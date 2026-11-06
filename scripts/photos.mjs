// Turns the owner's photos into small, fast images. Put originals (jpg/png/heic from a phone is fine once converted
// to jpg) in /photos, named after the dish id, e.g. photos/ffs-boss-burger.jpg, then run:  npm run photos
// For each photo it writes public/img/<name>-480.webp and -960.webp (about 25–70 KB each), and a tiny blurred
// preview, all listed in src/photos.gen.ts, which the site uses through photoHTML() in shared.ts.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const req = createRequire(path.join(ROOT, 'package.json'));
let sharp; try { sharp = req('sharp'); } catch { sharp = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('sharp'); }
const SRC = path.join(ROOT, 'photos'), OUT = path.join(ROOT, 'public', 'img');
fs.mkdirSync(OUT, { recursive: true });
const list = {};
for (const f of fs.existsSync(SRC) ? fs.readdirSync(SRC) : []) {
  if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
  const name = f.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const img = sharp(path.join(SRC, f)).rotate(); // respects the phone's orientation
  const { width = 0, height = 0 } = await img.metadata();
  for (const w of [480, 960]) await img.clone().resize({ width: Math.min(w, width), withoutEnlargement: true }).webp({ quality: 72, effort: 6 }).toFile(path.join(OUT, `${name}-${w}.webp`));
  const ph = await img.clone().resize(16).webp({ quality: 40 }).toBuffer();
  list[name] = { w: width, h: height, ph: 'data:image/webp;base64,' + ph.toString('base64') };
  console.log(name, ...[480, 960].map(w => `${w}: ${(fs.statSync(path.join(OUT, `${name}-${w}.webp`)).size / 1024).toFixed(0)} KB`));
}
fs.writeFileSync(path.join(ROOT, 'src', 'photos.gen.ts'), `// Made by scripts/photos.mjs — don't edit by hand.\nexport const PHOTOS: Record<string, { w: number; h: number; ph: string }> = ${JSON.stringify(list, null, 1)};\n`);
console.log(Object.keys(list).length ? `${Object.keys(list).length} photo(s) ready` : 'no photos in /photos yet — nothing to do');
