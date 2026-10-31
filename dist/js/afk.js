// Away screen: when the visitor leaves the site open and idle, a calm kitchen scene fades in over the page.
// One cook, three acts on a loop: a latte, a burger (with a flip that goes a little too high) and a lavash
// (rolled with a little too much confidence). Any touch, key, scroll or real mouse move brings the site back.
// Try it fast with ?afk=5 (seconds). Off for reduced motion.
import { $, clamp, reduced, state, t, money, addLine, toast, on } from './shared.js';
import { ITEM } from './data.js';
import { latteArt, LAYERS, bunTop, bunBottom } from './art.js';
const START_AT = Number(new URLSearchParams(location.search).get('afkt')) || 0; // jump into the loop (seconds), for previews
const IDLE_MS = (() => { const v = Number(new URLSearchParams(location.search).get('afk')); return v > 0 ? v * 1000 : 50000; })();
const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const win = (tm, a, b) => clamp((tm - a) / (b - a));
const between = (tm, a, b) => tm >= a && tm < b;
const f1 = (n) => n.toFixed(1);
/** Piecewise path through [time, a, b] keyframes with smooth easing between them. */
function track(keys, tm) {
    if (tm <= keys[0][0])
        return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) {
        const [t1, x1, y1] = keys[i];
        if (tm <= t1) {
            const [t0, x0, y0] = keys[i - 1];
            const k = ease((tm - t0) / Math.max(.001, t1 - t0));
            return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
        }
    }
    const l = keys[keys.length - 1];
    return [l[1], l[2]];
}
const ACTS = [
    { id: 'coffee', dur: 24, steps: [0, 4, 7, 12.6, 16, 19.8], cap: 'afk.s', title: 'afk.title', order: 'afk.order', item: 'latte', size: 'M' },
    { id: 'burger', dur: 18.5, steps: [0, 4, 7.2, 10.3, 13.5, 15.6], cap: 'afk.b', title: 'afk.titleB', order: 'afk.orderB', item: 'classic-burger' },
    { id: 'wrap', dur: 18.5, steps: [0, 3.4, 8, 10.1, 12.6, 15.6], cap: 'afk.w', title: 'afk.titleW', order: 'afk.orderW', item: 'lavash-chicken' },
];
const TOTAL = ACTS.reduce((a, x) => a + x.dur, 0);
const MOUTH = {
    neutral: 'M691 276 q9 3 18 0', smile: 'M689 273 q11 10 22 0', smirk: 'M692 278 q8 1 13 -3 q3 -2 5 -5', o: 'M696 276 a4 4.6 0 1 0 8 0 a4 4.6 0 1 0 -8 0',
};
const UPPER = 112, FORE = 104;
function ik(sx, sy, tx, ty, side) {
    let dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy);
    const max = UPPER + FORE - 1;
    if (d > max) {
        dx *= max / d;
        dy *= max / d;
        d = max;
    }
    const base = Math.atan2(dy, dx);
    const a = Math.acos(clamp((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d), -1, 1));
    const ang = base + a * side;
    return { ex: sx + Math.cos(ang) * UPPER, ey: sy + Math.sin(ang) * UPPER, hx: sx + dx, hy: sy + dy };
}
/** Tapered limb segment (a quad with round ends). */
function seg(x1, y1, w1, x2, y2, w2, fill) {
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    const p = [[x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x2 + nx * w2 / 2, y2 + ny * w2 / 2], [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2]];
    return `<polygon points="${p.map(q => q.map(f1).join(',')).join(' ')}" fill="${fill}"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="${w1 / 2}" fill="${fill}"/><circle cx="${f1(x2)}" cy="${f1(y2)}" r="${w2 / 2}" fill="${fill}"/>`;
}
function arm(sx, sy, tx, ty, side) {
    const { ex, ey, hx, hy } = ik(sx, sy, tx, ty, side);
    const fa = Math.atan2(hy - ey, hx - ex), ua = Math.atan2(ey - sy, ex - sx);
    const ox = -Math.sin(ua) * side * 6, oy = Math.cos(ua) * side * 6;
    const fox = -Math.sin(fa) * side * 4, foy = Math.cos(fa) * side * 4;
    const deg = fa * 180 / Math.PI;
    let s = `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="25" fill="#E4D9CB"/>`;
    s += seg(sx, sy, 44, ex, ey, 33, '#EAE0D3');
    s += `<line x1="${f1(sx + ox)}" y1="${f1(sy + oy)}" x2="${f1(ex + ox)}" y2="${f1(ey + oy)}" stroke="rgba(255,255,255,.45)" stroke-width="6" stroke-linecap="round"/>`;
    s += `<line x1="${f1(sx - ox * 2.4)}" y1="${f1(sy - oy * 2.4)}" x2="${f1(ex - ox * 2)}" y2="${f1(ey - oy * 2)}" stroke="rgba(60,40,30,.12)" stroke-width="6" stroke-linecap="round"/>`;
    s += seg(ex, ey, 25, hx - Math.cos(fa) * 8, hy - Math.sin(fa) * 8, 17, '#D49A74');
    s += `<line x1="${f1(ex + fox)}" y1="${f1(ey + foy)}" x2="${f1(hx - Math.cos(fa) * 12 + fox)}" y2="${f1(hy - Math.sin(fa) * 12 + foy)}" stroke="rgba(255,230,210,.35)" stroke-width="4" stroke-linecap="round"/>`;
    s += `<circle cx="${f1(ex)}" cy="${f1(ey)}" r="18" fill="#DCCFBF"/><path d="M${f1(ex - 15)} ${f1(ey)} a15 15 0 0 0 30 0" fill="none" stroke="#C8BAA6" stroke-width="2.5"/>`;
    s += `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(${f1(deg)})"><ellipse cx="0" cy="0" rx="13.5" ry="10.5" fill="url(#aSkin)"/><ellipse cx="2" cy="${-8 * side}" rx="6.5" ry="3.8" fill="#D49A74" transform="rotate(${-25 * side})"/><path d="M6 -6 q4 6 0 12" fill="none" stroke="rgba(90,50,30,.25)" stroke-width="1.6"/></g>`;
    return { hx, hy, svg: s };
}
function rotAround(x, y, cx, cy, deg) {
    const a = deg * Math.PI / 180, dx = x - cx, dy = y - cy;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}
function drawCook(p, tm) {
    const tilt = p.lean * .06;
    $('#akBody').setAttribute('transform', `translate(${f1(p.lean)} 0) rotate(${f1(tilt)} 700 640)`);
    $('#akHead').setAttribute('transform', `rotate(${f1(p.head[0] * .5)} 700 300) translate(${f1(p.head[0] * .25)} ${f1(p.head[1] * .35)})`);
    const blink = (tm % 4.3) > 4.16 ? .12 : 1;
    const lx = clamp(p.look[0], -8, 8) * .38, ly = clamp(p.look[1], -8, 8) * .3;
    ['L', 'R'].forEach(sd => {
        const cx = sd === 'L' ? 687 : 713, b = sd === 'R' && p.wink ? .1 : blink;
        $('#akEye' + sd).setAttribute('transform', `translate(0 ${f1(245 * (1 - b))}) scale(1 ${b})`);
        const pu = $('#akPup' + sd);
        pu.setAttribute('cx', f1(cx + lx));
        pu.setAttribute('cy', f1(245 + ly));
    });
    $('#akBrows').setAttribute('transform', `translate(0 ${f1(-p.brows)})`);
    const m = $('#akMouth');
    m.setAttribute('d', MOUTH[p.mouth]);
    m.setAttribute('fill', p.mouth === 'o' ? '#5A2A22' : 'none');
    const sR = rotAround(792 + p.lean, 326, 700 + p.lean, 640, tilt), sL = rotAround(608 + p.lean, 326, 700 + p.lean, 640, tilt);
    const R = arm(sR[0], sR[1], p.R[0], p.R[1], -1), L = arm(sL[0], sL[1], p.L[0], p.L[1], 1);
    $('#akArms').innerHTML = L.svg + R.svg;
    return { R, L };
}
/* ===================== scene ===================== */
const DEFS = `<defs>
  <linearGradient id="aWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1934"/><stop offset=".7" stop-color="#1C1024"/><stop offset="1" stop-color="#140B1A"/></linearGradient>
  <radialGradient id="aLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD38A" stop-opacity=".55"/><stop offset=".45" stop-color="#FFB45A" stop-opacity=".18"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient>
  <linearGradient id="aWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5636"/><stop offset=".08" stop-color="#6B3F25"/><stop offset="1" stop-color="#3E2314"/></linearGradient>
  <linearGradient id="aTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DCCB"/><stop offset="1" stop-color="#BBA48B"/></linearGradient>
  <linearGradient id="aBoard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9A876"/><stop offset=".3" stop-color="#C08A57"/><stop offset="1" stop-color="#8E5E36"/></linearGradient>
  <linearGradient id="aChrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5D5B66"/><stop offset=".18" stop-color="#E9E7EF"/><stop offset=".4" stop-color="#9C99A6"/><stop offset=".7" stop-color="#F4F3F8"/><stop offset="1" stop-color="#6B6875"/></linearGradient>
  <linearGradient id="aBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3B2357"/><stop offset=".35" stop-color="#6A3FA0"/><stop offset=".65" stop-color="#5A3590"/><stop offset="1" stop-color="#2E1A45"/></linearGradient>
  <linearGradient id="aShirt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#CDBFAE"/><stop offset=".45" stop-color="#F2EADF"/><stop offset="1" stop-color="#C2B4A1"/></linearGradient>
  <linearGradient id="aApron" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2C1A3C"/><stop offset=".5" stop-color="#4A2C66"/><stop offset="1" stop-color="#26162F"/></linearGradient>
  <radialGradient id="aSkin" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#F0C9A6"/><stop offset=".7" stop-color="#D9A27C"/><stop offset="1" stop-color="#B98060"/></radialGradient>
  <linearGradient id="aSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7E7B88"/><stop offset=".3" stop-color="#F2F1F6"/><stop offset=".6" stop-color="#ABA8B4"/><stop offset="1" stop-color="#5F5C69"/></linearGradient>
  <linearGradient id="aCup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D8D0DE"/><stop offset=".4" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9BFD2"/></linearGradient>
  <radialGradient id="aCrema" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#D8A06A"/><stop offset=".8" stop-color="#9A5A2E"/><stop offset="1" stop-color="#6B3A1C"/></radialGradient>
  <linearGradient id="aLav" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8E6BE"/><stop offset=".6" stop-color="#E8C487"/><stop offset="1" stop-color="#C99A5A"/></linearGradient>
  <linearGradient id="aDoner" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5A2C14"/><stop offset=".35" stop-color="#B8642C"/><stop offset=".6" stop-color="#D9864A"/><stop offset="1" stop-color="#6A3418"/></linearGradient>
  <radialGradient id="aHeat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF8A3A" stop-opacity=".55"/><stop offset="1" stop-color="#FF5A1A" stop-opacity="0"/></radialGradient>
  <filter id="aBlur"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="aSoft" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>
  <clipPath id="aInset"><circle cx="1010" cy="190" r="104"/></clipPath>
  <clipPath id="aCone"><path d="M890 296 Q930 284 970 296 L952 468 Q930 476 908 468z"/></clipPath>
</defs>`;
const board = (x, w) => `<g filter="url(#aSoft)"><rect x="${x}" y="488" width="${w}" height="16" rx="6" fill="url(#aBoard)"/></g><rect x="${x + 6}" y="489" width="${w - 12}" height="3" rx="1.5" fill="rgba(255,255,255,.3)"/>`;
function sceneSVG() {
    const jars = [0, 1, 2, 3, 4].map(i => { const x = 120 + i * 70; return `<g transform="translate(${x} 150)"><rect x="-22" y="-56" width="44" height="56" rx="8" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.18)"/><rect x="-18" y="-${20 + (i * 7) % 24}" width="36" height="${16 + (i * 7) % 24}" rx="4" fill="${['#5A3220', '#7A4A2A', '#3E2316', '#8A5A36', '#4A2A1A'][i]}"/><rect x="-24" y="-64" width="48" height="10" rx="4" fill="#3A2A44"/></g>`; }).join('');
    const bokeh = Array.from({ length: 14 }, (_, i) => `<circle class="ak-bokeh" style="--d:${(i * .9) % 8}s;--x:${(i % 2 ? 1 : -1) * (10 + i * 2)}px" cx="${(i * 83) % 1200}" cy="${80 + (i * 47) % 380}" r="${4 + (i % 4) * 3}" fill="#FFC98A" opacity="${.05 + (i % 3) * .04}"/>`).join('');
    const lamp = (x, d) => `<g class="ak-lamp" style="--d:${d}s;transform-origin:${x}px 0px"><line x1="${x}" y1="0" x2="${x}" y2="90" stroke="#0E0812" stroke-width="2"/><path d="M${x - 34} 120 Q${x} 72 ${x + 34} 120z" fill="#1E1428"/><ellipse cx="${x}" cy="120" rx="34" ry="6" fill="#FFE2A8"/><circle cx="${x}" cy="150" r="190" fill="url(#aLamp)"/></g>`;
    const stripes = Array.from({ length: 22 }, (_, i) => `<rect x="${876 + i * 7}" y="280" width="3" height="200" fill="rgba(60,25,8,.35)"/>`).join('');
    return `${DEFS}
  <rect width="1200" height="700" fill="url(#aWall)"/>
  <g opacity=".5">${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 100}" y="0" width="2" height="500" fill="rgba(255,255,255,.025)"/>`).join('')}</g>
  <rect x="60" y="150" width="420" height="10" rx="3" fill="#4A2E22"/>${jars}
  <g transform="translate(860 70)"><rect width="260" height="160" rx="10" fill="#151018" stroke="#3A2A44" stroke-width="6"/><text x="130" y="58" text-anchor="middle" class="ak-chalk-t">Violette</text>
    <text x="24" y="98" class="ak-chalk" id="akBoardN1"></text><text x="236" y="98" text-anchor="end" class="ak-chalk" id="akBoardP1"></text><text x="24" y="128" class="ak-chalk" id="akBoardN2"></text><text x="236" y="128" text-anchor="end" class="ak-chalk" id="akBoardP2"></text></g>
  ${bokeh}
  <g id="stCoffee">
    <g id="akMachine">
      <rect x="232" y="318" width="300" height="190" rx="18" fill="url(#aBody)"/>
      <rect x="232" y="318" width="300" height="34" rx="14" fill="url(#aChrome)"/>
      <rect x="250" y="300" width="70" height="20" rx="6" fill="url(#aCup)"/><rect x="330" y="302" width="64" height="18" rx="6" fill="url(#aCup)"/>
      <circle cx="300" cy="388" r="20" fill="#1A1222" stroke="url(#aChrome)" stroke-width="5"/><line id="akNeedle" x1="300" y1="388" x2="300" y2="374" stroke="#FFB45A" stroke-width="3" stroke-linecap="round"/>
      <circle cx="470" cy="388" r="20" fill="#1A1222" stroke="url(#aChrome)" stroke-width="5"/><line x1="470" y1="388" x2="481" y2="378" stroke="#FFB45A" stroke-width="3" stroke-linecap="round"/>
      <rect x="352" y="420" width="56" height="26" rx="6" fill="url(#aChrome)"/><circle id="akLight" cx="380" cy="414" r="5" fill="#5A3A1C"/>
      <rect x="262" y="486" width="240" height="18" rx="5" fill="url(#aChrome)"/>
      <path d="M520 360 q30 4 26 40 l-2 56" fill="none" stroke="url(#aChrome)" stroke-width="7" stroke-linecap="round"/>
      <text x="382" y="342" text-anchor="middle" class="ak-badge">V</text>
    </g>
    <g id="akGrinder">
      <path d="M818 300 h64 l-10 58 h-44z" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.35)"/>
      <rect id="akBeans" x="826" y="318" width="48" height="38" rx="4" fill="#4A2A18"/>
      <rect x="810" y="356" width="80" height="70" rx="10" fill="url(#aChrome)"/>
      <rect x="838" y="426" width="24" height="16" rx="3" fill="#3A3640"/>
      <rect x="800" y="500" width="100" height="8" rx="3" fill="#2A2630"/>
    </g>
  </g>
  <g id="stWrapBack" opacity="0">
    <rect x="982" y="284" width="22" height="196" rx="6" fill="#2A2630"/><rect x="986" y="292" width="14" height="180" rx="4" fill="#FF7A3A" opacity=".75" class="ak-flicker"/>
    <ellipse cx="960" cy="380" rx="90" ry="130" fill="url(#aHeat)"/>
    <line x1="930" y1="232" x2="930" y2="500" stroke="url(#aSteel)" stroke-width="6"/><circle cx="930" cy="232" r="7" fill="url(#aSteel)"/>
    <path d="M890 296 Q930 284 970 296 L952 468 Q930 476 908 468z" fill="url(#aDoner)"/>
    <g clip-path="url(#aCone)"><g class="ak-spin">${stripes}</g><rect x="880" y="280" width="30" height="200" fill="rgba(0,0,0,.25)"/></g>
    <ellipse cx="930" cy="296" rx="40" ry="8" fill="#C97A40"/>
  </g>
  <g id="akBody">
    <path d="M596 362 Q598 322 646 312 L754 312 Q802 322 804 362 L816 640 H584z" fill="url(#aShirt)"/>
    <path d="M684 276 L716 276 L718 318 Q700 328 682 318z" fill="#C98E68"/><path d="M684 290 Q700 300 716 290 L716 300 Q700 308 684 300z" fill="rgba(90,50,30,.18)"/>
    <path d="M674 314 L700 342 L726 314 L714 304 L700 324 L686 304z" fill="#F7F1E8" stroke="#D8CDBE" stroke-width="1.5"/>
    <path d="M638 354 Q700 342 762 354 L772 640 H628z" fill="url(#aApron)"/>
    <path d="M650 356 L670 312 M750 356 L730 312" stroke="#2C1A3C" stroke-width="7" stroke-linecap="round"/>
    <rect x="676" y="440" width="48" height="34" rx="4" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/><line x1="712" y1="430" x2="714" y2="450" stroke="#C9B2E8" stroke-width="3" stroke-linecap="round"/>
    <text x="700" y="412" text-anchor="middle" class="ak-badge">V</text>
    <rect x="726" y="370" width="38" height="14" rx="3" fill="#F4ECE1"/><text x="745" y="380.5" text-anchor="middle" class="ak-tag">Sardor</text>
    <g id="akSplat"></g>
    <g id="akHead">
      <ellipse cx="667" cy="250" rx="6" ry="10" fill="#C98E68"/><ellipse cx="733" cy="250" rx="6" ry="10" fill="#C98E68"/>
      <path d="M668 240 Q668 204 700 204 Q732 204 732 240 Q732 270 714 286 Q700 294 686 286 Q668 270 668 240z" fill="url(#aSkin)"/>
      <path d="M672 262 Q674 284 700 293 Q726 284 728 262 Q718 281 700 283 Q682 281 672 262z" fill="rgba(60,36,24,.16)"/>
      <path d="M665 246 Q658 206 688 195 Q714 186 732 199 Q745 210 737 244 Q733 223 716 220 Q700 214 686 222 Q676 215 671 228 Q668 236 665 246z" fill="#2A1A14"/>
      <path d="M684 200 Q706 192 726 204" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3" stroke-linecap="round"/>
      <g id="akBrows"><path d="M679 234 q8 -4 15 -1 M706 233 q7 -3 15 1" stroke="#2A1A14" stroke-width="3" fill="none" stroke-linecap="round"/></g>
      <g id="akEyeL"><ellipse cx="687" cy="245" rx="5" ry="3.8" fill="#FBF6F0"/><circle id="akPupL" cx="687" cy="245" r="2.7" fill="#2A1A14"/></g>
      <g id="akEyeR"><ellipse cx="713" cy="245" rx="5" ry="3.8" fill="#FBF6F0"/><circle id="akPupR" cx="713" cy="245" r="2.7" fill="#2A1A14"/></g>
      <path d="M700 249 q-4 10 0 13 q3 1.5 6 -1" stroke="#B07454" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path id="akMouth" d="${MOUTH.neutral}" stroke="#8E4A3A" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="677" cy="264" rx="6" ry="3.4" fill="#E79A88" opacity=".28"/><ellipse cx="723" cy="264" rx="6" ry="3.4" fill="#E79A88" opacity=".28"/>
    </g>
  </g>
  <g id="stGrill" opacity="0">
    ${board(410, 280)}
    <rect x="800" y="470" width="190" height="34" rx="4" fill="#2A2630"/><rect x="806" y="464" width="178" height="8" rx="2" fill="#4A4652"/>
    <rect x="812" y="474" width="166" height="3" rx="1.5" fill="#FF7A3A" opacity=".6" class="ak-flicker"/>
    <circle cx="830" cy="490" r="5" fill="url(#aSteel)"/><circle cx="960" cy="490" r="5" fill="url(#aSteel)"/>
  </g>
  <g id="stWrap" opacity="0">${board(410, 300)}<rect x="866" y="486" width="84" height="18" rx="4" fill="url(#aSteel)"/><rect x="872" y="482" width="72" height="8" rx="3" fill="#8A4A22"/></g>
  <g id="akArms"></g>
  <g id="akProps"></g>
  <g id="akFx"></g>
  <rect x="0" y="504" width="1200" height="20" fill="url(#aTop)"/>
  <rect x="0" y="524" width="1200" height="176" fill="url(#aWood)"/>
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${40 + i * 196}" y="548" width="176" height="128" rx="6" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`).join('')}
  <g id="akServe"></g>
  ${lamp(170, 0)}${lamp(600, 1.4)}
  <g id="akInset" opacity="0"><circle cx="1010" cy="190" r="112" fill="#140B1A" stroke="#FFE2A8" stroke-opacity=".5" stroke-width="3"/>
    <g clip-path="url(#aInset)"><circle cx="1010" cy="190" r="104" fill="url(#aCup)"/><circle cx="1010" cy="190" r="84" fill="url(#aCrema)"/><g id="akArt"></g></g></g>`;
}
/* ===================== act 1: latte ===================== */
const C_RIGHT = [[0, 775, 505], [.8, 898, 468], [3.2, 898, 468], [4, 818, 500], [4.3, 850, 505], [4.7, 770, 468], [5.2, 770, 488], [5.6, 770, 470], [6, 770, 488], [6.4, 770, 470], [6.9, 850, 505], [7.3, 818, 500], [7.9, 705, 470], [8.3, 775, 505],
    [15.4, 775, 505], [16, 680, 505], [16.6, 716, 408], [19, 716, 408], [19.6, 680, 505], [20.2, 852, 258], [20.6, 884, 246], [21.0, 852, 258], [21.4, 884, 246], [21.8, 852, 258], [22.2, 860, 270], [22.8, 775, 505], [24, 775, 505]];
const C_LEFT = [[0, 625, 505], [7.4, 625, 505], [7.9, 705, 470], [8.9, 428, 446], [9.3, 428, 446], [9.8, 560, 505], [10.4, 408, 505], [10.9, 600, 468], [12.6, 600, 468], [13, 600, 505], [13.5, 552, 470], [14, 552, 480], [14.5, 552, 470], [15, 552, 480],
    [15.4, 680, 505], [15.9, 408, 505], [16.6, 650, 452], [19, 650, 452], [19.7, 700, 505], [20.2, 625, 505], [24, 625, 505]];
const C_HEAD = [[0, 0, 0], [.8, 9, 4], [3.2, 9, 4], [4.4, 5, 8], [6.8, 5, 8], [8, -2, 2], [8.9, -12, 2], [12.6, -12, 4], [13.4, -10, 6], [15, -10, 6], [16.4, -2, 10], [19, -2, 10], [20, 0, 0], [24, 0, 0]];
const C_LOOK = [[0, 0, 0], [.8, 7, 3], [3.2, 7, 3], [4.4, 5, 6], [6.8, 5, 6], [8, -4, 2], [8.9, -8, 2], [12.6, -8, 4], [15, -6, 5], [16.4, -2, 7], [19, -2, 7], [19.8, 0, 0], [24, 0, 0]];
const portafilter = (gx, gy, rot = 0) => `<g transform="translate(${f1(gx)} ${f1(gy)}) rotate(${rot})"><rect x="-6" y="-6" width="52" height="12" rx="6" fill="#2A1A14"/><rect x="-62" y="-12" width="44" height="20" rx="6" fill="url(#aSteel)" transform="translate(14 0)"/><path d="M-48 8 h44 l-4 10 h-36z" fill="url(#aSteel)" transform="translate(14 0)"/></g>`;
const tamper = (x, y) => `<g transform="translate(${f1(x)} ${f1(y)})"><rect x="-7" y="-34" width="14" height="30" rx="7" fill="#2A1A14"/><rect x="-20" y="-6" width="40" height="10" rx="3" fill="url(#aSteel)"/></g>`;
function cup(cx, by, fill, rot = 0, scale = 1) {
    const lvl = 34 * fill;
    return `<g transform="translate(${f1(cx)} ${f1(by)}) rotate(${rot}) scale(${scale})" filter="url(#aSoft)"><path d="M18 -26 q18 2 14 14 q-3 9 -16 8" fill="none" stroke="#E7DFEA" stroke-width="6"/>
    <path d="M-22 -40 h44 l-5 36 q-1 4 -6 4 h-22 q-5 0 -6 -4z" fill="url(#aCup)"/><rect x="-21" y="-30" width="42" height="5" fill="#7A4FB0" opacity=".9"/>
    ${fill > 0 ? `<clipPath id="akCupClip"><path d="M-19 -38 h38 l-5 34 h-28z"/></clipPath><rect clip-path="url(#akCupClip)" x="-20" y="${-4 - lvl}" width="40" height="${lvl}" fill="${fill > .5 ? '#C99A6E' : '#6B3A1C'}"/><ellipse cx="0" cy="${-4 - lvl}" rx="${15 + fill * 4}" ry="3" fill="${fill > .5 ? '#F1E3CF' : '#C7864B'}"/>` : ''}
    <ellipse cx="0" cy="0" rx="30" ry="5" fill="#EFE8F2"/></g>`;
}
const pitcher = (gx, gy, rot = 0) => `<g transform="translate(${f1(gx)} ${f1(gy)}) rotate(${rot})"><path d="M-6 -34 q14 2 12 16 q-2 10 -12 10" fill="none" stroke="url(#aSteel)" stroke-width="5"/><path d="M-50 -46 h40 l4 42 q0 4 -4 4 h-40 q-4 0 -4 -4z M-50 -46 l-10 -4 l6 8z" fill="url(#aSteel)" transform="translate(4 0)"/></g>`;
const servedSteam = (x, y, tm) => Array.from({ length: 3 }, (_, i) => { const f = ((tm * .5 + i / 3) % 1); return `<path d="M${f1(x + (i - 1) * 16)} ${f1(y - f * 90)} q-10 -14 0 -28 q10 -14 0 -28" stroke="#fff" stroke-width="5" fill="none" opacity="${f1((1 - f) * .45)}" filter="url(#aBlur)"/>`; }).join('');
function actCoffee(tm) {
    const pose = { R: track(C_RIGHT, tm), L: track(C_LEFT, tm), head: track(C_HEAD, tm), look: track(C_LOOK, tm), brows: tm > 19.8 && tm < 23 ? 2 : 0, mouth: tm > 19.8 && tm < 23 ? 'smile' : 'neutral', wink: between(tm, 21.2, 21.6), lean: 0 };
    const { R, L } = drawCook(pose, tm);
    let props = '', fx = '', serve = '';
    if (tm < 4)
        props += portafilter(R.hx, R.hy);
    else if (tm < 7.3)
        props += portafilter(818, 500);
    else if (tm < 7.9)
        props += portafilter(R.hx, R.hy);
    else if (tm < 8.9)
        props += portafilter(L.hx, L.hy, -8 * win(tm, 8.4, 8.9));
    else
        props += portafilter(428, 446, -8 + 8 * win(tm, 8.9, 9.3));
    props += between(tm, 4.3, 6.9) ? tamper(R.hx, R.hy) : tamper(850, 505);
    if (between(tm, 12.6, 15))
        props += pitcher(L.hx, L.hy);
    else if (between(tm, 16, 19.6))
        props += pitcher(R.hx, R.hy, -58 * ease(win(tm, 16.6, 17.4)) + 10 * win(tm, 18.8, 19.3));
    else
        props += pitcher(tm < 12.6 ? 600 : 680, 505);
    const espresso = .45 * win(tm, 10.4, 12.6), milk = .45 * win(tm, 16.8, 18.8);
    let cupX = 532, cupY = 505, cupRot = 0, cupScale = 1, served = false;
    if (between(tm, 9.8, 10.4)) {
        cupX = L.hx - 28;
        cupY = L.hy;
    }
    else if (between(tm, 10.4, 15.9))
        cupX = 380;
    else if (between(tm, 15.9, 19.7)) {
        cupX = L.hx - 28;
        cupY = L.hy;
        cupRot = -14 * ease(win(tm, 16.4, 16.8)) * (1 - win(tm, 18.8, 19.4));
    }
    else if (tm >= 19.7) {
        const k = ease(win(tm, 20.2, 21.3));
        cupX = 672 + 28 * k;
        cupY = 505 + 70 * k;
        cupScale = 1 + .55 * k;
        served = k > 0;
    }
    const c = cup(cupX, cupY, espresso + milk, cupRot, cupScale);
    if (served)
        serve = c;
    else
        props += c;
    if (between(tm, .9, 3.1)) {
        for (let i = 0; i < 9; i++) {
            const f = ((tm * 3 + i / 9) % 1);
            fx += `<circle cx="${f1(850 + Math.sin(i * 7 + tm * 10) * 5)}" cy="${f1(442 + f * 22)}" r="2.2" fill="#3A2214"/>`;
        }
        $('#akGrinder').setAttribute('transform', `translate(${f1(Math.sin(tm * 90) * .8)} 0)`);
    }
    else
        $('#akGrinder').removeAttribute('transform');
    $('#akBeans').setAttribute('height', f1(38 - 8 * win(tm, .9, 3.1)));
    $('#akBeans').setAttribute('y', f1(318 + 8 * win(tm, .9, 3.1)));
    const brewing = between(tm, 10.4, 12.6);
    $('#akLight').setAttribute('fill', brewing ? '#FFB45A' : '#5A3A1C');
    $('#akNeedle').setAttribute('transform', `rotate(${brewing ? f1(60 + Math.sin(tm * 8) * 4) : tm > 12.6 && tm < 16 ? 30 : 0} 300 388)`);
    if (brewing)
        fx += `<path d="M374 446 Q373 ${f1(470 + Math.sin(tm * 20))} 376 ${f1(490 - 34 * espresso)}" stroke="#5A2E1A" stroke-width="3" fill="none"/><path d="M386 446 Q387 ${f1(470 + Math.cos(tm * 20))} 384 ${f1(490 - 34 * espresso)}" stroke="#5A2E1A" stroke-width="3" fill="none"/>`;
    if (between(tm, 13.4, 15))
        for (let i = 0; i < 6; i++) {
            const f = ((tm * .9 + i / 6) % 1);
            fx += `<circle cx="${f1(546 + Math.sin(i * 3 + tm * 2) * 14 * f)}" cy="${f1(452 - f * 120)}" r="${f1(10 + f * 26)}" fill="#fff" opacity="${f1((1 - f) * .35)}" filter="url(#aBlur)"/>`;
        }
    if (between(tm, 16.8, 18.8)) {
        const sx = R.hx - 66, sy = R.hy - 30;
        fx += `<path d="M${f1(sx)} ${f1(sy)} Q${f1(sx - 4)} ${f1((sy + L.hy - 40) / 2)} ${f1(L.hx - 30)} ${f1(L.hy - 42)}" stroke="#F4ECE1" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    if (tm > 20.6)
        fx += servedSteam(700, 495, tm);
    const ins = clamp(win(tm, 16.4, 16.9) - win(tm, 19.4, 19.9));
    $('#akInset').setAttribute('opacity', f1(ins));
    const art = win(tm, 17, 18.8);
    $('#akArt').innerHTML = art > 0 ? `<g transform="translate(1010 196) scale(${(.4 + art * .6).toFixed(2)}) translate(-1010 -196)" opacity="${f1(Math.min(1, art * 2))}">${latteArt('heart', 1010, 196, 4.2, '#F7EEE2')}</g>` : '';
    return { props, fx, serve };
}
/* ===================== act 2: burger ===================== */
const BX = 520, BY = 488, S = .5;
const STACK = ['bunB', 'beef', 'cheese', 'lettuce', 'tomato', 'ketchup', 'bunT'];
const LAND = [-1, 6.2, 8.2, 9.2, 10.1, 13.1, 14.35];
const layerOf = (id) => (id === 'bunB' ? bunBottom('classic') : id === 'bunT' ? bunTop('classic') : LAYERS[id]);
const baseY = (i) => BY - STACK.slice(0, i).reduce((a, id) => a + (layerOf(id).h - 4) * S, 0);
const TOP_Y = baseY(STACK.length);
function part(id, x, y, rot = 0, sx = S, sy = S) {
    const L = layerOf(id);
    return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})">${L.svg(-L.h, 0, 240)}</g>`;
}
const squish = (tm, land) => { const f = win(tm, land, land + .3); return f > 0 && f < 1 ? .16 * Math.sin(Math.PI * f) * (1 - f) : 0; };
const B_RIGHT = [[0, 775, 505], [.6, 880, 452], [1.3, 880, 460], [1.7, 880, 452], [2.3, 880, 460], [3.2, 880, 455], [3.6, 905, 470], [4.0, 880, 462], [4.25, 820, 400], [4.9, 775, 505],
    [6.8, 720, 545], [7.1, 745, 470], [7.4, 690, 418], [7.8, 720, 545], [9.0, 720, 545], [9.4, 560, 420], [9.8, 528, 440], [10.05, 720, 545],
    [10.5, 568, 372], [11.2, 568, 372], [11.25, 582, 372], [11.35, 554, 372], [11.45, 582, 372], [11.55, 554, 372], [11.65, 582, 372], [11.75, 554, 372], [11.85, 582, 372], [12.0, 568, 372],
    [12.3, 548, 380], [12.6, 568, 388], [12.9, 590, 380], [13.1, 568, 372], [13.4, 720, 545], [14.7, 720, 545], [15.1, 524, TOP_Y - 26], [15.3, 524, TOP_Y - 22], [15.6, 775, 505], [18.5, 775, 505]];
const B_LEFT = [[0, 640, 500], [8.0, 620, 545], [8.4, 530, 428], [8.85, 522, 448], [9.1, 640, 500], [13.4, 640, 500], [13.7, 618, 470], [14.0, 522, 250], [14.3, 560, 330], [14.8, 640, 500], [18.5, 640, 500]];
const B_HEAD = [[0, 8, 6], [3.8, 8, 6], [4.6, -2, -16], [5.4, -6, -12], [6.1, -4, 6], [6.4, 0, 0], [7.3, 0, 0], [7.6, -6, 6], [10.6, -6, 2], [11.0, 2, 14], [11.3, 2, 14], [11.6, -4, 0], [13.2, -6, 2], [13.6, -4, -10], [14.4, -6, 6], [15.5, 0, 0], [18.5, 0, 0]];
const B_LOOK = [[0, 7, 4], [3.8, 7, 4], [4.4, 2, -8], [5.4, -4, -6], [6.1, -6, 4], [6.4, 0, 0], [7.3, 0, 0], [7.6, -6, 4], [10.5, -4, -3], [10.9, -2, 8], [11.3, -2, 8], [11.6, -4, -4], [13.2, -4, 2], [13.6, -4, -8], [14.4, -6, 4], [15.5, 0, 0], [18.5, 0, 0]];
const spatula = (hx, hy) => `<g><line x1="${f1(hx + 2)}" y1="${f1(hy)}" x2="${f1(hx + 24)}" y2="${f1(hy - 24)}" stroke="#2A1A14" stroke-width="7" stroke-linecap="round"/><path d="M${f1(hx - 2)} ${f1(hy - 2)} L${f1(hx - 12)} ${f1(hy + 10)}" stroke="url(#aSteel)" stroke-width="4"/><rect x="${f1(hx - 58)}" y="${f1(hy + 8)}" width="50" height="5" rx="2" fill="url(#aSteel)"/></g>`;
const bottle = (hx, hy) => `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(172)"><rect x="-13" y="-8" width="26" height="54" rx="9" fill="#C62828"/><rect x="-13" y="-8" width="9" height="54" rx="4" fill="rgba(255,255,255,.22)"/><rect x="-9" y="-20" width="18" height="14" rx="3" fill="#F4ECE1"/><path d="M-3 -20 l3 -10 l3 10z" fill="#F4ECE1"/><rect x="-10" y="10" width="20" height="16" rx="2" fill="#F4B731"/></g>`;
const flag = (x, y) => `<g><line x1="${f1(x)}" y1="${f1(y + 26)}" x2="${f1(x)}" y2="${f1(y - 30)}" stroke="#E7D3B0" stroke-width="2.5"/><path d="M${f1(x)} ${f1(y - 30)} h22 l-5 7 l5 7 h-22z" fill="#7A4FB0"/><text x="${f1(x + 9)}" y="${f1(y - 19)}" class="ak-flag" text-anchor="middle">V</text></g>`;
function actBurger(tm) {
    const pose = { R: track(B_RIGHT, tm), L: track(B_LEFT, tm), head: track(B_HEAD, tm), look: track(B_LOOK, tm),
        brows: between(tm, 6.3, 7.4) ? 6 : between(tm, 10.9, 11.6) ? -2 : tm > 15.5 ? 2 : between(tm, 4.4, 5.6) ? 4 : 0,
        mouth: between(tm, 6.3, 7.4) ? 'smirk' : between(tm, 10.75, 11.0) ? 'o' : tm > 15.5 ? 'smile' : 'neutral', wink: between(tm, 6.7, 7.0), lean: 0 };
    const { R, L } = drawCook(pose, tm);
    let stack = '', props = '', fx = '', serveSvg = '';
    STACK.forEach((id, i) => {
        const land = LAND[i], by = baseY(i);
        if (id === 'bunB') {
            stack += part(id, BX, by);
            return;
        }
        if (tm >= land) {
            if (id === 'ketchup') {
                stack += part(id, BX, by);
                return;
            }
            const q = squish(tm, land);
            if (id === 'bunT' && tm < land + .4) {
                const f = win(tm, land, land + .4);
                stack += part(id, BX, by - 16 * Math.sin(Math.PI * f) * (1 - f * .3), 0, S * (1 + q), S * (1 - q));
            }
            else
                stack += part(id, BX, by, 0, S * (1 + q), S * (1 - q));
            return;
        }
        if (id === 'ketchup') {
            const kg = win(tm, 12.1, 13.1);
            if (kg > 0)
                stack += part(id, BX, by, 0, S * kg, S);
            return;
        }
        if (id === 'beef') {
            if (tm < 4.0) {
                const press = between(tm, 1.3, 1.6) || between(tm, 2.3, 2.6) ? .1 : 0;
                props += part(id, 880, 466, 0, S * (1 + press), S * (1 - press));
            }
            else {
                const f = win(tm, 4.0, 6.2);
                props += part(id, 880 + (BX - 880) * f, 466 + (by - 466) * f - 420 * 4 * f * (1 - f), 900 * f);
            }
        }
        if (id === 'cheese') {
            if (between(tm, 7.0, 7.4))
                props += part(id, R.hx - 4, R.hy - 6, -18);
            else if (tm >= 7.4) {
                const f = win(tm, 7.4, 8.2);
                props += part(id, 690 + (BX - 690) * f, 412 + (by - 412) * f - 70 * 4 * f * (1 - f), 360 * f - 18);
            }
        }
        if (id === 'lettuce') {
            if (between(tm, 8.3, 8.85))
                props += part(id, L.hx, L.hy + 6);
            else if (tm >= 8.85) {
                const f = win(tm, 8.85, 9.2);
                props += part(id, 522 + (BX - 522) * f, 454 + (by - 454) * f * f);
            }
        }
        if (id === 'tomato') {
            if (between(tm, 9.3, 9.8))
                props += part(id, R.hx - 6, R.hy + 6);
            else if (tm >= 9.8) {
                const f = win(tm, 9.8, 10.1);
                props += part(id, 522 + (BX - 522) * f, 446 + (by - 446) * f * f);
            }
        }
        if (id === 'bunT') {
            if (tm < 13.65)
                props += part(id, 628, BY);
            else if (tm < 14.0)
                props += part(id, L.hx, L.hy + 20);
            else {
                const f = win(tm, 14.0, land);
                const y0 = 272;
                props += part(id, BX, y0 + (by - y0) * f * f);
            }
        }
    });
    // spatula, bottle, flag
    props += tm < 4.6 ? spatula(R.hx, R.hy) : `<rect x="905" y="458" width="56" height="5" rx="2" fill="url(#aSteel)"/>`;
    if (between(tm, 10.25, 13.35))
        props += bottle(R.hx, R.hy);
    if (between(tm, 14.75, 15.15))
        props += flag(R.hx + 4, R.hy + 4);
    if (tm >= 15.15)
        stack += flag(BX + 4, TOP_Y - 4);
    // the ketchup bottle's first attempt: a dry puff, three drops on the board, one on the apron
    if (between(tm, 10.75, 11.25)) {
        const f = win(tm, 10.75, 11.25);
        fx += `<circle cx="${f1(R.hx - 4)}" cy="${f1(R.hy + 62)}" r="${f1(6 + f * 26)}" fill="#fff" opacity="${f1((1 - f) * .5)}" filter="url(#aBlur)"/>`;
    }
    if (tm > 10.85) {
        const f = win(tm, 10.8, 10.95);
        fx += [[488, 487], [602, 486], [560, 488]].map(([x, y]) => `<ellipse cx="${x}" cy="${f1(440 + (y - 440) * f)}" rx="${f > .99 ? 5 : 2.5}" ry="${f > .99 ? 1.8 : 2.5}" fill="#B71C1C"/>`).join('');
        $('#akSplat').innerHTML = tm > 10.95 ? '<circle cx="690" cy="468" r="3.4" fill="#B71C1C"/><circle cx="694" cy="472" r="1.6" fill="#B71C1C"/>' : '';
    }
    else
        $('#akSplat').innerHTML = '';
    // grill smoke while the patty sizzles
    if (tm < 4.2)
        for (let i = 0; i < 5; i++) {
            const f = ((tm * .7 + i / 5) % 1);
            fx += `<circle cx="${f1(870 + Math.sin(i * 2.3 + tm * 1.5) * 16 * f)}" cy="${f1(448 - f * 110)}" r="${f1(8 + f * 22)}" fill="#fff" opacity="${f1((1 - f) * .28)}" filter="url(#aBlur)"/>`;
        }
    // serve: the burger slides to the viewer
    const k = ease(win(tm, 15.6, 16.6));
    if (k > 0) {
        serveSvg = `<g transform="translate(${f1(BX + 90 * k)} ${f1(BY + 84 * k)}) scale(${(1 + .5 * k).toFixed(3)}) translate(${-BX} ${-BY})">${stack}</g>` + servedSteam(BX + 90 * k, TOP_Y + 40, tm);
        stack = '';
    }
    return { props: stack + props, fx, serve: serveSvg };
}
/* ===================== act 3: lavash ===================== */
const LX = 560;
const W_RIGHT = [[0, 775, 505], [.4, 868, 330], [.8, 868, 440], [1.2, 868, 330], [1.6, 868, 440], [2.0, 868, 330], [2.4, 868, 440], [2.8, 868, 330], [3.2, 868, 440], [3.6, 775, 505],
    [4.2, 720, 545], [4.5, 478, 440], [5.2, 650, 440], [5.4, 720, 545], [5.7, 900, 480], [6.0, 520, 440], [6.3, 900, 480], [6.6, 610, 440], [6.85, 720, 545], [7.05, 560, 440], [7.35, 720, 545], [7.6, 570, 445], [7.85, 720, 520],
    [8.0, 674, 458], [10.0, 474, 458], [10.25, 640, 470], [12.6, 640, 470], [12.8, 616, 468], [14.4, 616, 468], [14.6, 760, 505], [18.5, 760, 505]];
const W_LEFT = [[0, 640, 500], [3.2, 640, 500], [3.4, 620, 545], [3.8, 462, 482], [4.3, 640, 500], [7.9, 640, 500], [8.0, 664, 466], [10.0, 464, 466], [10.35, 470, 470], [11.3, 398, 476], [12.6, 520, 470],
    [14.4, 520, 470], [14.9, 592, 322], [15.5, 592, 322], [15.9, 560, 474], [16.1, 640, 500], [18.5, 640, 500]];
const W_HEAD = [[0, 8, 2], [3.4, 8, 2], [3.8, -6, 8], [9.9, -6, 8], [10.3, -10, 10], [11.2, -14, 6], [11.5, 0, 0], [12.4, 0, 0], [12.8, -6, 8], [14.4, -6, 8], [14.9, -2, -6], [15.6, 0, 0], [18.5, 0, 0]];
const W_LOOK = [[0, 6, -1], [3.4, 6, 0], [3.7, -5, 5], [10.1, -6, 5], [10.8, -8, 5], [11.4, 0, 0], [12.4, 0, 0], [12.6, -4, 5], [14.5, -2, -4], [15.0, 0, 0], [18.5, 0, 0]];
const W_LEAN = [[0, 0, 0], [10.4, 0, 0], [11.1, -72, 0], [11.4, -72, 0], [12.3, 0, 0], [18.5, 0, 0]];
const knife = (hx, hy) => `<g><line x1="${f1(hx - 16)}" y1="${f1(hy + 3)}" x2="${f1(hx + 4)}" y2="${f1(hy)}" stroke="#2A1A14" stroke-width="8" stroke-linecap="round"/><path d="M${f1(hx + 4)} ${f1(hy - 5)} L${f1(hx + 70)} ${f1(hy - 2)} L${f1(hx + 4)} ${f1(hy + 5)}z" fill="url(#aSteel)"/></g>`;
const squeeze = (hx, hy) => `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(176)"><rect x="-10" y="-6" width="20" height="44" rx="8" fill="#F4ECE1"/><path d="M-3 -6 l3 -12 l3 12z" fill="#F4ECE1"/></g>`;
function spiral(r, turns = 2.4) {
    let d = '';
    const n = 40;
    for (let i = 0; i <= n; i++) {
        const th = (i / n) * turns * Math.PI * 2, rr = r * (i / n);
        d += `${i ? 'L' : 'M'}${f1(Math.cos(th) * rr)} ${f1(Math.sin(th) * rr)}`;
    }
    return d;
}
const rollEnd = (x, y, r, ang) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})" filter="url(#aSoft)"><circle r="${f1(r)}" fill="url(#aLav)"/><circle r="${f1(r * .5)}" fill="#A0552E" opacity=".8"/><path d="${spiral(r * .95)}" fill="none" stroke="#B9874A" stroke-width="2"/></g>`;
const rollSide = (x, y, rot, paper) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" filter="url(#aSoft)">
  <rect x="-66" y="-17" width="132" height="34" rx="17" fill="url(#aLav)"/><path d="M-40 -14 l10 28 M-14 -14 l10 28 M12 -14 l10 28" stroke="#C99A5A" stroke-width="3" opacity=".6"/>
  <ellipse cx="-62" cy="0" rx="9" ry="16" fill="#E8C487"/><ellipse cx="-62" cy="0" rx="5" ry="9" fill="#A0552E"/><circle cx="-60" cy="-4" r="2.6" fill="#E2452F"/><circle cx="-63" cy="5" r="2" fill="#7CB342"/>
  ${paper > 0 ? `<rect x="${f1(66 - 80 * paper)}" y="-19" width="${f1(80 * paper)}" height="38" rx="6" fill="#7A4FB0"/><rect x="${f1(66 - 80 * paper)}" y="-19" width="${f1(80 * paper)}" height="8" rx="4" fill="rgba(255,255,255,.18)"/>${paper > .6 ? `<text x="30" y="7" text-anchor="middle" class="ak-flag" style="font-size:18px">V</text>` : ''}` : ''}</g>`;
function actWrap(tm) {
    const pose = { R: track(W_RIGHT, tm), L: track(W_LEFT, tm), head: track(W_HEAD, tm), look: track(W_LOOK, tm),
        brows: between(tm, 10.4, 11.4) ? 8 : between(tm, 11.4, 12.4) ? 4 : tm > 15 ? 2 : 0,
        mouth: between(tm, 10.4, 11.4) ? 'o' : between(tm, 11.5, 12.4) ? 'smirk' : tm > 14.8 ? 'smile' : 'neutral', wink: between(tm, 15.0, 15.35), lean: track(W_LEAN, tm)[0] };
    const { R, L } = drawCook(pose, tm);
    let props = '', fx = '', serve = '';
    // knife on the spit, shavings fall into the tray
    if (tm < 3.55) {
        props += knife(R.hx, R.hy);
        for (let i = 0; i < 8; i++) {
            const f = ((tm * 1.6 + i / 8) % 1);
            fx += `<rect x="${f1(900 + Math.sin(i * 3.1) * 14)}" y="${f1(330 + ((i * 37) % 110) + f * (480 - 330 - ((i * 37) % 110)))}" width="9" height="3.5" rx="1.5" fill="#8A4A22" transform="rotate(${(i * 47) % 90} ${f1(904)} ${f1(400)})" opacity="${f1(1 - f * .3)}"/>`;
        }
    }
    // the lavash and what goes on it (anything left of the roll is still flat)
    const rolling = win(tm, 8, 10);
    const rollX = tm < 8 ? 666 : tm < 10 ? 666 - 206 * ease(rolling) : 460 - 64 * Math.pow(win(tm, 10, 11.3), 2);
    const rollR = tm < 8 ? 0 : 4 + 13 * Math.min(1, rolling);
    if (between(tm, 3.4, 10.05)) {
        const w = 210 * ease(win(tm, 3.4, 3.9)), right = Math.min(455 + w, rollX);
        let flat = `<rect x="455" y="481" width="${f1(Math.max(0, right - 455))}" height="7" rx="3.5" fill="url(#aLav)"/>`;
        const sx = 470 + 180 * win(tm, 4.5, 5.2);
        if (tm > 4.5) {
            let d = 'M470 481';
            for (let x = 482; x <= Math.min(sx, right - 4); x += 12)
                d += ` L${x} ${(x / 12) % 2 ? 478 : 482}`;
            flat += `<path d="${d}" stroke="#FFF8EC" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
        }
        const meat = [[480, 6.0], [505, 6.0], [530, 6.05], [585, 6.6], [612, 6.6], [640, 6.65]];
        meat.forEach(([x, at], i) => { if (tm > at && x < right - 6) {
            const f = win(tm, at, at + .2);
            flat += `<rect x="${x - 9}" y="${f1(440 + (472 - 440) * f)}" width="18" height="7" rx="3" fill="#8A4A22" transform="rotate(${(i * 23) % 30 - 15} ${x} 476)"/>`;
        } });
        [500, 528, 556, 590, 622].forEach((x, i) => { if (tm > 7.2 && x < right - 6)
            flat += `<rect x="${x - 11}" y="${470 - (i % 2) * 3}" width="22" height="4" rx="2" fill="#F4C542" transform="rotate(${(i * 31) % 40 - 20} ${x} 472)"/>`; });
        [512, 548, 600, 632].forEach(x => { if (tm > 7.8 && x < right - 6)
            flat += `<circle cx="${x}" cy="469" r="5" fill="#E2452F"/>`; });
        props += flat;
    }
    if (between(tm, 4.4, 5.3))
        props += squeeze(R.hx, R.hy);
    if (between(tm, 5.6, 6.7))
        props += `<rect x="${f1(R.hx - 9)}" y="${f1(R.hy + 8)}" width="18" height="7" rx="3" fill="#8A4A22"/>`;
    // the roll: end view while rolling, then it keeps going on its own
    const ang = -(666 - rollX) * 3.2;
    if (between(tm, 8, 11.3))
        props += rollEnd(rollX, 488 - Math.max(rollR, 4), Math.max(rollR, 4), ang);
    else if (between(tm, 11.3, 12.6))
        props += rollEnd(L.hx, L.hy - 6, 17, ang);
    else if (between(tm, 12.6, 14.45))
        props += rollSide(LX, 470, 0, ease(win(tm, 12.9, 14.2)));
    else if (between(tm, 14.45, 15.9))
        props += rollSide(L.hx + 6, L.hy - 12, -24 * clamp(win(tm, 14.45, 14.9) - win(tm, 15.5, 15.9)), 1);
    else if (tm >= 15.9) {
        const k = ease(win(tm, 16.0, 17.0));
        const r = rollSide(LX + 90 * k, 470 + 92 * k, 0, 1);
        if (k > 0)
            serve = `<g transform="translate(${f1(LX + 90 * k)} ${f1(470 + 92 * k)}) scale(${(1 + .5 * k).toFixed(3)}) translate(${f1(-(LX + 90 * k))} ${f1(-(470 + 92 * k))})">${r}</g>` + servedSteam(LX + 90 * k, 440 + 60 * k, tm);
        else
            props += r;
    }
    // a little sparkle when he shows it off
    if (between(tm, 14.8, 15.6)) {
        const f = win(tm, 14.8, 15.6);
        fx += [[-50, -40], [40, -50], [60, 10]].map(([dx, dy], i) => `<path transform="translate(${f1(L.hx + dx)} ${f1(L.hy + dy - 10)}) scale(${f1(Math.sin(Math.PI * clamp(f * 1.4 - i * .15)))})" d="M0 -12 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 l9 -3z" fill="#FFE2A8"/>`).join('');
    }
    return { props, fx, serve };
}
/* ===================== overlay & idle detection ===================== */
let el = null, raf = 0, t0 = 0, shownAt = 0, step = -1, act = -1, idleTimer = 0, lastMove = { x: -1, y: -1 };
function build() {
    el = document.createElement('div');
    el.className = 'afk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'akTitle');
    el.innerHTML = `<div class="ak-top"><span class="ak-logo">Violette</span><p id="akTitle"></p><span class="ak-clock" id="akClock"></span></div>
    <svg class="ak-scene" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sceneSVG()}</svg>
    <div class="ak-bottom"><div class="ak-steps" id="akSteps">${Array.from({ length: 6 }, (_, i) => `<i data-i="${i}"></i>`).join('')}</div><p class="ak-caption" id="akCaption" aria-live="polite"></p>
      <button type="button" class="btn btn-acc ak-order" id="akOrder"></button><p class="ak-hint" id="akHint"></p></div>`;
    document.body.appendChild(el);
    $('#akOrder', el).addEventListener('click', e => {
        e.stopPropagation();
        const a = ACTS[Math.max(0, act)], it = ITEM(a.item);
        addLine({ kind: 'item', item: it.id, size: a.size, extras: [] }, 1);
        hide();
        toast(`${it.name[state.lang]} — ${t('card.added').toLowerCase()}`);
    });
    texts();
}
function texts() {
    if (!el)
        return;
    const a = ACTS[Math.max(0, act)], it = ITEM(a.item);
    $('#akTitle', el).textContent = t(a.title);
    $('#akHint', el).textContent = t('afk.hint');
    $('#akOrder', el).textContent = `${t(a.order)} · ${money(it.price + (a.size ? 4000 : 0))}`;
    const pair = a.id === 'coffee' ? ['latte', 'cappuccino'] : a.id === 'burger' ? ['classic-burger', 'cheeseburger'] : ['lavash-chicken', 'lavash-beef'];
    pair.forEach((id, i) => { const x = ITEM(id); $('#akBoardN' + (i + 1), el).textContent = x.name[state.lang]; $('#akBoardP' + (i + 1), el).textContent = money(x.price); });
    if (step >= 0)
        $('#akCaption', el).textContent = t(a.cap + (step + 1));
}
function fit() {
    const svg = el?.querySelector('.ak-scene');
    if (!svg)
        return;
    const portrait = innerWidth / innerHeight < .9;
    svg.setAttribute('viewBox', portrait ? '200 60 760 640' : '0 0 1200 700');
    svg.setAttribute('preserveAspectRatio', portrait ? 'xMidYMid meet' : 'xMidYMid slice');
    svg.querySelector('#akInset')?.setAttribute('transform', portrait ? 'translate(-160 -40) scale(.95)' : '');
}
addEventListener('resize', fit);
function frame(now) {
    if (!el)
        return;
    let T = ((now - t0) / 1000) % TOTAL, ai = 0;
    while (T >= ACTS[ai].dur) {
        T -= ACTS[ai].dur;
        ai++;
    }
    const a = ACTS[ai], tm = T;
    if (ai !== act) {
        act = ai;
        step = -1;
        texts();
        el.dataset.act = a.id;
    }
    const fade = (id) => (a.id === id ? clamp(Math.min(tm / .5, (a.dur - tm) / .5)) : 0);
    $('#stCoffee', el).setAttribute('opacity', f1(fade('coffee')));
    $('#stGrill', el).setAttribute('opacity', f1(fade('burger')));
    $('#stWrap', el).setAttribute('opacity', f1(fade('wrap')));
    $('#stWrapBack', el).setAttribute('opacity', f1(fade('wrap')));
    if (a.id !== 'coffee')
        $('#akInset', el).setAttribute('opacity', '0');
    if (a.id !== 'burger')
        $('#akSplat', el).innerHTML = '';
    const out = a.id === 'coffee' ? actCoffee(tm) : a.id === 'burger' ? actBurger(tm) : actWrap(tm);
    const g = $('#akProps', el), fxg = $('#akFx', el), sv = $('#akServe', el);
    const op = f1(clamp(Math.min(tm / .4, (a.dur - tm) / .4)));
    g.innerHTML = out.props;
    fxg.innerHTML = out.fx;
    sv.innerHTML = out.serve;
    [g, fxg, sv].forEach(x => x.setAttribute('opacity', op));
    const s = a.steps.reduce((acc, st, i) => (tm >= st ? i : acc), 0);
    if (s !== step) {
        step = s;
        $('#akCaption', el).textContent = t(a.cap + (s + 1));
        $('#akCaption', el).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'ease-out' });
        el.querySelectorAll('#akSteps i').forEach((d, i) => d.classList.toggle('on', i <= s));
        el.classList.toggle('serving', s === a.steps.length - 1);
    }
    const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 300) * 60000);
    $('#akClock', el).textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    raf = requestAnimationFrame(frame);
}
function show() {
    if (el?.classList.contains('on') || document.hidden)
        return;
    if (!el)
        build();
    step = -1;
    act = -1;
    t0 = performance.now() - START_AT * 1000;
    shownAt = Date.now();
    el.hidden = false;
    fit();
    requestAnimationFrame(() => el.classList.add('on'));
    document.documentElement.classList.add('afk-on');
    raf = requestAnimationFrame(frame);
}
function hide() {
    if (!el || !el.classList.contains('on'))
        return;
    el.classList.remove('on');
    document.documentElement.classList.remove('afk-on');
    cancelAnimationFrame(raf);
    setTimeout(() => { if (el && !el.classList.contains('on'))
        el.hidden = true; }, 600);
}
function activity(e) {
    if (el?.classList.contains('on')) {
        if (Date.now() - shownAt < 700)
            return; // ignore the jitter right after it appears
        if (e.type === 'pointermove') {
            const p = e;
            if (lastMove.x < 0) {
                lastMove = { x: p.clientX, y: p.clientY };
                return;
            }
            if (Math.hypot(p.clientX - lastMove.x, p.clientY - lastMove.y) < 24)
                return; // a nudged desk isn't "back"
        }
        if (e.type === 'pointerdown' && e.target.closest?.('#akOrder'))
            return;
        hide();
    }
    lastMove = { x: -1, y: -1 };
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(show, IDLE_MS);
}
export function initAfk() {
    if (reduced)
        return;
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, activity, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) {
        hide();
        clearTimeout(idleTimer);
    }
    else
        activity(new Event('visible')); });
    idleTimer = window.setTimeout(show, IDLE_MS);
    on('lang', texts);
}
