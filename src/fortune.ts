// "Burger fortune" — four quick questions; every answer drops a real layer onto the burger on the stage. At the end the
// visitor gets their burger of the day (priced like the burger builder, so the kitchen can make it), a silly prediction,
// a one-time gift code (free Frans sauce with that burger — shown on the cart line and in the kitchen's Telegram order),
// a story card for Instagram (drawn here on a canvas, tagged with the shop's handle) and one matching upsell.
// For the shop: shareable marketing, a reason to order, measurable orders (the code shows which ones came from here).
import { CAFE, FILLINGS, ITEM, SIZES } from './data.js';
import { LAYERS, bunTop, bunBottom, plateSVG, stackBurger, REAL_DEFS } from './art.js';
import { burgerPrice, burgerKcal, burgerName, type BurgerSpec } from './recipes.js';
import { $, $$, esc, state, t, tf, money, on, addLine, toast, store, itemPic, reduced, tashkentNow, ddmmyyyy, lineSig, FORTUNE_DAYS } from './shared.js';

type Opt = { id: string; e: string; add: string[] };
const QS: { id: string; opts: Opt[] }[] = [
  { id: 'mood', opts: [{ id: 'great', e: '😎', add: ['cheese'] }, { id: 'tired', e: '😴', add: ['egg'] }, { id: 'bold', e: '🔥', add: ['onion'] }, { id: 'love', e: '💘', add: ['lettuce'] }] },
  { id: 'hunger', opts: [{ id: 'bit', e: '🙂', add: ['tomato'] }, { id: 'very', e: '😋', add: ['beef'] }, { id: 'max', e: '🐘', add: ['beef', 'beef'] }] },
  { id: 'taste', opts: [{ id: 'classic', e: '🍅', add: ['ketchup'] }, { id: 'cheese', e: '🧀', add: ['cheese'] }, { id: 'crispy', e: '🍗', add: ['chicken'] }, { id: 'smoky', e: '🥓', add: ['bacon'] }] },
  { id: 'with', opts: [{ id: 'solo', e: '🎧', add: ['pickles'] }, { id: 'duo', e: '👯', add: ['sauce'] }, { id: 'group', e: '🎉', add: ['sauce', 'pickles'] }] },
];
const UPSELL: Record<string, { item: string; size?: 'M' }> = { solo: { item: 'fries', size: 'M' }, duo: { item: 'duo-combo' }, group: { item: 'chicken-box' } };
const FORTUNES = 8;

let picks: string[] = []; // chosen option id per question
let code = '';
let lastDrop = -1; // index of the layer that should animate in

const optOf = (qi: number, id: string) => QS[qi].opts.find(o => o.id === id)!;
const bunOf = () => (['great', 'love'].includes(picks[0]) ? 'brioche' : 'classic');
const fillOf = () => picks.flatMap((id, qi) => optOf(qi, id).add);
const spec = (): BurgerSpec => ({ bun: bunOf(), fill: fillOf() });
const done = () => picks.length === QS.length;
const layerName = (id: string) => FILLINGS.find(f => f.id === id)?.name[state.lang] ?? id;
const fortuneName = () => tf('fo.name', { a: t('fo.m.' + picks[0]) + (picks[1] === 'max' ? ' ' + t('fo.xxl') : '') });
function fortuneIdx() {
  const key = picks.join('|') + ddmmyyyy(tashkentNow()); // same answers, same day → same prediction
  let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % FORTUNES;
}
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(4));
  return 'FRANS-' + Array.from(r, b => A[b % A.length]).join('');
}

/* ---------- the stage: plate, the layers so far, a mystery bun until the end ---------- */
const CX = 200, BASE = 318, W = 200;
const STARS = [[46, 60, 1], [350, 48, .8], [90, 150, .6], [322, 140, 1], [30, 250, .7], [370, 236, .9], [140, 40, .5], [262, 30, .7], [200, 92, .4], [62, 330, .6], [342, 318, .5]];
const star = (x: number, y: number, s: number, i: number) => `<path class="fo-star" style="--d:${(i * .37) % 2.4}s" d="M${x} ${y - 9 * s} Q${x + 1.6 * s} ${y - 1.6 * s} ${x + 9 * s} ${y} Q${x + 1.6 * s} ${y + 1.6 * s} ${x} ${y + 9 * s} Q${x - 1.6 * s} ${y + 1.6 * s} ${x - 9 * s} ${y} Q${x - 1.6 * s} ${y - 1.6 * s} ${x} ${y - 9 * s}z"/>`;
function renderStage() {
  const bun = bunOf(), fill = fillOf();
  const layers = [bunBottom(bun), ...fill.map(f => LAYERS[f]).filter(Boolean), ...(done() ? [bunTop(bun)] : [])];
  const total = layers.reduce((a, l) => a + l.h - 4, 0);
  const sc = Math.min(1, 220 / Math.max(total, 1));
  let y = BASE;
  const parts = layers.map((l, i) => { y -= l.h - 4; const g = l.svg(y, CX, W); return lastDrop >= 0 && i >= lastDrop && !reduced ? `<g class="fo-drop${done() && i === layers.length - 1 ? ' fo-crown' : ''}" style="animation-delay:${(i - lastDrop) * 140}ms">${g}</g>` : g; });
  const topY = BASE - (BASE - y) * sc;
  const ghost = done() ? '' : `<g class="fo-ghost" transform="translate(0 ${Math.max(40, topY - 96)})"><path d="M${CX - 92} 62 C${CX - 92} 0, ${CX + 92} 0, ${CX + 92} 62 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="8 9" stroke-linejoin="round"/><text x="${CX}" y="52" text-anchor="middle" class="fo-q-mark">?</text></g>`;
  $('#foSvg').innerHTML = `<defs><radialGradient id="foHalo" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".28"/><stop offset=".6" stop-color="#8FA4FF" stop-opacity=".12"/><stop offset="1" stop-color="#8FA4FF" stop-opacity="0"/></radialGradient></defs>
    <circle class="fo-halo${done() ? ' lit' : ''}" cx="${CX}" cy="${BASE - 110}" r="190" fill="url(#foHalo)"/>
    ${STARS.map(([x, yy, s], i) => star(x, yy, s, i)).join('')}
    ${plateSVG(CX, BASE + 18, 150)}
    <g transform="translate(${CX} ${BASE}) scale(${sc.toFixed(3)}) translate(${-CX} ${-BASE})">${parts.join('')}</g>${ghost}`;
  $('#foStep').textContent = done() ? t('fo.done') : tf('fo.step', { n: picks.length + 1, t: QS.length });
  $$('#foDots i').forEach((d, i) => { d.classList.toggle('on', i < picks.length); d.classList.toggle('now', i === picks.length); });
  $('#foPicked').innerHTML = picks.length ? picks.map((id, qi) => `<span>${optOf(qi, id).e} ${esc(t('fo.a.' + id))}</span>`).join('') : esc(t('fo.wait'));
}

/* ---------- the panel: the current question, or the result ---------- */
function renderQuestion(focus = false) {
  const qi = picks.length, q = QS[qi];
  $('#foPanel').innerHTML = `<div class="fo-q" data-q="${qi}">
    <h3>${esc(t('fo.q.' + q.id))}</h3>
    <div class="fo-opts${q.opts.length === 3 ? ' three' : ''}">${q.opts.map((o, k) => `<button type="button" class="fo-opt" data-o="${o.id}" style="--k:${k}">
      <span class="fo-e" aria-hidden="true">${o.e}</span><b>${esc(t('fo.a.' + o.id))}</b><small>+ ${esc(o.add.map(layerName).join(', '))}</small></button>`).join('')}</div>
    ${qi ? `<button type="button" class="btn btn-mini fo-back" data-back>← ${esc(t('fo.back'))}</button>` : ''}
  </div>`;
  if (focus) $<HTMLElement>('#foPanel .fo-opt')?.focus({ preventScroll: true });
}
function renderResult(focus = false) {
  const s = spec(), up = UPSELL[picks[3]], ui = ITEM(up.item)!;
  const upPrice = ui.price + (ui.sized && up.size ? SIZES.find(z => z.id === up.size)!.add : 0);
  $('#foPanel').innerHTML = `<div class="fo-res">
    <p class="fo-kick">${esc(t('fo.kicker'))}</p>
    <h3 class="fo-name" tabindex="-1">${esc(fortuneName())}</h3>
    <blockquote class="fo-cookie">${esc(t('fo.f' + fortuneIdx()))}</blockquote>
    <p class="fo-meta">${esc(burgerName(s, state.lang))} · ${burgerKcal(s)} ${esc(t('card.kcal'))}</p>
    <div class="fo-ticket"><span>${esc(t('fo.code'))}</span><b>${code}</b><small>${esc(tf('fo.codeNote', { d: FORTUNE_DAYS }))}</small></div>
    <button type="button" class="btn btn-acc btn-big" id="foAdd">${esc(tf('fo.add', { s: money(burgerPrice(s)) }))}</button>
    <div class="fo-row"><button type="button" class="btn btn-line" id="foStory">📸 ${esc(t('fo.story'))}</button><button type="button" class="btn btn-mini" id="foAgain">↺ ${esc(t('fo.again'))}</button></div>
    <div class="fo-up"><div class="fo-up-art">${itemPic(ui, 120)}</div><div><small>${esc(t('fo.up.' + picks[3]))}</small><b>${esc(ui.name[state.lang])}${ui.sized && up.size ? ` <em>${up.size}</em>` : ''}</b><span>${money(upPrice)}</span></div>
      <button type="button" class="fo-up-add" id="foUp" aria-label="${esc(t('card.add'))}: ${esc(ui.name[state.lang])}">+</button></div>
    <div class="fo-prev" id="foPrev" hidden></div>
  </div>`;
  if (focus) $<HTMLElement>('.fo-name')?.focus({ preventScroll: true });
}
function render(focus = false) { renderStage(); done() ? renderResult(focus) : renderQuestion(focus); }

function choose(id: string) {
  if (done()) return;
  picks.push(id);
  lastDrop = 1 + fillOf().length - optOf(picks.length - 1, id).add.length; // first new layer (after the bottom bun)
  if (done()) { // the last layers drop, then the top bun lands
    code = newCode();
    store.set('vc-fortune', { code, sig: lineSig({ kind: 'burger', burger: spec() }), at: Date.now() });
  }
  render(true);
  // phones: the stage sits above the questions — bring it back into view so the new layer is seen landing
  const st = $('.fo-stage'), r = st.getBoundingClientRect();
  if (matchMedia('(max-width: 960px)').matches && (r.top < 40 || r.top > innerHeight * .45)) st.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
}

/* ---------- story card (1080×1920, for Instagram / Telegram stories) ---------- */
function burgerImage(s: BurgerSpec): Promise<HTMLImageElement> {
  const defs = REAL_DEFS.slice(REAL_DEFS.indexOf('<defs>'), REAL_DEFS.indexOf('</defs>') + 7);
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="1600" height="1200">${defs}${stackBurger(['bun:' + s.bun, ...s.fill])}</svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  return img.decode().then(() => img);
}
function wrapLines(x: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = []; let line = '';
  for (const w of text.split(/\s+/)) { const tryL = line ? line + ' ' + w : w; if (x.measureText(tryL).width > max && line) { out.push(line); line = w; } else line = tryL; }
  if (line) out.push(line);
  return out;
}
async function drawCard(): Promise<HTMLCanvasElement> {
  const Wc = 1080, Hc = 1920, c = document.createElement('canvas'); c.width = Wc; c.height = Hc;
  const x = c.getContext('2d')!;
  const D = '"Dela Gothic One", "Arial Black", sans-serif', M = 'Manrope, system-ui, sans-serif';
  await Promise.all([document.fonts.load(`400 72px ${D}`), document.fonts.load(`800 46px ${M}`), document.fonts.load(`700 36px ${M}`)]).catch(() => null);
  const img = await burgerImage(spec());
  x.fillStyle = '#1F3FBF'; x.fillRect(0, 0, Wc, Hc);
  const glow = x.createRadialGradient(540, 800, 40, 540, 800, 900); glow.addColorStop(0, 'rgba(255,255,255,.24)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = glow; x.fillRect(0, 0, Wc, Hc);
  x.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 34; i++) { const px = (i * 317) % Wc, py = 340 + ((i * 523) % 1240), r = 5 + (i % 4) * 3; x.beginPath(); x.moveTo(px, py - r); x.quadraticCurveTo(px, py, px + r, py); x.quadraticCurveTo(px, py, px, py + r); x.quadraticCurveTo(px, py, px - r, py); x.quadraticCurveTo(px, py, px, py - r); x.fill(); }
  const band = (y: number) => { [['#142A85', 0], ['#FFFFFF', 360], ['#E63329', 720]].forEach(([col, bx]) => { x.fillStyle = col as string; x.fillRect(bx as number, y, 360, 24); }); };
  band(0); band(Hc - 24);
  x.textAlign = 'center'; x.fillStyle = '#FFFFFF';
  x.font = `400 44px ${D}`; x.fillText('FRANS BURGER', 540, 128);
  let fs = 70; x.font = `400 ${fs}px ${D}`;
  while (fs > 46 && x.measureText(t('fo.card.title')).width > 960) { fs -= 2; x.font = `400 ${fs}px ${D}`; }
  const tl = wrapLines(x, t('fo.card.title'), 960).slice(0, 2);
  tl.forEach((l, i) => x.fillText(l, 540, 246 + i * (fs + 12)));
  x.globalAlpha = .75; x.font = `700 34px ${M}`; x.fillText(ddmmyyyy(tashkentNow()), 540, 246 + (tl.length - 1) * (fs + 12) + 62); x.globalAlpha = 1;
  const disc = (cx: number, cy: number, r: number) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); };
  x.fillStyle = '#E63329'; disc(562, 822, 380); x.fill();
  x.fillStyle = '#FBF3E4'; disc(540, 800, 380); x.fill(); x.lineWidth = 10; x.strokeStyle = '#15192B'; x.stroke();
  x.drawImage(img, 540 - 380, 800 - 300, 760, 570);
  x.fillStyle = '#FFFFFF'; x.font = `400 76px ${D}`;
  let y = 1300; wrapLines(x, fortuneName(), 940).forEach(l => { x.fillText(l, 540, y); y += 88; });
  x.font = `800 44px ${M}`; y += 10;
  wrapLines(x, `“${t('fo.f' + fortuneIdx())}”`, 900).slice(0, 4).forEach(l => { x.fillText(l, 540, y); y += 60; });
  x.fillStyle = '#FFFFFF'; x.beginPath(); x.roundRect(80, 1640, 920, 160, 34); x.fill();
  x.fillStyle = '#15192B'; x.font = `700 36px ${M}`; x.fillText(t('fo.card.ask'), 540, 1704);
  x.fillStyle = '#1F3FBF'; x.font = `400 42px ${D}`; x.fillText(`${location.host}/#fortune`.slice(0, 40), 540, 1764);
  x.fillStyle = '#FFFFFF'; x.font = `800 40px ${M}`; x.fillText('@' + CAFE.instagram, 540, 1866);
  return c;
}
async function story(btn: HTMLButtonElement) {
  const label = btn.innerHTML;
  btn.disabled = true; btn.textContent = t('fo.storyBusy');
  try {
    const c = await drawCard();
    const url = c.toDataURL('image/png');
    const prev = $('#foPrev'); if (prev) { prev.innerHTML = `<img src="${url}" alt="${esc(t('fo.story'))}" width="108" height="192">`; prev.hidden = false; }
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'));
    const file = blob ? new File([blob], 'frans-burger-fol.png', { type: 'image/png' }) : null;
    if (file && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text: `${t('fo.card.ask')} ${location.origin}/#fortune` }); return; }
      catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = url; a.download = 'frans-burger-fol.png'; document.body.appendChild(a); a.click(); a.remove();
    toast(tf('fo.storyDone', { ig: CAFE.instagram }));
  } catch { toast(t('fo.storyFail')); }
  finally { btn.disabled = false; btn.innerHTML = label; }
}

export function initFortune() {
  render();
  $('#foPanel').addEventListener('click', e => {
    const el = e.target as Element;
    const o = el.closest<HTMLElement>('[data-o]');
    if (o) { o.classList.add('picked'); return void setTimeout(() => choose(o.dataset.o!), reduced ? 0 : 160); }
    if (el.closest('[data-back]')) { picks.pop(); lastDrop = -1; return render(true); }
    if (el.closest('#foAgain')) { picks = []; lastDrop = -1; code = ''; return render(true); }
    if (el.closest('#foStory')) return void story(el.closest<HTMLButtonElement>('#foStory')!);
    if (el.closest('#foAdd')) { if (addLine({ kind: 'burger', burger: spec() }, 1, el.closest('#foAdd'))) toast(t('fo.added')); return; }
    if (el.closest('#foUp')) { const up = UPSELL[picks[3]], it = ITEM(up.item)!; if (addLine({ kind: 'item', item: it.id, size: it.sized ? up.size ?? 'M' : undefined, extras: [] }, 1, el.closest('#foUp'))) toast(t('card.added')); }
  });
  on('lang', () => { lastDrop = -1; render(); });
}
