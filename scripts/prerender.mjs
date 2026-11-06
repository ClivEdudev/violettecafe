// Writes the menu (category chips, dish cards, the running tape) into dist/index.html, in Uzbek, by loading the
// built page once in a headless browser. The page's own script redraws the same markup when it starts, so this only
// matters on a slow connection: the food and prices are readable before the scripts arrive.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), DIST = path.join(ROOT, 'dist');
const req = createRequire(path.join(ROOT, 'package.json'));
let pw;
try { pw = req('playwright'); } catch { pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x'); let f = path.join(DIST, decodeURIComponent(u.pathname));
  if (u.pathname.startsWith('/api/')) { r.writeHead(200, { 'content-type': 'application/json' }); return r.end('{"paused":false,"extra":0}'); }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const b = await pw.chromium.launch();
try {
  const p = await b.newPage({ locale: 'uz-UZ', viewport: { width: 1280, height: 800 } });
  await p.goto(`http://127.0.0.1:${port}/?lang=uz`, { waitUntil: 'load' });
  await p.waitForSelector('#grid .card', { timeout: 20000 });
  const parts = await p.evaluate(() => Object.fromEntries(['chips', 'grid', 'tape'].map(id => [id, document.getElementById(id)?.innerHTML ?? ''])));
  let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  for (const [id, inner] of Object.entries(parts)) {
    const re = new RegExp(`(<div[^>]*id="${id}"[^>]*>)(</div>)`);
    if (!re.test(html)) throw new Error('container not empty or missing: #' + id);
    html = html.replace(re, (_, open, close) => open.replace(`id="${id}"`, `id="${id}" data-pre`) + inner + close);
  }
  fs.writeFileSync(path.join(DIST, 'index.html'), html);
  console.log('prerendered:', Object.entries(parts).map(([k, v]) => `#${k} ${(v.length / 1024).toFixed(1)} KB`).join(', '));
} finally { await b.close(); server.close(); }
