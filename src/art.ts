// Hand-drawn SVG food and drink illustrations (viewBox 0 0 400 300).
// Placeholders until the cafe's own photos arrive.

import type { WrapSpec, HotdogSpec } from './recipes.js';
export type Vessel = 'cup' | 'small' | 'glass' | 'iced' | 'pot';
export interface DrinkSpec {
  v: Vessel; liquid: string; foam?: string; layers?: string[]; art?: 'heart' | 'rosetta' | 'tulip';
  ice?: boolean; straw?: string; dust?: string; cream?: boolean; lemon?: boolean; mallow?: boolean; berry?: boolean;
}
export type FoodKind = 'wrap' | 'pita' | 'hotdog' | 'fries' | 'nuggets' | 'pizza' | 'club' | 'croissant' | 'cheesecake' | 'tiramisu' | 'medovik' | 'soda' | 'bucket' | 'drumsticks';
export type ArtSpec =
  | { k: 'drink'; d: DrinkSpec }
  | { k: 'burger'; layers: string[] }
  | { k: FoodKind; variant?: string }
  | { k: 'combo'; parts: ArtSpec[] }
  | { k: 'cwrap'; w: WrapSpec }
  | { k: 'chotdog'; h: HotdogSpec };

const SH = (cx = 200, rx = 120, cy = 270) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="10" fill="#1A1414" opacity=".12"/>`;
const INK = '#1A1414';
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
  s += `<ellipse cx="${cx}" cy="256" rx="${118 * k + 18}" ry="${20 * k + 4}" fill="#FFFDFC" stroke="${INK}" stroke-width="3"/>`;
  s += `<ellipse cx="${cx}" cy="252" rx="${70 * k}" ry="${11 * k}" fill="#ECE1E2"/>`;
  s += `<path d="M${R - 6} ${top + 26 * k} c ${44 * k} -6, ${48 * k} ${54 * k}, ${2 * k} ${58 * k}" fill="none" stroke="${INK}" stroke-width="${16 * k}" stroke-linecap="round"/>`;
  s += `<path d="M${R - 6} ${top + 26 * k} c ${44 * k} -6, ${48 * k} ${54 * k}, ${2 * k} ${58 * k}" fill="none" stroke="#E11D24" stroke-width="${9 * k}" stroke-linecap="round"/>`;
  s += `<path d="M${L} ${top} h${w} c 0 ${h * .7}, ${-24 * k} ${h}, ${-w * .26} ${h} h${-w * .48} c ${-w * .26 + 24 * k} 0, ${-w * .26} ${-h * .3}, ${-w * .26} ${-h}z" fill="#E11D24" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<path d="M${L + 14 * k} ${top + 18 * k} c 0 ${h * .5}, ${10 * k} ${h * .7}, ${26 * k} ${h * .8}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${7 * k}" stroke-linecap="round"/>`;
  s += `<path d="M${cx - 18 * k} ${top + h * .55} q${18 * k} ${-16 * k} ${36 * k} 0 q${-18 * k} ${16 * k} ${-36 * k} 0" fill="#F6C2C3"/>`;
  s += `<ellipse cx="${cx}" cy="${top}" rx="${w / 2}" ry="${18 * k}" fill="#FFFDFC" stroke="${INK}" stroke-width="3"/>`;
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
  return `<g class="steam" fill="none" stroke="#EC5A5F" stroke-width="${5 * k}" stroke-linecap="round" opacity=".55">
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
  s += `<rect x="${cx - 40}" y="${top + 66}" width="80" height="44" rx="22" fill="#FFFDFC" stroke="${INK}" stroke-width="3"/>`;
  s += `<path d="M${cx - 11} ${top + 98} c-16 -10 -12 -24 0 -20 c0 -10 22 -10 22 0 c12 -4 16 10 0 20z" fill="#E11D24"/><circle cx="${cx}" cy="${top + 86}" r="4" fill="#F4B731"/>`;
  const domeTop = d.cream ? top - 46 : top - 8;
  s += d.cream
    ? `<path d="M${cx - wt / 2 - 6} ${top} Q${cx - wt / 2} ${domeTop} ${cx} ${domeTop} Q${cx + wt / 2} ${domeTop} ${cx + wt / 2 + 6} ${top}z" fill="#fff" fill-opacity=".5" stroke="${INK}" stroke-width="3"/><path d="M${cx - 46} ${top - 2} q-4 -22 18 -24 q4 -20 28 -16 q24 -4 26 16 q22 4 20 24z" fill="#FFF9F2"/>`
    : `<rect x="${cx - wt / 2 - 8}" y="${top - 10}" width="${wt + 16}" height="14" rx="7" fill="#FFFDFC" stroke="${INK}" stroke-width="3"/>`;
  if (d.dust) for (let i = 0; i < 10; i++) s += `<circle cx="${cx - 34 + ((i * 23) % 68)}" cy="${top - 24 + ((i * 7) % 10)}" r="1.8" fill="${d.dust}"/>`;
  s += `<path d="M${cx + 14} ${top + 40} L${cx + 40} ${top - 74}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M${cx + 14} ${top + 40} L${cx + 40} ${top - 74}" stroke="${d.straw ?? '#E11D24'}" stroke-width="8" stroke-linecap="round"/>`;
  return s;
}

function pot(d: DrinkSpec): string {
  // Uzbek teapot (choynak) with a piyola
  let s = SH(190, 140);
  s += `<path d="M118 150 c-40 -4 -52 -46 -64 -56" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M118 150 c-40 -4 -52 -46 -64 -56" fill="none" stroke="#3E6FB8" stroke-width="7" stroke-linecap="round"/>`;
  s += `<path d="M232 128 c46 -8 50 70 4 76" fill="none" stroke="${INK}" stroke-width="13"/><path d="M232 128 c46 -8 50 70 4 76" fill="none" stroke="#3E6FB8" stroke-width="7"/>`;
  s += `<path d="M110 120 h130 c10 80 -10 126 -65 126 c-55 0 -75 -46 -65 -126z" fill="#3E6FB8" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<path d="M118 160 q57 30 114 0" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) s += `<circle cx="${135 + i * 20}" cy="${196 + (i % 2) * 8}" r="6" fill="#fff" opacity=".9"/><circle cx="${135 + i * 20}" cy="${196 + (i % 2) * 8}" r="2.5" fill="#E11D24"/>`;
  s += `<ellipse cx="175" cy="120" rx="65" ry="11" fill="#5C8BD0" stroke="${INK}" stroke-width="3"/><path d="M150 112 q25 -32 50 0" fill="#3E6FB8" stroke="${INK}" stroke-width="3"/><circle cx="175" cy="94" r="7" fill="#F4B731" stroke="${INK}" stroke-width="2.5"/>`;
  // piyola
  s += `<path d="M262 214 h96 c-4 30 -20 46 -48 46 c-28 0 -44 -16 -48 -46z" fill="#FFFDFC" stroke="${INK}" stroke-width="3.5"/><path d="M272 236 q38 14 76 0" fill="none" stroke="#3E6FB8" stroke-width="5"/>`;
  s += `<ellipse cx="310" cy="214" rx="48" ry="9" fill="${d.liquid}" stroke="${INK}" stroke-width="3"/>`;
  if (d.lemon) s += `<path d="M300 210 a12 7 0 0 1 24 0z" fill="#F7D94C" stroke="${INK}" stroke-width="2"/>`;
  s += steam(310, 196, .6);
  return s;
}

/* ---------------- burger layers (shared by the hero fallback, the builder and menu fallbacks) ----------------
   Drawn to look real: gradients, texture filters, gloss and soft shadows from REAL_DEFS (no cartoon outlines). */
export interface Layer { svg: (y: number, cx: number, w: number) => string; h: number }

export const REAL_DEFS = `<svg class="real-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">
<defs>
  <filter id="fx-bread" x="-10%" y="-20%" width="120%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="4" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .45  0 0 0 0 .25  0 0 0 0 .08  0 0 0 .55 -.12" result="c"/><feComposite in="c" in2="SourceGraphic" operator="in" result="t"/>
    <feBlend in="t" in2="SourceGraphic" mode="multiply" result="b"/><feDropShadow in="b" dx="0" dy="5" stdDeviation="4" flood-color="#2a1208" flood-opacity=".35"/></filter>
  <filter id="fx-meat" x="-10%" y="-30%" width="120%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="3" seed="9" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 .04  0 0 0 0 .02  0 0 0 1.2 -.35" result="c"/><feComposite in="c" in2="SourceGraphic" operator="in" result="t"/>
    <feBlend in="t" in2="SourceGraphic" mode="multiply" result="b"/><feDropShadow in="b" dx="0" dy="4" stdDeviation="3" flood-color="#1a0a04" flood-opacity=".45"/></filter>
  <filter id="fx-crisp" x="-10%" y="-30%" width="120%" height="180%"><feTurbulence type="turbulence" baseFrequency="1.1" numOctaves="2" seed="2" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .55  0 0 0 0 .3  0 0 0 0 .05  0 0 0 .9 -.2" result="c"/><feComposite in="c" in2="SourceGraphic" operator="in" result="t"/>
    <feBlend in="t" in2="SourceGraphic" mode="multiply" result="b"/><feDropShadow in="b" dx="0" dy="4" stdDeviation="3" flood-color="#2a1208" flood-opacity=".4"/></filter>
  <filter id="fx-soft" x="-10%" y="-40%" width="120%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#1a0a04" flood-opacity=".32"/></filter>
  <filter id="fx-foam" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="3" numOctaves="1" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.35" result="c"/><feComposite in="c" in2="SourceGraphic" operator="in" result="t"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/></feMerge></filter>
  <filter id="fx-mix" x="0" y="-5%" width="100%" height="110%"><feGaussianBlur stdDeviation="0 5"/></filter>
  <filter id="fx-steam" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="fx-photo" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#1C1213" flood-opacity=".32"/></filter>
  <filter id="fx-gray"><feColorMatrix type="saturate" values=".05"/></filter>
  <radialGradient id="g-bun-classic" cx=".36" cy=".22" r=".95"><stop offset="0" stop-color="#F9CF8E"/><stop offset=".35" stop-color="#E8A552"/><stop offset=".75" stop-color="#BE7130"/><stop offset="1" stop-color="#8A4A1C"/></radialGradient>
  <radialGradient id="g-bun-brioche" cx=".36" cy=".22" r=".95"><stop offset="0" stop-color="#FFE3A6"/><stop offset=".35" stop-color="#F2B550"/><stop offset=".75" stop-color="#C97B22"/><stop offset="1" stop-color="#94520F"/></radialGradient>
  <radialGradient id="g-bun-violet" cx=".36" cy=".22" r=".95"><stop offset="0" stop-color="#F7BDC0"/><stop offset=".35" stop-color="#D86B70"/><stop offset=".75" stop-color="#A33B40"/><stop offset="1" stop-color="#6B1F23"/></radialGradient>
  <radialGradient id="g-bun-black" cx=".36" cy=".22" r=".95"><stop offset="0" stop-color="#7C7079"/><stop offset=".35" stop-color="#4A393A"/><stop offset=".75" stop-color="#282424"/><stop offset="1" stop-color="#131010"/></radialGradient>
  <linearGradient id="g-crumb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE6BE"/><stop offset=".45" stop-color="#F0CF95"/><stop offset="1" stop-color="#D9A862"/></linearGradient>
  <linearGradient id="g-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="g-patty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A4B2C"/><stop offset=".25" stop-color="#6A3620"/><stop offset=".75" stop-color="#4A2414"/><stop offset="1" stop-color="#2E150B"/></linearGradient>
  <linearGradient id="g-chicken" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C277"/><stop offset=".4" stop-color="#E39A3F"/><stop offset="1" stop-color="#A9601E"/></linearGradient>
  <linearGradient id="g-cheese" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE07A"/><stop offset=".5" stop-color="#F7B92E"/><stop offset="1" stop-color="#E0901A"/></linearGradient>
  <linearGradient id="g-lettuce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C6EA7E"/><stop offset=".45" stop-color="#7DBA3E"/><stop offset="1" stop-color="#4C8A28"/></linearGradient>
  <radialGradient id="g-tomato" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#FF8B6B"/><stop offset=".6" stop-color="#E5432C"/><stop offset="1" stop-color="#A82519"/></radialGradient>
  <linearGradient id="g-pickle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C1D97A"/><stop offset=".6" stop-color="#8DAF44"/><stop offset="1" stop-color="#5F7E27"/></linearGradient>
  <linearGradient id="g-bacon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4B9A5"/><stop offset=".3" stop-color="#C0503A"/><stop offset=".55" stop-color="#E9917A"/><stop offset=".8" stop-color="#9E3324"/><stop offset="1" stop-color="#6E2016"/></linearGradient>
  <radialGradient id="g-yolk" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#FFF1B0"/><stop offset=".35" stop-color="#FFC21A"/><stop offset="1" stop-color="#E88A00"/></radialGradient>
  <linearGradient id="g-white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEE6D8"/></linearGradient>
  <linearGradient id="g-sauce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6E6"/><stop offset="1" stop-color="#E6CDA4"/></linearGradient>
  <linearGradient id="g-ketchup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0524B"/><stop offset="1" stop-color="#A3140F"/></linearGradient>
  <radialGradient id="g-plate" cx=".5" cy=".4" r=".62"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F4F0F0"/><stop offset=".92" stop-color="#E3D3D4"/><stop offset="1" stop-color="#C9B3B4"/></radialGradient>
  <radialGradient id="g-plate-well" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#F6F2F3"/><stop offset="1" stop-color="#E4DDDE"/></radialGradient>
  <linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".12" stop-color="#fff" stop-opacity=".12"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset=".86" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient>
  <linearGradient id="g-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#fff" stop-opacity=".1"/><stop offset=".85" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
  <linearGradient id="g-foam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF8EE"/><stop offset=".7" stop-color="#F1DFC6"/><stop offset="1" stop-color="#D9B98F"/></linearGradient>
  <linearGradient id="g-straw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C98A10"/><stop offset=".4" stop-color="#FFD866"/><stop offset="1" stop-color="#B57A08"/></linearGradient>
  <linearGradient id="g-saus-beef" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E07A5A"/><stop offset=".3" stop-color="#B5482E"/><stop offset=".8" stop-color="#7E2A18"/><stop offset="1" stop-color="#5A1C10"/></linearGradient>
  <linearGradient id="g-saus-chicken" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C9A2"/><stop offset=".3" stop-color="#E0A074"/><stop offset=".8" stop-color="#B8714A"/><stop offset="1" stop-color="#8E5034"/></linearGradient>
  <linearGradient id="g-saus-smoked" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A2583A"/><stop offset=".3" stop-color="#7A3418"/><stop offset=".8" stop-color="#4E1E0C"/><stop offset="1" stop-color="#341206"/></linearGradient>
  <linearGradient id="g-saus-spicy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0704C"/><stop offset=".3" stop-color="#CC3A1C"/><stop offset=".8" stop-color="#8A1E0C"/><stop offset="1" stop-color="#5E1206"/></linearGradient>
  <radialGradient id="g-lav-lavash" cx=".45" cy=".4" r=".75"><stop offset="0" stop-color="#FBEBC8"/><stop offset=".7" stop-color="#F1D39A"/><stop offset="1" stop-color="#D9AE6A"/></radialGradient>
  <radialGradient id="g-lav-red" cx=".45" cy=".4" r=".75"><stop offset="0" stop-color="#F6C7A6"/><stop offset=".7" stop-color="#E9A27A"/><stop offset="1" stop-color="#C9744A"/></radialGradient>
  <radialGradient id="g-lav-pita" cx=".42" cy=".36" r=".8"><stop offset="0" stop-color="#FFF1D2"/><stop offset=".6" stop-color="#F4DDAE"/><stop offset=".9" stop-color="#DDB474"/><stop offset="1" stop-color="#B9894A"/></radialGradient>
  <linearGradient id="g-roll" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0CF"/><stop offset=".35" stop-color="#F1D39A"/><stop offset=".8" stop-color="#C9954F"/><stop offset="1" stop-color="#9E6E34"/></linearGradient>
  <linearGradient id="g-roll-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FAD2B4"/><stop offset=".35" stop-color="#E9A27A"/><stop offset=".8" stop-color="#B9673E"/><stop offset="1" stop-color="#8E4A26"/></linearGradient>
  <linearGradient id="g-paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D86B70"/><stop offset=".5" stop-color="#E11D24"/><stop offset="1" stop-color="#7A2D31"/></linearGradient>
  <radialGradient id="g-cream" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#FBF3E8"/><stop offset="1" stop-color="#E7D6BF"/></radialGradient>
</defs></svg>`;

const sesame = (cx: number, y: number, w: number) => {
  let s = '';
  for (let i = 0; i < 14; i++) {
    const x = cx - w * .36 + ((i * 47) % 100) / 100 * w * .72, yy = y + 12 + ((i * 31) % 30), r = (i * 37) % 70 - 35;
    s += `<g transform="rotate(${r} ${x} ${yy})"><ellipse cx="${x + .8}" cy="${yy + 1.2}" rx="4.6" ry="2.3" fill="#7A4518" opacity=".35"/><ellipse cx="${x}" cy="${yy}" rx="4.4" ry="2.2" fill="#FFF3D9"/><ellipse cx="${x - 1}" cy="${yy - .6}" rx="2" ry=".9" fill="#fff"/></g>`;
  }
  return s;
};
const BUNS_ART: Record<string, boolean> = { classic: true, brioche: false, violet: true, black: true };
export function bunTop(kind = 'classic'): Layer {
  const seeds = BUNS_ART[kind] ?? true, g = `url(#g-bun-${BUNS_ART[kind] === undefined ? 'classic' : kind})`;
  return { h: 70, svg: (y, cx, w) => `<g filter="url(#fx-bread)"><path d="M${cx - w / 2} ${y + 62} C ${cx - w / 2} ${y - 4}, ${cx + w / 2} ${y - 4}, ${cx + w / 2} ${y + 62} Q ${cx + w / 2} ${y + 70} ${cx + w / 2 - 12} ${y + 70} H ${cx - w / 2 + 12} Q ${cx - w / 2} ${y + 70} ${cx - w / 2} ${y + 62}z" fill="${g}"/></g>
    <path d="M${cx - w / 2 + 4} ${y + 60} Q ${cx} ${y + 72} ${cx + w / 2 - 4} ${y + 60}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="6"/>
    <ellipse cx="${cx - w * .17}" cy="${y + 19}" rx="${w * .22}" ry="9" fill="url(#g-gloss)" transform="rotate(-9 ${cx - w * .17} ${y + 19})"/>
    ${seeds ? sesame(cx, y, w) : `<ellipse cx="${cx + w * .12}" cy="${y + 14}" rx="${w * .1}" ry="4" fill="#fff" opacity=".35"/>`}` };
}
export function bunBottom(kind = 'classic'): Layer {
  const g = `url(#g-bun-${BUNS_ART[kind] === undefined ? 'classic' : kind})`;
  return { h: 32, svg: (y, cx, w) => `<g filter="url(#fx-bread)"><path d="M${cx - w / 2 + 2} ${y + 6} Q ${cx - w / 2} ${y} ${cx - w / 2 + 8} ${y} H ${cx + w / 2 - 8} Q ${cx + w / 2} ${y} ${cx + w / 2 - 2} ${y + 6} L ${cx + w / 2 - 10} ${y + 26} Q ${cx + w / 2 - 14} ${y + 32} ${cx + w / 2 - 24} ${y + 32} H ${cx - w / 2 + 24} Q ${cx - w / 2 + 14} ${y + 32} ${cx - w / 2 + 10} ${y + 26}z" fill="${g}"/>
    <rect x="${cx - w / 2 + 3}" y="${y}" width="${w - 6}" height="8" rx="4" fill="url(#g-crumb)"/></g>` };
}
const bumps = (x0: number, x1: number, y: number, amp: number, n: number) => {
  let d = `M${x0} ${y}`; const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) d += ` q${step / 2} ${-(amp * (.6 + ((i * 7) % 5) / 10))} ${step} 0`;
  return d;
};
export const LAYERS: Record<string, Layer> = {
  beef: { h: 34, svg: (y, cx, w) => `<g filter="url(#fx-meat)"><path d="${bumps(cx - w / 2 - 6, cx + w / 2 + 6, y + 6, 6, 18)} Q ${cx + w / 2 + 12} ${y + 8} ${cx + w / 2 + 10} ${y + 18} Q ${cx + w / 2 + 8} ${y + 34} ${cx + w / 2 - 8} ${y + 34} H ${cx - w / 2 + 8} Q ${cx - w / 2 - 8} ${y + 34} ${cx - w / 2 - 10} ${y + 18} Q ${cx - w / 2 - 12} ${y + 8} ${cx - w / 2 - 6} ${y + 6}z" fill="url(#g-patty)"/></g>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${cx - w * .42 + i * w * .14}" cy="${y + 12 + (i % 2) * 6}" r="1.6" fill="#E9A57A" opacity=".55"/>`).join('')}
    <path d="M${cx - w * .35} ${y + 10} Q ${cx} ${y + 4} ${cx + w * .3} ${y + 10}" stroke="#fff" stroke-opacity=".18" stroke-width="3" fill="none"/>` },
  chicken: { h: 34, svg: (y, cx, w) => `<g filter="url(#fx-crisp)"><path d="${bumps(cx - w / 2 - 10, cx + w / 2 + 10, y + 8, 9, 14)} Q ${cx + w / 2 + 18} ${y + 20} ${cx + w / 2 + 6} ${y + 32} ${bumps(cx + w / 2 + 6, cx - w / 2 - 6, y + 32, -5, 12).replace(/^M[^q]+/, '')} Q ${cx - w / 2 - 18} ${y + 20} ${cx - w / 2 - 10} ${y + 8}z" fill="url(#g-chicken)"/></g>
    ${Array.from({ length: 16 }, (_, i) => `<circle cx="${cx - w * .45 + ((i * 41) % 100) / 100 * w * .9}" cy="${y + 8 + ((i * 17) % 20)}" r="${1.2 + (i % 3) * .6}" fill="#FCE2B0" opacity=".7"/>`).join('')}` },
  cheese: { h: 10, svg: (y, cx, w) => `<g filter="url(#fx-soft)"><path d="M${cx - w / 2 - 4} ${y} H ${cx + w / 2 + 4} l-2 6 q-4 2 -6 10 q-2 8 -6 0 q-2 -6 -10 -6 H ${cx + w * .1} q-8 0 -9 12 q-2 10 -7 0 q-1 -12 -9 -12 H ${cx - w * .3} q-6 0 -7 8 q-2 6 -6 0 q-1 -8 -8 -8 H ${cx - w / 2 + 2}z" fill="url(#g-cheese)"/></g>
    <path d="M${cx - w / 2 + 6} ${y + 2} H ${cx + w / 2 - 20}" stroke="#FFF4C2" stroke-width="1.6" opacity=".8"/>` },
  lettuce: { h: 16, svg: (y, cx, w) => { let d = `M${cx - w / 2 - 14} ${y + 8}`; const n = 16, st = (w + 28) / n; for (let i = 0; i < n; i++) d += ` q${st / 2} ${i % 2 ? -9 : 9} ${st} ${i % 3 === 0 ? -2 : 1}`; return `<g filter="url(#fx-soft)"><path d="${d} L ${cx + w / 2 + 6} ${y + 16} H ${cx - w / 2 - 6}z" fill="url(#g-lettuce)"/></g>${[0, 1, 2, 3, 4].map(i => `<path d="M${cx - w * .4 + i * w * .2} ${y + 14} q 6 -6 14 -8" stroke="#E2F5B0" stroke-width="1.4" fill="none" opacity=".7"/>`).join('')}`; } },
  tomato: { h: 15, svg: (y, cx, w) => [0, 1].map(k => { const x = cx - w / 2 + 4 + k * (w / 2), sw = w / 2 - 8; return `<g filter="url(#fx-soft)"><rect x="${x}" y="${y}" width="${sw}" height="15" rx="7.5" fill="url(#g-tomato)"/></g><rect x="${x + 6}" y="${y + 3}" width="${sw - 12}" height="5" rx="2.5" fill="#FF9F86" opacity=".7"/>${[0, 1, 2].map(j => `<ellipse cx="${x + sw * (.25 + j * .25)}" cy="${y + 9}" rx="3" ry="1.6" fill="#FFE2A8" opacity=".85"/>`).join('')}`; }).join('') },
  onion: { h: 10, svg: (y, cx, w) => [0, 1, 2, 3].map(i => `<ellipse cx="${cx - w * .33 + i * w * .22}" cy="${y + 5}" rx="${w * .12}" ry="4.6" fill="none" stroke="#D68C90" stroke-width="6" opacity=".85"/><ellipse cx="${cx - w * .33 + i * w * .22}" cy="${y + 4}" rx="${w * .12}" ry="4.6" fill="none" stroke="#F7F0F0" stroke-width="2.4" opacity=".9"/>`).join('') },
  pickles: { h: 10, svg: (y, cx, w) => [0, 1, 2].map(i => { const x = cx - w * .3 + i * w * .3; return `<g filter="url(#fx-soft)"><ellipse cx="${x}" cy="${y + 5}" rx="${w * .14}" ry="6" fill="url(#g-pickle)"/></g><ellipse cx="${x}" cy="${y + 4.5}" rx="${w * .09}" ry="3.6" fill="#D8E9A0" opacity=".7"/>${[0, 1, 2, 3].map(j => `<circle cx="${x - w * .05 + j * w * .033}" cy="${y + 5 + (j % 2)}" r="1.1" fill="#F2F7D2"/>`).join('')}`; }).join('') },
  jalapeno: { h: 10, svg: (y, cx, w) => [0, 1, 2, 3, 4].map(i => { const x = cx - w * .38 + i * w * .19; return `<g filter="url(#fx-soft)"><circle cx="${x}" cy="${y + 5}" r="7.5" fill="#3E8A33"/></g><circle cx="${x}" cy="${y + 5}" r="4.6" fill="#D9EBA8"/><circle cx="${x - 1}" cy="${y + 4}" r="1.2" fill="#FFF8D8"/><circle cx="${x + 1.6}" cy="${y + 6}" r="1.1" fill="#FFF8D8"/>`; }).join('') },
  bacon: { h: 12, svg: (y, cx, w) => { let p = `M${cx - w / 2 - 8} ${y + 6}`; for (let i = 0; i < 8; i++) p += ` q${(w + 16) / 16} ${i % 2 ? -8 : 8} ${(w + 16) / 8} 0`; return `<g filter="url(#fx-soft)"><path d="${p}" fill="none" stroke="#7A2418" stroke-width="12" stroke-linecap="round"/><path d="${p}" fill="none" stroke="#C0503A" stroke-width="9" stroke-linecap="round"/></g><path d="${p}" fill="none" stroke="#F3B6A1" stroke-width="2.6" stroke-linecap="round" transform="translate(0 -1.5)"/>`; } },
  egg: { h: 15, svg: (y, cx, w) => `<g filter="url(#fx-soft)"><path d="M${cx - w / 2 + 2} ${y + 8} q4 -9 ${w * .3} -8 q${w * .2} -4 ${w * .42} 0 q${w * .3} 0 ${w * .28 - 8} 9 q-2 7 ${-w * .5} 6 q${-w * .48} 2 ${-w * .5 + 8} -7z" fill="url(#g-white)"/></g><circle cx="${cx + 8}" cy="${y + 6}" r="10" fill="url(#g-yolk)"/><ellipse cx="${cx + 4}" cy="${y + 2.5}" rx="3.5" ry="2" fill="#fff" opacity=".8"/>` },
  sauce: { h: 8, svg: (y, cx, w) => `<path d="M${cx - w / 2 + 2} ${y + 2} H ${cx + w / 2 - 2} q2 5 -6 7 q-6 0 -8 6 q-3 -8 -12 -6 H ${cx - w * .1} q-6 0 -7 9 q-3 -9 -10 -9 H ${cx - w / 2 + 14} q-6 4 -10 -2z" fill="url(#g-sauce)" filter="url(#fx-soft)"/><path d="M${cx - w * .4} ${y + 3} H ${cx + w * .3}" stroke="#fff" stroke-width="1.4" opacity=".8"/>` },
  ketchup: { h: 6, svg: (y, cx, w) => `<path d="M${cx - w / 2 + 10} ${y + 3} q${w / 8} -7 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4 - 20} 0" fill="none" stroke="url(#g-ketchup)" stroke-width="7" stroke-linecap="round" filter="url(#fx-soft)"/><path d="M${cx - w / 2 + 12} ${y + 1.5} q${w / 8} -7 ${w / 4} 0 t${w / 4} 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>` },
};
export const plateSVG = (cx: number, cy: number, rx: number) => `<ellipse cx="${cx}" cy="${cy + 12}" rx="${rx + 10}" ry="${rx * .15}" fill="#1C1213" opacity=".18" filter="url(#fx-steam)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * .15}" fill="url(#g-plate)"/><ellipse cx="${cx}" cy="${cy - 2}" rx="${rx * .7}" ry="${rx * .1}" fill="url(#g-plate-well)"/>
  <path d="M${cx - rx * .95} ${cy - 2} A ${rx} ${rx * .15} 0 0 1 ${cx + rx * .95} ${cy - 2}" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/>`;
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
    <circle cx="298" cy="146" r="7" fill="#E11D24"/><circle cx="310" cy="186" r="7" fill="#E11D24"/>
    <path d="M292 160 q12 6 22 -2 M292 196 q12 6 20 -4" stroke="#FFF3E0" stroke-width="4" fill="none"/>
    ${v === 'spicy' ? '<circle cx="306" cy="132" r="5" fill="#3F9142"/><circle cx="296" cy="204" r="5" fill="#3F9142"/>' : ''}
    ${v === 'cheese' ? '<path d="M282 150 q10 30 0 60" stroke="#F4B731" stroke-width="6" fill="none"/>' : ''}
  </g>`;
  s += `<rect x="58" y="196" width="120" height="60" rx="10" fill="#E11D24" stroke="${INK}" stroke-width="3.5" transform="rotate(-14 118 226)"/><text x="118" y="234" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="15" fill="#FFFDFC" transform="rotate(-14 118 226)">FFS</text>`;
  return s;
}
function pita(): string {
  let s = SH(200, 130);
  s += `<path d="M84 210 q-6 -120 116 -120 q122 0 116 120z" fill="#F3D9A4" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<path d="M104 200 q8 -84 96 -86 q88 2 96 86" fill="#7CB342" stroke="${INK}" stroke-width="3"/>`;
  s += `<path d="M118 200 q10 -66 82 -68 q72 2 82 68z" fill="#A0552E"/>`;
  for (let i = 0; i < 7; i++) s += `<rect x="${130 + i * 20}" y="${150 + (i % 3) * 10}" width="16" height="8" rx="3" fill="#7A3B20"/>`;
  s += `<circle cx="160" cy="146" r="9" fill="#E11D24"/><circle cx="236" cy="150" r="9" fill="#E11D24"/><path d="M140 176 q60 20 120 0" stroke="#FFF3E0" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M70 206 h260 v34 q0 20 -20 20 h-220 q-20 0 -20 -20z" fill="#FFFDFC" stroke="${INK}" stroke-width="3.5"/><path d="M70 222 h260" stroke="#E11D24" stroke-width="8"/>`;
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
  s += `<path d="M118 116 h164 l-18 150 h-128z" fill="#E11D24" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<path d="M118 116 q41 26 82 0 q41 26 82 0" fill="#EC5A5F" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<text x="200" y="210" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="34" fill="#FFFDFC">FFS</text>`;
  return s;
}
function nuggets(): string {
  let s = SH(200, 140);
  s += `<path d="M80 150 h240 l-20 108 h-200z" fill="#F4B731" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  const n = (x: number, y: number, r: number) => `<path d="M${x} ${y} q8 -22 30 -18 q26 -2 26 22 q4 22 -22 24 q-30 6 -34 -28z" fill="#D9933A" stroke="${INK}" stroke-width="3" transform="rotate(${r} ${x + 28} ${y + 4})"/><circle cx="${x + 20}" cy="${y - 2}" r="2.5" fill="#F2C178"/><circle cx="${x + 36}" cy="${y + 8}" r="2.5" fill="#F2C178"/>`;
  s += n(96, 130, -10) + n(150, 118, 12) + n(206, 128, -4) + n(250, 136, 16) + n(124, 150, 20) + n(186, 150, -14);
  s += `<path d="M80 150 h240" stroke="${INK}" stroke-width="3.5"/><rect x="96" y="180" width="208" height="40" rx="20" fill="#E11D24"/><text x="200" y="208" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="22" fill="#FFFDFC">6×</text>`;
  s += `<ellipse cx="330" cy="236" rx="34" ry="14" fill="#FFFDFC" stroke="${INK}" stroke-width="3"/><ellipse cx="330" cy="232" rx="26" ry="8" fill="#C62828"/>`;
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
    <rect x="118" y="206" width="164" height="10" fill="#E11D24" stroke="${INK}" stroke-width="2.5"/>
    <rect x="122" y="190" width="156" height="10" fill="#F4B731" stroke="${INK}" stroke-width="2.5"/></g>`;
  s += tri(-60, -8) + tri(60, 8);
  s += `<path d="M140 70 v40 M260 70 v40" stroke="${INK}" stroke-width="4"/><path d="M140 70 l-10 -14 h20z M260 70 l-10 -14 h20z" fill="#E11D24" stroke="${INK}" stroke-width="2.5"/>`;
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
  return iced({ v: 'iced', liquid: '#5A2A1A', straw: '#E11D24' });
}

/* ---------------- custom shawarma & hot dog (realistic, shared by the builders, the cart and the kitchen show) ---------------- */
const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const SAUCE_C: Record<string, [string, string]> = { garlic: ['#FBF4E4', '#E6D6B8'], spicy: ['#E2522C', '#A82A12'], ketchup: ['#D3271F', '#8E120C'], cheese: ['#FFC94A', '#D99415'], mustard: ['#F2C230', '#B58410'], bbq: ['#6E2814', '#3E1408'] };
const MEAT_G: Record<string, string> = { chicken: 'url(#g-chicken)', beef: 'url(#g-patty)' };
/** One topping piece seen from above. */
function piece(kind: string, x: number, y: number, r: number, i: number): string {
  const tr = `transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(0)})"`;
  switch (kind) {
    case 'chicken': case 'beef': return `<g ${tr}><rect x="-15" y="-5" width="30" height="10" rx="5" fill="${MEAT_G[kind]}"/><path d="M-10 -2 h14" stroke="${kind === 'beef' ? '#A9643E' : '#FCE2B0'}" stroke-width="1.6" opacity=".7"/><circle cx="${-6 + (i % 3) * 5}" cy="2" r="1.4" fill="${kind === 'beef' ? '#2A1006' : '#8A4A1A'}" opacity=".6"/></g>`;
    case 'fries': return `<g ${tr}><rect x="-3.5" y="-17" width="7" height="34" rx="2.6" fill="#F6CA4C"/><rect x="-3.5" y="-17" width="2.4" height="34" rx="1.2" fill="#FFE59A"/><rect x="-3.5" y="12" width="7" height="5" rx="2" fill="#D99A28"/></g>`;
    case 'tomato': return `<g ${tr}><rect x="-6" y="-6" width="12" height="12" rx="3" fill="url(#g-tomato)"/><ellipse cx="1" cy="1" rx="2.6" ry="1.4" fill="#FFE2A8" opacity=".85"/></g>`;
    case 'cucumber': return `<g ${tr}><circle r="9" fill="#4E8A2C"/><circle r="7" fill="#D7EDA6"/><circle r="3.4" fill="#BFDE86"/>${[0, 1, 2, 3].map(j => `<ellipse cx="${(Math.cos(j * 1.57) * 3.6).toFixed(1)}" cy="${(Math.sin(j * 1.57) * 3.6).toFixed(1)}" rx="1.3" ry=".8" fill="#F4FAD8"/>`).join('')}</g>`;
    case 'pickles': return `<g ${tr}><ellipse rx="11" ry="7" fill="url(#g-pickle)"/><ellipse rx="7" ry="4.2" fill="#D8E9A0" opacity=".7"/>${[0, 1, 2].map(j => `<circle cx="${-4 + j * 4}" cy="${j % 2}" r="1" fill="#F2F7D2"/>`).join('')}</g>`;
    case 'cabbage': return `<g ${tr}><path d="M-14 0 q7 -6 14 0 t14 0" stroke="#E8F5CC" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-12 5 q6 -5 12 0 t12 0" stroke="#C4E28E" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`;
    case 'carrot': return `<g ${tr}><path d="M-14 -2 q8 -5 16 2 t12 -2" stroke="#F08A24" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M-12 4 q8 3 14 -1 t10 2" stroke="#F7A548" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
    case 'onion': return `<g ${tr}><ellipse rx="10" ry="6" fill="none" stroke="#D68C90" stroke-width="3"/><ellipse rx="10" ry="6" fill="none" stroke="#F7F0F0" stroke-width="1.2"/></g>`;
    case 'crispy': return `<g ${tr}><path d="M-8 2 q3 -8 9 -4 q5 4 -1 6 q-5 2 -8 -2z" fill="#B9782E"/><path d="M-4 -1 q3 -3 6 -1" stroke="#E4B064" stroke-width="1.2" fill="none"/></g>`;
    case 'cheese': return `<g ${tr}><rect x="-8" y="-2" width="16" height="4" rx="2" fill="url(#g-cheese)"/></g>`;
    case 'jalapeno': return `<g ${tr}><circle r="7" fill="#3E8A33"/><circle r="4.4" fill="#D9EBA8"/><circle cx="-1" cy="-1" r="1.1" fill="#FFF8D8"/><circle cx="1.5" cy="1.2" r="1" fill="#FFF8D8"/></g>`;
    case 'bacon': return `<g ${tr}><path d="M-16 0 q4 -6 8 0 t8 0 t8 0 t8 0" stroke="#7A2418" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-16 0 q4 -6 8 0 t8 0 t8 0 t8 0" stroke="#C0503A" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M-16 -1 q4 -6 8 0 t8 0" stroke="#F3B6A1" stroke-width="1.4" fill="none"/></g>`;
  }
  return '';
}
const zig = (x0: number, x1: number, y: number, amp: number, n: number) => { let d = `M${x0.toFixed(1)} ${y.toFixed(1)}`; const st = (x1 - x0) / n; for (let i = 0; i < n; i++) d += ` l${(st / 2).toFixed(1)} ${(i % 2 ? amp : -amp).toFixed(1)} l${(st / 2).toFixed(1)} ${(i % 2 ? -amp : amp).toFixed(1)}`; return d; };
const sauceLine = (id: string, d: string, w = 5) => { const [c, dark] = SAUCE_C[id] ?? SAUCE_C.garlic; return `<path d="${d}" stroke="${dark}" stroke-width="${w + 1.6}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55" transform="translate(0 1.4)"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55" transform="translate(-.6 -1.2)"/>`; };
const ADD_N: Record<string, number> = { fries: 9, tomato: 9, cucumber: 6, pickles: 6, cabbage: 9, carrot: 9, onion: 6, cheese: 14, jalapeno: 6, chicken: 11, beef: 11 };

/** The open lavash or pita seen from above, everything laid on a band across the middle. Groups carry data-part for the builder's animations. */
export function wrapTopSVG(w: WrapSpec, cx = 200, cy = 290): string {
  const pita = w.base === 'pita';
  let s = `<ellipse cx="${cx}" cy="${cy + 176}" rx="170" ry="16" fill="#1A1414" opacity=".12"/>`;
  s += `<g data-part="base"><g filter="url(#fx-bread)">${pita
    ? `<circle cx="${cx}" cy="${cy}" r="152" fill="url(#g-lav-pita)"/><circle cx="${cx}" cy="${cy}" r="132" fill="none" stroke="#E9C890" stroke-width="10" opacity=".5"/>`
    : `<path d="M${cx - 150} ${cy - 150} q-4 -16 14 -18 h272 q18 2 14 20 v296 q2 16 -16 18 h-270 q-18 -2 -16 -18z" fill="url(#g-lav-${w.base === 'red' ? 'red' : 'lavash'})"/>`}</g>
    ${Array.from({ length: 22 }, (_, i) => { const a = rnd(i, 1) * Math.PI * 2, rr = (pita ? 130 : 150) * Math.sqrt(rnd(i, 2)); return `<ellipse cx="${(cx + Math.cos(a) * rr * (pita ? 1 : 1)).toFixed(1)}" cy="${(cy + Math.sin(a) * rr * (pita ? 1 : 1.05)).toFixed(1)}" rx="${(3 + rnd(i, 3) * 7).toFixed(1)}" ry="${(2 + rnd(i, 4) * 4).toFixed(1)}" fill="${w.base === 'red' ? '#B5552C' : '#B07A3A'}" opacity="${(.18 + rnd(i, 5) * .25).toFixed(2)}"/>`; }).join('')}</g>`;
  const bx0 = cx - 104, bw = 208, by0 = cy - 50, bh = 100;
  // a base smear of the first sauce
  if (w.sauces[0]) s += `<g data-part="smear"><ellipse cx="${cx}" cy="${cy}" rx="${bw / 2 + 8}" ry="${bh / 2 + 4}" fill="${(SAUCE_C[w.sauces[0]] ?? SAUCE_C.garlic)[0]}" opacity=".55"/></g>`;
  const meats = w.meat === 'mix' ? ['chicken', 'beef'] : [w.meat];
  const nMeat = Math.round(ADD_N.chicken * (w.double ? 1.7 : 1) / meats.length);
  let k = 0;
  s += `<g data-part="meat" filter="url(#fx-soft)">${meats.map((m, mi) => Array.from({ length: nMeat }, (_, i) => piece(m, bx0 + 12 + rnd(i + mi * 50, 7) * (bw - 24), by0 + 12 + rnd(i + mi * 50, 8) * (bh - 24), rnd(i + mi * 50, 9) * 360, i)).join('')).join('')}</g>`;
  for (const a of w.add) {
    k++;
    const n = ADD_N[a] ?? 6;
    s += `<g data-part="add:${a}">${Array.from({ length: n }, (_, i) => piece(a, bx0 + 10 + rnd(i + k * 31, 11) * (bw - 20), by0 + 8 + rnd(i + k * 31, 12) * (bh - 16), rnd(i + k * 31, 13) * 360, i)).join('')}</g>`;
  }
  w.sauces.forEach((sc, i) => { s += `<g data-part="sauce:${sc}">${sauceLine(sc, zig(bx0 + 6, bx0 + bw - 6, by0 + 26 + i * 22, 12, 9 + i * 2), sc === 'cheese' ? 6 : 4.6)}</g>`; });
  return s;
}

/** The rolled shawarma from the side, half in FFS paper, the open end showing what's inside. */
export function wrapRolledSVG(w: WrapSpec, cx = 200, cy = 170, len = 280): string {
  if (w.base === 'pita') return pitaPocketSVG(w, cx, cy + 40, len * .82);
  const r = 44, x0 = cx - len / 2, x1 = cx + len / 2, g = w.base === 'red' ? 'url(#g-roll-red)' : 'url(#g-roll)';
  const meatC = w.meat === 'beef' ? '#6A3620' : w.meat === 'mix' ? '#8A4A28' : '#D99A4A';
  const inside = [meatC, ...w.add.map(a => ({ fries: '#F4C542', tomato: '#E5432C', cucumber: '#7DBA3E', pickles: '#8DAF44', cabbage: '#D6EDB0', carrot: '#F08A24', onion: '#DCA0A3', cheese: '#F7B92E', jalapeno: '#3E8A33' } as Record<string, string>)[a]).filter(Boolean)];
  let s = `<ellipse cx="${cx}" cy="${cy + r + 14}" rx="${len / 2 + 20}" ry="12" fill="#1A1414" opacity=".14"/>`;
  s += `<g filter="url(#fx-bread)"><rect x="${x0}" y="${cy - r}" width="${len}" height="${r * 2}" rx="${r}" fill="${g}"/></g>`;
  // grill marks
  for (let i = 0; i < 6; i++) { const x = x0 + 70 + i * (len - 120) / 6; s += `<path d="M${x.toFixed(1)} ${cy - r + 6} l18 ${r * 2 - 12}" stroke="#8A5424" stroke-width="5" stroke-linecap="round" opacity=".38"/>`; }
  s += `<path d="M${x0 + 40} ${cy - r + 12} H${x1 - 50}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".28"/>`;
  // the open end
  s += `<ellipse cx="${x1 - 6}" cy="${cy}" rx="22" ry="${r}" fill="${w.base === 'red' ? '#F2B48E' : '#F7E2B4'}"/><ellipse cx="${x1 - 6}" cy="${cy}" rx="16" ry="${r - 8}" fill="${meatC}"/>`;
  s += inside.slice(1).map((c, i) => `<circle cx="${(x1 - 10 + Math.cos(i * 2.1) * 8).toFixed(1)}" cy="${(cy + Math.sin(i * 2.1) * (r - 18)).toFixed(1)}" r="${(5 + (i % 2) * 2)}" fill="${c}"/>`).join('');
  w.sauces.forEach((sc, i) => { s += `<path d="M${x1 - 18} ${cy - r + 14 + i * 14} q10 6 18 0" stroke="${(SAUCE_C[sc] ?? SAUCE_C.garlic)[0]}" stroke-width="4" fill="none" stroke-linecap="round"/>`; });
  s += `<path d="M${x1 - 6} ${cy - r} a22 ${r} 0 0 1 0 ${r * 2}" fill="none" stroke="${w.base === 'red' ? '#C9744A' : '#D9AE6A'}" stroke-width="5"/>`;
  // paper sleeve
  s += `<g filter="url(#fx-soft)"><path d="M${x0 - 4} ${cy - r - 4} H${cx - 10} l-14 ${r * 2 + 8} H${x0 - 4} q-12 0 -12 -${r} q0 -${r + 4} 12 -${r + 4}z" fill="url(#g-paper)"/></g>`;
  s += `<path d="M${x0 + 6} ${cy - r + 6} H${cx - 26}" stroke="#fff" stroke-width="4" opacity=".25" stroke-linecap="round"/><text x="${x0 + (cx - x0) / 2 - 8}" y="${cy + 12}" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="25" fill="#FFFDFC" opacity=".9">FFS</text>`;
  if (w.double) s += `<g transform="translate(${x0 + 30} ${cy - r - 18})"><rect x="-18" y="-12" width="36" height="22" rx="11" fill="#1A1414"/><text x="0" y="4" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="12" fill="#fff">×2</text></g>`;
  return s;
}
function pitaPocketSVG(w: WrapSpec, cx: number, base: number, wd: number): string {
  const h = wd * .55;
  let s = `<ellipse cx="${cx}" cy="${base + 12}" rx="${wd / 2 + 16}" ry="12" fill="#1A1414" opacity=".14"/>`;
  s += `<g filter="url(#fx-bread)"><path d="M${cx - wd / 2} ${base} q0 -${h * 1.25} ${wd / 2} -${h * 1.25} q${wd / 2} 0 ${wd / 2} ${h * 1.25}z" fill="url(#g-lav-pita)"/></g>`;
  // what's inside, peeking out of the top
  const meats = w.meat === 'mix' ? ['chicken', 'beef'] : [w.meat];
  let fill = Array.from({ length: w.double ? 12 : 8 }, (_, i) => piece(meats[i % meats.length], cx - wd * .32 + rnd(i, 21) * wd * .64, base - h * .95 + rnd(i, 22) * 26, rnd(i, 23) * 60 - 30, i)).join('');
  w.add.forEach((a, k) => { fill += Array.from({ length: 4 }, (_, i) => piece(a, cx - wd * .3 + rnd(i + k * 9, 24) * wd * .6, base - h * 1.02 + rnd(i + k * 9, 25) * 22, rnd(i + k * 9, 26) * 360, i)).join(''); });
  s += `<g filter="url(#fx-soft)">${fill}</g>`;
  w.sauces.forEach((sc, i) => { s += sauceLine(sc, zig(cx - wd * .3, cx + wd * .3, base - h * .98 + i * 10, 6, 8), 4); });
  s += `<g filter="url(#fx-bread)"><path d="M${cx - wd / 2 + 4} ${base} q0 -${h * .8} ${wd / 2 - 4} -${h * .82} q${wd / 2 - 4} 0 ${wd / 2 - 4} ${h * .82}z" fill="url(#g-lav-pita)"/></g>`;
  s += `<path d="M${cx - wd / 2 + 6} ${base - 4} h${wd - 12} v-${h * .42} h-${wd - 12}z" fill="url(#g-paper)" opacity=".95"/><text x="${cx}" y="${base - h * .12}" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="21" fill="#FFFDFC" opacity=".9">FFS</text>`;
  return s;
}

/** A hot dog from the side: back of the bun, sausage, toppings, sauces, front of the bun. */
export function hotdogSVG(h: HotdogSpec, cx = 200, base = 250, L = 290): string {
  const g = `url(#g-bun-${['classic', 'brioche', 'violet', 'black'].includes(h.bun) ? h.bun : 'classic'})`;
  const S = L * (h.xl ? 1.24 : 1.03), sy = base - 46, R = 17;
  let s = `<ellipse cx="${cx}" cy="${base + 8}" rx="${Math.max(L, S) / 2 + 16}" ry="12" fill="#1A1414" opacity=".14"/>`;
  s += `<g data-part="bunback"><g filter="url(#fx-bread)"><path d="M${cx - L / 2 + 8} ${base - 36} Q${cx - L / 2} ${base - 82} ${cx - L / 2 + 34} ${base - 84} H${cx + L / 2 - 34} Q${cx + L / 2} ${base - 82} ${cx + L / 2 - 8} ${base - 36}z" fill="${g}"/></g>
    <path d="M${cx - L / 2 + 16} ${base - 44} Q${cx} ${base - 62} ${cx + L / 2 - 16} ${base - 44}" stroke="url(#g-crumb)" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M${cx - L / 2 + 40} ${base - 76} H${cx + L / 2 - 60}" stroke="#fff" stroke-width="5" opacity=".3" stroke-linecap="round"/></g>`;
  s += `<g data-part="sausage"><g filter="url(#fx-meat)"><rect x="${cx - S / 2}" y="${sy - R}" width="${S}" height="${R * 2}" rx="${R}" fill="url(#g-saus-${h.sausage})"/></g>
    <path d="M${cx - S / 2 + 14} ${sy - R + 7} H${cx + S / 2 - 18}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".35"/>
    ${h.sausage === 'smoked' || h.sausage === 'beef' ? Array.from({ length: 7 }, (_, i) => `<path d="M${(cx - S * .36 + i * S * .12).toFixed(1)} ${sy - R + 4} l10 ${R * 2 - 10}" stroke="#2A0E06" stroke-width="3.4" opacity=".45" stroke-linecap="round"/>`).join('') : ''}
    ${h.sausage === 'spicy' ? Array.from({ length: 14 }, (_, i) => `<circle cx="${(cx - S * .42 + rnd(i, 31) * S * .84).toFixed(1)}" cy="${(sy - R + 6 + rnd(i, 32) * (R * 2 - 12)).toFixed(1)}" r="1.5" fill="#FFB27A" opacity=".8"/>`).join('') : ''}</g>`;
  // toppings, each a thin layer above the last
  const top = sy - R + 4, span = Math.min(S, L) * .84;
  h.tops.forEach((tp, k) => {
    const y = top - k * 7;
    let p = '';
    if (tp === 'cheese') p = `<path d="M${cx - span / 2} ${y - 2} H${cx + span / 2} ${Array.from({ length: 8 }, (_, i) => `l-${(span / 8 * .4).toFixed(1)} ${(6 + (i % 3) * 5).toFixed(0)} l-${(span / 8 * .2).toFixed(1)} -${(6 + (i % 3) * 5).toFixed(0)} l-${(span / 8 * .4).toFixed(1)} 0`).join(' ')}z" fill="url(#g-cheese)" filter="url(#fx-soft)"/>`;
    else if (tp === 'bacon') p = `<g filter="url(#fx-soft)">${sauceLine('bbq', zig(cx - span / 2, cx + span / 2, y - 2, 4, 10), 8).replace(/#6E2814/g, '#C0503A').replace(/#3E1408/g, '#7A2418')}</g>`;
    else { const kind = tp === 'onion' ? 'crispy' : tp; const n = Math.round(span / 22); p = `<g filter="url(#fx-soft)">${Array.from({ length: n }, (_, i) => piece(kind, cx - span / 2 + (i + .5) * span / n + (rnd(i + k * 7, 41) - .5) * 8, y - 3 + rnd(i + k * 7, 42) * 4, kind === 'pickles' || kind === 'jalapeno' ? 0 : rnd(i + k * 7, 43) * 360, i).replace(/<ellipse rx="11" ry="7"/, '<ellipse rx="11" ry="5"')).join('')}</g>`; }
    s += `<g data-part="top:${tp}">${p}</g>`;
  });
  const sTop = top - h.tops.length * 7 - 4;
  h.sauces.forEach((sc, i) => { s += `<g data-part="sauce:${sc}">${sauceLine(sc, zig(cx - span / 2 + 6, cx + span / 2 - 6, sTop - i * 3, 6, 12 + i * 2), sc === 'cheese' ? 6 : 4.4)}</g>`; });
  s += `<g data-part="bunfront"><g filter="url(#fx-bread)"><path d="M${cx - L / 2} ${base - 42} Q${cx - L / 2} ${base} ${cx - L / 2 + 30} ${base} H${cx + L / 2 - 30} Q${cx + L / 2} ${base} ${cx + L / 2} ${base - 42} Q${cx} ${base - 30} ${cx - L / 2} ${base - 42}z" fill="${g}"/></g>
    <path d="M${cx - L / 2 + 22} ${base - 30} Q${cx} ${base - 20} ${cx + L / 2 - 22} ${base - 30}" stroke="#fff" stroke-width="4" opacity=".22" fill="none" stroke-linecap="round"/>
    ${h.bun === 'classic' || h.bun === 'violet' || h.bun === 'black' ? Array.from({ length: 10 }, (_, i) => `<ellipse cx="${(cx - L * .4 + rnd(i, 51) * L * .8).toFixed(1)}" cy="${(base - 30 + rnd(i, 52) * 18).toFixed(1)}" rx="3.6" ry="1.8" fill="#FFF3D9" transform="rotate(${(rnd(i, 53) * 60 - 30).toFixed(0)} ${(cx - L * .4 + rnd(i, 51) * L * .8).toFixed(1)} ${(base - 30 + rnd(i, 52) * 18).toFixed(1)})"/>`).join('') : ''}</g>`;
  return s;
}


/** A crispy drumstick: craggy golden coating and a bone end. */
function drumstick(x: number, y: number, rot: number, s = 1, spicy = false): string {
  const coat = spicy ? '#C2461C' : '#D98A2E', hi = spicy ? '#E8743C' : '#F2B45A';
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M30 -6 l26 -4 q10 -6 14 2 q8 2 2 10 q2 10 -8 6 l-26 6z" fill="#FFF6E6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M-44 0 q-4 -30 26 -34 q22 -4 42 10 q14 10 10 22 q-4 14 -22 18 q-30 8 -46 -2 q-12 -6 -10 -14z" fill="${coat}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-30 -14 q8 -12 24 -12 M-20 0 q10 -6 20 -2 M-8 12 q10 0 18 -6" stroke="${hi}" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${[[-26, -6], [-12, -18], [4, -10], [-4, 8], [14, 4], [-34, 6]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2.2" fill="${spicy ? '#7A1E08' : '#A45A16'}"/>`).join('')}
  </g>`;
}
function bucket(): string {
  let s = SH(200, 120);
  // chicken piled above the rim
  s += drumstick(150, 92, -28, .95) + drumstick(250, 88, 208, .95) + drumstick(200, 70, -84, .9) + drumstick(170, 112, 12, .85) + drumstick(236, 114, 168, .85);
  // the bucket: red and white stripes, FFS band
  s += `<clipPath id="bkClip"><path d="M100 120 h200 l-22 140 q-2 8 -10 8 h-136 q-8 0 -10 -8z"/></clipPath>`;
  s += `<path d="M100 120 h200 l-22 140 q-2 8 -10 8 h-136 q-8 0 -10 -8z" fill="#FFFDFC"/>`;
  s += `<g clip-path="url(#bkClip)">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${92 + i * 40}" y="110" width="20" height="170" fill="#E11D24"/>`).join('')}</g>`;
  s += `<path d="M100 120 h200 l-22 140 q-2 8 -10 8 h-136 q-8 0 -10 -8z" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<rect x="92" y="110" width="216" height="20" rx="6" fill="#FFFDFC" stroke="${INK}" stroke-width="3.5"/>`;
  s += `<rect x="132" y="168" width="136" height="48" rx="10" fill="#FFFDFC" stroke="${INK}" stroke-width="3"/><text x="200" y="203" text-anchor="middle" font-family="Dela Gothic One, sans-serif" font-size="28" fill="${INK}">FFS</text>`;
  return s;
}
function drumsticks(v?: string): string {
  let s = SH(200, 150);
  s += `<ellipse cx="200" cy="238" rx="150" ry="26" fill="#FFFDFC" stroke="${INK}" stroke-width="3.5"/><path d="M70 236 q130 22 260 0" stroke="#E11D24" stroke-width="5" fill="none" stroke-dasharray="14 10"/>`;
  s += drumstick(150, 196, -12, 1.05, v === 'spicy') + drumstick(250, 190, 192, 1.05, v === 'spicy') + drumstick(200, 160, -60, 1, v === 'spicy');
  if (v === 'spicy') s += [[120, 150], [282, 146], [210, 118]].map(([x, y]) => `<path d="M${x} ${y} q10 -16 22 -6 q-6 14 -22 6z" fill="#C62828" stroke="${INK}" stroke-width="2.5"/><path d="M${x + 18} ${y - 10} l6 -6" stroke="#3F7D3A" stroke-width="3" stroke-linecap="round"/>`).join('');
  return s;
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
    case 'bucket': return bucket();
    case 'drumsticks': return drumsticks(a.variant);
    case 'pizza': return pizza();
    case 'club': return club();
    case 'croissant': return croissant(a.variant);
    case 'cheesecake': return slice('#F7F0E1', ['#FFF6E4', '#FFF6E4', '#D9A75F'], `<path d="M150 ${96} q30 -14 60 -4 q30 8 60 0" stroke="#C2185B" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="200" cy="86" r="12" fill="#C2185B" stroke="${INK}" stroke-width="2.5"/><circle cx="240" cy="92" r="10" fill="#9A1B21" stroke="${INK}" stroke-width="2.5"/>`);
    case 'tiramisu': return slice('#6B4226', ['#F6E7CF', '#8A5A3B', '#F6E7CF', '#8A5A3B'], [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<circle cx="${140 + i * 18}" cy="${96 + (i % 3) * 5}" r="2.4" fill="#3A1F14"/>`).join(''));
    case 'medovik': return slice('#E9B44C', ['#C98A3C', '#F7E6C4', '#C98A3C', '#F7E6C4', '#C98A3C', '#F7E6C4'], [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${150 + i * 26}" cy="${96 + (i % 2) * 6}" r="3" fill="#A0652A"/>`).join(''));
    case 'soda': return soda();
    case 'cwrap': return wrapRolledSVG(a.w, 200, 160, 290);
    case 'chotdog': return hotdogSVG(a.h, 200, 250, 300);
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
