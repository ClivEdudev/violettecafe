// Builds dist/ for Netlify: one small bundle for the first screen, the rest loaded on demand, everything minified,
// file names carry a content hash (so browsers can keep them for a year), fonts served from this site,
// the service worker gets the list of files to keep offline, and the menu is written into the HTML.
//   node scripts/build.mjs            (npm run build)   — NO_PRERENDER=1 skips the menu snapshot
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';

const esbuild = await import('esbuild').catch(() => import('/opt/npm-tools/node_modules/esbuild/lib/main.js')).then(m => m.default ?? m);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const P = (...a) => path.join(ROOT, ...a), DIST = P('dist'), ASSETS = P('dist', 'assets');

// 1. clean, copy the plain files
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(ASSETS, { recursive: true });
const SKIP = new Set(['index.html', 'styles.css', 'js', 'sw.js', 'fonts']);
for (const f of fs.readdirSync(P('public'))) if (!SKIP.has(f)) fs.cpSync(P('public', f), P('dist', f), { recursive: true });
fs.mkdirSync(P('dist', 'fonts'), { recursive: true });
for (const f of fs.readdirSync(P('public', 'fonts'))) if (f.endsWith('.txt')) fs.copyFileSync(P('public', 'fonts', f), P('dist', 'fonts', f));

// 2. type check (no output), then bundle
execFileSync('tsc', ['--noEmit', '-p', ROOT], { stdio: 'inherit', cwd: ROOT, shell: process.platform === 'win32' });
const common = { bundle: true, minify: true, target: 'es2020', legalComments: 'none', metafile: true, write: true, logLevel: 'warning' };
const js = await esbuild.build({ ...common, entryPoints: { main: P('src', 'main.ts') }, splitting: true, format: 'esm', outdir: ASSETS, entryNames: '[name]-[hash]', chunkNames: '[name]-[hash]' });
const theme = await esbuild.build({ ...common, entryPoints: { theme: P('public', 'js', 'theme-init.js') }, format: 'iife', outdir: ASSETS, entryNames: '[name]-[hash]' });
const css = await esbuild.build({ ...common, entryPoints: { styles: P('public', 'styles.css') }, outdir: ASSETS, entryNames: '[name]-[hash]', assetNames: '[name]-[hash]', loader: { '.woff2': 'file' } });

const outs = m => Object.entries(m.metafile.outputs).map(([f, o]) => ({ file: '/' + path.relative(DIST, P(f.startsWith('/') ? path.relative(ROOT, f) : f)).split(path.sep).join('/'), ...o }));
const jsOut = outs(js), mainOut = jsOut.find(o => o.entryPoint);
const staticDeps = mainOut.imports.filter(i => i.kind === 'import-statement').map(i => '/' + path.relative(DIST, P(i.path.startsWith('/') ? path.relative(ROOT, i.path) : i.path)).split(path.sep).join('/'));
const themeOut = outs(theme).find(o => o.entryPoint), cssOut = outs(css).find(o => o.file.endsWith('.css')), fonts = outs(css).filter(o => o.file.endsWith('.woff2'));

// 3. the page: point at the hashed files, preload what the first screen needs, no third-party fonts
let html = fs.readFileSync(P('public', 'index.html'), 'utf8');
const swap = (from, to) => { if (!html.includes(from)) throw new Error('index.html: not found: ' + from); html = html.replace(from, to); };
swap('<script src="js/theme-init.js"></script>', `<script src="${themeOut.file}"></script>`);
html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>/g, '');
html = html.replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '');
swap('<link rel="stylesheet" href="styles.css">', [
  // no font preloads: on a thin connection they'd compete with the stylesheet; text shows in a system font until they arrive
  `<link rel="stylesheet" href="${cssOut.file}">`,
  `<link rel="modulepreload" href="${mainOut.file}">`, ...staticDeps.map(d => `<link rel="modulepreload" href="${d}">`),
].join('\n'));
swap('<script type="module" src="js/main.js"></script>', `<script type="module" src="${mainOut.file}"></script>`);
fs.writeFileSync(P('dist', 'index.html'), html);

// 4. the menu and the first hero frame written into the page, so they show before the scripts arrive
if (!process.env.NO_PRERENDER) {
  try { execFileSync(process.execPath, [P('scripts', 'prerender.mjs')], { stdio: 'inherit', cwd: ROOT }); }
  catch { console.warn('prerender skipped (needs Playwright); the site still works, it just draws the menu with JavaScript'); }
}

// 5. service worker: the files to keep for offline, and a version that changes whenever any of them does
const shell = ['/', themeOut.file, cssOut.file, mainOut.file, ...staticDeps, ...fonts.map(f => f.file), '/favicon.svg', '/icon-192.png', '/manifest.webmanifest'];
const later = jsOut.filter(o => o.file.endsWith('.js') && !shell.includes(o.file)).map(o => o.file); // on-demand parts: cached when first used, or fetched quietly
const version = crypto.createHash('sha256').update(fs.readFileSync(P('dist', 'index.html'))).update(shell.concat(later).join()).digest('hex').slice(0, 12);
const sw = fs.readFileSync(P('public', 'sw.js'), 'utf8').replace("'__VERSION__'", JSON.stringify(version)).replace("'__SHELL__'", JSON.stringify(shell)).replace("'__LATER__'", JSON.stringify(later));
fs.writeFileSync(P('dist', 'sw.js'), sw);

// 6. sizes
const kb = f => (fs.statSync(P('dist', f.replace(/^\//, ''))).size / 1024).toFixed(1) + ' KB';
console.log('first screen:', [mainOut.file, ...staticDeps, cssOut.file, ...fonts.map(f => f.file)].map(f => `${path.basename(f)} ${kb(f)}`).join(', '));
console.log('on demand:', later.map(f => `${path.basename(f)} ${kb(f)}`).join(', '));
