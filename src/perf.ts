// Light mode for slower phones and computers. The site starts in full mode unless the device says it's modest
// (Data Saver, a slow connection, little memory) or the first seconds on screen run slowly; it also steps down by
// itself if scrolling keeps dropping frames. Light mode keeps everything working but drops what costs the most to
// draw: SVG textures and shadows, blur, scroll-linked effects, floating beans, endless decorative loops and the
// custom cursor; the kitchen show runs at 30 fps. Visitors can pick Full/Light in the footer; ?lite=1 / ?lite=0 too.
import { store, emit } from './shared.js';

type Choice = 'full' | 'lite' | null;
export const perf = { lite: false, auto: true };
const root = document.documentElement;

function apply(lite: boolean) {
  perf.lite = lite;
  root.classList.toggle('lite', lite);
  emit('perf', lite);
  if (lite) dispatchEvent(new Event('vc-lite'));
}

/** Device hints that don't need any measuring. */
function modestDevice(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  if (n.connection?.saveData) return true;
  if (n.connection?.effectiveType && /(^|-)2g|3g/.test(n.connection.effectiveType)) return true;
  if (typeof n.deviceMemory === 'number' && n.deviceMemory <= 2) return true;
  if (typeof n.deviceMemory === 'number' && n.deviceMemory <= 4 && (n.hardwareConcurrency ?? 8) <= 4) return true;
  return false;
}

/** Collects frame times while `ms` passes and resolves with the median and the share of slow frames. */
function sample(ms: number): Promise<{ median: number; slow: number; n: number }> {
  return new Promise(res => {
    const f: number[] = []; let last = 0; const t0 = performance.now();
    const loop = (t: number) => {
      if (last && !document.hidden) f.push(t - last);
      last = t;
      if (t - t0 < ms) requestAnimationFrame(loop);
      else { const s = f.slice().sort((a, b) => a - b); res({ median: s[Math.floor(s.length / 2)] ?? 16, slow: f.filter(x => x > 34).length / Math.max(1, f.length), n: f.length }); }
    };
    requestAnimationFrame(loop);
  });
}

/** While scrolling, keep an eye on frame times; if they stay poor for a while, step down to light mode once. */
function watchScrolling() {
  let scoring = false, bad = 0, good = 0;
  addEventListener('scroll', async () => {
    if (perf.lite || !perf.auto || scoring || document.hidden) return;
    scoring = true;
    const r = await sample(1200);
    scoring = false;
    if (r.n < 6) return;
    if (r.median > 30 || r.slow > .45) bad++; else { good++; if (good > 3) bad = Math.max(0, bad - 1); }
    if (bad >= 2) { apply(true); emit('perf-auto'); }
  }, { passive: true });
}

export function initPerf() {
  const q = new URLSearchParams(location.search).get('lite');
  const chosen: Choice = q === '1' ? 'lite' : q === '0' ? 'full' : (store.get('vc-perf') as Choice) ?? null;
  perf.auto = !chosen;
  if (chosen) { apply(chosen === 'lite'); return; }
  apply(modestDevice());
  if (perf.lite) return;
  // a first look once the page has settled: the hero's ambient animations are running then
  setTimeout(async () => {
    if (document.hidden || perf.lite) return;
    const r = await sample(1500);
    if (r.n > 8 && (r.median > 28 || r.slow > .5)) { apply(true); emit('perf-auto'); }
  }, 2600);
  watchScrolling();
}

/** The visitor's own choice (null = automatic). Reloads, so everything starts cleanly in the new mode. */
export function choosePerf(c: Choice) {
  store.set('vc-perf', c);
  const u = new URL(location.href); u.searchParams.delete('lite');
  location.replace(u.toString());
}
export const perfChoice = (): Choice => { const q = new URLSearchParams(location.search).get('lite'); return q === '1' ? 'lite' : q === '0' ? 'full' : (store.get('vc-perf') as Choice) ?? null; };
