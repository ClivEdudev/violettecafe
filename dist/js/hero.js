// Hero: every visit picks one of the shop's real combos (or a set of real menu items at menu prices), and as you scroll
// it is made piece by piece on an FFS tray — chicken dropped into the bucket, burgers stacked layer by layer, the hot
// dog assembled, fries filled, the drink poured — then the receipt prints exactly what was made, at its real price.
import { ITEM } from './data.js';
import { LAYERS, bunTop, bunBottom, hotdogSVG, wrapRolledSVG, steam } from './art.js';
import { $, $$, clamp, ease, esc, state, t, tf, money, addLine, toast, tashkentNow, ddmmyyyy, hhmm, unitPrice } from './shared.js';
// combos: the shop's names and prices; what's inside follows the menu descriptions (to be confirmed by the owner)
const DEALS = [
    { id: 'kfc', combo: 'kfc-1kg', gift: true, badge: ['+2', 'hero.bGift'], pieces: [{ k: 'bucket' }, { k: 'burger', item: 'cheeseburger', gift: true }, { k: 'burger', item: 'classic-burger', gift: true }], lines: [{ item: 'kfc-1kg' }] },
    { id: 'crunch', combo: 'crunch-duo', badge: ['2×', 'hero.bCombo'], pieces: [{ k: 'soda' }, { k: 'bucket' }, { k: 'burger', item: 'cheeseburger' }, { k: 'fries' }], lines: [{ item: 'crunch-duo' }], contents: ['kfc', 'cheeseburger', 'fries', 'soda'] },
    { id: 'solo', combo: 'solo-combo', badge: ['1×', 'hero.bCombo'], pieces: [{ k: 'soda' }, { k: 'burger', item: 'cheeseburger' }, { k: 'fries' }], lines: [{ item: 'solo-combo' }], contents: ['cheeseburger', 'fries', 'soda'] },
    { id: 'madina', combo: 'madina-combo', badge: ['★', 'hero.bCombo'], pieces: [{ k: 'soda' }, { k: 'wrap', item: 'lavash-chicken' }, { k: 'fries' }], lines: [{ item: 'madina-combo' }], contents: ['lavash-chicken', 'fries', 'soda'] },
    { id: 'mega', combo: 'ffs-mega-mix', badge: ['★', 'hero.bSig'], pieces: [{ k: 'drumsticks' }, { k: 'fries' }], lines: [{ item: 'ffs-mega-mix' }], contents: ['chicken', 'fries'] },
    { id: 'hotdog', badge: ['★', 'hero.bSet'], pieces: [{ k: 'tea', item: 'turkish-tea' }, { k: 'hotdog', item: 'hotdog' }, { k: 'fries' }], lines: [{ item: 'hotdog' }, { item: 'fries', size: 'M' }, { item: 'turkish-tea' }] },
    { id: 'boss', badge: ['★', 'hero.bSet'], pieces: [{ k: 'tea', item: 'glass-tea' }, { k: 'burger', item: 'ffs-boss-burger' }, { k: 'fries' }], lines: [{ item: 'ffs-boss-burger' }, { item: 'fries', size: 'M' }, { item: 'glass-tea' }] },
    { id: 'doner', badge: ['★', 'hero.bSet'], pieces: [{ k: 'soda' }, { k: 'wrap', item: 'shaurma-pita' }], lines: [{ item: 'shaurma-pita' }, { item: 'soda' }] },
    { id: 'spicy', badge: ['★', 'hero.bSet'], pieces: [{ k: 'tea', item: 'turkish-tea' }, { k: 'drumsticks', spicy: true }], lines: [{ item: 'spicy-bite' }, { item: 'turkish-tea' }] },
];
const q = new URLSearchParams(location.search).get('deal');
export const DEAL = DEALS.find(d => d.id === q) ?? DEALS[Math.floor(Math.random() * DEALS.length)];
const BASE = 650;
const lineOf = (l) => ({ kind: 'item', item: l.item, size: ITEM(l.item).sized ? (l.size ?? 'M') : undefined, extras: [], sig: '', qty: 1, who: -1 });
const dealPrice = () => DEAL.lines.reduce((a, l) => a + unitPrice(lineOf(l)), 0);
const nameOf = (id) => ITEM(id)?.name[state.lang] ?? '';
export const dealName = () => (DEAL.combo ? nameOf(DEAL.combo) : DEAL.lines.map(l => nameOf(l.item)).join(' + '));
/* ---------- realistic pieces, each drawn around its own origin (bottom centre) ---------- */
const WIDTH = { soda: 170, tea: 130, bucket: 250, drumsticks: 280, burger: 250, fries: 150, hotdog: 330, wrap: 330 };
function drumstickR(x, y, rot, s = 1, spicy = false) {
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M26 -7 l30 -5 q8 -9 15 -2 q10 0 6 9 q4 9 -6 9 q-6 7 -14 0 l-31 4z" fill="#FBF3E4"/>
    <path d="M58 -11 q6 -4 11 0" stroke="#E6D6BC" stroke-width="2.4" fill="none"/>
    <g filter="url(#fx-crisp)"><path d="M-48 2 q-6 -34 28 -40 q26 -4 48 12 q14 10 10 24 q-4 15 -26 19 q-34 9 -50 -2 q-12 -6 -10 -13z" fill="${spicy ? 'url(#g-chick-spicy)' : 'url(#g-chicken)'}"/></g>
    ${Array.from({ length: 14 }, (_, i) => `<circle cx="${-38 + ((i * 37) % 70)}" cy="${-26 + ((i * 23) % 40)}" r="${1.4 + (i % 3) * .7}" fill="${spicy ? '#FFB27A' : '#FCE2B0'}" opacity=".7"/>`).join('')}
    <path d="M-34 -18 q14 -14 34 -12" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>`;
}
const PIECES = {
    soda: (_p, i) => `<clipPath id="hc${i}"><path d="M-66 -262 h132 l-12 250 q0 12 -12 12 h-84 q-12 0 -12 -12z"/></clipPath>
    <ellipse cx="0" cy="6" rx="78" ry="12" fill="#1C1213" opacity=".2" filter="url(#fx-steam)"/>
    <path d="M-66 -262 h132 l-12 250 q0 12 -12 12 h-84 q-12 0 -12 -12z" fill="rgba(255,255,255,.22)"/>
    <g clip-path="url(#hc${i})"><rect id="hl${i}" x="-80" y="0" width="160" height="0" fill="#3A160C"/><rect id="hlh${i}" x="-80" y="0" width="160" height="0" fill="url(#g-cola)" opacity=".55"/>
      <rect id="hf${i}" x="-80" y="0" width="160" height="0" fill="#D9A877"/>
      <g id="hi${i}">${[[-28, -70, 12], [22, -118, -18], [-12, -168, 26], [26, -210, 8]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 26}" y="${y - 24}" width="52" height="48" rx="11" fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.85)" stroke-width="2"/><rect x="${x - 16}" y="${y - 16}" width="22" height="14" rx="4" fill="rgba(255,255,255,.55)"/></g>`).join('')}</g>
      ${Array.from({ length: 16 }, (_, j) => `<circle class="hb${i}" cx="${-50 + ((j * 37) % 100)}" cy="${-20 - ((j * 53) % 220)}" r="${1.5 + (j % 3)}" fill="rgba(255,255,255,.45)"/>`).join('')}</g>
    <path d="M-66 -262 h132 l-12 250 q0 12 -12 12 h-84 q-12 0 -12 -12z" fill="url(#g-glass)"/>
    <path d="M-66 -262 h132 l-12 250 q0 12 -12 12 h-84 q-12 0 -12 -12z" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-50 -236 l8 200" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".35"/>
    <ellipse cx="0" cy="-262" rx="66" ry="9" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="3"/>
    <text x="0" y="-120" text-anchor="middle" class="glass-print">FFS</text>
    <g id="hs${i}" opacity="0"><path d="M22 -30 L64 -330" stroke="#E11D24" stroke-width="14" stroke-linecap="round"/><path d="M22 -30 L64 -330" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-dasharray="14 16"/></g>
    <rect id="hst${i}" x="-6" y="-700" width="12" height="0" rx="6" fill="#3A160C"/>`,
    tea: (_p, i) => `<clipPath id="hc${i}"><path id="tulip${i}" d="M-44 -170 C-44 -120 -26 -110 -26 -88 C-26 -60 -46 -50 -40 -16 C-36 -4 -24 0 0 0 C24 0 36 -4 40 -16 C46 -50 26 -60 26 -88 C26 -110 44 -120 44 -170z"/></clipPath>
    <ellipse cx="0" cy="4" rx="78" ry="16" fill="#FFFDFC" stroke="#E5D8D6" stroke-width="2"/><ellipse cx="0" cy="2" rx="52" ry="9" fill="#F3ECEA"/>
    <path d="M-62 4 q62 18 124 0" stroke="#E11D24" stroke-width="3" fill="none"/>
    <g clip-path="url(#hc${i})"><rect x="-60" y="-200" width="120" height="210" fill="rgba(255,255,255,.18)"/><rect id="hl${i}" x="-60" y="0" width="120" height="0" fill="#B0421A"/><rect id="hlh${i}" x="-60" y="0" width="120" height="0" fill="url(#g-tea)" opacity=".6"/></g>
    <path d="M-44 -170 C-44 -120 -26 -110 -26 -88 C-26 -60 -46 -50 -40 -16 C-36 -4 -24 0 0 0 C24 0 36 -4 40 -16 C46 -50 26 -60 26 -88 C26 -110 44 -120 44 -170z" fill="url(#g-glass)" stroke="rgba(255,255,255,.95)" stroke-width="3"/>
    <path d="M-34 -150 C-32 -120 -20 -108 -20 -92" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5"/>
    <ellipse cx="0" cy="-170" rx="44" ry="6" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="2.5"/>
    <g transform="translate(58 -4)"><rect x="-9" y="-12" width="14" height="12" rx="2" fill="#FFFFFF" stroke="#E5D8D6"/><rect x="2" y="-10" width="12" height="10" rx="2" fill="#FFFFFF" stroke="#E5D8D6"/></g>
    <g id="hs${i}" opacity="0" filter="url(#fx-steam)">${steam(0, -200, .9).replace(/stroke="#[0-9A-Fa-f]{6}"/g, 'stroke="#FFFFFF"')}</g>
    <rect id="hst${i}" x="-5" y="-700" width="10" height="0" rx="5" fill="#B0421A"/>`,
    bucket: (_p, i) => `<ellipse cx="0" cy="6" rx="120" ry="14" fill="#1C1213" opacity=".2" filter="url(#fx-steam)"/>
    <ellipse cx="0" cy="-196" rx="112" ry="22" fill="#5A0E10"/>
    <g id="hp${i}">${[[-52, -214, -30], [44, -220, 205], [-6, -238, -80], [-30, -190, 16], [34, -190, 170]].map(([x, y, r], j) => `<g class="hd${i}" data-j="${j}">${drumstickR(x, y, r, 1.05)}</g>`).join('')}</g>
    <clipPath id="hc${i}"><path d="M-112 -196 L-88 -8 q2 8 10 8 h156 q8 0 10 -8 L112 -196z"/></clipPath>
    <path d="M-112 -196 L-88 -8 q2 8 10 8 h156 q8 0 10 -8 L112 -196z" fill="#FFFDFC"/>
    <g clip-path="url(#hc${i})">${[0, 1, 2, 3, 4, 5].map(j => `<path d="M${-130 + j * 48} -210 l20 0 l-8 220 l-20 0z" fill="#E11D24"/>`).join('')}<rect x="-120" y="-200" width="240" height="210" fill="url(#g-shade)"/></g>
    <path d="M-116 -200 h232 v16 q-116 16 -232 0z" fill="#FFFDFC" stroke="rgba(0,0,0,.08)"/>
    <ellipse cx="0" cy="-200" rx="116" ry="8" fill="none" stroke="#fff" stroke-width="3"/>
    <rect x="-56" y="-120" width="112" height="50" rx="12" fill="#FFFDFC" stroke="rgba(0,0,0,.1)"/><text x="0" y="-84" text-anchor="middle" class="tray-logo">FFS</text>`,
    drumsticks: (p, i) => `<ellipse cx="0" cy="2" rx="140" ry="20" fill="url(#g-plate)"/><ellipse cx="0" cy="-2" rx="104" ry="12" fill="url(#g-plate-well)"/>
    <path d="M-90 -6 q90 -16 180 0 l-10 8 q-80 -10 -160 0z" fill="#FFFDFC"/><path d="M-90 -6 q90 -16 180 0" stroke="#E11D24" stroke-width="3" fill="none" stroke-dasharray="10 8"/>
    <g id="hp${i}">${[[-46, -26, -10], [44, -30, 192], [0, -60, -70]].map(([x, y, r], j) => `<g class="hd${i}" data-j="${j}">${drumstickR(x, y, r, 1.1, !!p.spicy)}</g>`).join('')}</g>`,
    burger: (p, i) => {
        const art = ITEM(p.item).art;
        const bun = art.layers.find(l => l.startsWith('bun:'))?.slice(4) ?? 'classic';
        const ids = ['B', ...art.layers.filter(l => !l.startsWith('bun:')), 'T'];
        const lay = (id) => (id === 'B' ? bunBottom(bun) : id === 'T' ? bunTop(bun) : LAYERS[id]);
        const total = ids.reduce((a, id) => a + lay(id).h - 4, 0), sc = Math.min(1, 210 / total);
        let y = -12, out = '';
        ids.forEach((id, j) => { const L = lay(id); y -= L.h - 4; out += `<g class="hy${i}" data-y="${y + L.h}"><g>${L.svg(y, 0, 220)}</g></g>`; });
        return `<ellipse cx="0" cy="2" rx="128" ry="18" fill="url(#g-plate)"/><ellipse cx="0" cy="-2" rx="96" ry="11" fill="url(#g-plate-well)"/>
      <g transform="scale(${sc.toFixed(3)})" transform-origin="0 -12">${out}</g>
      ${p.gift ? `<g id="hg${i}" opacity="0" transform="translate(84 -${Math.round(total * sc) + 10})"><rect x="-34" y="-15" width="68" height="28" rx="14" fill="#E11D24"/><text x="0" y="5" text-anchor="middle" class="tray-gift"></text></g>` : ''}`;
    },
    fries: (_p, i) => `<ellipse cx="0" cy="4" rx="72" ry="10" fill="#1C1213" opacity=".2" filter="url(#fx-steam)"/>
    <clipPath id="hc${i}"><rect x="-80" y="-330" width="160" height="232"/></clipPath>
    <g clip-path="url(#hc${i})"><g id="hp${i}">${Array.from({ length: 13 }, (_, j) => { const x = -50 + j * 8.4, h = 120 + ((j * 37) % 40), r = (j % 2 ? 1 : -1) * (3 + (j * 7) % 9); return `<g transform="rotate(${r} ${x} -100)"><rect x="${x - 6}" y="${-100 - h}" width="12" height="${h + 20}" rx="3" fill="url(#g-fry)"/><rect x="${x - 6}" y="${-100 - h}" width="4" height="${h + 20}" rx="2" fill="#FFE9A6" opacity=".8"/><rect x="${x - 6}" y="${-100 - h}" width="12" height="7" rx="3" fill="#D9963A"/></g>`; }).join('')}</g></g>
    <path d="M-70 -150 q35 22 70 0 q35 22 70 0 l-16 140 q-1 10 -11 10 h-86 q-10 0 -11 -10z" fill="url(#g-box)"/>
    <path d="M-70 -150 q35 22 70 0 q35 22 70 0" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>
    <rect x="-70" y="-150" width="140" height="150" fill="url(#g-shade)" opacity=".7" clip-path="url(#hcb${i})"/>
    <clipPath id="hcb${i}"><path d="M-70 -150 q35 22 70 0 q35 22 70 0 l-16 140 q-1 10 -11 10 h-86 q-10 0 -11 -10z"/></clipPath>
    <text x="0" y="-60" text-anchor="middle" class="tray-logo light">FFS</text>`,
    hotdog: (p, i) => {
        const h = { bun: 'brioche', sausage: 'beef', xl: p.item === 'french-hotdog', tops: ['onion'], sauces: ['ketchup', 'mustard'] };
        return `<ellipse cx="0" cy="2" rx="172" ry="20" fill="url(#g-plate)"/><ellipse cx="0" cy="-2" rx="132" ry="12" fill="url(#g-plate-well)"/><g id="hp${i}">${hotdogSVG(h, 0, -6, 290)}</g>`;
    },
    wrap: (p, i) => {
        const doner = p.item === 'shaurma-pita';
        const w = { base: doner ? 'pita' : 'lavash', meat: doner ? 'beef' : 'chicken', double: false, add: ['fries', 'tomato', 'cucumber'], sauces: ['garlic'] };
        return `<ellipse cx="0" cy="2" rx="160" ry="20" fill="url(#g-plate)"/><ellipse cx="0" cy="-2" rx="124" ry="12" fill="url(#g-plate-well)"/><g id="hp${i}">${wrapRolledSVG(w, 0, doner ? -62 : -66, 270)}</g>`;
    },
};
/* ---------- layout and build ---------- */
const slots = [];
const weights = { soda: 1.1, tea: 1, bucket: 1.4, drumsticks: 1.1, burger: 1.3, fries: .9, hotdog: 1.3, wrap: 1 };
let span = [];
export function buildHero(scene) {
    const n = DEAL.pieces.length, gap = 26;
    const total = DEAL.pieces.reduce((a, p) => a + WIDTH[p.k], 0) + gap * (n - 1);
    const s = Math.min(1.3, 740 / total), x0 = 580 - (total * s) / 2;
    let x = x0;
    slots.length = 0;
    DEAL.pieces.forEach(p => { slots.push({ x: x + (WIDTH[p.k] * s) / 2, s }); x += (WIDTH[p.k] + gap) * s; });
    // the scroll range each piece is made in, in order, between .04 and .72
    const wsum = DEAL.pieces.reduce((a, p) => a + weights[p.k], 0);
    let acc = .04;
    span = DEAL.pieces.map(p => { const d = (.68 * weights[p.k]) / wsum; const r = [acc, acc + d]; acc += d; return r; });
    const food = DEAL.pieces.map((p, i) => ({ p, i })).filter(({ p }) => p.k !== 'soda' && p.k !== 'tea');
    const fx0 = food.length ? slots[food[0].i].x - (WIDTH[food[0].p.k] * s) / 2 - 24 : 0, fx1 = food.length ? slots[food[food.length - 1].i].x + (WIDTH[food[food.length - 1].p.k] * s) / 2 + 24 : 0;
    let stars = '';
    for (let i = 0; i < 38; i++) {
        const sx = (i * 157) % 1200, sy = (i * 71) % 300 + 10, r = 1 + (i % 3) * .7;
        stars += `<circle class="star" style="--d:${(i % 7) * .4}s" cx="${sx}" cy="${sy}" r="${r}"/>`;
    }
    scene.innerHTML = `
    <defs>
      <radialGradient id="discG" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="var(--disc-a)"/><stop offset="1" stop-color="var(--disc-b)"/></radialGradient>
      <radialGradient id="g-sticker" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FF8A70"/><stop offset=".6" stop-color="#E11D24"/><stop offset="1" stop-color="#B02A1C"/></radialGradient>
      <linearGradient id="g-cola" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".4"/><stop offset=".3" stop-color="#8A3A1A" stop-opacity=".8"/><stop offset=".55" stop-color="#C2602A" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
      <linearGradient id="g-tea" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5A1A08" stop-opacity=".6"/><stop offset=".4" stop-color="#E0702E" stop-opacity=".7"/><stop offset="1" stop-color="#5A1A08" stop-opacity=".6"/></linearGradient>
      <linearGradient id="g-fry" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9A93A"/><stop offset=".5" stop-color="#F8CF5C"/><stop offset="1" stop-color="#D99330"/></linearGradient>
      <linearGradient id="g-box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0353B"/><stop offset="1" stop-color="#B5121A"/></linearGradient>
      <linearGradient id="g-tray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0353B"/><stop offset="1" stop-color="#9E1016"/></linearGradient>
      <linearGradient id="g-chick-spicy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F08A4A"/><stop offset=".45" stop-color="#C2461C"/><stop offset="1" stop-color="#7A2208"/></linearGradient>
      <pattern id="p-liner" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#FFFDFC"/><rect width="14" height="14" fill="#F6D2D3"/><rect x="14" y="14" width="14" height="14" fill="#F6D2D3"/></pattern>
    </defs>
    <g class="sky">${stars}</g>
    <circle id="disc" cx="520" cy="440" r="330" fill="url(#discG)"/>
    <g id="discRing" fill="none" stroke="var(--ring)" stroke-width="2" stroke-dasharray="3 12"><circle cx="520" cy="440" r="372"/></g>
    <text class="neon" x="520" y="128" text-anchor="middle" textLength="380" lengthAdjust="spacingAndGlyphs">FFS</text>
    ${food.length ? `<g id="tray" filter="url(#fx-soft)"><path d="M${fx0} ${BASE - 4} h${fx1 - fx0} l-14 30 h${-(fx1 - fx0) + 28}z" fill="url(#g-tray)"/><path d="M${fx0 + 12} ${BASE - 8} h${fx1 - fx0 - 24} l-6 12 h${-(fx1 - fx0) + 36}z" fill="url(#p-liner)" opacity=".95"/></g>` : ''}
    ${DEAL.pieces.map((p, i) => `<g id="hpc${i}" transform="translate(${slots[i].x.toFixed(1)} ${BASE}) scale(${slots[i].s.toFixed(3)})">${PIECES[p.k](p, i)}</g>`).join('')}
    <g class="sparkle" id="sparkles" opacity="0">${[[900, 360], [240, 380], [940, 520], [600, 250]].map(([sx, sy], i) => `<path style="--d:${i * .3}s" d="M${sx} ${sy - 14} l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#F4B731"/>`).join('')}</g>
    <g id="sticker" opacity="0" transform="translate(300 300)"><g class="st-in">
      <path d="${Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 62 : 70; return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; }).join(' ')}z" fill="url(#g-sticker)" filter="url(#fx-soft)"/>
      <circle r="52" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 5" opacity=".7"/>
      <text class="st-pct" y="10" text-anchor="middle">${esc(DEAL.badge[0])}</text><text class="st-lbl" y="34" text-anchor="middle" id="stLbl"></text></g></g>`;
}
/* ---------- animation ---------- */
const dropY = (k, h = 520) => (k <= 0 ? -900 : k < .72 ? -h * (1 - (k / .72) ** 2) : -16 * Math.sin(Math.PI * ((k - .72) / .28)) * (1 - ((k - .72) / .28) * .4));
const set = (id, a) => { const el = document.getElementById(id); if (el)
    for (const k in a)
        el.setAttribute(k, String(a[k])); };
function easeBackOut(x) { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
function pour(i, k, H, foam) {
    const f = ease(clamp(k / .8)), h = H * f, top = -h;
    set('hl' + i, { y: top, height: h });
    set('hlh' + i, { y: top, height: h });
    if (foam)
        set('hf' + i, { y: top - 8, height: k > .05 ? 9 : 0 });
    const streaming = k > 0 && k < .85;
    set('hst' + i, { height: streaming ? 700 + top : 0, y: -700 });
    return f;
}
const STEPS = {
    soda: (i, k) => {
        const f = pour(i, k, 236, true);
        const ice = document.getElementById('hi' + i);
        if (ice) {
            const kk = clamp((k - .5) / .3);
            ice.setAttribute('transform', `translate(0 ${(-(1 - ease(kk)) * 260).toFixed(1)})`);
            ice.setAttribute('opacity', String(kk > 0 ? 1 : 0));
        }
        $$('.hb' + i).forEach((b, j) => b.setAttribute('opacity', f > .2 ? String(.4 + (j % 3) * .2) : '0'));
        set('hs' + i, { opacity: clamp((k - .88) / .1) });
    },
    tea: (i, k) => { pour(i, k, 140, false); set('hs' + i, { opacity: clamp((k - .85) / .12) * .9 }); },
    bucket: (i, k) => { $$('.hd' + i).forEach((g, j) => { const kk = clamp((k - j * .17) / .3); g.setAttribute('transform', `translate(0 ${dropY(kk, 380).toFixed(1)})`); g.setAttribute('opacity', kk > 0 ? '1' : '0'); }); },
    drumsticks: (i, k) => { $$('.hd' + i).forEach((g, j) => { const kk = clamp((k - j * .28) / .4); g.setAttribute('transform', `translate(0 ${dropY(kk, 380).toFixed(1)})`); g.setAttribute('opacity', kk > 0 ? '1' : '0'); }); },
    burger: (i, k) => {
        const ls = $$('.hy' + i), n = ls.length;
        ls.forEach((g, j) => {
            const kk = clamp((k - (j / n) * .8) / .22), yb = Number(g.getAttribute('data-y'));
            let sq = 1;
            if (kk > .72) {
                const f = (kk - .72) / .28;
                sq = 1 - .1 * Math.sin(Math.PI * Math.min(1, f * 2)) * (1 - f);
            }
            g.setAttribute('transform', `translate(0 ${dropY(kk, 600).toFixed(1)})`);
            g.setAttribute('opacity', kk > 0 ? '1' : '0');
            g.firstElementChild.setAttribute('transform', `translate(0 ${yb}) scale(${(2 - sq).toFixed(3)} ${sq.toFixed(3)}) translate(0 ${-yb})`);
        });
        set('hg' + i, { opacity: clamp((k - .9) / .1) });
    },
    fries: (i, k) => { const kk = ease(clamp(k)); set('hp' + i, { transform: `translate(0 ${((1 - kk) * 150).toFixed(1)})` }); },
    hotdog: (i, k) => {
        const g = document.getElementById('hp' + i);
        if (!g)
            return;
        const part = (n) => g.querySelector(`[data-part="${n}"]`);
        const bun = clamp(k / .3), saus = clamp((k - .3) / .3), sauce = clamp((k - .62) / .34);
        for (const n of ['bunback', 'bunfront']) {
            const p = part(n);
            if (p) {
                p.setAttribute('transform', `translate(0 ${dropY(bun, 420).toFixed(1)})`);
                p.setAttribute('opacity', bun > 0 ? '1' : '0');
            }
        }
        const s = part('sausage');
        if (s) {
            s.setAttribute('transform', `translate(0 ${dropY(saus, 420).toFixed(1)})`);
            s.setAttribute('opacity', saus > 0 ? '1' : '0');
        }
        g.querySelectorAll('[data-part^="top:"]').forEach(t0 => t0.setAttribute('opacity', String(clamp((k - .58) / .06))));
        g.querySelectorAll('[data-part^="sauce:"] path').forEach(p => { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; p.style.strokeDashoffset = String(1 - sauce); });
    },
    wrap: (i, k) => { const kk = clamp(k / .8); set('hp' + i, { transform: `translate(${((1 - ease(kk)) * 260).toFixed(1)} ${dropY(kk, 300).toFixed(1)}) rotate(${((1 - ease(kk)) * 24).toFixed(1)})`, opacity: kk > 0 ? 1 : 0 }); },
};
let stageKey = '';
export function updateHero(p) {
    DEAL.pieces.forEach((pc, i) => STEPS[pc.k](i, clamp((p - span[i][0]) / (span[i][1] - span[i][0]))));
    const end = span.length ? span[span.length - 1][1] : .7;
    $('#sparkles').setAttribute('opacity', String(clamp((p - end) / .04)));
    const sk = clamp((p - .74) / .06), stk = $('#sticker');
    stk.setAttribute('opacity', String(Math.min(1, sk * 2)));
    $('.st-in', stk).setAttribute('transform', `scale(${sk <= 0 ? .2 : .2 + .8 * easeBackOut(sk)}) rotate(${(1 - sk) * -40 - 12})`);
    $('#disc').setAttribute('r', String(330 + p * 30));
    $('#discRing').setAttribute('transform', `rotate(${p * 90} 520 440)`);
    const rk = clamp((p - .76) / .18), paper = $('#rcPaper');
    paper.style.setProperty('--k', String(rk));
    $('#receipt').classList.toggle('on', rk > 0);
    $$('.rc-row', paper).forEach((r, i, arr) => r.classList.toggle('in', rk > (i + 1) / (arr.length + 1)));
    // what's happening right now, in words
    let key = 'hero.st.start', d = '';
    if (p >= .04) {
        const i = span.findIndex(([a, b]) => p >= a && p < b);
        if (i >= 0) {
            const pc = DEAL.pieces[i];
            key = 'hero.st.' + pc.k;
            d = 'item' in pc ? nameOf(pc.item) : '';
        }
        else
            key = p < .76 ? 'hero.st.ready' : p < .94 ? 'hero.st.receipt' : 'hero.st.done';
    }
    const txt = tf(key, { d });
    if (txt !== stageKey) {
        stageKey = txt;
        $('#heroStage').textContent = txt;
    }
}
/* ---------- receipt, button and texts ---------- */
const CONTENT = { kfc: () => t('hero.c.kfc'), chicken: () => t('hero.c.chicken'), fries: () => nameOf('fries'), soda: () => t('hero.c.soda') };
export function renderHeroTexts(scene) {
    const now = tashkentNow();
    const rows = DEAL.combo
        ? `<div class="rc-row"><span>${esc(nameOf(DEAL.combo))}</span><span>${money(unitPrice(lineOf({ item: DEAL.combo })))}</span></div>`
            + (DEAL.contents ?? []).map(c => `<div class="rc-row rc-sub"><span>· ${esc(CONTENT[c] ? CONTENT[c]() : nameOf(c))}</span></div>`).join('')
            + (DEAL.gift ? `<div class="rc-row rc-disc"><span>${t('rc.gift')}</span><span>${money(0)}</span></div>` : '')
        : DEAL.lines.map(l => `<div class="rc-row"><span>${esc(nameOf(l.item))}${ITEM(l.item).sized ? ` ${t('size.' + (l.size ?? 'M'))}` : ''}</span><span>${money(unitPrice(lineOf(l)))}</span></div>`).join('');
    $('#rcPaper').innerHTML = `
    <div class="rc-row rc-title">${t('rc.title')}</div>
    <div class="rc-row rc-meta"><span>${ddmmyyyy(now)}</span><span>${hhmm(now)}</span></div>
    ${rows}
    <div class="rc-row rc-total"><span>${t('rc.total')}</span><span>${money(dealPrice())}</span></div>
    <div class="rc-row rc-bar" aria-hidden="true">${Array.from({ length: 34 }, (_, i) => `<i style="width:${1 + ((i * 7) % 4)}px"></i>`).join('')}</div>
    <div class="rc-row rc-thanks">${t('rc.thanks')}</div>`;
    $('#heroComboTitle').textContent = t(DEAL.combo ? 'hero.getCombo' : 'hero.getSet');
    $('#heroComboPrice').textContent = money(dealPrice());
    $('#heroPairName').textContent = DEAL.gift ? `${dealName()} ${t('promo.kfcGift')}` : dealName();
    $('#stLbl', scene).textContent = t(DEAL.badge[1]);
    scene.querySelectorAll('.tray-gift').forEach(e => { e.textContent = t('hero.gift'); });
    scene.setAttribute('aria-label', dealName());
    stageKey = '';
}
export function addDeal(from) {
    DEAL.lines.forEach((l, i) => { const { sig: _s, qty: _q, who: _w, ...base } = lineOf(l); addLine(base, 1, i === 0 ? from : null); });
    toast(`${dealName()} — ${t('card.added').toLowerCase()}`);
}
