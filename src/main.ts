import { CAFE, CATS, ITEMS, ITEM, SIZES, EXTRAS, ZONES, STAMPS_FOR_GIFT, SET_DRINKS, SET_BURGERS, SET_DISCOUNTS, setFull, setPrice, isVeg, isSpicy, allergens, type World, type CatId, type Item, type ExtraId, type Lang } from './data.js';
import { svg, steam, LAYERS, bunTop, bunBottom, latteArt, plateSVG, REAL_DEFS } from './art.js';
import { initPointer } from './ui.js';
import { initScroll } from './scroll.js';
import { initAfk, showOrder } from './afk.js';
import { initTrack, startTrack, openTrack, langTrack } from './track.js';
document.body.insertAdjacentHTML('afterbegin', REAL_DEFS);
import {
  $, $$, clamp, ease, reduced, finePointer, esc, store, state, t, tf, money, plural, on, emit, cart, saveCart, setCart, addLine,
  unitPrice, lineName, lineSub, lineArt, linePrep, isCoffeeLine, subtotal, count, toast, openOverlay, closeOverlay, tashkentNow, hhmm, ddmmyyyy, pad,
  isLang, itemPic, lineVisual, addSavedLines, type Line, type Size,
} from './shared.js';
import { initLab } from './lab.js';
import { initBudget } from './budget.js';

const root = document.documentElement;

/* =============== theme =============== */
type Theme = 'light' | 'dark';
const sysDark = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = (): Theme => (root.dataset.theme === 'dark' ? 'dark' : 'light');
function paintTheme(th: Theme) {
  root.dataset.theme = th;
  $('#themeBtn').setAttribute('aria-pressed', String(th === 'dark'));
  $('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#170D22' : '#F1EAF7');
}
function setTheme(next: Theme, origin?: HTMLElement) {
  store.set('vc-theme', next);
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduced || !origin) { paintTheme(next); return; }
  const r = origin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = doc.startViewTransition(() => paintTheme(next));
  vt.ready.then(() => root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 650, easing: 'cubic-bezier(.6,0,.2,1)', pseudoElement: '::view-transition-new(root)' } as KeyframeAnimationOptions)).catch(() => {});
}
paintTheme(currentTheme());
$('#themeBtn').addEventListener('click', e => setTheme(currentTheme() === 'dark' ? 'light' : 'dark', e.currentTarget as HTMLElement));
sysDark.addEventListener('change', e => { if (store.get('vc-theme') !== 'light' && store.get('vc-theme') !== 'dark') paintTheme(e.matches ? 'dark' : 'light'); });

/* =============== language =============== */
function splitWords(el: HTMLElement) {
  const words = (el.textContent ?? '').trim().split(/\s+/);
  el.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
}
function applyLang() {
  root.lang = state.lang;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n!); if (el.hasAttribute('data-split')) splitWords(el); });
  $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria!)));
  $$<HTMLInputElement>('[data-i18n-ph]').forEach(el => (el.placeholder = t(el.dataset.i18nPh!)));
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  document.title = { uz: 'Violette — kofe va fast-food, Andijon', ru: 'Violette — кофе и фастфуд, Андижан', en: 'Violette — coffee & fast food, Andijan' }[state.lang];
  emit('lang');
}
$$('.lang button').forEach(b => b.addEventListener('click', () => {
  const l = b.dataset.lang; if (!isLang(l) || l === state.lang) return;
  state.lang = l as Lang; store.set('vc-lang', l); applyLang();
}));

/* =============== header, progress, mobile menu =============== */
const menuBtn = $('#menuBtn'), menu = $('#menu');
function setMenu(open: boolean) {
  menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open));
  root.classList.toggle('menu-open', open);
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
$$('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

/* =============== open status & greeting =============== */
function renderStatus() {
  const now = tashkentNow(), h = now.getHours() + now.getMinutes() / 60;
  const open = h >= CAFE.open && h < CAFE.close;
  const pill = $('#openPill');
  pill.classList.toggle('closed', !open);
  $('span', pill).textContent = open ? tf('open.now', { t: `${pad(CAFE.close)}:00` }) : tf('open.closed', { t: `${pad(CAFE.open)}:00` });
  const g = h < 5 ? 'night' : h < 11.5 ? 'morning' : h < 17 ? 'day' : h < 22.5 ? 'evening' : 'night';
  $('#greet').textContent = t('greet.' + g);
  $('#hoursV').textContent = tf('visit.hoursV', { o: `${pad(CAFE.open)}:00`, c: `${pad(CAFE.close)}:00` });
}
setInterval(renderStatus, 60000);

/* =============== HERO: a random drink + burger pair, poured and stacked as you scroll =============== */
const scene = $<SVGSVGElement>('#scene');
interface DrinkRecipe { layers: { c: string; f: number }[]; foam: number; art?: 'heart' | 'rosetta' | 'tulip'; artC?: string; ice?: boolean; cream?: boolean; dust?: string; top?: string }
const RECIPES: Record<string, DrinkRecipe> = {
  'violette-latte': { layers: [{ c: '#B08CDB', f: .12 }, { c: '#F5EDF6', f: .5 }, { c: '#9A6A45', f: .2 }], foam: .09, art: 'heart', artC: '#B07FD8' },
  latte: { layers: [{ c: '#F6EFE6', f: .52 }, { c: '#B8865C', f: .16 }, { c: '#8E5E3C', f: .12 }], foam: .1, art: 'rosetta', artC: '#B07A50' },
  cappuccino: { layers: [{ c: '#F3E7D8', f: .3 }, { c: '#9A6A45', f: .22 }], foam: .3, art: 'heart', artC: '#A8744C' },
  mocha: { layers: [{ c: '#4A2616', f: .16 }, { c: '#C9A27E', f: .34 }, { c: '#6B3E24', f: .26 }], foam: 0, cream: true, dust: '#3A1F14' },
  raf: { layers: [{ c: '#F1DFC2', f: .5 }, { c: '#D9B98F', f: .26 }], foam: .1, art: 'tulip', artC: '#C49A6C' },
  'iced-latte': { layers: [{ c: '#F6EFE6', f: .5 }, { c: '#B8865C', f: .14 }, { c: '#5A3220', f: .2 }], foam: 0, ice: true },
  'iced-violette': { layers: [{ c: '#B08CDB', f: .16 }, { c: '#EFE4F8', f: .44 }, { c: '#9A6A45', f: .22 }], foam: 0, ice: true },
  matcha: { layers: [{ c: '#F6EFE6', f: .44 }, { c: '#A9C76F', f: .14 }, { c: '#7FA54A', f: .24 }], foam: 0, ice: true },
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const PAIR = { drink: pick(SET_DRINKS), burger: pick(SET_BURGERS), pct: pick(SET_DISCOUNTS) };
const HL = ITEM(PAIR.drink)!, HB = ITEM(PAIR.burger)!, REC = RECIPES[PAIR.drink];
const GLASS = { cx: 330, top: 300, bot: 650, wt: 214, wb: 178 };
const BURGER = { cx: 712, base: 646, w: 300, layers: [] as string[], bun: 'classic' };
{
  const art = HB.art as { k: 'burger'; layers: string[] };
  BURGER.bun = art.layers.find(l => l.startsWith('bun:'))?.slice(4) ?? 'classic';
  BURGER.layers = ['bottom', ...art.layers.filter(l => !l.startsWith('bun:')), 'top'];
}
let burgerY: number[] = [];
function buildScene() {
  const { cx, top, bot, wt, wb } = GLASS;
  const L = cx - wt / 2, R = cx + wt / 2, bl = cx - wb / 2, br = cx + wb / 2;
  const gp = `M${L} ${top} L${bl} ${bot - 8} Q${cx} ${bot + 10} ${br} ${bot - 8} L${R} ${top}z`;
  const hp = `M${R - 8} ${top + 60} c 86 -10, 92 150, -8 ${160}`;
  let stars = '';
  for (let i = 0; i < 38; i++) { const x = (i * 157) % 1200, y = (i * 71) % 300 + 10, r = 1 + (i % 3) * .7; stars += `<circle class="star" style="--d:${(i % 7) * .4}s" cx="${x}" cy="${y}" r="${r}"/>`; }
  let layersSvg = '', y = BURGER.base;
  burgerY = [];
  const scale = Math.min(1, 300 / BURGER.layers.reduce((a, id) => a + (id === 'bottom' ? 28 : id === 'top' ? 66 : (LAYERS[id]?.h ?? 10) - 4), 0));
  BURGER.layers.forEach((id, i) => {
    const Ly = id === 'bottom' ? bunBottom(BURGER.bun) : id === 'top' ? bunTop(BURGER.bun) : LAYERS[id];
    y -= Ly.h - 4; burgerY.push(y);
    layersSvg += `<g class="bl" data-i="${i}"><g class="bl-in">${Ly.svg(y, BURGER.cx, BURGER.w)}</g></g>`;
  });
  const ice = REC.ice ? [[-50, .3], [20, .38], [-14, .55], [44, .62], [-44, .74]].map(([x, f], i) => { const yy = top + (bot - top) * f, ix = cx + x; return `<g class="hice" data-f="${f}" transform="rotate(${i * 21 - 30} ${ix} ${yy + 22})"><rect x="${ix - 27}" y="${yy}" width="54" height="50" rx="12" fill="rgba(255,255,255,.3)" stroke="rgba(255,255,255,.85)" stroke-width="2"/><rect x="${ix - 18}" y="${yy + 8}" width="24" height="15" rx="5" fill="rgba(255,255,255,.55)"/></g>`; }).join('') : '';
  const drops = REC.ice ? Array.from({ length: 22 }, (_, i) => { const f = ((i * 37) % 100) / 100, yy = top + 50 + ((i * 53) % 100) / 100 * (bot - top - 90); const k = (yy - top) / (bot - top); const left = L + (bl - L) * k, width = wt + (wb - wt) * k; const x = left + 10 + f * (width - 20), r = 1.8 + (i % 4); return `<circle cx="${x}" cy="${yy}" r="${r}" fill="rgba(255,255,255,.55)"/><circle cx="${x - r * .3}" cy="${yy - r * .3}" r="${r * .35}" fill="#fff"/>`; }).join('') : '';
  scene.innerHTML = `
    <defs>
      <clipPath id="glassClip"><path d="${gp}"/></clipPath>
      <radialGradient id="discG" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="var(--disc-a)"/><stop offset="1" stop-color="var(--disc-b)"/></radialGradient>
      <linearGradient id="g-stream" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".35" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
      <radialGradient id="g-sticker" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FF8A70"/><stop offset=".6" stop-color="#E2452F"/><stop offset="1" stop-color="#B02A1C"/></radialGradient>
    </defs>
    <g class="sky">${stars}</g>
    <circle id="disc" cx="520" cy="440" r="330" fill="url(#discG)"/>
    <g id="discRing" fill="none" stroke="var(--ring)" stroke-width="2" stroke-dasharray="3 12"><circle cx="520" cy="440" r="372"/></g>
    <text class="neon" x="520" y="128" text-anchor="middle" textLength="640" lengthAdjust="spacingAndGlyphs">Violette</text>
    <ellipse cx="${cx}" cy="${bot + 12}" rx="${wb * .72}" ry="14" fill="#1a0a24" opacity=".28" filter="url(#fx-steam)"/>
    ${plateSVG(BURGER.cx, BURGER.base + 10, 206)}
    <g id="pour"><rect id="stream" x="${cx - 7}" y="-20" width="14" height="0" rx="7"/><rect id="streamHi" x="${cx - 7}" y="-20" width="14" height="0" rx="7" fill="url(#g-stream)"/></g>
    ${REC.ice ? '' : `<path d="${hp}" fill="none" stroke="rgba(42,20,64,.22)" stroke-width="26" stroke-linecap="round"/>
    <path d="${hp}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="22" stroke-linecap="round"/>
    <path d="${hp}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9" transform="translate(-4 -4)"/>`}
    <path d="${gp}" fill="rgba(255,255,255,.2)"/>
    <g clip-path="url(#glassClip)">
      <g filter="url(#fx-mix)">${REC.layers.map((_, i) => `<rect id="lq${i}" x="${L - 20}" width="${wt + 40}" fill="${REC.layers[i].c}"/>`).join('')}</g>
      <rect id="lqFoam" x="${L - 20}" width="${wt + 40}" fill="url(#g-foam)" filter="url(#fx-foam)"/>
      <rect id="lqShade" x="${bl - 20}" width="${wt + 40}" fill="url(#g-shade)"/>
      <g id="iceG">${ice}</g>
      <g id="splash"></g>
    </g>
    <g id="surfaceTop"></g>
    <path d="${gp}" fill="url(#g-glass)"/>
    <path d="${gp}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="${gp}" fill="none" stroke="rgba(42,20,64,.3)" stroke-width="1.6" stroke-linejoin="round" transform="translate(0 2)"/>
    <path d="M${L + 20} ${top + 36} L${bl + 14} ${bot - 54}" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".45"/>
    <path d="M${L + 42} ${top + 50} L${bl + 32} ${bot - 150}" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".5"/>
    <path d="M${R - 20} ${top + 60} L${br - 14} ${bot - 70}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".28"/>
    <ellipse cx="${cx}" cy="${bot - 7}" rx="${wb / 2 - 5}" ry="10" fill="rgba(255,255,255,.38)"/>
    <text x="${cx}" y="${top + 205}" text-anchor="middle" class="glass-print">Violette</text>
    ${drops}
    <g id="creamTop" opacity="0"></g>
    <ellipse cx="${cx}" cy="${top}" rx="${wt / 2}" ry="11" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="3.5"/>
    <ellipse cx="${cx}" cy="${top}" rx="${wt / 2}" ry="11" fill="none" stroke="rgba(42,20,64,.22)" stroke-width="1.4" transform="translate(0 2.5)"/>
    ${REC.ice ? `<g id="straw" opacity="0"><path d="M${cx + 22} ${bot - 60} L${cx + 70} ${top - 120}" stroke="url(#g-straw)" stroke-width="16" stroke-linecap="round"/><path d="M${cx + 22} ${bot - 60} L${cx + 70} ${top - 120}" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 14" opacity=".55"/></g>` : ''}
    <g id="heroSteam" opacity="0" filter="url(#fx-steam)">${REC.ice ? '' : steam(cx, top - 30, 1.6).replace(/stroke="#9D7BD1"/, 'stroke="#FFFFFF"')}</g>
    <g id="burger">${layersSvg}</g>
    <g class="sparkle" id="sparkles" opacity="0">${[[900, 380], [560, 400], [920, 520], [560, 280]].map(([x, yy], i) => `<path style="--d:${i * .3}s" d="M${x} ${yy - 14} l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#F4B731"/>`).join('')}</g>
    <g id="sticker" opacity="0" transform="translate(500 405)"><g class="st-in">
      <path d="${Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 62 : 70; return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; }).join(' ')}z" fill="url(#g-sticker)" filter="url(#fx-soft)"/>
      <circle r="52" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 5" opacity=".7"/>
      <text class="st-pct" y="10" text-anchor="middle">−${PAIR.pct}%</text><text class="st-lbl" y="34" text-anchor="middle" id="stLbl"></text></g></g>`;
  if (scale < 1) $('#burger', scene).setAttribute('transform', `translate(${BURGER.cx} ${BURGER.base}) scale(${scale}) translate(${-BURGER.cx} ${-BURGER.base})`);
}
function fitScene() { scene.setAttribute('viewBox', innerWidth <= 960 ? '160 150 840 560' : '0 0 1200 800'); }
const stageKeys = ['hero.s0', 'hero.s1', 'hero.s2', 'hero.s3', 'hero.s4', 'hero.s5', 'hero.s6'];
let stageIdx = -1, heroP = -1;
function setAttrs(el: Element, a: Record<string, number | string>) { for (const k in a) el.setAttribute(k, String(a[k])); }
function updateHero(p: number) {
  if (Math.abs(p - heroP) < .0005) return; heroP = p;
  const { cx, top, bot, wt, wb } = GLASS;
  const floor = bot + 6, inner = bot - top - 24;
  const pour = clamp((p - .03) / .3);
  // each layer pours in turn, in proportion to its share of the glass
  const total = REC.layers.reduce((a, l) => a + l.f, 0);
  let acc = 0, yy = floor, curC = REC.layers[0].c;
  REC.layers.forEach((l, i) => {
    const s0 = acc / total, s1 = (acc + l.f) / total; acc += l.f;
    const k = clamp((pour - s0) / (s1 - s0));
    if (k > 0 && k < 1) curC = l.c;
    const h = inner * l.f * k; yy -= h;
    setAttrs($('#lq' + i, scene), { y: yy, height: Math.max(0, h + (h > 0 ? 2 : 0)) });
  });
  const foamH = inner * REC.foam * ease(clamp((p - .33) / .05));
  yy -= foamH; setAttrs($('#lqFoam', scene), { y: yy, height: Math.max(0, foamH + (foamH > 0 ? 2 : 0)) });
  const surface = yy;
  setAttrs($('#lqShade', scene), { y: surface, height: Math.max(0, floor - surface) });
  const filled = surface < floor - 3;
  const rx = (wb + (wt - wb) * ((bot - surface) / (bot - top))) / 2 - 5, ry = Math.max(4, rx * .13);
  const foamy = foamH > 1;
  const topLayer = REC.layers[REC.layers.length - 1];
  const topCol = foamy ? '#F7ECE0' : pour < 1 ? curC : topLayer.c;
  const hk = ease(clamp((p - .35) / .05));
  const wob = pour > 0 && pour < 1 ? Math.sin(p * 120) * 2 : 0;
  $('#surfaceTop', scene).innerHTML = filled && !REC.ice ? `<ellipse cx="${cx}" cy="${surface + wob}" rx="${rx}" ry="${ry}" fill="${topCol}"${foamy ? ' filter="url(#fx-foam)"' : ''}/>
    <ellipse cx="${cx}" cy="${surface + wob}" rx="${rx}" ry="${ry}" fill="none" stroke="#6B4630" stroke-opacity=".25" stroke-width="2.5"/>
    ${hk > 0 && REC.art ? `<g opacity="${hk}" transform="translate(0 ${surface}) scale(1 ${.3 * hk}) translate(0 ${-surface})">${latteArt(REC.art, cx, surface, 2.6, REC.artC ?? '#B07A50')}</g>` : ''}
    <ellipse cx="${cx - rx * .4}" cy="${surface - ry * .3}" rx="${rx * .28}" ry="${ry * .25}" fill="#fff" opacity=".4"/>` : '';
  if (REC.ice) {
    $$('.hice', scene).forEach((g, i) => { const k = ease(clamp((p - .3 - i * .012) / .05)); g.setAttribute('opacity', String(k)); (g as unknown as SVGGElement).style.translate = `0 ${(1 - k) * -360}px`; });
    $('#straw', scene)?.setAttribute('opacity', String(ease(clamp((p - .36) / .04))));
  }
  const cr = $('#creamTop', scene);
  if (REC.cream) {
    const k = ease(clamp((p - .33) / .06));
    cr.setAttribute('opacity', String(k));
    cr.innerHTML = `<g transform="translate(0 ${(1 - k) * -40})"><g filter="url(#fx-soft)"><path d="M${cx - 86} ${surface + 6} q-12 -34 28 -44 q2 -40 46 -34 q24 -28 46 0 q44 -6 46 34 q40 10 28 44z" fill="url(#g-cream)"/></g>
      <path d="M${cx - 58} ${surface - 16} q34 -16 70 -4 M${cx - 34} ${surface - 42} q26 -12 52 0" fill="none" stroke="#E2CDB0" stroke-width="2.6" stroke-linecap="round"/>
      ${REC.dust ? Array.from({ length: 30 }, (_, i) => `<circle cx="${cx - 70 + ((i * 37) % 140)}" cy="${surface - 30 + ((i * 13) % 34)}" r="${1 + (i % 3) * .6}" fill="${REC.dust}"/>`).join('') : ''}</g>`;
  }
  const streaming = pour > 0 && pour < 1;
  const sw = streaming ? 13 + Math.sin(p * 90) * 1.5 : 0;
  setAttrs($('#stream', scene), { height: streaming ? Math.max(0, surface + 4) : 0, fill: curC, width: sw, x: cx - sw / 2 });
  setAttrs($('#streamHi', scene), { height: streaming ? Math.max(0, surface + 4) : 0, width: sw, x: cx - sw / 2 });
  $('#splash', scene).innerHTML = streaming ? [-34, -14, 12, 32].map((d, i) => `<circle cx="${cx + d + Math.sin(p * 90 + i) * 6}" cy="${surface - 4 - Math.abs(Math.sin(p * 70 + i * 2)) * 16}" r="${3 + (i % 2) * 2}" fill="${curC}" opacity=".9"/>`).join('') : '';
  $('#heroSteam', scene).setAttribute('opacity', String(clamp((p - .36) / .06) * .85));
  // burger: each layer drops in with a soft landing
  const n = BURGER.layers.length, gap = .3 / n;
  $$('.bl', scene).forEach((g, i) => {
    const start = .4 + i * gap, k = clamp((p - start) / .075);
    let dy: number, sq = 1;
    if (k < .72) { const f = k / .72; dy = -760 * (1 - f * f); }
    else { const f = (k - .72) / .28; dy = -18 * Math.sin(Math.PI * f) * (1 - f * .4); sq = 1 - .1 * Math.sin(Math.PI * Math.min(1, f * 2)) * (1 - f); }
    if (k <= 0) dy = -900;
    const yb = burgerY[i] + 30;
    g.setAttribute('transform', `translate(0 ${dy})`);
    (g.firstElementChild as SVGGElement).setAttribute('transform', `translate(${BURGER.cx} ${yb}) scale(${2 - sq} ${sq}) translate(${-BURGER.cx} ${-yb})`);
    g.setAttribute('opacity', k <= 0 ? '0' : '1');
  });
  const done = clamp((p - (.4 + (n - 1) * gap + .075)) / .04);
  $('#sparkles', scene).setAttribute('opacity', String(done));
  const sk = clamp((p - .74) / .06);
  const stk = $('#sticker', scene);
  stk.setAttribute('opacity', String(Math.min(1, sk * 2)));
  ($('.st-in', stk) as unknown as SVGGElement).setAttribute('transform', `scale(${sk <= 0 ? .2 : .2 + .8 * easeBackOut(sk)}) rotate(${(1 - sk) * -40 - 12})`);
  $('#disc', scene).setAttribute('r', String(330 + p * 30));
  $('#discRing', scene).setAttribute('transform', `rotate(${p * 90} 520 440)`);
  // receipt
  const rk = clamp((p - .76) / .18);
  const paper = $('#rcPaper');
  paper.style.setProperty('--k', String(rk));
  $('#receipt').classList.toggle('on', rk > 0);
  $$('.rc-row', paper).forEach((r, i, arr) => r.classList.toggle('in', rk > (i + 1) / (arr.length + 1)));
  const st = p < .03 ? 0 : pour < .2 ? 1 : pour < 1 ? 2 : p < .4 ? 3 : p < .74 ? 4 : p < .94 ? 5 : 6;
  if (st !== stageIdx) { stageIdx = st; $('#heroStage').textContent = st === 1 ? tf('hero.s1', { d: HL.name[state.lang] }) : t(stageKeys[st]); }
}
function easeBackOut(t: number) { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
function renderReceipt() {
  const now = tashkentNow();
  const full = setFull(PAIR.drink, PAIR.burger), price = setPrice(PAIR.drink, PAIR.burger, PAIR.pct);
  const dPrice = HL.price + (HL.sized ? SIZES[1].add : 0);
  $('#rcPaper').innerHTML = `
    <div class="rc-row rc-title">${t('rc.title')}</div>
    <div class="rc-row rc-meta"><span>${ddmmyyyy(now)}</span><span>${hhmm(now)}</span></div>
    <div class="rc-row"><span>${esc(HL.name[state.lang])}${HL.sized ? ' M' : ''}</span><span>${money(dPrice)}</span></div>
    <div class="rc-row"><span>${esc(HB.name[state.lang])}</span><span>${money(HB.price)}</span></div>
    <div class="rc-row rc-disc"><span>${tf('rc.disc', { p: PAIR.pct })}</span><span>−${money(full - price)}</span></div>
    <div class="rc-row rc-total"><span>${t('rc.total')}</span><span>${money(price)}</span></div>
    <div class="rc-row rc-bar" aria-hidden="true">${Array.from({ length: 34 }, (_, i) => `<i style="width:${1 + ((i * 7) % 4)}px"></i>`).join('')}</div>
    <div class="rc-row rc-thanks">${t('rc.thanks')}</div>`;
  $('#heroComboPrice').innerHTML = `<s>${money(full)}</s> ${money(price)}`;
  $('#heroPairName').textContent = `${HL.name[state.lang]} + ${HB.name[state.lang]}`;
  const lbl = $('#stLbl', scene); if (lbl) lbl.textContent = t('hero.badge');
  scene.setAttribute('aria-label', `${HL.name[state.lang]} + ${HB.name[state.lang]}`);
  stageIdx = -1; const p = heroP; heroP = -1; updateHero(Math.max(0, p));
}
$('#heroCombo').addEventListener('click', e => {
  addLine({ kind: 'set', set: { ...PAIR } }, 1, e.currentTarget as Element);
  toast(`${t('set.name')}: ${HL.name[state.lang]} + ${HB.name[state.lang]} — ${t('card.added').toLowerCase()}`);
});
const hero = $('#top');
function heroProgress() {
  if (reduced) return 1;
  const r = hero.getBoundingClientRect();
  const span = hero.offsetHeight - innerHeight;
  return span > 0 ? clamp(-r.top / span) : 1;
}

/* =============== tape =============== */
function renderTape() {
  const words = ['Violette latte', 'Lavash', 'Cheesecake', 'Double beef', 'Raf', 'Hot-dog', 'Medovik', 'Iced Violette', 'Fri'];
  const seq = words.map((w, i) => `<span class="${i % 2 ? 'tw-a' : 'tw-b'}">${w}</span><svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7" ry="10"/><path d="M12 3c-4 5 4 13 0 18" fill="none" stroke-width="1.8"/></svg>`).join('');
  $('#tape').innerHTML = seq + seq + seq;
}

/* =============== menu =============== */
let world: World = tashkentNow().getHours() < 12 ? 'coffee' : 'food';
const view = { cat: 'all' as 'all' | CatId | 'fav', q: '' };
type Diet = 'veg' | 'noNuts' | 'noGluten' | 'noLactose' | 'spicy';
const DIETS: Diet[] = ['veg', 'noNuts', 'noGluten', 'noLactose', 'spicy'];
const diet = new Set<Diet>();
const favs = new Set<string>(((store.get('vc-favs') as unknown[]) ?? []).filter((x): x is string => typeof x === 'string' && !!ITEM(x)));
const saveFavs = () => store.set('vc-favs', [...favs]);
const dietOK = (i: Item) => {
  const a = allergens(i);
  return (!diet.has('veg') || isVeg(i)) && (!diet.has('spicy') || isSpicy(i)) && (!diet.has('noNuts') || !a.includes('nuts')) && (!diet.has('noGluten') || !a.includes('gluten')) && (!diet.has('noLactose') || !a.includes('lactose'));
};
const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’]/g, '').replace(/ё/g, 'е');
function visibleItems(): Item[] {
  const q = norm(view.q.trim());
  let list = ITEMS.filter(i => (q || view.cat === 'fav' ? true : CATS.find(c => c.id === i.cat)!.world === world));
  if (!q && view.cat === 'fav') list = list.filter(i => favs.has(i.id));
  else if (!q && view.cat !== 'all') list = list.filter(i => i.cat === view.cat);
  list = list.filter(dietOK);
  if (q) list = list.filter(i => (['uz', 'ru', 'en'] as Lang[]).some(l => norm(i.name[l] + ' ' + i.desc[l]).includes(q)));
  return list.sort((a, b) => b.pop - a.pop);
}
function renderChips() {
  const cats = CATS.filter(c => c.world === world);
  if (view.cat === 'fav' && !favs.size) view.cat = 'all';
  $('#chips').innerHTML = [`<button role="tab" data-cat="all" aria-selected="${view.cat === 'all'}">${t('menu.all')}</button>`,
    ...(favs.size ? [`<button role="tab" data-cat="fav" class="chip-fav" aria-selected="${view.cat === 'fav'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>${t('fav.chip')} <small>${favs.size}</small></button>`] : []),
    ...cats.map(c => `<button role="tab" data-cat="${c.id}" aria-selected="${view.cat === c.id}">${esc(c.name[state.lang])}</button>`)].join('');
  renderDiet(); renderLast();
  $('#chips').classList.toggle('dim', !!view.q.trim());
}
function renderDiet() {
  $('#diets').innerHTML = DIETS.map(d => `<button type="button" data-diet="${d}" aria-pressed="${diet.has(d)}"><i class="dot dot-${d}"></i>${t('diet.' + d)}</button>`).join('');
}
function renderLast() {
  const last = store.get('vc-last') as { at?: number; n?: number; total?: number } | null;
  const btn = $('#repeatLast');
  btn.hidden = !last || !last.n;
  if (last && last.n) btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t('last.chip')} <small>${last.at ? ddmmyyyy(new Date(last.at)) : ''} · ${money(last.total ?? 0)}</small>`;
}
const allergenHTML = (i: Item) => { const a = allergens(i); return (isVeg(i) ? `<i class="dt dt-veg" title="${t('diet.veg')}">V</i>` : '') + a.map(x => `<i class="dt dt-${x}" title="${t('diet.' + x)}">${{ nuts: 'N', gluten: 'G', lactose: 'L' }[x]}</i>`).join(''); };
const tagHTML = (tags: Item['tags'] = []) => tags.map(g => `<span class="tag tag-${g}">${t('tag.' + g)}</span>`).join('');
function cardHTML(i: Item, k: number) {
  const hot = i.art.k === 'drink' && ['cup', 'small', 'pot'].includes(i.art.d.v);
  return `<article class="card${hot ? ' hot' : ''}" data-id="${i.id}" data-sr="card" style="--k:${k}">
    <button class="card-hit" data-open="${i.id}" aria-label="${esc(i.name[state.lang])} — ${t('card.open')}"></button>
    <div class="card-art">${itemPic(i, 520, i.name[state.lang])}</div>
    <div class="card-tags">${tagHTML(i.tags)}</div>
    <button class="fav" data-fav="${i.id}" aria-pressed="${favs.has(i.id)}" aria-label="${t(favs.has(i.id) ? 'fav.remove' : 'fav.add')}: ${esc(i.name[state.lang])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>
    <h3>${esc(i.name[state.lang])}</h3>
    <p class="card-desc">${esc(i.desc[state.lang])}</p>
    <div class="card-foot">
      <span class="card-meta">${i.kcal} ${t('card.kcal')} · ${i.prep} ${t('card.min')} <span class="dts">${allergenHTML(i)}</span></span>
      <b class="price">${money(i.price)}</b>
      <button class="add" data-add="${i.id}" aria-label="${t('card.add')}: ${esc(i.name[state.lang])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
    </div>
  </article>`;
}
function renderGrid() {
  const list = visibleItems();
  $('#grid').innerHTML = list.map(cardHTML).join('');
  const empty = $('#empty');
  empty.hidden = list.length > 0;
  if (!list.length) empty.textContent = view.q.trim() ? tf('menu.empty', { q: view.q.trim() }) : view.cat === 'fav' && !diet.size ? t('fav.empty') : t('menu.emptyFilter');
  if (finePointer && !reduced) $$('.card', $('#grid')).forEach(attachTilt);
}
function attachTilt(el: HTMLElement) {
  const art = $('.card-art', el);
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    art.style.transform = `translate(${x * 14}px, ${y * 10 - 6}px) rotate(${x * 6}deg) scale(1.04)`;
  });
  el.addEventListener('pointerleave', () => { art.style.transform = ''; });
}
function setWorldUI() {
  root.dataset.world = world;
  $$('.world button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.world === world)));
}
const wipePath = $<SVGPathElement>('#wipePath');
let wiping = false;
function wavePath(yTop: number, yBot: number, ph: number) {
  const seg = (y: number, dir: 1 | -1) => { let d = ''; for (let i = 0; i <= 10; i++) { const x = dir === 1 ? i * 10 : 100 - i * 10; const yy = y + Math.sin(i * .9 + ph) * 3.2; d += `${i === 0 ? (dir === 1 ? 'M' : 'L') : 'L'}${x} ${yy} `; } return d; };
  return seg(yTop, 1) + seg(yBot, -1) + 'Z';
}
function switchWorld(next: World) {
  if (next === world || wiping) return;
  if (reduced) { world = next; view.cat = 'all'; setWorldUI(); renderChips(); renderGrid(); return; }
  wiping = true;
  const wipe = $('#wipe');
  wipe.style.setProperty('--wc', next === 'coffee' ? 'var(--violet)' : 'var(--ketchup)');
  wipe.classList.add('on');
  const t0 = performance.now(), D1 = 520, D2 = 560;
  let swapped = false;
  const tick = (now: number) => {
    const e = now - t0;
    if (e < D1) { const k = ease(e / D1); wipePath.setAttribute('d', wavePath(124 - k * 140, 130, e / 90)); }
    else {
      if (!swapped) {
        swapped = true; world = next; view.cat = 'all'; setWorldUI(); renderChips(); renderGrid();
        const top = $('#menuSec').getBoundingClientRect().top;
        if (top < -10 || top > innerHeight * .5) scrollTo({ top: scrollY + top - 70, behavior: 'instant' as ScrollBehavior });
      }
      const k = ease(Math.min(1, (e - D1) / D2));
      wipePath.setAttribute('d', wavePath(-20, 130 - k * 150, e / 90));
      if (k >= 1) { wipe.classList.remove('on'); wiping = false; return; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
$$('.world button').forEach(b => b.addEventListener('click', () => switchWorld(b.dataset.world as World)));
$('.world').addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = world === 'coffee' ? 'food' : 'coffee'; switchWorld(next); $<HTMLButtonElement>(`.world [data-world="${next}"]`).focus(); }
});
$('#chips').addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLElement>('[data-cat]'); if (!b) return;
  view.cat = b.dataset.cat as CatId | 'all' | 'fav';
  if (view.q) { view.q = ''; $<HTMLInputElement>('#q').value = ''; $('#qClear').hidden = true; }
  renderChips(); renderGrid();
});
const qIn = $<HTMLInputElement>('#q');
let qTimer = 0;
qIn.addEventListener('input', () => { $('#qClear').hidden = !qIn.value; clearTimeout(qTimer); qTimer = window.setTimeout(() => { view.q = qIn.value; renderChips(); renderGrid(); }, 140); });
$('#qClear').addEventListener('click', () => { qIn.value = ''; view.q = ''; $('#qClear').hidden = true; renderChips(); renderGrid(); qIn.focus(); });
$('#grid').addEventListener('click', e => {
  const target = e.target as Element;
  const fv = target.closest<HTMLElement>('[data-fav]');
  if (fv) {
    const id = fv.dataset.fav!, on = !favs.has(id);
    on ? favs.add(id) : favs.delete(id); saveFavs();
    fv.setAttribute('aria-pressed', String(on));
    fv.setAttribute('aria-label', `${t(on ? 'fav.remove' : 'fav.add')}: ${ITEM(id)!.name[state.lang]}`);
    fv.classList.remove('pop'); void fv.offsetWidth; fv.classList.add('pop');
    if (on) toast(t('fav.added'));
    renderChips();
    if (view.cat === 'fav' && !on) renderGrid();
    return;
  }
  const add = target.closest<HTMLElement>('[data-add]');
  if (add) {
    const it = ITEM(add.dataset.add!)!;
    addLine({ kind: 'item', item: it.id, size: it.sized ? 'M' : undefined, extras: [] }, 1, add.closest('.card')!.querySelector('.card-art'));
    add.classList.remove('pop'); void add.offsetWidth; add.classList.add('pop');
    toast(`${it.name[state.lang]} — ${t('card.added').toLowerCase()}`);
    return;
  }
  const open = target.closest<HTMLElement>('[data-open]');
  if (open) openItem(open.dataset.open!);
});

/* =============== item dialog =============== */
const im = { id: '', size: 'M' as Size, extras: new Set<ExtraId>(), qty: 1 };
function imPrice() {
  const it = ITEM(im.id)!;
  return (it.price + (it.sized ? SIZES.find(s => s.id === im.size)!.add : 0) + [...im.extras].reduce((a, e) => a + EXTRAS[e].price, 0)) * im.qty;
}
function renderItem() {
  const it = ITEM(im.id)!;
  $('#imArt').innerHTML = itemPic(it, 760, it.name[state.lang], true);
  $('#imTags').innerHTML = tagHTML(it.tags);
  $('#imName').textContent = it.name[state.lang];
  $('#imDesc').textContent = it.desc[state.lang];
  $('#imMeta').textContent = `${tf('im.kcal', { k: it.kcal })} · ${tf('im.prep', { m: it.prep })}`;
  const al = allergens(it);
  $('#imDiet').innerHTML = `<span class="dts">${allergenHTML(it)}</span>${isVeg(it) ? `<b>${t('diet.veg')}</b>` : ''}${al.length ? `<span>${tf('diet.has', { list: al.map(a => t('diet.' + a)).join(', ') })}</span>` : `<span>${t('diet.free')}</span>`}<small>${t('diet.note')}</small>`;
  $('#imSizes').innerHTML = it.sized ? `<h4>${t('im.size')}</h4><div class="seg" role="radiogroup">${SIZES.map(s => `<button type="button" role="radio" data-size="${s.id}" aria-checked="${im.size === s.id}"><b>${s.id}</b><small>${s.ml} ml${s.add ? ` · +${money(s.add)}` : ''}</small></button>`).join('')}</div>` : '';
  $('#imExtras').innerHTML = it.extras?.length ? `<h4>${t('im.extras')}</h4><div class="extras">${it.extras.map(x => `<label class="check"><input type="checkbox" data-extra="${x}" ${im.extras.has(x) ? 'checked' : ''}><i></i><span>${esc(EXTRAS[x].name[state.lang])}</span><small>+${money(EXTRAS[x].price)}</small></label>`).join('')}</div>` : '';
  $('output', $('#imQty')).textContent = String(im.qty);
  $('#imPrice').textContent = money(imPrice());
}
function openItem(id: string) {
  im.id = id; im.size = 'M'; im.extras = new Set(); im.qty = 1;
  renderItem(); openOverlay($('#itemModal'));
}
$('#itemModal').addEventListener('click', e => {
  const tg = e.target as Element;
  if (tg.closest('[data-close]')) { closeOverlay($('#itemModal')); return; }
  const s = tg.closest<HTMLElement>('[data-size]');
  if (s) { im.size = s.dataset.size as Size; renderItem(); $<HTMLElement>(`[data-size="${im.size}"]`, $('#itemModal')).focus(); }
  const d = tg.closest<HTMLElement>('#imQty [data-d]');
  if (d) { im.qty = clamp(im.qty + Number(d.dataset.d), 1, 20); $('output', $('#imQty')).textContent = String(im.qty); $('#imPrice').textContent = money(imPrice()); }
});
$('#itemModal').addEventListener('change', e => {
  const c = e.target as HTMLInputElement;
  if (c.dataset.extra) { c.checked ? im.extras.add(c.dataset.extra as ExtraId) : im.extras.delete(c.dataset.extra as ExtraId); $('#imPrice').textContent = money(imPrice()); }
});
$('#imAdd').addEventListener('click', () => {
  const it = ITEM(im.id)!;
  addLine({ kind: 'item', item: it.id, size: it.sized ? im.size : undefined, extras: [...im.extras] }, im.qty, $('#imArt'));
  toast(`${it.name[state.lang]} — ${t('card.added').toLowerCase()}`);
  closeOverlay($('#itemModal'));
});

/* =============== cart drawer =============== */
const PCOL = ['#7A4FB0', '#E2452F', '#F4B731', '#3E8E6A', '#3E6FB8', '#C2185B', '#8A5A3B', '#4B4F5C'];
const split = { on: false, n: 2 };
function eta(): Date {
  const prep = cart.length ? Math.max(...cart.map(linePrep)) : 0;
  const load = Math.min(10, Math.floor(count() / 4) * 2);
  const ride = order.method === 'delivery' ? (ZONES.find(z => z.id === order.zone) ?? ZONES[0]).mins : 0;
  return new Date(tashkentNow().getTime() + (prep + 5 + load + ride) * 60000);
}
function renderCart() {
  const c = count();
  const badge = $('#cartCount');
  badge.hidden = c === 0; badge.textContent = String(c);
  $('#cartBtn').setAttribute('aria-label', `${t('aria.cart')}: ${c}`);
  const empty = cart.length === 0;
  $('#cartEmpty').hidden = !empty; $('#cartFoot').hidden = empty; $('#split').hidden = cart.length < 1;
  $('#lines').innerHTML = cart.map((l, i) => `<li class="line" data-i="${i}">
      <div class="ln-art">${lineVisual(l, 140)}</div>
      <div class="ln-main"><b>${esc(lineName(l))}</b><small>${esc(lineSub(l))}</small>
        <div class="ln-row">
          <div class="stepper sm"><button type="button" data-q="-1" aria-label="${t('aria.less')}">−</button><output>${l.qty}</output><button type="button" data-q="1" aria-label="${t('aria.more')}">+</button></div>
          <span class="ln-price">${money(unitPrice(l) * l.qty)}</span>
        </div>
      </div>
      ${split.on ? `<button type="button" class="who" data-who style="--pc:${l.who >= 0 && l.who < split.n ? PCOL[l.who] : 'transparent'}" aria-label="${l.who >= 0 && l.who < split.n ? tf('split.pays', { n: l.who + 1 }) : t('split.shared')}">${l.who >= 0 && l.who < split.n ? l.who + 1 : '∗'}</button>` : ''}
      <button type="button" class="rm" data-rm aria-label="${t('aria.remove')}">×</button>
    </li>`).join('');
  $('#cartSub').textContent = money(subtotal());
  const near = ZONES[0], sub = subtotal(), toFree = Math.max(0, near.freeFrom - sub);
  $('#cartDeliv').innerHTML = `<div class="dv-row"><span>${t('cart.delivery')}</span><b>${toFree ? tf('cart.delivFrom', { s: money(Math.min(...ZONES.map(z => z.fee))) }) : t('rv.free')}</b></div>
    <div class="dv-bar"><i style="width:${Math.min(100, (sub / near.freeFrom) * 100)}%"></i></div>
    <small>${toFree ? tf('cart.toFree', { s: money(toFree) }) : t('cart.freeOk')} · ${t('cart.pickupFree')}</small>`;
  const last = store.get('vc-last') as { n?: number; total?: number; at?: number } | null;
  $('#cartLast').hidden = !last || !last.n;
  if (last && last.n) $('#cartLast').innerHTML = `<div><b>${t('last.title')}</b><small>${last.at ? ddmmyyyy(new Date(last.at)) + ' · ' : ''}${last.n} ${plural(last.n, 'items')} · ${money(last.total ?? 0)}</small></div><button type="button" class="btn btn-mini" data-repeat>${t('last.repeat')}</button>`;
  $('#cartEta').textContent = tf('cart.eta', { t: hhmm(eta()) });
  renderSplit(); renderStamps();
}
function splitShares(): number[] {
  const shares = Array(split.n).fill(0);
  let shared = 0;
  cart.forEach(l => { const v = unitPrice(l) * l.qty; if (l.who >= 0 && l.who < split.n) shares[l.who] += v; else shared += v; });
  return shares.map(s => s + shared / split.n);
}
function renderSplit() {
  $<HTMLInputElement>('#splitOn').checked = split.on;
  $('#splitBody').hidden = !split.on;
  $('output', $('#splitN')).textContent = String(split.n);
  if (!split.on) return;
  $('#splitRes').innerHTML = splitShares().map((s, i) => `<div style="--pc:${PCOL[i]}"><i>${i + 1}</i><b>${money(Math.ceil(s / 500) * 500)}</b></div>`).join('');
}
function renderStamps() {
  const k = Number(store.get('vc-stamps')) || 0;
  const have = k % STAMPS_FOR_GIFT;
  const gift = k > 0 && have === 0;
  $('#stamps').innerHTML = `<div class="st-head"><b>${t('stamps.title')}</b><small>${gift ? t('stamps.gift') : tf('stamps.text', { n: STAMPS_FOR_GIFT, k: have })}</small></div>
    <div class="st-cups">${Array.from({ length: STAMPS_FOR_GIFT }, (_, i) => `<span class="${gift || i < have ? 'got' : ''}${i === STAMPS_FOR_GIFT - 1 ? ' gift' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h12v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6z M17 10h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>`).join('')}</div>`;
}
$('#cartBtn').addEventListener('click', () => { renderCart(); openOverlay($('#cart')); });
$('#cart').addEventListener('click', e => {
  const tg = e.target as Element;
  if (tg.closest('[data-close]')) { closeOverlay($('#cart')); return; }
  if (tg.closest('[data-repeat]')) { repeatLast(); return; }
  const li = tg.closest<HTMLElement>('.line');
  if (li) {
    const i = Number(li.dataset.i), l = cart[i];
    const q = tg.closest<HTMLElement>('[data-q]');
    if (q) { l.qty = clamp(l.qty + Number(q.dataset.q), 1, 30); saveCart(); return; }
    if (tg.closest('[data-who]')) { l.who = l.who + 1 >= split.n ? -1 : l.who + 1; saveCart(); $<HTMLElement>(`.line[data-i="${i}"] [data-who]`)?.focus(); return; }
    if (tg.closest('[data-rm]')) {
      const done = () => { setCart(cart.filter((_, k) => k !== i)); toast(t('cart.removed')); const next = $<HTMLElement>('#lines .rm') ?? $<HTMLElement>('#cart .x'); next?.focus(); };
      if (reduced) done(); else { li.classList.add('out'); setTimeout(done, 260); }
    }
  }
  const sn = tg.closest<HTMLElement>('#splitN [data-d]');
  if (sn) { split.n = clamp(split.n + Number(sn.dataset.d), 2, 8); renderCart(); }
});
function repeatLast() {
  const last = store.get('vc-last') as { lines?: unknown } | null;
  const n = addSavedLines(last?.lines);
  toast(n ? t('last.added') : t('last.none'));
}
$('#repeatLast').addEventListener('click', e => { repeatLast(); const b = e.currentTarget as HTMLElement; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
$('#diets').addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLElement>('[data-diet]'); if (!b) return;
  const d = b.dataset.diet as Diet; diet.has(d) ? diet.delete(d) : diet.add(d);
  if (d === 'veg' && diet.has('veg')) diet.delete('spicy');
  if (d === 'spicy' && diet.has('spicy')) diet.delete('veg');
  renderDiet(); renderGrid();
  $<HTMLElement>(`[data-diet="${d}"]`).focus();
});
$('#splitOn').addEventListener('change', e => { split.on = (e.target as HTMLInputElement).checked; renderCart(); });
$('#toCheckout').addEventListener('click', () => { closeOverlay($('#cart')); openCheckout(); });
on('cart', renderCart);

/* =============== checkout =============== */
type Method = 'delivery' | 'pickup' | 'table';
const params = new URLSearchParams(location.search);
const tableParam = (params.get('stol') ?? params.get('table') ?? '').replace(/\D/g, '').slice(0, 3);
const saved = (store.get('vc-contact') ?? {}) as Record<string, string>;
const order = {
  step: 1, method: (tableParam ? 'table' : 'pickup') as Method, zone: 'near', table: tableParam,
  name: typeof saved.name === 'string' ? saved.name.slice(0, 60) : '', phone: typeof saved.phone === 'string' ? saved.phone.replace(/\D/g, '').slice(0, 9) : '',
  address: typeof saved.address === 'string' ? saved.address.slice(0, 160) : '', time: 'asap', payment: 'cash', comment: '',
};
const phoneDigits = (raw: string) => { let d = raw.replace(/\D/g, ''); if (d.length > 9 && d.startsWith('998')) d = d.slice(3); return d.slice(0, 9); };
const fmtPhone = (raw: string) => { const d = phoneDigits(raw); return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' '); };
function bindPhone(el: HTMLInputElement) {
  el.addEventListener('input', () => {
    const before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;
    el.value = fmtPhone(el.value);
    let pos = 0, seen = 0; while (pos < el.value.length && seen < before) { if (/\d/.test(el.value[pos])) seen++; pos++; }
    el.setSelectionRange(pos, pos);
  });
}
const deliveryFee = () => { if (order.method !== 'delivery') return 0; const z = ZONES.find(z => z.id === order.zone) ?? ZONES[0]; return subtotal() >= z.freeFrom ? 0 : z.fee; };
const orderTotal = () => subtotal() + deliveryFee();
function timeSlots(): string[] {
  const now = tashkentNow();
  const lead = order.method === 'delivery' ? 45 : 20;
  const start = new Date(now.getTime() + lead * 60000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const out: string[] = [];
  for (let d = new Date(start); out.length < 9; d = new Date(d.getTime() + 15 * 60000)) {
    const h = d.getHours() + d.getMinutes() / 60;
    if (d.getDate() !== now.getDate() || h >= CAFE.close || h < CAFE.open) break;
    out.push(hhmm(d));
  }
  return out;
}
function renderCheckout() {
  $$('#coSteps li').forEach((li, i) => { li.classList.toggle('on', i + 1 === order.step); li.classList.toggle('done', i + 1 < order.step); });
  $$('.co-step').forEach(s => (s.hidden = Number(s.dataset.step) !== order.step));
  $('#coBack').hidden = order.step === 1;
  $('#coNext').textContent = order.step === 3 ? t('co.send') : t('co.next');
  $('#coErr').textContent = '';
  if (order.step === 1) {
    const how: Method[] = ['pickup', 'delivery', 'table'];
    const ico: Record<Method, string> = {
      pickup: '<path d="M6 8h12l-1 12H7z M9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
      delivery: '<path d="M3 16V7h11v9 M14 10h4l3 3v3h-7 M7 18.5a1.5 1.5 0 1 0 0-.01 M17 18.5a1.5 1.5 0 1 0 0-.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
      table: '<path d="M4 9h16 M7 9v10 M17 9v10 M10 5h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    };
    $('#coHow').innerHTML = how.map(m => `<button type="button" role="radio" data-how="${m}" aria-checked="${order.method === m}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico[m]}</svg><b>${t('how.' + m)}</b><small>${t('how.' + m + 'D')}</small></button>`).join('');
    const x = $('#coHowExtra');
    if (order.method === 'delivery') x.innerHTML = `<h4>${t('how.zone')}</h4><div class="zones" role="radiogroup">${ZONES.map(z => `<button type="button" role="radio" data-zone="${z.id}" aria-checked="${order.zone === z.id}"><b>${esc(z.name[state.lang])}</b><small>${money(z.fee)} · ${tf('how.free', { s: money(z.freeFrom) })} · ~${z.mins} ${t('card.min')}</small></button>`).join('')}</div>`;
    else if (order.method === 'table') x.innerHTML = `<label class="field"><span>${t('how.tableNo')}</span><input id="coTable" inputmode="numeric" maxlength="3" value="${esc(order.table)}"></label>`;
    else x.innerHTML = '';
  }
  if (order.step === 2) {
    $<HTMLInputElement>('#coName').value = order.name;
    $<HTMLInputElement>('#coPhone').value = fmtPhone(order.phone);
    $<HTMLInputElement>('#coAddr').value = order.address;
    $<HTMLInputElement>('#coComment').value = order.comment;
    $('#coAddrWrap').hidden = order.method !== 'delivery';
    $('#coTimeWrap').hidden = order.method === 'table';
    $('#coTimeLabel').textContent = t(order.method === 'delivery' ? 'time.delivery' : 'time.pickup');
    const slots = timeSlots();
    if (order.time !== 'asap' && !slots.includes(order.time)) order.time = 'asap';
    $('#coTimes').innerHTML = ['asap', ...slots].map(s => `<button type="button" role="radio" data-time="${s}" aria-checked="${order.time === s}">${s === 'asap' ? t('time.asap') : s}</button>`).join('');
    $('#coPay').innerHTML = ['cash', 'card', 'click'].map(p => `<button type="button" role="radio" data-pay="${p}" aria-checked="${order.payment === p}">${t('pay.' + p)}</button>`).join('') ;
  }
  if (order.step === 3) {
    const fee = deliveryFee();
    const howLine = order.method === 'table' ? `${t('how.table')} · ${order.table}` : order.method === 'delivery' ? `${t('how.delivery')} · ${(ZONES.find(z => z.id === order.zone) ?? ZONES[0]).name[state.lang]}` : t('how.pickup');
    $('#coReview').innerHTML = `
      <h4>${t('rv.items')}</h4>
      <ul>${cart.map(l => `<li><span>${l.qty} × ${esc(lineName(l))}${lineSub(l) ? `<small>${esc(lineSub(l))}</small>` : ''}</span><b>${money(unitPrice(l) * l.qty)}</b></li>`).join('')}</ul>
      <dl>
        <div><dt>${t('rv.how')}</dt><dd>${esc(howLine)}</dd></div>
        ${order.method !== 'table' ? `<div><dt>${t('rv.time')}</dt><dd>${order.time === 'asap' ? `${t('time.asap')} (~${hhmm(eta())})` : order.time}</dd></div>` : ''}
        ${order.method === 'delivery' ? `<div><dt>${t('rv.delivery')}</dt><dd>${fee ? money(fee) : t('rv.free')}</dd></div>` : ''}
        <div><dt>${t('rv.contact')}</dt><dd>${esc(order.name)}, +998 ${fmtPhone(order.phone)}</dd></div>
        <div class="rv-total"><dt>${t('rv.total')}</dt><dd>${money(orderTotal())}</dd></div>
      </dl>
      <p class="hint">${t('pay.note')}</p>`;
  }
}
function captureStep2() {
  order.name = $<HTMLInputElement>('#coName').value.trim();
  order.phone = phoneDigits($<HTMLInputElement>('#coPhone').value);
  order.address = $<HTMLInputElement>('#coAddr').value.trim();
  order.comment = $<HTMLInputElement>('#coComment').value.trim();
}
function openCheckout() {
  if (!cart.length) return;
  order.step = 1;
  $('#coForm').hidden = false; $('#coDone').hidden = true; $('#coSteps').hidden = false;
  renderCheckout(); openOverlay($('#checkout'));
}
$('#checkout').addEventListener('click', e => {
  const tg = e.target as Element;
  if (tg.closest('[data-close]')) { closeOverlay($('#checkout')); return; }
  const h = tg.closest<HTMLElement>('[data-how]'); if (h) { order.method = h.dataset.how as Method; renderCheckout(); $<HTMLElement>(`[data-how="${order.method}"]`).focus(); return; }
  const z = tg.closest<HTMLElement>('[data-zone]'); if (z) { order.zone = z.dataset.zone!; renderCheckout(); $<HTMLElement>(`[data-zone="${order.zone}"]`).focus(); return; }
  const tm = tg.closest<HTMLElement>('[data-time]'); if (tm) { captureStep2(); order.time = tm.dataset.time!; renderCheckout(); $<HTMLElement>(`[data-time="${order.time}"]`).focus(); return; }
  const p = tg.closest<HTMLElement>('[data-pay]'); if (p) { captureStep2(); order.payment = p.dataset.pay!; renderCheckout(); $<HTMLElement>(`[data-pay="${order.payment}"]`).focus(); }
});
$('#checkout').addEventListener('input', e => { const el = e.target as HTMLInputElement; if (el.id === 'coTable') { el.value = el.value.replace(/\D/g, '').slice(0, 3); order.table = el.value; } });
bindPhone($<HTMLInputElement>('#coPhone'));
$('#coBack').addEventListener('click', () => { if (order.step === 2) captureStep2(); order.step = Math.max(1, order.step - 1); renderCheckout(); });
const hasLetters = (s: string) => /\p{L}/u.test(s);
function fail(msg: string, focus?: string) { $('#coErr').textContent = msg; if (focus) $<HTMLElement>(focus)?.focus(); }
$('#coForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (order.step === 1) {
    if (order.method === 'table' && !order.table) return fail(t('err.table'), '#coTable');
    order.step = 2; renderCheckout(); $<HTMLElement>('#coName').focus(); return;
  }
  if (order.step === 2) {
    captureStep2();
    if (order.name.length < 2 || !hasLetters(order.name)) return fail(t('err.name'), '#coName');
    if (order.phone.length !== 9) return fail(t('err.phone'), '#coPhone');
    if (order.method === 'delivery' && order.address.length < 5) return fail(t('err.address'), '#coAddr');
    store.set('vc-contact', { name: order.name, phone: order.phone, address: order.address });
    order.step = 3; renderCheckout(); $<HTMLElement>('#coNext').focus(); return;
  }
  await sendOrder();
});
let sending = false;
async function sendOrder() {
  if (sending || !cart.length) return;
  sending = true;
  const btn = $<HTMLButtonElement>('#coNext');
  btn.disabled = true; btn.textContent = t('co.sending');
  const id = 'V' + Date.now().toString(36).slice(-5).toUpperCase();
  const due = order.method === 'table' || order.time === 'asap' ? hhmm(eta()) : order.time;
  const items = cart.map(l => `${l.qty} × ${lineName(l)}${lineSub(l) ? ` (${lineSub(l)})` : ''} — ${money(unitPrice(l) * l.qty)}${split.on && l.who >= 0 && l.who < split.n ? ` [${l.who + 1}]` : ''}`).join('\n');
  const data: Record<string, string> = {
    'form-name': 'order', 'bot-field': '', order_id: id, method: order.method, table: order.method === 'table' ? order.table : '',
    name: order.name, phone: '+998 ' + fmtPhone(order.phone), address: order.method === 'delivery' ? order.address : '',
    zone: order.method === 'delivery' ? (ZONES.find(z => z.id === order.zone) ?? ZONES[0]).name.uz : '', time: order.time === 'asap' ? `ASAP ~${due}` : order.time,
    payment: order.payment, comment: order.comment, items, split: split.on ? splitShares().map((s, i) => `${i + 1}: ${money(Math.ceil(s / 500) * 500)}`).join('; ') : '',
    subtotal: String(subtotal()), delivery: String(deliveryFee()), total: String(orderTotal()), lang: state.lang,
  };
  const coffees = cart.filter(isCoffeeLine).reduce((a, l) => a + l.qty, 0);
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 12000);
    const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString(), signal: ctl.signal });
    clearTimeout(tm);
    if (!res.ok) throw new Error(String(res.status));
    const prev = Number(store.get('vc-stamps')) || 0;
    store.set('vc-stamps', prev + coffees);
    store.set('vc-last', { at: Date.now(), n: count(), total: subtotal(), lines: cart.map(({ sig: _s, who: _w, ...l }) => l) });
    const made = cart.map(l => ({ ...l }));
    const isDelivery = order.method === 'delivery';
    if (isDelivery) {
      // real timestamps for the tracker: when the courier is due, and when the kitchen has to start to make it
      const zone = ZONES.find(z => z.id === order.zone) ?? ZONES[0];
      const tn = tashkentNow(), [hh, mm] = due.split(':').map(Number), target = new Date(tn); target.setHours(hh, mm, 0, 0);
      if (target.getTime() < tn.getTime() - 60000) target.setDate(target.getDate() + 1);
      const now = Date.now(), dueAt = now + (target.getTime() - tn.getTime());
      const cookMin = Math.max(...made.map(linePrep)) + 5 + Math.min(10, Math.floor(count() / 4) * 2);
      const cooked = Math.max(now + 3 * 60000, dueAt - zone.mins * 60000);
      const start = Math.max(now, cooked - cookMin * 60000);
      startTrack({ id, placed: now, start, cooked, due: dueAt, zone: zone.id, address: order.address, total: orderTotal(), lines: made });
    }
    setCart([]);
    $('#coForm').hidden = true; $('#coSteps').hidden = true;
    const done = $('#coDone');
    done.hidden = false;
    done.innerHTML = `<div class="done-cup" aria-hidden="true">${svg(ITEM('cappuccino')!.art)}</div><h4>${t('done.title')}</h4>
      <p>${tf('done.text', { id, phone: '+998 ' + fmtPhone(order.phone) })}</p><p class="eta-big">${tf('done.eta', { t: due })}</p>
      ${coffees ? `<p class="stamp-plus">${tf('done.stamp', { n: coffees })}</p>` : ''}
      ${isDelivery ? `<button type="button" class="btn btn-ink tk-done-btn" data-track>${t('tr.open')}</button>` : ''}
      <button type="button" class="watch-btn" data-watch><span class="wb-play" aria-hidden="true"></span><span><b>${t('afk.watch')}</b><small>${t('afk.watchSub')}</small></span></button>
      <button class="btn btn-acc" data-close>${t('done.close')}</button>`;
    $('[data-watch]', done).addEventListener('click', () => showOrder(made, due));
    done.querySelector('[data-track]')?.addEventListener('click', () => { closeOverlay($('#checkout')); setTimeout(openTrack, 250); });
    $<HTMLElement>('[data-close].btn', done).focus();
  } catch {
    fail(t('err.send'));
  } finally {
    sending = false; btn.disabled = false; if (order.step === 3) btn.textContent = t('co.send');
  }
}

/* =============== booking =============== */
const bk = { date: '', time: '', guests: 2 };
function renderBooking() {
  const now = tashkentNow();
  const fmt = new Intl.DateTimeFormat(state.lang === 'uz' ? 'uz-UZ' : state.lang === 'ru' ? 'ru-RU' : 'en-GB', { weekday: 'short' });
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) { const d = new Date(now); d.setDate(now.getDate() + i); days.push(d); }
  if (!bk.date) bk.date = ddmmyyyy(days[now.getHours() >= CAFE.close - 2 ? 1 : 0]);
  $('#bkDates').innerHTML = days.map(d => { const v = ddmmyyyy(d); return `<button type="button" role="radio" data-date="${v}" aria-checked="${bk.date === v}"><small>${esc(fmt.format(d))}</small><b>${pad(d.getDate())}/${pad(d.getMonth() + 1)}</b></button>`; }).join('');
  const isToday = bk.date === ddmmyyyy(now);
  const times: string[] = [];
  for (let h = CAFE.open + 1; h <= CAFE.close - 1; h++) for (const m of [0, 30]) { if (h === CAFE.close - 1 && m === 30) continue; if (isToday && h + m / 60 < now.getHours() + now.getMinutes() / 60 + 1) continue; times.push(`${pad(h)}:${pad(m)}`); }
  if (!times.includes(bk.time)) bk.time = '';
  $('#bkTimes').innerHTML = times.map(s => `<button type="button" role="radio" data-btime="${s}" aria-checked="${bk.time === s}">${s}</button>`).join('');
  $('output', $('#bkGuests')).textContent = String(bk.guests);
}
$('#bookForm').addEventListener('click', e => {
  const tg = e.target as Element;
  const d = tg.closest<HTMLElement>('[data-date]'); if (d) { bk.date = d.dataset.date!; renderBooking(); $<HTMLElement>(`[data-date="${bk.date}"]`).focus(); return; }
  const tm = tg.closest<HTMLElement>('[data-btime]'); if (tm) { bk.time = tm.dataset.btime!; $$('[data-btime]').forEach(b => b.setAttribute('aria-checked', String(b === tm))); return; }
  const g = tg.closest<HTMLElement>('#bkGuests [data-d]'); if (g) { bk.guests = clamp(bk.guests + Number(g.dataset.d), 1, 30); $('output', $('#bkGuests')).textContent = String(bk.guests); return; }
  if (tg.closest('#bkAgain')) { $('#bookDone').hidden = true; $$('.book-form > :not(#bookDone)').forEach(x => x.classList.remove('gone')); }
});
bindPhone($<HTMLInputElement>('#bkPhone'));
if (order.name) $<HTMLInputElement>('#bkName').value = order.name;
if (order.phone) $<HTMLInputElement>('#bkPhone').value = fmtPhone(order.phone);
$('#bookForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#bkErr'); err.textContent = '';
  const name = $<HTMLInputElement>('#bkName').value.trim(), phone = phoneDigits($<HTMLInputElement>('#bkPhone').value);
  if (name.length < 2 || !hasLetters(name)) { err.textContent = t('err.name'); $<HTMLElement>('#bkName').focus(); return; }
  if (phone.length !== 9) { err.textContent = t('err.phone'); $<HTMLElement>('#bkPhone').focus(); return; }
  if (!bk.date) { err.textContent = t('err.date'); return; }
  if (!bk.time) { err.textContent = t('err.time'); $<HTMLElement>('#bkTimes button')?.focus(); return; }
  const btn = $<HTMLButtonElement>('#bkSend'); btn.disabled = true;
  try {
    const body = new URLSearchParams({ 'form-name': 'booking', 'bot-field': '', name, phone: '+998 ' + fmtPhone(phone), date: bk.date, time: bk.time, guests: String(bk.guests), comment: $<HTMLInputElement>('#bkComment').value.trim(), lang: state.lang });
    const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    if (!res.ok) throw new Error();
    store.set('vc-contact', { ...(store.get('vc-contact') as object ?? {}), name, phone });
    $$('.book-form > :not(#bookDone)').forEach(x => x.classList.add('gone'));
    const done = $('#bookDone'); done.hidden = false;
    done.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/><path class="tick" d="M14 25l7 7 13-15" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p>${esc(tf('book.done', { name, date: bk.date, time: bk.time, g: bk.guests }))}</p><button type="button" class="btn btn-line" id="bkAgain">${t('book.again')}</button>`;
  } catch { err.textContent = t('err.send'); }
  finally { btn.disabled = false; }
});

/* =============== visit =============== */
function renderVisit() {
  $('#phoneV').textContent = CAFE.phone;
  const tg = $<HTMLAnchorElement>('#tgLink'), ig = $<HTMLAnchorElement>('#igLink');
  tg.href = `https://t.me/${CAFE.telegram}`; tg.textContent = `Telegram @${CAFE.telegram}`;
  ig.href = `https://instagram.com/${CAFE.instagram}`; ig.textContent = `Instagram @${CAFE.instagram}`;
  $<HTMLAnchorElement>('#routeLink').href = `https://www.google.com/maps/dir/?api=1&destination=${CAFE.lat},${CAFE.lng}`;
  $('#year').textContent = String(new Date().getFullYear());
}

/* =============== table mode =============== */
function renderTable() {
  const b = $('#tableBanner');
  b.hidden = !order.table || order.method !== 'table';
  if (!b.hidden) $('span', b).textContent = tf('table.banner', { n: order.table });
}
$('#tableExit').addEventListener('click', () => { order.table = ''; order.method = 'pickup'; renderTable(); history.replaceState(null, '', location.pathname + location.hash); });

/* =============== reveal (headings) =============== */
function initReveal() {
  if (reduced || !('IntersectionObserver' in window)) { $$('[data-split]').forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .4 });
  $$('[data-split]').forEach(el => io.observe(el));
}

/* =============== scroll loop =============== */
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    root.classList.toggle('scrolled', scrollY > 20);
    const hr = hero.getBoundingClientRect();
    if (hr.bottom > 0) updateHero(heroProgress());
    $('#tape').style.transform = `translate3d(${-(scrollY * .35) % ($('#tape').scrollWidth / 3 || 1)}px,0,0) skewX(var(--skew, 0deg))`;
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { heroP = -1; fitScene(); onScroll(); });

/* =============== boot =============== */
on('lang', () => { renderStatus(); renderReceipt(); renderChips(); renderGrid(); renderCart(); renderBooking(); renderTable(); if (!$('#itemModal').hidden && im.id) renderItem(); if (!$('#checkout').hidden && !$('#coForm').hidden) { if (order.step === 2) captureStep2(); renderCheckout(); } });
buildScene(); fitScene(); renderTape(); renderVisit(); setWorldUI();
applyLang();
initLab(); initBudget();
initPointer(t); initReveal(); initScroll(); initAfk(); initTrack();
on('lang', langTrack);
if (reduced) root.classList.add('reduced');
// iOS Safari brings pages back from its back/forward cache with frozen transitions, a stale scroll state and the pinned
// hero scene unpinned. Instead of patching that state, load the page fresh (from cache, so it's instant).
addEventListener('pageshow', e => { if ((e as PageTransitionEvent).persisted) location.reload(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { heroP = -1; fitScene(); onScroll(); } });
updateHero(heroProgress()); onScroll();
const hideLoader = () => { const l = document.getElementById('loader'); if (!l || l.classList.contains('gone')) return; l.classList.add('gone'); setTimeout(() => l.remove(), 700); root.classList.add('ready'); };
if (document.readyState === 'complete') setTimeout(hideLoader, 500); else addEventListener('load', () => setTimeout(hideLoader, 400));
setTimeout(hideLoader, 3500);
