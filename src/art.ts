// Hand-drawn SVG food and drink illustrations (viewBox 0 0 400 300).
// Placeholders until the cafe's own photos arrive.

export type Vessel = 'cup' | 'small' | 'glass' | 'iced' | 'pot';
export interface DrinkSpec {
  v: Vessel; liquid: string; foam?: string; layers?: string[]; art?: 'heart' | 'rosetta' | 'tulip';
  ice?: boolean; straw?: string; dust?: string; cream?: boolean; lemon?: boolean; mallow?: boolean; berry?: boolean;
}
export type FoodKind = 'wrap' | 'pita' | 'hotdog' | 'fries' | 'nuggets' | 'pizza' | 'club' | 'croissant' | 'cheesecake' | 'tiramisu' | 'medovik' | 'soda';
export type ArtSpec =
  | { k: 'drink'; d: DrinkSpec }
  | { k: 'burger'; layers: string[] }
  | { k: FoodKind; variant?: string }
  | { k: 'combo'; parts: ArtSpec[] };

const SH = (cx = 200, rx = 120, cy = 270) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="10" fill="#2A1440" opacity=".12"/>`;
const INK = '#2A1440';
export const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return '#' + ch.map(c => f(c).toString(16).padStart(2, '0')).join('');
};
let uid = 0;
const id = (p: string) => `${p}${++uid}`;

/* ---------------- latte art (top view, drawn inside an ellipse) ---------------- */
export function latteArt(kind: 'heart' | 'rosetta' | 'tulip', cx: number, cy: number, s: number, col = '#FFF6EA'): string {
  if (kind === 'heart') return `<path class="lart" d="M${cx} ${cy + 9 * s} C ${cx - 26 * s} ${cy - 4 * s}, ${cx - 14 * s} ${cy - 16 * s}, ${cx} ${cy - 6 * s} C ${cx + 14 * s} ${cy - 16 * s}, ${cx + 26 * s} ${cy - 4 * s}, ${cx} ${cy + 9 * s}z" fill="${col}"/>`;
  if (kind === 'tulip') return [0, 1, 2].map(i => `<ellipse class="lart" cx="${cx}" cy="${cy - 6 * s + i * 6 * s}" rx="${(16 - i * 4) * s}" ry="${4.2 * s}" fill="${col}"/>`).join('') + `<path class="lart" d="M${cx} ${cy - 10 * s}v${22 * s}" stroke="${col}" stroke-width="${1.6 * s}"/>`;
  let r = '';
  for (let i = 0; i < 6; i++) r += `<ellipse class="lart" cx="${cx + (i - 2.5) * 5 * s}" cy="${cy}" rx="${3 * s}" ry="${(9 - Math.abs(i - 2.5) * 2) * s}" fill="${col}"/>`;
  return r + `<path class="lart" d="M${cx - 16 * s} ${cy}h${32 * s}" stroke="${col}" stroke-width="${1.4 * s}"/>`;
}

/* ---------------- drinks ---------------- */
function cup(d: DrinkSpec, small: boolean): string {
  const k = small ? .72 : 1, cx = 200;
  const w = 150 * k, h = 112 * k, top = 268 - 22 - h, L = cx - w / 2, R = cx + w / 2;
  let s = SH(cx, 128 * k + 20);
  s += `<ellipse cx="${cx}" cy="256" rx="${118 * k + 18}" ry="${20 * k + 4}" fill="#FBF8FD" stroke="${INK}" stroke-width="3"/>`;
  s += `<ellipse cx="${cx}" cy="252" rx="${70 * k}" ry="${11 * k}" fill="#E7DCF1"/>`;
  s += `<path d="M${R - 6} ${top + 26 * k} c ${44 * k} -6, ${48 * k} ${54 * k}, ${2 * k} ${58 * k}" fill="none" stroke="${INK}" stroke-width="${16 * k}" stroke-linecap="round"/>`;
  s += `<path d="M${R - 6} ${top + 26 * k} c ${44 * k} -6, ${48 * k} ${54 * k}, ${2 * k} ${58 * k}" fill="none" stroke="#7A4FB0" stroke-width="${9 * k}" stroke-linecap="round"/>`;
  s += `<path d="M${L} ${top} h${w} c 0 ${h * .7}, ${-24 * k} ${h}, ${-w * .26} ${h} h${-w * .48} c ${-w * .26 + 24 * k} 0, ${-w * .26} ${-h * .3}, ${-w * .26} ${-h}z" fill="#7A4FB0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<path d="M${L + 14 * k} ${top + 18 * k} c 0 ${h * .5}, ${10 * k} ${h * .7}, ${26 * k} ${h * .8}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${7 * k}" stroke-linecap="round"/>`;
  s += `<path d="M${cx - 18 * k} ${top + h * .55} q${18 * k} ${-16 * k} ${36 * k} 0 q${-18 * k} ${16 * k} ${-36 * k} 0" fill="#C9B2E8"/>`;
  s += `<ellipse cx="${cx}" cy="${top}" rx="${w / 2}" ry="${18 * k}" fill="#FBF8FD" stroke="${INK}" stroke-width="3"/>`;
  const liq = d.foam ?? d.liquid;
  s += `<ellipse cx="${cx}" cy="${top + 3 * k}" rx="${w / 2 - 9 * k}" ry="${13 * k}" fill="${liq}"/>`;
  if (d.foam) s += `<ellipse cx="${cx}" cy="${top + 3 * k}" rx="${w / 2 - 9 * k}" ry="${13 * k}" fill="none" stroke="${d.liquid}" stroke-width="${4 * k}" opacity=".7"/>`;
  if (d.art) s += `<g transform="translate(0 ${top + 3 * k}) scale(1 .42) translate(0 ${-(top + 3 * k)})">${latteArt(d.art, cx, top + 3 * k, 1.05 * k, d.foam ? shade(d.liquid, .05) : '#F5E6D3')}</g>`;
  if (d.dust) for (let i = 0; i < 14; i++) s += `<circle cx="${cx - 48 * k + ((i * 37) % 96) * k}" cy="${top - 4 * k + ((i * 13) % 12) * k}" r="${1.6 * k}" fill="${d.dust}"/>`;
  if (d.mallow) s += [[-20, -2], [8, -6], [26, 2], [-4, 4]].map(([x, y]) => `<rect x="${cx + x * k - 9 * k}" y="${top + y * k - 6 * k}" width="${18 * k}" height="${12 * k}" rx="${4 * k}" fill="#FFF2F7" stroke="${INK}" stroke-width="2"/>`).join('');
  if (d.lemon) s += `<g transform="translate(${cx + 30 * k} ${top - 2 * k})"><circle r="${16 * k}" fill="#F7D94C" stroke="${INK}" stroke-width="2.5"/><circle r="${11 * k}" fill="#FCEB8E"/><path d="M0 ${-11 * k}V${11 * k}M${-11 * k} 0H${11 * k}M${-8 * k} ${-8 * k}L${8 * k} ${8 * k}M${8 * k} ${-8 * k}L${-8 * k} ${8 * k}" stroke="#F7D94C" stroke-width="2"/></g>`;
  s += steam(cx, top - 14 * k, k);
  return s;
}

export function steam(cx: number, y: number, k = 1): string {
  return `<g class="steam" fill="none" stroke="#9D7BD1" stroke-width="${5 * k}" stroke-linecap="round" opacity=".55">
    <path d="M${cx - 24 * k} ${y} c ${-10 * k} ${-14 * k}, ${10 * k} ${-22 * k}, 0 ${-38 * k}"/>
    <path d="M${cx} ${y - 6 * k} c ${-10 * k} ${-14 * k}, ${10 * k} ${-22 * k}, 0 ${-40 * k}"/>
    <path d="M${cx + 24 * k} ${y} c ${-10 * k} ${-14 * k}, ${10 * k} ${-22 * k}, 0 ${-34 * k}"/></g>`;
}

function glass(d: DrinkSpec): string {
  const cx = 200, top = 46, bot = 262, wt = 116, wb = 94;
  const clip = id('g');
  const path = `M${cx - wt / 2} ${top} L${cx - wb / 2} ${bot} Q${cx} ${bot + 8} ${cx + wb / 2} ${bot} L${cx + wt / 2} ${top}z`;
  let s = SH(cx, 70);
  s += `<defs><clipPath id="${clip}"><path d="${path}"/></clipPath></defs>`;
  s += `<path d="${path}" fill="#FFFFFF" fill-opacity=".55"/>`;
  const layers = d.layers ?? [d.liquid];
  const fillTop = top + 22, H = bot - fillTop;
  let y = bot + 8;
  const hs = layers.map((_, i) => (i === layers.length - 1 && d.foam ? .2 : 1));
  const sum = hs.reduce((a, b) => a + b, 0) + (d.foam ? .45 : 0);
  s += `<g clip-path="url(#${clip})">`;
  layers.forEach((c, i) => {
    const lh = (H * hs[i]) / sum;
    y -= lh;
    s += `<rect x="${cx - 80}" y="${y}" width="160" height="${lh + 2}" fill="${c}"/>`;
    if (i > 0) s += `<path d="M${cx - 80} ${y + lh} q20 -6 40 0 t40 0 t40 0 t40 0" fill="none" stroke="${c}" stroke-width="6" opacity=".6"/>`;
  });
  if (d.foam) { const fh = (H * .45) / sum; y -= fh; s += `<rect x="${cx - 80}" y="${y}" width="160" height="${fh + 2}" fill="${d.foam}"/>`; for (let i = 0; i < 9; i++) s += `<circle cx="${cx - 44 + i * 11}" cy="${y + 6 + (i % 3) * 5}" r="2.4" fill="#fff" opacity=".7"/>`; }
  if (d.ice) s += [[-26, 70], [14, 92], [-6, 130], [22, 150]].map(([x, yy], i) => `<rect x="${cx + x - 17}" y="${top + yy}" width="34" height="32" rx="7" fill="#fff" fill-opacity=".55" stroke="#fff" stroke-width="2" transform="rotate(${i * 17 - 20} ${cx + x} ${top + yy + 16})"/>`).join('');
  s += `</g>`;
  if (d.cream) s += `<path d="M${cx - 54} ${top + 20} q-6 -26 22 -30 q4 -26 32 -22 q28 -6 30 22 q28 4 22 30z" fill="#FFF9F2" stroke="${INK}" stroke-width="3"/>`;
  if (d.dust) for (let i = 0; i < 12; i++) s += `<circle cx="${cx - 40 + ((i * 29) % 80)}" cy="${top + (d.cream ? -2 : 24) + ((i * 11) % 10)}" r="1.8" fill="${d.dust}"/>`;
  if (d.straw) s += `<path d="M${cx + 18} ${bot - 20} L${cx + 44} ${top - 34}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M${cx + 18} ${bot - 20} L${cx + 44} ${top - 34}" stroke="${d.straw}" stroke-width="7" stroke-linecap="round"/>`;
  if (d.berry) s += `<circle cx="${cx - 28}" cy="${top + 8}" r="11" fill="#C2185B" stroke="${INK}" stroke-width="2.5"/><path d="M${cx - 28} ${top - 3} l4 -8" stroke="#3F7D3A" stroke-width="3"/>`;
  if (d.lemon) s += `<g transform="translate(${cx - wt / 2 + 6} ${top + 10})"><circle r="22" fill="#F7D94C" stroke="${INK}" stroke-width="3"/><circle r="15" fill="#FCEB8E"/><path d="M0 -15V15M-15 0H15M-10 -10L10 10M10 -10L-10 10" stroke="#F7D94C" stroke-width="2.4"/></g>`;
  s += `<path d="${path}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<path d="M${cx - wt / 2 + 12} ${top + 30} L${cx - wb / 2 + 10} ${bot - 20}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/>`;
  s += `<ellipse cx="${cx}" cy="${top}" rx="${wt / 2}" ry="7" fill="none" stroke="${INK}" stroke-width="3"/>`;
  return s;
}

function iced(d: DrinkSpec): string {
  const cx = 200, top = 70, bot = 262, wt = 124, wb = 96;
  const clip = id('i');
  const path = `M${cx - wt / 2} ${top} L${cx - wb / 2} ${bot} Q${cx} ${bot + 6} ${cx + wb / 2} ${bot} L${cx + wt / 2} ${top}z`;
  let s = SH(cx, 72);
  s += `<defs><clipPath id="${clip}"><path d="${path}"/></clipPath></defs>`;
  s += `<path d="${path}" fill="#fff" fill-opacity=".6"/>`;
  const layers = d.layers ?? [d.liquid];
  const H = bot - (top + 16); let y = bot + 6;
  s += `<g clip-path="url(#${clip})">`;
  layers.forEach(c => { const lh = H / layers.length; y -= lh; s += `<rect x="${cx - 80}" y="${y}" width="160" height="${lh + 2}" fill="${c}"/>`; });
  s += [[-28, 34], [10, 50], [-10, 92], [24, 110], [-24, 140]].map(([x, yy], i) => `<rect x="${cx + x - 18}" y="${top + yy}" width="36" height="34" rx="8" fill="#fff" fill-opacity=".5" stroke="#fff" stroke-width="2" transform="rotate(${i * 23 - 30} ${cx + x} ${top + yy + 17})"/>`).join('');
  s += `</g>`;
  s += `<path d="${path}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<rect x="${cx - 40}" y="${top + 66}" width="80" height="44" rx="22" fill="#FBF8FD" stroke="${INK}" stroke-width="3"/>`;
  s += `<path d="M${cx - 11} ${top + 98} c-16 -10 -12 -24 0 -20 c0 -10 22 -10 22 0 c12 -4 16 10 0 20z" fill="#7A4FB0"/><circle cx="${cx}" cy="${top + 86}" r="4" fill="#F4B731"/>`;
  const domeTop = d.cream ? top - 46 : top - 8;
  s += d.cream
    ? `<path d="M${cx - wt / 2 - 6} ${top} Q${cx - wt / 2} ${domeTop} ${cx} ${domeTop} Q${cx + wt / 2} ${domeTop} ${cx + wt / 2 + 6} ${top}z" fill="#fff" fill-opacity=".5" stroke="${INK}" stroke-width="3"/><path d="M${cx - 46} ${top - 2} q-4 -22 18 -24 q4 -20 28 -16 q24 -4 26 16 q22 4 20 24z" fill="#FFF9F2"/>`
    : `<rect x="${cx - wt / 2 - 8}" y="${top - 10}" width="${wt + 16}" height="14" rx="7" fill="#FBF8FD" stroke="${INK}" stroke-width="3"/>`;
  if (d.dust) for (let i = 0; i < 10; i++) s += `<circle cx="${cx - 34 + ((i * 23) % 68)}" cy="${top - 24 + ((i * 7) % 10)}" r="1.8" fill="${d.dust}"/>`;
  s += `<path d="M${cx + 14} ${top + 40} L${cx + 40} ${top - 74}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M${cx + 14} ${top + 40} L${cx + 40} ${top - 74}" stroke="${d.straw ?? '#7A4FB0'}" stroke-width="8" stroke-linecap="round"/>`;
  return s;
}

function pot(d: DrinkSpec): string {
  // Uzbek teapot (choynak) with a piyola
  let s = SH(190, 140);
  s += `<path d="M118 150 c-40 -4 -52 -46 -64 -56" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M118 150 c-40 -4 -52 -46 -64 -56" fill="none" stroke="#3E6FB8" stroke-width="7" stroke-linecap="round"/>`;
  s += `<path d="M232 128 c46 -8 50 70 4 76" fill="none" stroke="${INK}" stroke-width="13"/><path d="M232 128 c46 -8 50 70 4 76" fill="none" stroke="#3E6FB8" stroke-width="7"/>`;
  s += `<path d="M110 120 h130 c10 80 -10 126 -65 126 c-55 0 -75 -46 -65 -126z" fill="#3E6FB8" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<path d="M118 160 q57 30 114 0" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) s += `<circle cx="${135 + i * 20}" cy="${196 + (i % 2) * 8}" r="6" fill="#fff" opacity=".9"/><circle cx="${135 + i * 20}" cy="${196 + (i % 2) * 8}" r="2.5" fill="#E2452F"/>`;
  s += `<ellipse cx="175" cy="120" rx="65" ry="11" fill="#5C8BD0" stroke="${INK}" stroke-width="3"/><path d="M150 112 q25 -32 50 0" fill="#3E6FB8" stroke="${INK}" stroke-width="3"/><circle cx="175" cy="94" r="7" fill="#F4B731" stroke="${INK}" stroke-width="2.5"/>`;
  // piyola
  s += `<path d="M262 214 h96 c-4 30 -20 46 -48 46 c-28 0 -44 -16 -48 -46z" fill="#FBF8FD" stroke="${INK}" stroke-width="3.5"/><path d="M272 236 q38 14 76 0" fill="none" stroke="#3E6FB8" stroke-width="5"/>`;
  s += `<ellipse cx="310" cy="214" rx="48" ry="9" fill="${d.liquid}" stroke="${INK}" stroke-width="3"/>`;
  if (d.lemon) s += `<path d="M300 210 a12 7 0 0 1 24 0z" fill="#F7D94C" stroke="${INK}" stroke-width="2"/>`;
  s += steam(310, 196, .6);
  return s;
}

/* ---------------- burger layers (shared by menu art, hero and builder) ---------------- */
export interface Layer { svg: (y: number, cx: number, w: number) => string; h: number }
const sesame = (cx: number, y: number, w: number) => {
  let s = '';
  for (let i = 0; i < 11; i++) { const x = cx - w * .36 + ((i * 47) % 100) / 100 * w * .72, yy = y + 12 + ((i * 31) % 26); s += `<ellipse cx="${x}" cy="${yy}" rx="4.5" ry="2.4" fill="#FFF3D6" transform="rotate(${(i * 37) % 60 - 30} ${x} ${yy})"/>`; }
  return s;
};
const BUN: Record<string, { c: string; seed: boolean }> = {
  classic: { c: '#E3A04C', seed: true }, brioche: { c: '#E9B44C', seed: false }, violet: { c: '#8E5CC9', seed: true }, black: { c: '#3A2F3C', seed: true },
};
export function bunTop(kind = 'classic'): Layer {
  const b = BUN[kind] ?? BUN.classic;
  return { h: 62, svg: (y, cx, w) => `<path d="M${cx - w / 2} ${y + 60} C ${cx - w / 2} ${y - 6}, ${cx + w / 2} ${y - 6}, ${cx + w / 2} ${y + 60} Q ${cx} ${y + 70} ${cx - w / 2} ${y + 60}z" fill="${b.c}" stroke="${INK}" stroke-width="3.5"/><path d="M${cx - w * .32} ${y + 22} q${w * .12} -16 ${w * .3} -14" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="8" stroke-linecap="round"/>${b.seed ? sesame(cx, y, w) : ''}` };
}
export function bunBottom(kind = 'classic'): Layer {
  const b = BUN[kind] ?? BUN.classic;
  return { h: 30, svg: (y, cx, w) => `<path d="M${cx - w / 2 + 4} ${y} h${w - 8} q4 0 2 10 l-6 14 q-3 6 -10 6 h${-(w - 36)} q-7 0 -10 -6 l-6 -14 q-2 -10 2 -10z" fill="${b.c}" stroke="${INK}" stroke-width="3.5"/><rect x="${cx - w / 2 + 6}" y="${y + 1}" width="${w - 12}" height="6" fill="${shade(b.c, .25)}"/>` };
}
export const LAYERS: Record<string, Layer> = {
  beef: { h: 30, svg: (y, cx, w) => `<rect x="${cx - w / 2 - 4}" y="${y}" width="${w + 8}" height="30" rx="15" fill="#6B3A24" stroke="${INK}" stroke-width="3.5"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${cx - w * .4 + i * w * .16} ${y + 9} l10 8" stroke="#4A2516" stroke-width="3" stroke-linecap="round"/>`).join('')}` },
  chicken: { h: 30, svg: (y, cx, w) => `<path d="M${cx - w / 2 - 8} ${y + 15} q4 -16 20 -14 q10 -6 22 0 q12 -6 24 0 q12 -6 24 0 q12 -6 24 0 q12 -6 24 0 q16 -2 18 14 q-2 16 -18 15 h${-(w - 2)} q-18 1 -18 -15z" fill="#D9933A" stroke="${INK}" stroke-width="3.5"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${cx - w * .42 + i * w * .14}" cy="${y + 12 + (i % 2) * 6}" r="2.6" fill="#F2C178"/>`).join('')}` },
  cheese: { h: 10, svg: (y, cx, w) => `<path d="M${cx - w / 2} ${y} h${w} l-4 6 l-14 16 l-8 -14 h-${w * .3} l-12 20 l-10 -20 h-${w * .25} l-12 14 l-6 -14 h-${w * .2}z" fill="#F4B731" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` },
  lettuce: { h: 14, svg: (y, cx, w) => { let p = `M${cx - w / 2 - 10} ${y + 6}`; for (let i = 0; i < 9; i++) p += ` q${(w + 20) / 18} ${i % 2 ? -10 : 10} ${(w + 20) / 9} 0`; return `<path d="${p} v8 h-${w + 20}z" fill="#7CB342" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`; } },
  tomato: { h: 14, svg: (y, cx, w) => `<rect x="${cx - w / 2 + 2}" y="${y}" width="${w / 2 - 4}" height="14" rx="7" fill="#E2452F" stroke="${INK}" stroke-width="3"/><rect x="${cx + 2}" y="${y}" width="${w / 2 - 4}" height="14" rx="7" fill="#E2452F" stroke="${INK}" stroke-width="3"/><circle cx="${cx - w / 4}" cy="${y + 7}" r="2.5" fill="#FFB199"/><circle cx="${cx + w / 4}" cy="${y + 7}" r="2.5" fill="#FFB199"/>` },
  onion: { h: 10, svg: (y, cx, w) => [0, 1, 2, 3].map(i => `<ellipse cx="${cx - w * .33 + i * w * .22}" cy="${y + 5}" rx="${w * .12}" ry="5" fill="none" stroke="#C9A3E6" stroke-width="5"/>`).join('') },
  pickles: { h: 10, svg: (y, cx, w) => [0, 1, 2].map(i => `<ellipse cx="${cx - w * .3 + i * w * .3}" cy="${y + 5}" rx="${w * .14}" ry="6" fill="#8BAF3A" stroke="${INK}" stroke-width="2.5"/>`).join('') },
  jalapeno: { h: 10, svg: (y, cx, w) => [0, 1, 2, 3, 4].map(i => `<circle cx="${cx - w * .38 + i * w * .19}" cy="${y + 5}" r="7" fill="#3F9142" stroke="${INK}" stroke-width="2.5"/><circle cx="${cx - w * .38 + i * w * .19}" cy="${y + 5}" r="3" fill="#E9F2B7"/>`).join('') },
  bacon: { h: 12, svg: (y, cx, w) => { let p = `M${cx - w / 2 - 6} ${y + 6}`; for (let i = 0; i < 8; i++) p += ` q${(w + 12) / 16} ${i % 2 ? -8 : 8} ${(w + 12) / 8} 0`; return `<path d="${p}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="${p}" fill="none" stroke="#B5432F" stroke-width="8" stroke-linecap="round"/><path d="${p}" fill="none" stroke="#F0A08A" stroke-width="2.5" stroke-linecap="round"/>`; } },
  egg: { h: 14, svg: (y, cx, w) => `<path d="M${cx - w / 2 + 6} ${y + 7} q0 -8 ${w * .3} -7 q${w * .2} -4 ${w * .4} 0 q${w * .3} 0 ${w * .3 - 12} 8 q0 8 ${-w * .5} 6 q${-w * .5} 2 ${-w * .5 + 6} -7z" fill="#FFFDF5" stroke="${INK}" stroke-width="3"/><circle cx="${cx + 6}" cy="${y + 6}" r="8" fill="#F4B731" stroke="${INK}" stroke-width="2.5"/>` },
  sauce: { h: 8, svg: (y, cx, w) => { let p = `M${cx - w / 2 + 4} ${y + 2} h${w - 8}`; for (let i = 0; i < 6; i++) p += ''; return `<path d="${p} q2 8 -10 10 q-6 -2 -10 6 q-6 -10 -20 -6 h-${w - 80} q-8 6 -14 -2 q-8 4 -10 -4z" fill="#F1E0C7" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`; } },
  ketchup: { h: 6, svg: (y, cx, w) => `<path d="M${cx - w / 2 + 8} ${y + 3} q${w / 8} -6 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4 - 16} 0" fill="none" stroke="#C62828" stroke-width="6" stroke-linecap="round"/>` },
};
export function stackBurger(layers: string[], cx = 200, base = 262, w = 210): string {
  const bun = layers.find(l => l.startsWith('bun:'))?.slice(4) ?? 'classic';
  const mids = layers.filter(l => !l.startsWith('bun:'));
  const all = [bunBottom(bun), ...mids.map(m => LAYERS[m]).filter(Boolean), bunTop(bun)];
  const total = all.reduce((a, l) => a + l.h - 4, 0);
  const scale = Math.min(1, 200 / total);
  let y = base, s = SH(cx, w / 2 + 14);
  const parts = all.map(l => { y -= (l.h - 4); return l.svg(y, cx, w); });
  s += `<g transform="translate(${cx} ${base}) scale(${scale}) translate(${-cx} ${-base})">${parts.join('')}</g>`;
  return s;
}

/* ---------------- other food ---------------- */
function wrap(v = 'chicken'): string {
  const fill = v === 'beef' ? '#7A4128' : v === 'cheese' ? '#F4B731' : v === 'spicy' ? '#D84315' : '#E7B279';
  let s = SH(200, 150);
  // back half
  s += `<g transform="rotate(-14 200 170)">
    <path d="M70 150 q-10 -40 30 -46 h170 q34 0 34 46 v40 q0 44 -34 44 h-170 q-40 -6 -30 -44z" fill="#F3D9A4" stroke="${INK}" stroke-width="3.5"/>
    <path d="M100 118 l14 -6 M150 116 l12 -8 M210 118 l12 -6 M250 120 l12 -6" stroke="#C99652" stroke-width="5" stroke-linecap="round"/>
    <path d="M100 210 l14 6 M170 214 l14 4" stroke="#C99652" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="304" cy="170" rx="34" ry="64" fill="#FBEAC6" stroke="${INK}" stroke-width="3.5"/>
    <ellipse cx="304" cy="170" rx="24" ry="52" fill="#7CB342"/>
    <ellipse cx="304" cy="170" rx="18" ry="42" fill="${fill}"/>
    <circle cx="298" cy="146" r="7" fill="#E2452F"/><circle cx="310" cy="186" r="7" fill="#E2452F"/>
    <path d="M292 160 q12 6 22 -2 M292 196 q12 6 20 -4" stroke="#FFF3E0" stroke-width="4" fill="none"/>
    ${v === 'spicy' ? '<circle cx="306" cy="132" r="5" fill="#3F9142"/><circle cx="296" cy="204" r="5" fill="#3F9142"/>' : ''}
    ${v === 'cheese' ? '<path d="M282 150 q10 30 0 60" stroke="#F4B731" stroke-width="6" fill="none"/>' : ''}
  </g>`;
  s += `<rect x="58" y="196" width="120" height="60" rx="10" fill="#7A4FB0" stroke="${INK}" stroke-width="3.5" transform="rotate(-14 118 226)"/><text x="118" y="234" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="20" fill="#FBF8FD" transform="rotate(-14 118 226)">V</text>`;
  return s;
}
function pita(): string {
  let s = SH(200, 130);
  s += `<path d="M84 210 q-6 -120 116 -120 q122 0 116 120z" fill="#F3D9A4" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<path d="M104 200 q8 -84 96 -86 q88 2 96 86" fill="#7CB342" stroke="${INK}" stroke-width="3"/>`;
  s += `<path d="M118 200 q10 -66 82 -68 q72 2 82 68z" fill="#A0552E"/>`;
  for (let i = 0; i < 7; i++) s += `<rect x="${130 + i * 20}" y="${150 + (i % 3) * 10}" width="16" height="8" rx="3" fill="#7A3B20"/>`;
  s += `<circle cx="160" cy="146" r="9" fill="#E2452F"/><circle cx="236" cy="150" r="9" fill="#E2452F"/><path d="M140 176 q60 20 120 0" stroke="#FFF3E0" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M70 206 h260 v34 q0 20 -20 20 h-220 q-20 0 -20 -20z" fill="#FBF8FD" stroke="${INK}" stroke-width="3.5"/><path d="M70 222 h260" stroke="#7A4FB0" stroke-width="8"/>`;
  return s;
}
function hotdog(v = 'classic'): string {
  let s = SH(200, 160);
  if (v === 'french') {
    s += `<g transform="rotate(-18 200 170)"><rect x="60" y="130" width="250" height="84" rx="42" fill="#E9B44C" stroke="${INK}" stroke-width="3.5"/><ellipse cx="300" cy="172" rx="22" ry="34" fill="#F7E1B0" stroke="${INK}" stroke-width="3"/><ellipse cx="300" cy="172" rx="12" ry="18" fill="#B5432F" stroke="${INK}" stroke-width="2.5"/><rect x="292" y="166" width="50" height="14" rx="7" fill="#B5432F" stroke="${INK}" stroke-width="3"/><path d="M90 150 q20 -10 40 0" stroke="#fff" stroke-opacity=".4" stroke-width="8" fill="none" stroke-linecap="round"/></g>`;
    return s;
  }
  s += `<path d="M58 176 q0 -30 30 -30 h224 q30 0 30 30 q0 56 -50 56 h-184 q-50 0 -50 -56z" fill="#E3A04C" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<rect x="40" y="138" width="320" height="42" rx="21" fill="#B5432F" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<path d="M70 160 l20 -12 l20 12 l20 -12 l20 12 l20 -12 l20 12 l20 -12 l20 12 l20 -12 l20 12 l20 -12 l20 12 l20 -12" fill="none" stroke="#F4B731" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M76 140 q30 -8 60 0 t60 0 t60 0 t60 0" fill="none" stroke="#C62828" stroke-width="7" stroke-linecap="round"/>`;
  s += `<path d="M74 196 q126 26 252 0" fill="none" stroke="#F7CF8A" stroke-width="6" stroke-linecap="round"/>`;
  return s;
}
function fries(v = 'classic'): string {
  let s = SH(200, 100);
  const fry = (x: number, y: number, r: number, h = 120) => `<rect x="${x}" y="${y}" width="20" height="${h}" rx="4" fill="#F4C542" stroke="${INK}" stroke-width="3" transform="rotate(${r} ${x + 10} ${y + h})"/>`;
  s += [[132, 52, -14], [156, 36, -6], [180, 44, 2], [204, 30, 6], [228, 46, 12], [252, 58, 18], [146, 66, -20], [196, 58, -2], [240, 70, 8]].map(([x, y, r]) => fry(x, y, r)).join('');
  if (v === 'cheese') s += `<path d="M128 112 q20 20 40 4 q20 20 40 2 q20 20 40 4 q14 14 30 0 v20 h-150z" fill="#F4B731" stroke="${INK}" stroke-width="3"/>`;
  s += `<path d="M118 116 h164 l-18 150 h-128z" fill="#7A4FB0" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<path d="M118 116 q41 26 82 0 q41 26 82 0" fill="#9D7BD1" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<text x="200" y="210" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="44" fill="#FBF8FD">V</text>`;
  return s;
}
function nuggets(): string {
  let s = SH(200, 140);
  s += `<path d="M80 150 h240 l-20 108 h-200z" fill="#F4B731" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  const n = (x: number, y: number, r: number) => `<path d="M${x} ${y} q8 -22 30 -18 q26 -2 26 22 q4 22 -22 24 q-30 6 -34 -28z" fill="#D9933A" stroke="${INK}" stroke-width="3" transform="rotate(${r} ${x + 28} ${y + 4})"/><circle cx="${x + 20}" cy="${y - 2}" r="2.5" fill="#F2C178"/><circle cx="${x + 36}" cy="${y + 8}" r="2.5" fill="#F2C178"/>`;
  s += n(96, 130, -10) + n(150, 118, 12) + n(206, 128, -4) + n(250, 136, 16) + n(124, 150, 20) + n(186, 150, -14);
  s += `<path d="M80 150 h240" stroke="${INK}" stroke-width="3.5"/><rect x="96" y="180" width="208" height="40" rx="20" fill="#7A4FB0"/><text x="200" y="208" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="22" fill="#FBF8FD">6×</text>`;
  s += `<ellipse cx="330" cy="236" rx="34" ry="14" fill="#FBF8FD" stroke="${INK}" stroke-width="3"/><ellipse cx="330" cy="232" rx="26" ry="8" fill="#C62828"/>`;
  return s;
}
function pizza(): string {
  let s = SH(200, 140);
  s += `<path d="M70 110 q130 -50 260 0 l-130 160z" fill="#F4B731" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<path d="M64 106 q136 -62 272 0 l-8 18 q-128 -52 -256 0z" fill="#D98A3A" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += [[150, 130], [234, 128], [196, 176], [180, 220], [240, 160]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="#B5432F" stroke="${INK}" stroke-width="2.5"/>`).join('');
  s += `<path d="M120 140 q4 20 0 34 M280 140 q-2 16 2 26" stroke="#F4B731" stroke-width="8" stroke-linecap="round"/>`;
  s += [[164, 160], [214, 140], [210, 206]].map(([x, y]) => `<path d="M${x} ${y} l8 -6 l8 6" stroke="#3F7D3A" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('');
  return s;
}
function club(): string {
  let s = SH(200, 140);
  const tri = (dx: number, r: number) => `<g transform="translate(${dx} 0) rotate(${r} 200 180)">
    <path d="M110 250 L200 74 L290 250z" fill="#F7E1B0" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M124 236 L200 92 L276 236z" fill="#FFF6DD"/>
    <rect x="112" y="244" width="176" height="12" fill="#7CB342" stroke="${INK}" stroke-width="2.5"/>
    <rect x="114" y="222" width="172" height="12" fill="#E7B279" stroke="${INK}" stroke-width="2.5"/>
    <rect x="118" y="206" width="164" height="10" fill="#E2452F" stroke="${INK}" stroke-width="2.5"/>
    <rect x="122" y="190" width="156" height="10" fill="#F4B731" stroke="${INK}" stroke-width="2.5"/></g>`;
  s += tri(-60, -8) + tri(60, 8);
  s += `<path d="M140 70 v40 M260 70 v40" stroke="${INK}" stroke-width="4"/><path d="M140 70 l-10 -14 h20z M260 70 l-10 -14 h20z" fill="#7A4FB0" stroke="${INK}" stroke-width="2.5"/>`;
  return s;
}
function croissant(v = 'butter'): string {
  let s = SH(200, 150);
  const segs = [[-110, 30, 34, -40], [-62, 2, 46, -16], [0, -10, 56, 0], [62, 2, 46, 16], [110, 30, 34, 40]];
  s += segs.map(([x, y, r, a]) => `<ellipse cx="${200 + x}" cy="${178 + y}" rx="${r}" ry="${r * 1.25}" fill="#E3A04C" stroke="${INK}" stroke-width="3.5" transform="rotate(${a} ${200 + x} ${178 + y})"/>`).join('');
  s += segs.map(([x, y, r, a]) => `<path d="M${200 + x - r * .4} ${178 + y - r * .6} q${r * .3} -${r * .3} ${r * .7} 0" stroke="#fff" stroke-opacity=".4" stroke-width="6" fill="none" stroke-linecap="round" transform="rotate(${a} ${200 + x} ${178 + y})"/>`).join('');
  if (v === 'almond') s += [[-60, -30], [-20, -46], [20, -44], [60, -28], [0, -30]].map(([x, y], i) => `<ellipse cx="${200 + x}" cy="${178 + y}" rx="10" ry="5" fill="#FFF3DD" stroke="${INK}" stroke-width="1.5" transform="rotate(${i * 30} ${200 + x} ${178 + y})"/>`).join('') + [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${130 + i * 20}" cy="${138 + (i % 3) * 8}" r="2" fill="#fff"/>`).join('');
  return s;
}
function slice(top: string, layers: string[], deco: string): string {
  let s = SH(200, 140);
  const H = 120, y0 = 250 - H;
  s += `<path d="M90 ${y0} L310 ${y0 + 30} L310 250 L90 ${250 - 30}z" fill="${layers[0]}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  const n = layers.length;
  for (let i = 1; i < n; i++) { const yy = y0 + (H / n) * i; s += `<path d="M90 ${yy} L310 ${yy + 30} V${yy + 30 + H / n} L90 ${yy + H / n}z" fill="${layers[i]}"/>`; }
  s += `<path d="M90 ${y0} L310 ${y0 + 30} L310 250 L90 ${250 - 30}z" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<path d="M90 ${y0} L160 ${y0 - 34} L330 ${y0 - 10} L310 ${y0 + 30}z" fill="${top}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<path d="M310 ${y0 + 30} L330 ${y0 - 10} V${210} L310 250z" fill="${shade(layers[0], -.12)}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  return s + deco;
}
function soda(): string {
  return iced({ v: 'iced', liquid: '#5A2A1A', straw: '#E2452F' });
}

/* ---------------- dispatcher ---------------- */
export function inner(a: ArtSpec): string {
  switch (a.k) {
    case 'drink': return a.d.v === 'glass' ? glass(a.d) : a.d.v === 'iced' ? iced(a.d) : a.d.v === 'pot' ? pot(a.d) : cup(a.d, a.d.v === 'small');
    case 'burger': return stackBurger((a as { layers: string[] }).layers);
    case 'wrap': return wrap(a.variant);
    case 'pita': return pita();
    case 'hotdog': return hotdog(a.variant);
    case 'fries': return fries(a.variant);
    case 'nuggets': return nuggets();
    case 'pizza': return pizza();
    case 'club': return club();
    case 'croissant': return croissant(a.variant);
    case 'cheesecake': return slice('#F7F0E1', ['#FFF6E4', '#FFF6E4', '#D9A75F'], `<path d="M150 ${96} q30 -14 60 -4 q30 8 60 0" stroke="#C2185B" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="200" cy="86" r="12" fill="#C2185B" stroke="${INK}" stroke-width="2.5"/><circle cx="240" cy="92" r="10" fill="#6A1B9A" stroke="${INK}" stroke-width="2.5"/>`);
    case 'tiramisu': return slice('#6B4226', ['#F6E7CF', '#8A5A3B', '#F6E7CF', '#8A5A3B'], [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<circle cx="${140 + i * 18}" cy="${96 + (i % 3) * 5}" r="2.4" fill="#3A1F14"/>`).join(''));
    case 'medovik': return slice('#E9B44C', ['#C98A3C', '#F7E6C4', '#C98A3C', '#F7E6C4', '#C98A3C', '#F7E6C4'], [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${150 + i * 26}" cy="${96 + (i % 2) * 6}" r="3" fill="#A0652A"/>`).join(''));
    case 'soda': return soda();
    case 'combo': {
      const n = a.parts.length;
      const pos = n === 2 ? [[-80, 10, .72], [86, 0, .72]] : [[-104, 16, .58], [0, -10, .6], [104, 16, .58]];
      return a.parts.map((p, i) => { const [dx, dy, sc] = pos[i] ?? [0, 0, .5]; return `<g transform="translate(${200 + dx} ${150 + dy}) scale(${sc}) translate(-200 -150)">${inner(p)}</g>`; }).join('');
    }
  }
  return '';
}
export function svg(a: ArtSpec, cls = 'art', label = ''): string {
  return `<svg class="${cls}" viewBox="0 0 400 300" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${inner(a)}</svg>`;
}
