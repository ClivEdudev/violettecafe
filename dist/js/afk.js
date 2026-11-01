// Away screen and kitchen show. After 50 s without input a calm kitchen scene fades in over the page: one cook,
// a latte, a burger (with a flip that goes a little too high) and a lavash (rolled with a little too much confidence).
// When he serves a dish, Enter (or a tap on the button) puts it in the cart; anything else brings the site back.
// After checkout the same cook can make the customer's exact order — every size, extra and custom recipe — on request.
// Try it fast with ?afk=5 (seconds) and ?afkt=12 (jump into the loop). The idle show is off for reduced motion.
import { $, clamp, reduced, finePointer, state, t, tf, money, addLine, toast, on } from './shared.js';
import { ITEM, FILLINGS, LAB, EXTRAS, SIZES } from './data.js';
import { latteArt, LAYERS, bunTop, bunBottom, inner } from './art.js';
import { coffeeName, burgerName, wrapName, hotdogName } from './recipes.js';
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
const MOUTH = {
    neutral: 'M691 276 q9 3 18 0', smile: 'M689 273 q11 10 22 0', smirk: 'M692 278 q8 1 13 -3 q3 -2 5 -5', o: 'M696 276 a4 4.6 0 1 0 8 0 a4 4.6 0 1 0 -8 0',
};
/* Proportions (head is 64 wide, 90 tall): shoulders ~2.6 heads wide, upper arm ~1.3 heads, forearm ~1.2, hand ~0.4.
   Elbows always pick the natural bend (down and outward); if a hand can't reach, the body leans and bends toward it
   instead of the arm stretching. */
const UPPER = 118, FORE = 112, SHOULDER_Y = 334, SHOULDER_X = 72;
function ik(sx, sy, tx, ty, side) {
    let dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy) || 1;
    const max = UPPER + FORE - 2, min = Math.abs(UPPER - FORE) + 30;
    if (d > max) {
        dx *= max / d;
        dy *= max / d;
        d = max;
    }
    if (d < min) {
        dx *= min / d;
        dy *= min / d;
        d = min;
    }
    const base = Math.atan2(dy, dx);
    const a = Math.acos(clamp((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d), -1, 1));
    const out = side === 'L' ? -1 : 1;
    const cand = [base + a, base - a].map(ang => ({ ex: sx + Math.cos(ang) * UPPER, ey: sy + Math.sin(ang) * UPPER }));
    // a real elbow hangs down and points away from the body
    const score = (e) => e.ey + .7 * out * (e.ex - sx);
    const e = score(cand[0]) >= score(cand[1]) ? cand[0] : cand[1];
    // When the hand is close to the shoulder on screen, a real arm is reaching toward the viewer, not bending sideways:
    // the elbow then sits near the shoulder-hand line (foreshortened) instead of sticking out like hands on hips.
    const depth = clamp((max - d) / (max * .55)) * (ty > sy - 20 ? .8 : .35);
    const k = UPPER / (UPPER + FORE);
    const lx = sx + dx * k + out * 9, ly = sy + dy * k + 8;
    return { ex: e.ex + (lx - e.ex) * depth, ey: e.ey + (ly - e.ey) * depth, hx: sx + dx, hy: sy + dy };
}
/** Tapered limb segment (a quad with round ends). */
function seg(x1, y1, w1, x2, y2, w2, fill) {
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    const p = [[x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x2 + nx * w2 / 2, y2 + ny * w2 / 2], [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2]];
    return `<polygon points="${p.map(q => q.map(f1).join(',')).join(' ')}" fill="${fill}"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="${w1 / 2}" fill="${fill}"/><circle cx="${f1(x2)}" cy="${f1(y2)}" r="${w2 / 2}" fill="${fill}"/>`;
}
/** A hand drawn along the forearm direction: palm, four curled fingers in a loose grip, and the thumb on the inner side. */
function hand(hx, hy, deg, side) {
    const th = side === 'L' ? 1 : -1;
    return `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(${f1(deg)})">
    <path d="M-16 -9 Q-4 -12 8 -10 Q14 -9 14 0 Q14 9 8 10 Q-4 12 -16 9z" fill="url(#aSkin)"/>
    ${[-6.5, -2.2, 2.2, 6.5].map((y, i) => `<rect x="9" y="${f1(y - 2.4)}" width="${12 - Math.abs(i - 1.5) * 1.6}" height="4.8" rx="2.4" fill="#D9A27C"/>`).join('')}
    <path d="M9 -8 v16" stroke="rgba(110,60,35,.25)" stroke-width="1.3"/>
    <path d="M-8 ${10 * th} Q2 ${15 * th} 9 ${9 * th}" stroke="#CF9670" stroke-width="6.5" fill="none" stroke-linecap="round"/>
    <path d="M-12 ${-6 * th} Q-2 ${-9 * th} 6 ${-7 * th}" stroke="rgba(255,235,215,.45)" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
}
function arm(sx, sy, tx, ty, side) {
    const { ex, ey, hx, hy } = ik(sx, sy, tx, ty, side);
    const fa = Math.atan2(hy - ey, hx - ex), ua = Math.atan2(ey - sy, ex - sx);
    const cuffX = ex + Math.cos(fa) * 20, cuffY = ey + Math.sin(fa) * 20;
    const wx = hx - Math.cos(fa) * 12, wy = hy - Math.sin(fa) * 12;
    const lit = side === 'L' ? 1 : -1; // light comes from the upper left
    const ox = -Math.sin(ua) * lit * 7, oy = Math.cos(ua) * lit * 7;
    let s = `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="21" fill="#E4D9CB"/>`;
    s += seg(sx, sy, 38, ex, ey, 31, '#EAE0D3');
    s += `<line x1="${f1(sx - ox)}" y1="${f1(sy - oy)}" x2="${f1(ex - ox)}" y2="${f1(ey - oy)}" stroke="rgba(255,255,255,.4)" stroke-width="5" stroke-linecap="round"/>`;
    s += `<line x1="${f1(sx + ox * 1.6)}" y1="${f1(sy + oy * 1.6)}" x2="${f1(ex + ox * 1.4)}" y2="${f1(ey + oy * 1.4)}" stroke="rgba(70,45,30,.13)" stroke-width="6" stroke-linecap="round"/>`;
    s += seg(ex, ey, 31, cuffX, cuffY, 29, '#EAE0D3');
    s += seg(cuffX, cuffY, 25, wx, wy, 17, '#D49A74');
    s += `<line x1="${f1(cuffX - ox * .5)}" y1="${f1(cuffY - oy * .5)}" x2="${f1(wx - ox * .4)}" y2="${f1(wy - oy * .4)}" stroke="rgba(255,228,205,.35)" stroke-width="4" stroke-linecap="round"/>`;
    s += `<g transform="translate(${f1(cuffX)} ${f1(cuffY)}) rotate(${f1(fa * 180 / Math.PI)})"><rect x="-7" y="-16" width="14" height="32" rx="7" fill="#DCCFBF"/><line x1="0" y1="-15" x2="0" y2="15" stroke="#C8BAA6" stroke-width="1.6"/></g>`;
    s += hand(hx, hy, fa * 180 / Math.PI, side);
    return { hx, hy, svg: s };
}
function rotAround(x, y, cx, cy, deg) {
    const a = deg * Math.PI / 180, dx = x - cx, dy = y - cy;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}
const reach = { x: 0, y: 0 };
function drawCook(p, tm) {
    // how far each hand is beyond comfortable reach from the resting shoulders → the body leans/bends to help
    const max = UPPER + FORE - 14;
    let wantX = 0, wantY = 0;
    ['L', 'R'].forEach(sd => {
        const sx = 700 + p.lean + (sd === 'L' ? -SHOULDER_X : SHOULDER_X), [tx, ty] = sd === 'L' ? p.L : p.R;
        const dx = tx - sx, dy = ty - SHOULDER_Y, d = Math.hypot(dx, dy);
        if (d > max) {
            const k = (d - max) / d;
            if (Math.abs(dx * k) > Math.abs(wantX))
                wantX = dx * k;
            wantY = Math.max(wantY, dy * k);
        }
    });
    reach.x += (clamp(wantX, -64, 64) - reach.x) * .35;
    reach.y += (clamp(wantY, 0, 34) - reach.y) * .35;
    const lean = p.lean + reach.x, bend = reach.y, tilt = lean * .06;
    $('#akBody').setAttribute('transform', `translate(${f1(lean)} ${f1(bend * .9)}) rotate(${f1(tilt)} 700 640)`);
    $('#akHead').setAttribute('transform', `rotate(${f1(p.head[0] * .5)} 700 300) translate(${f1(p.head[0] * .25)} ${f1(p.head[1] * .35 + bend * .25)})`);
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
    // shoulders follow the body, and lift a little toward a raised hand
    const sh = (sd) => {
        const [x, y] = rotAround(700 + lean + (sd === 'L' ? -SHOULDER_X : SHOULDER_X), SHOULDER_Y + bend * .9, 700 + lean, 640, tilt);
        const [tx, ty] = sd === 'L' ? p.L : p.R;
        return [x + clamp((tx - x) * .04, -6, 6), y + clamp((ty - y) * .05, -9, 3)];
    };
    const sR = sh('R'), sL = sh('L');
    const R = arm(sR[0], sR[1], p.R[0], p.R[1], 'R'), L = arm(sL[0], sL[1], p.L[0], p.L[1], 'L');
    $('#akArms').innerHTML = L.svg + R.svg;
    return { R, L };
}
/* ===================== scene ===================== */
const DEFS = `<defs>
  <linearGradient id="aWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2222"/><stop offset=".7" stop-color="#1D1617"/><stop offset="1" stop-color="#151010"/></linearGradient>
  <radialGradient id="aLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD38A" stop-opacity=".55"/><stop offset=".45" stop-color="#FFB45A" stop-opacity=".18"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient>
  <linearGradient id="aWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5636"/><stop offset=".08" stop-color="#6B3F25"/><stop offset="1" stop-color="#3E2314"/></linearGradient>
  <linearGradient id="aTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DCCB"/><stop offset="1" stop-color="#BBA48B"/></linearGradient>
  <linearGradient id="aBoard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9A876"/><stop offset=".3" stop-color="#C08A57"/><stop offset="1" stop-color="#8E5E36"/></linearGradient>
  <linearGradient id="aChrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5D5B66"/><stop offset=".18" stop-color="#EDE9E9"/><stop offset=".4" stop-color="#9C99A6"/><stop offset=".7" stop-color="#F7F4F4"/><stop offset="1" stop-color="#6B6875"/></linearGradient>
  <linearGradient id="aBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#572326"/><stop offset=".35" stop-color="#A03F44"/><stop offset=".65" stop-color="#B5121A"/><stop offset="1" stop-color="#372829"/></linearGradient>
  <linearGradient id="aShirt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#CDBFAE"/><stop offset=".45" stop-color="#F2EADF"/><stop offset="1" stop-color="#C2B4A1"/></linearGradient>
  <linearGradient id="aApron" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#312526"/><stop offset=".5" stop-color="#662C2F"/><stop offset="1" stop-color="#271E1F"/></linearGradient>
  <radialGradient id="aSkin" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#F0C9A6"/><stop offset=".7" stop-color="#D9A27C"/><stop offset="1" stop-color="#B98060"/></radialGradient>
  <linearGradient id="aSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7E7B88"/><stop offset=".3" stop-color="#F5F2F2"/><stop offset=".6" stop-color="#ABA8B4"/><stop offset="1" stop-color="#5F5C69"/></linearGradient>
  <linearGradient id="aCup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DED0D1"/><stop offset=".4" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D2BFC0"/></linearGradient>
  <radialGradient id="aCrema" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#D8A06A"/><stop offset=".8" stop-color="#9A5A2E"/><stop offset="1" stop-color="#6B3A1C"/></radialGradient>
  <linearGradient id="aLav" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8E6BE"/><stop offset=".6" stop-color="#E8C487"/><stop offset="1" stop-color="#C99A5A"/></linearGradient>
  <linearGradient id="aDoner" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5A2C14"/><stop offset=".35" stop-color="#B8642C"/><stop offset=".6" stop-color="#D9864A"/><stop offset="1" stop-color="#6A3418"/></linearGradient>
  <linearGradient id="aDonerC" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7A4A1E"/><stop offset=".35" stop-color="#D99A4A"/><stop offset=".6" stop-color="#EDB872"/><stop offset="1" stop-color="#8A5422"/></linearGradient>
  <radialGradient id="aHeat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF8A3A" stop-opacity=".55"/><stop offset="1" stop-color="#FF5A1A" stop-opacity="0"/></radialGradient>
  <filter id="aBlur"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="aSoft" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>
  <clipPath id="aInset"><circle cx="1010" cy="190" r="104"/></clipPath>
  <clipPath id="aCone"><path d="M890 296 Q930 284 970 296 L952 468 Q930 476 908 468z"/></clipPath>
</defs>`;
const board = (x, w) => `<g filter="url(#aSoft)"><rect x="${x}" y="488" width="${w}" height="16" rx="6" fill="url(#aBoard)"/></g><rect x="${x + 6}" y="489" width="${w - 12}" height="3" rx="1.5" fill="rgba(255,255,255,.3)"/>`;
function sceneSVG() {
    const jars = [0, 1, 2, 3, 4].map(i => { const x = 120 + i * 70; return `<g transform="translate(${x} 150)"><rect x="-22" y="-56" width="44" height="56" rx="8" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.18)"/><rect x="-18" y="-${20 + (i * 7) % 24}" width="36" height="${16 + (i * 7) % 24}" rx="4" fill="${['#5A3220', '#7A4A2A', '#3E2316', '#8A5A36', '#4A2A1A'][i]}"/><rect x="-24" y="-64" width="48" height="10" rx="4" fill="#3C3233"/></g>`; }).join('');
    const bokeh = Array.from({ length: 14 }, (_, i) => `<circle class="ak-bokeh" style="--d:${(i * .9) % 8}s;--x:${(i % 2 ? 1 : -1) * (10 + i * 2)}px" cx="${(i * 83) % 1200}" cy="${80 + (i * 47) % 380}" r="${4 + (i % 4) * 3}" fill="#FFC98A" opacity="${.05 + (i % 3) * .04}"/>`).join('');
    const lamp = (x, d) => `<g class="ak-lamp" style="--d:${d}s;transform-origin:${x}px 0px"><line x1="${x}" y1="0" x2="${x}" y2="90" stroke="#0F0B0B" stroke-width="2"/><path d="M${x - 34} 120 Q${x} 72 ${x + 34} 120z" fill="#221A1B"/><ellipse cx="${x}" cy="120" rx="34" ry="6" fill="#FFE2A8"/><circle cx="${x}" cy="150" r="190" fill="url(#aLamp)"/></g>`;
    const stripes = Array.from({ length: 22 }, (_, i) => `<rect x="${876 + i * 7}" y="280" width="3" height="200" fill="rgba(60,25,8,.35)"/>`).join('');
    return `${DEFS}
  <rect width="1200" height="700" fill="url(#aWall)"/>
  <g opacity=".5">${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 100}" y="0" width="2" height="500" fill="rgba(255,255,255,.025)"/>`).join('')}</g>
  <rect x="60" y="150" width="420" height="10" rx="3" fill="#4A2E22"/>${jars}
  <g transform="translate(860 70)"><rect width="260" height="160" rx="10" fill="#151313" stroke="#3C3233" stroke-width="6"/><text x="130" y="58" text-anchor="middle" class="ak-chalk-t">FFS</text>
    <text x="24" y="98" class="ak-chalk" id="akBoardN1"></text><text x="236" y="98" text-anchor="end" class="ak-chalk" id="akBoardP1"></text><text x="24" y="128" class="ak-chalk" id="akBoardN2"></text><text x="236" y="128" text-anchor="end" class="ak-chalk" id="akBoardP2"></text></g>
  ${bokeh}
  <g id="stCoffee">
    <g id="akMachine">
      <rect x="232" y="318" width="300" height="190" rx="18" fill="url(#aBody)"/>
      <rect x="232" y="318" width="300" height="34" rx="14" fill="url(#aChrome)"/>
      <rect x="250" y="300" width="70" height="20" rx="6" fill="url(#aCup)"/><rect x="330" y="302" width="64" height="18" rx="6" fill="url(#aCup)"/>
      <circle cx="300" cy="388" r="20" fill="#1D1717" stroke="url(#aChrome)" stroke-width="5"/><line id="akNeedle" x1="300" y1="388" x2="300" y2="374" stroke="#FFB45A" stroke-width="3" stroke-linecap="round"/>
      <circle cx="470" cy="388" r="20" fill="#1D1717" stroke="url(#aChrome)" stroke-width="5"/><line x1="470" y1="388" x2="481" y2="378" stroke="#FFB45A" stroke-width="3" stroke-linecap="round"/>
      <rect x="352" y="420" width="56" height="26" rx="6" fill="url(#aChrome)"/><circle id="akLight" cx="380" cy="414" r="5" fill="#5A3A1C"/>
      <rect x="262" y="486" width="240" height="18" rx="5" fill="url(#aChrome)"/>
      <path d="M520 360 q30 4 26 40 l-2 56" fill="none" stroke="url(#aChrome)" stroke-width="7" stroke-linecap="round"/>
      <text x="382" y="342" text-anchor="middle" class="ak-badge" style="font-size:16px">FFS</text>
    </g>
    <g id="akGrinder">
      <path d="M818 300 h64 l-10 58 h-44z" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.35)"/>
      <rect id="akBeans" x="826" y="318" width="48" height="38" rx="4" fill="#4A2A18"/>
      <rect x="810" y="356" width="80" height="70" rx="10" fill="url(#aChrome)"/>
      <rect x="838" y="426" width="24" height="16" rx="3" fill="#3A3640"/>
      <rect x="800" y="500" width="100" height="8" rx="3" fill="#2D2929"/>
    </g>
  </g>
  <g id="stWrapBack" opacity="0">
    <rect x="982" y="284" width="22" height="196" rx="6" fill="#2D2929"/><rect x="986" y="292" width="14" height="180" rx="4" fill="#FF7A3A" opacity=".75" class="ak-flicker"/>
    <ellipse cx="960" cy="380" rx="90" ry="130" fill="url(#aHeat)"/>
    <line x1="930" y1="232" x2="930" y2="500" stroke="url(#aSteel)" stroke-width="6"/><circle cx="930" cy="232" r="7" fill="url(#aSteel)"/>
    <path id="akCone" d="M890 296 Q930 284 970 296 L952 468 Q930 476 908 468z" fill="url(#aDoner)"/>
    <g clip-path="url(#aCone)"><g class="ak-spin">${stripes}</g><rect x="880" y="280" width="30" height="200" fill="rgba(0,0,0,.25)"/></g>
    <ellipse cx="930" cy="296" rx="40" ry="8" fill="#C97A40"/>
  </g>
  <g id="akBody">
    <path d="M626 334 Q628 318 656 312 L744 312 Q772 318 774 334 Q786 356 780 392 L772 640 H628 L620 392 Q614 356 626 334z" fill="url(#aShirt)"/>
    <path d="M640 396 Q700 410 760 396" fill="none" stroke="rgba(70,45,30,.08)" stroke-width="10"/>
    <path d="M687 276 L713 276 L715 316 Q700 324 685 316z" fill="#C98E68"/><path d="M687 288 Q700 298 713 288 L713 298 Q700 306 687 298z" fill="rgba(90,50,30,.2)"/>
    <path d="M676 314 L700 340 L724 314 L713 304 L700 322 L687 304z" fill="#F7F1E8" stroke="#D8CDBE" stroke-width="1.5"/>
    <path d="M652 354 Q700 345 748 354 L756 640 H644z" fill="url(#aApron)"/>
    <path d="M662 356 L678 314 M738 356 L722 314" stroke="#312526" stroke-width="6" stroke-linecap="round"/>
    <rect x="681" y="442" width="40" height="30" rx="4" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/><line x1="712" y1="432" x2="714" y2="450" stroke="#F6C2C3" stroke-width="3" stroke-linecap="round"/>
    <text x="700" y="414" text-anchor="middle" class="ak-badge" style="font-size:16px">FFS</text>
    <rect x="716" y="368" width="34" height="13" rx="3" fill="#F4ECE1"/><text x="733" y="377.8" text-anchor="middle" class="ak-tag">Sardor</text>
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
    <rect x="800" y="470" width="190" height="34" rx="4" fill="#2D2929"/><rect x="806" y="464" width="178" height="8" rx="2" fill="#4A4652"/>
    <rect x="812" y="474" width="166" height="3" rx="1.5" fill="#FF7A3A" opacity=".6" class="ak-flicker"/>
    <circle cx="830" cy="490" r="5" fill="url(#aSteel)"/><circle cx="960" cy="490" r="5" fill="url(#aSteel)"/>
  </g>
  <g id="stWrap" opacity="0">${board(410, 300)}<rect x="866" y="486" width="84" height="18" rx="4" fill="url(#aSteel)"/><rect x="872" y="482" width="72" height="8" rx="3" fill="#8A4A22"/></g>
  <g id="stFryer" opacity="0">${board(410, 300)}
    <rect x="812" y="300" width="182" height="150" rx="8" fill="url(#aChrome)" opacity=".35"/><rect x="826" y="314" width="154" height="10" rx="4" fill="#2D2929"/>
    <ellipse cx="903" cy="452" rx="84" ry="7" fill="#C98A2C" opacity=".85"/><ellipse cx="903" cy="440" rx="90" ry="60" fill="url(#aHeat)" opacity=".5"/></g>
  <g id="stPlain" opacity="0">${board(410, 300)}<rect x="830" y="456" width="150" height="48" rx="6" fill="url(#aChrome)" opacity=".55"/><rect x="840" y="462" width="130" height="6" rx="3" fill="rgba(255,255,255,.4)"/></g>
  <g id="akArms"></g>
  <g id="akProps"></g>
  <g id="akFx"></g>
  <rect x="0" y="504" width="1200" height="20" fill="url(#aTop)"/>
  <rect x="0" y="524" width="1200" height="176" fill="url(#aWood)"/>
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${40 + i * 196}" y="548" width="176" height="128" rx="6" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`).join('')}
  <g id="akServe"></g>
  ${lamp(170, 0)}${lamp(600, 1.4)}
  <g id="akInset" opacity="0"><circle cx="1010" cy="190" r="112" fill="#151010" stroke="#FFE2A8" stroke-opacity=".5" stroke-width="3"/>
    <g clip-path="url(#aInset)"><circle cx="1010" cy="190" r="104" fill="url(#aCup)"/><circle cx="1010" cy="190" r="84" fill="url(#aCrema)"/><g id="akArt"></g></g></g>`;
}
/* ===================== shared props =====================*/
const portafilter = (gx, gy, rot = 0) => `<g transform="translate(${f1(gx)} ${f1(gy)}) rotate(${rot})"><rect x="-6" y="-6" width="52" height="12" rx="6" fill="#2A1A14"/><rect x="-62" y="-12" width="44" height="20" rx="6" fill="url(#aSteel)" transform="translate(14 0)"/><path d="M-48 8 h44 l-4 10 h-36z" fill="url(#aSteel)" transform="translate(14 0)"/></g>`;
const tamper = (x, y) => `<g transform="translate(${f1(x)} ${f1(y)})"><rect x="-7" y="-34" width="14" height="30" rx="7" fill="#2A1A14"/><rect x="-20" y="-6" width="40" height="10" rx="3" fill="url(#aSteel)"/></g>`;
const pitcher = (gx, gy, rot = 0) => `<g transform="translate(${f1(gx)} ${f1(gy)}) rotate(${rot})"><path d="M-6 -34 q14 2 12 16 q-2 10 -12 10" fill="none" stroke="url(#aSteel)" stroke-width="5"/><path d="M-50 -46 h40 l4 42 q0 4 -4 4 h-40 q-4 0 -4 -4z M-50 -46 l-10 -4 l6 8z" fill="url(#aSteel)" transform="translate(4 0)"/></g>`;
const servedSteam = (x, y, tm) => Array.from({ length: 3 }, (_, i) => { const f = ((tm * .5 + i / 3) % 1); return `<path d="M${f1(x + (i - 1) * 16)} ${f1(y - f * 90)} q-10 -14 0 -28 q10 -14 0 -28" stroke="#fff" stroke-width="5" fill="none" opacity="${f1((1 - f) * .45)}" filter="url(#aBlur)"/>`; }).join('');
const BX = 520, BY = 488;
const spatula = (hx, hy) => `<g><line x1="${f1(hx + 2)}" y1="${f1(hy)}" x2="${f1(hx + 24)}" y2="${f1(hy - 24)}" stroke="#2A1A14" stroke-width="7" stroke-linecap="round"/><path d="M${f1(hx - 2)} ${f1(hy - 2)} L${f1(hx - 12)} ${f1(hy + 10)}" stroke="url(#aSteel)" stroke-width="4"/><rect x="${f1(hx - 58)}" y="${f1(hy + 8)}" width="50" height="5" rx="2" fill="url(#aSteel)"/></g>`;
const bottle = (hx, hy) => `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(172)"><rect x="-13" y="-8" width="26" height="54" rx="9" fill="#C62828"/><rect x="-13" y="-8" width="9" height="54" rx="4" fill="rgba(255,255,255,.22)"/><rect x="-9" y="-20" width="18" height="14" rx="3" fill="#F4ECE1"/><path d="M-3 -20 l3 -10 l3 10z" fill="#F4ECE1"/><rect x="-10" y="10" width="20" height="16" rx="2" fill="#F4B731"/></g>`;
const flag = (x, y) => `<g><line x1="${f1(x)}" y1="${f1(y + 26)}" x2="${f1(x)}" y2="${f1(y - 30)}" stroke="#E7D3B0" stroke-width="2.5"/><path d="M${f1(x)} ${f1(y - 30)} h22 l-5 7 l5 7 h-22z" fill="#E11D24"/><text x="${f1(x + 9)}" y="${f1(y - 19)}" class="ak-flag" text-anchor="middle" style="font-size:6.5px">FFS</text></g>`;
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
  <ellipse cx="-62" cy="0" rx="9" ry="16" fill="#E8C487"/><ellipse cx="-62" cy="0" rx="5" ry="9" fill="#A0552E"/><circle cx="-60" cy="-4" r="2.6" fill="#E11D24"/><circle cx="-63" cy="5" r="2" fill="#7CB342"/>
  ${paper > 0 ? `<rect x="${f1(66 - 80 * paper)}" y="-19" width="${f1(80 * paper)}" height="38" rx="6" fill="#E11D24"/><rect x="${f1(66 - 80 * paper)}" y="-19" width="${f1(80 * paper)}" height="8" rx="4" fill="rgba(255,255,255,.18)"/>${paper > .6 ? `<text x="30" y="7" text-anchor="middle" class="ak-flag" style="font-size:13px">FFS</text>` : ''}` : ''}</g>`;
/** The lavash timeline, drawn from the current recipe (WP): meat, sauce, fries or greens, cheese, jalapeño. */
function wrapDraw(tm, h) {
    const R = h.R, L = h.L, p = WP;
    let props = '', fx = '', serve = '';
    // knife on the spit, shavings fall into the tray
    if (tm < 3.55) {
        props += knife(R.hx, R.hy);
        for (let i = 0; i < 8; i++) {
            const f = ((tm * 1.6 + i / 8) % 1);
            fx += `<rect x="${f1(900 + Math.sin(i * 3.1) * 14)}" y="${f1(330 + ((i * 37) % 110) + f * (480 - 330 - ((i * 37) % 110)))}" width="9" height="3.5" rx="1.5" fill="${p.meatC}" transform="rotate(${(i * 47) % 90} ${f1(904)} ${f1(400)})" opacity="${f1(1 - f * .3)}"/>`;
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
        const zig = (c, dy, sw) => { let d = `M470 ${481 + dy}`; for (let x = 482; x <= Math.min(sx, right - 4); x += 12)
            d += ` L${x} ${((x / 12) % 2 ? 478 : 482) + dy}`; return `<path d="${d}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linejoin="round"/>`; };
        if (tm > 4.5) {
            flat += zig('#FFF8EC', 0, p.extraSauce ? 4.5 : 3);
            if (p.spicy)
                flat += zig('#D84315', -2, 2.2);
        }
        const meat = [[480, 6.0], [505, 6.0], [530, 6.05], [585, 6.6], [612, 6.6], [640, 6.65]];
        meat.forEach(([x, at], i) => { if (tm > at && x < right - 6) {
            const f = win(tm, at, at + .2);
            flat += `<rect x="${x - 9}" y="${f1(440 + (472 - 440) * f)}" width="18" height="7" rx="3" fill="${p.meatC}" transform="rotate(${(i * 23) % 30 - 15} ${x} 476)"/>`;
        } });
        if (p.fries)
            [500, 528, 556, 590, 622].forEach((x, i) => { if (tm > 7.2 && x < right - 6)
                flat += `<rect x="${x - 11}" y="${470 - (i % 2) * 3}" width="22" height="4" rx="2" fill="#F4C542" transform="rotate(${(i * 31) % 40 - 20} ${x} 472)"/>`; });
        else
            [496, 530, 566, 604, 636].forEach((x, i) => { if (tm > 7.2 && x < right - 6)
                flat += `<path d="M${x - 10} ${471 - (i % 2) * 2} q10 -8 20 0" stroke="#5E9E3A" stroke-width="4" fill="none" stroke-linecap="round"/>`; });
        if (p.cheese)
            [490, 540, 596, 630].forEach((x, i) => { if (tm > 7.5 && x < right - 6)
                flat += `<path d="M${x - 12} ${466 + (i % 2)} h24 l-3 6 l-4 -2 l-5 4 l-4 -3 l-8 1z" fill="#F4B731"/>`; });
        [512, 548, 600, 632].forEach(x => { if (tm > 7.8 && x < right - 6)
            flat += `<circle cx="${x}" cy="469" r="5" fill="#E11D24"/>`; });
        if (p.jalapeno)
            [524, 576, 618].forEach(x => { if (tm > 7.9 && x < right - 6)
                flat += `<circle cx="${x}" cy="466" r="4.5" fill="none" stroke="#3F8A2E" stroke-width="2.6"/>`; });
        props += flat;
    }
    if (between(tm, 4.4, 5.3))
        props += squeeze(R.hx, R.hy);
    if (between(tm, 5.6, 6.7))
        props += `<rect x="${f1(R.hx - 9)}" y="${f1(R.hy + 8)}" width="18" height="7" rx="3" fill="${p.meatC}"/>`;
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
const REST_R = [775, 505], REST_L = [625, 505];
function at(path, T) { let cur = null; for (const [tt, l] of path) {
    if (T >= tt)
        cur = l;
    else
        break;
} return cur; }
const merge = (...o) => ({ props: o.map(x => x?.props ?? '').join(''), fx: o.map(x => x?.fx ?? '').join(''), serve: o.map(x => x?.serve ?? '').join('') });
function mkAct(a) {
    let T = 0;
    const segs = a.segs.map(s => { const x = { ...s, start: T }; T += s.dur; return x; });
    return { ...a, segs, dur: T };
}
/** A builder helper: adds segments one after another and tells you when each starts. */
class Seq {
    constructor() {
        this.segs = [];
        this.T = 0;
    }
    add(s) { const st = this.T; this.segs.push(s); this.T += s.dur; return st; }
}
const servePose = (k, x0, y0, dx, dy, sc) => ({ x: x0 + dx * k, y: y0 + dy * k, s: 1 + sc * k });
const wave = [[0, 775, 505], [.6, 852, 258], [1.0, 884, 246], [1.4, 852, 258], [1.8, 884, 246], [2.4, 775, 505]];
const smileFace = (from) => (tm) => (tm > from ? { mouth: 'smile', brows: 2, wink: between(tm, from + .9, from + 1.25), look: [0, 0], head: [0, 0] } : {});
const artAt = (a, x, by, s, extra = '') => `<g transform="translate(${f1(x)} ${f1(by)}) scale(${s.toFixed(3)}) translate(-200 -268)"${extra}>${inner(a)}</g>`;
function drawCup(kind, x, by, layers, o) {
    const sc = (o.scale ?? 1) * (kind === 'small' ? .74 : 1);
    const tot = layers.reduce((a, l) => a + l.a, 0);
    if (kind === 'iced') {
        const H = 74;
        let y = -4, liquid = '';
        layers.forEach(l => { const h = H * l.a; y -= h; if (h > .2)
            liquid += `<rect x="-24" y="${f1(y)}" width="48" height="${f1(h + .6)}" fill="${l.c}"/>`; });
        const ice = o.ice ?? 0;
        const cubes = ice > 0 ? [[-10, -26], [8, -38], [-6, -52], [10, -60]].slice(0, Math.ceil(ice * 4)).map(([cx, cy], i) => `<rect x="${cx - 9}" y="${cy - 9}" width="18" height="17" rx="4" fill="rgba(255,255,255,.45)" stroke="rgba(255,255,255,.85)" stroke-width="1.4" transform="rotate(${i * 23 - 20} ${cx} ${cy})"/>`).join('') : '';
        const cream = o.tops?.find(t => t.k === 'cream');
        return `<g transform="translate(${f1(x)} ${f1(by)}) rotate(${o.rot ?? 0}) scale(${sc.toFixed(3)})" filter="url(#aSoft)">
      <clipPath id="${o.clipId}"><path d="M-21 -80 h42 l-4 76 h-34z"/></clipPath>
      <path d="M-23 -82 h46 l-5 78 q0 4 -4 4 h-28 q-4 0 -4 -4z" fill="rgba(255,255,255,.22)"/>
      <g clip-path="url(#${o.clipId})">${liquid}${cubes}</g>
      <path d="M-23 -82 h46 l-5 78 q0 4 -4 4 h-28 q-4 0 -4 -4z" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2"/>
      <path d="M-17 -74 l3 64" stroke="#fff" stroke-width="4" opacity=".45" stroke-linecap="round"/>
      ${cream && cream.v > 0 ? `<g transform="translate(0 -82) scale(${f1(cream.v)})"><path d="M-24 2 q-6 -18 12 -22 q2 -18 18 -14 q16 -6 18 12 q14 6 0 24z" fill="url(#g-cream)"/></g>` : ''}
      ${o.straw ? `<path d="M6 -10 L20 -110" stroke="url(#g-straw)" stroke-width="7" stroke-linecap="round"/>` : ''}
      ${(o.tops ?? []).filter(t => t.k === 'cocoa' || t.k === 'cinnamon').map(t => Array.from({ length: Math.round(16 * t.v) }, (_, i) => `<circle cx="${-14 + ((i * 37) % 28)}" cy="${-86 - ((i * 13) % 8)}" r="1.4" fill="${t.k === 'cocoa' ? '#3A1F14' : '#8A4B1F'}"/>`).join('')).join('')}</g>`;
    }
    const lvl = 34 * Math.min(1, tot);
    let y = -4, liquid = '';
    layers.forEach(l => { const h = 34 * l.a; y -= h; if (h > .2)
        liquid += `<rect x="-20" y="${f1(y)}" width="40" height="${f1(h + .6)}" fill="${l.c}"/>`; });
    const topC = o.foam ? '#F3E6D6' : layers.filter(l => l.a > .01).slice(-1)[0]?.c ?? '#fff';
    const tops = o.tops ?? [];
    const cream = tops.find(t => t.k === 'cream'), mallow = tops.find(t => t.k === 'mallow');
    return `<g transform="translate(${f1(x)} ${f1(by)}) rotate(${o.rot ?? 0}) scale(${sc.toFixed(3)})" filter="url(#aSoft)"><path d="M18 -26 q18 2 14 14 q-3 9 -16 8" fill="none" stroke="#E7E2E2" stroke-width="6"/>
    <path d="M-22 -40 h44 l-5 36 q-1 4 -6 4 h-22 q-5 0 -6 -4z" fill="url(#aCup)"/><rect x="-21" y="-30" width="42" height="5" fill="#E11D24" opacity=".9"/>
    ${tot > .005 ? `<clipPath id="${o.clipId}"><path d="M-19 -38 h38 l-5 34 h-28z"/></clipPath><g clip-path="url(#${o.clipId})">${liquid}</g><ellipse cx="0" cy="${f1(-4 - lvl)}" rx="${f1(15 + Math.min(1, tot) * 4)}" ry="3" fill="${topC}"/>` : ''}
    ${cream && cream.v > 0 ? `<g transform="translate(0 ${f1(-4 - lvl)}) scale(${f1(cream.v)})"><path d="M-20 2 q-5 -14 10 -18 q2 -14 14 -11 q14 -4 15 10 q12 6 0 19z" fill="url(#g-cream)"/></g>` : ''}
    ${mallow ? [[-8, 0], [5, -3], [12, 1]].slice(0, Math.ceil(mallow.v * 3)).map(([mx, my]) => `<rect x="${mx - 5}" y="${f1(-8 - lvl + my)}" width="10" height="8" rx="2.5" fill="#FFF4F8" stroke="#E9D6D7"/>`).join('') : ''}
    ${tops.filter(t => t.k === 'cocoa' || t.k === 'cinnamon').map(t => Array.from({ length: Math.round(14 * t.v) }, (_, i) => `<circle cx="${-12 + ((i * 37) % 24)}" cy="${f1(-5 - lvl - (cream ? 14 : 0) + ((i * 13) % 4))}" r="1.3" fill="${t.k === 'cocoa' ? '#3A1F14' : '#8A4B1F'}"/>`).join('')).join('')}
    <ellipse cx="0" cy="0" rx="30" ry="5" fill="#EFEBEB"/></g>`;
}
const pumpBottle = (hx, hy, c, press) => `<g transform="translate(${f1(hx)} ${f1(hy)})"><rect x="-12" y="${f1(-4 + press)}" width="24" height="6" rx="2" fill="#2D2929"/><rect x="-3" y="${f1(2 + press)}" width="6" height="14" fill="#3A3640"/><path d="M3 ${f1(8 + press)} h16 v4 h-12z" fill="#3A3640"/><rect x="-16" y="16" width="32" height="64" rx="8" fill="${c}" opacity=".92"/><rect x="-16" y="16" width="10" height="64" rx="5" fill="rgba(255,255,255,.25)"/><rect x="-12" y="36" width="24" height="18" rx="3" fill="#F4ECE1"/></g>`;
const carton = (hx, hy, rot) => `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(${f1(rot)})"><rect x="-48" y="-30" width="40" height="64" rx="4" fill="#FBF8F2"/><path d="M-48 -30 l20 -16 l20 16z" fill="#EEE6DA"/><rect x="-48" y="0" width="40" height="14" fill="#E11D24"/></g>`;
const kettle = (hx, hy, rot) => `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(${f1(rot)})"><path d="M-14 -6 q4 -14 -6 -18" fill="none" stroke="#2A1A14" stroke-width="6" stroke-linecap="round"/><path d="M-70 -30 h50 l4 32 q0 6 -6 6 h-46 q-6 0 -6 -6z" fill="url(#aSteel)"/><path d="M-70 -18 q-20 -6 -30 -24" fill="none" stroke="url(#aSteel)" stroke-width="5" stroke-linecap="round"/></g>`;
const creamCan = (hx, hy) => `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(180)"><rect x="-11" y="-10" width="22" height="58" rx="6" fill="url(#aSteel)"/><path d="M-4 -10 l4 -14 l4 14z" fill="#2D2929"/><rect x="-11" y="20" width="22" height="10" fill="#E11D24"/></g>`;
const shaker = (hx, hy, c) => `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(170)"><rect x="-12" y="-6" width="24" height="40" rx="6" fill="#F4ECE1"/><rect x="-13" y="-12" width="26" height="9" rx="3" fill="url(#aSteel)"/><rect x="-12" y="8" width="24" height="12" fill="${c}"/></g>`;
function coffeeAct(p, qty = 1, order) {
    const q = new Seq();
    const espresso = p.base === 'espresso';
    const cupPath = [], pfPath = [], pitPath = p.milk === 'steam' ? [[0, [600, 505]]] : [];
    const fills = [];
    const tilts = [];
    const tops = [];
    let iceT = Infinity, strawT = Infinity, foamT = Infinity, grindT = -1, serveT = Infinity;
    if (espresso) {
        grindT = q.add({ dur: 4.2, cap: () => t('k.grind'), R: [[0, 775, 505], [.8, 898, 468], [3.2, 898, 468], [4.2, 818, 500]],
            draw: (tm) => { let fx = ''; if (between(tm, .9, 3.1)) {
                for (let i = 0; i < 9; i++) {
                    const f = ((tm * 3 + i / 9) % 1);
                    fx += `<circle cx="${f1(850 + Math.sin(i * 7 + tm * 10) * 5)}" cy="${f1(442 + f * 22)}" r="2.2" fill="#3A2214"/>`;
                }
                $('#akGrinder').setAttribute('transform', `translate(${f1(Math.sin(tm * 90) * .8)} 0)`);
            } return { fx }; } });
        pfPath.push([0, 'R']);
        const tampT = q.add({ dur: 3.4, cap: () => t('k.tamp'), R: [[0, 818, 500], [.3, 850, 505], [.7, 770, 468], [1.2, 770, 488], [1.6, 770, 470], [2.0, 770, 488], [2.4, 770, 470], [2.9, 850, 505], [3.4, 818, 500]],
            draw: (tm, h) => ({ props: between(tm, .3, 2.9) ? tamper(h.R.hx, h.R.hy) : '' }) });
        pfPath.push([tampT, [818, 500]]);
        const lockT = q.add({ dur: 3.6, cap: () => t('k.lock'), R: [[0, 818, 500], [.5, 705, 470], [.9, 775, 505]], L: [[0, 625, 505], [.5, 705, 470], [1.5, 428, 446], [1.9, 428, 446], [2.4, 560, 545], [3.0, 408, 505], [3.6, 625, 505]] });
        pfPath.push([lockT, 'R'], [lockT + .5, 'L'], [lockT + 1.5, [428, 446]]);
        cupPath.push([lockT + 2.5, 'L'], [lockT + 3.0, [380, 505]]);
    }
    else {
        pfPath.push([0, [428, 446]]);
        const c = p.base === 'matcha' ? '#7FA54A' : '#5A2A18';
        const bT = q.add({ dur: 3.4, cap: () => t('k.base.' + p.base), L: [[0, 625, 505], [.5, 600, 545], [1.0, 408, 505], [1.3, 625, 505]], R: [[0, 775, 505], [1.3, 775, 505], [1.7, 440, 396], [2.9, 440, 396], [3.4, 775, 505]],
            draw: (tm, h) => { const pour = between(tm, 1.9, 2.8); return { props: between(tm, 1.4, 3.1) ? `<g transform="translate(${f1(h.R.hx)} ${f1(h.R.hy)}) rotate(${f1(-50 * ease(win(tm, 1.7, 2.0)) * (1 - win(tm, 2.8, 3.0)))})"><path d="M-40 -26 h30 l3 30 q0 4 -4 4 h-28 q-4 0 -4 -4z M-40 -26 l-8 -2 l5 6z" fill="url(#aSteel)"/></g>` : '', fx: pour ? `<path d="M${f1(h.R.hx - 46)} ${f1(h.R.hy - 14)} Q${f1(h.R.hx - 54)} ${f1(h.R.hy + 40)} 384 ${p.cup === 'iced' ? 420 : 470}" stroke="${c}" stroke-width="5" fill="none"/>` : '' }; } });
        cupPath.push([bT + .5, 'L'], [bT + 1.0, [380, 505]]);
        fills.push({ c, a: .3, t0: bT + 1.9, t1: bT + 2.8 });
    }
    if (p.syrup) {
        const sy = p.syrup;
        const sT = q.add({ dur: 2.4, cap: () => tf('k.syrup', { s: sy.n() }), R: [[0, 775, 505], [.6, 430, 300], [.9, 430, 300], [1.2, 430, 300], [1.5, 430, 300], [1.8, 430, 300], [2.4, 775, 505]],
            draw: (tm, h) => { const press = (between(tm, .9, 1.1) || between(tm, 1.5, 1.7)) ? 8 : 0; const show = between(tm, .4, 2.1); return { props: show ? pumpBottle(h.R.hx, h.R.hy, sy.c, press) : '', fx: press ? `<path d="M${f1(h.R.hx + 17)} ${f1(h.R.hy + 14)} Q${f1(h.R.hx + 12)} ${f1(h.R.hy + 80)} 384 ${p.cup === 'iced' ? 430 : 472}" stroke="${sy.c}" stroke-width="3" fill="none"/>` : '' }; } });
        fills.unshift({ c: sy.c, a: .08, t0: sT + .9, t1: sT + 1.8 });
    }
    if (p.cup === 'iced') {
        const iT = q.add({ dur: 2.0, cap: () => t('k.ice'), R: [[0, 775, 505], [.5, 720, 545], [.95, 400, 380], [1.25, 400, 380], [2.0, 775, 505]],
            draw: (tm, h) => { let props = ''; if (between(tm, .55, 1.25))
                props += [[-8, 0], [8, -4], [0, -12]].map(([dx, dy]) => `<rect x="${f1(h.R.hx + dx - 8)}" y="${f1(h.R.hy + dy + 6)}" width="16" height="15" rx="4" fill="rgba(255,255,255,.55)" stroke="#fff"/>`).join(''); if (between(tm, 1.25, 1.55)) {
                const f = win(tm, 1.25, 1.55);
                props += [[-8, 0], [8, -4], [0, -12]].map(([dx, dy]) => `<rect x="${f1(380 + dx - 8)}" y="${f1(386 + dy + f * 60)}" width="16" height="15" rx="4" fill="rgba(255,255,255,.55)" stroke="#fff"/>`).join('');
            } return { props }; } });
        iceT = iT + 1.5;
    }
    if (espresso) {
        const dur = 2.6 + .9 * (p.shots - 1);
        const shotA = p.cup === 'small' ? .32 + .14 * (p.shots - 1) : p.milk === 'water' ? .22 : .13 + .06 * (p.shots - 1);
        const brT = q.add({ dur, cap: () => t('k.brew' + Math.min(3, p.shots)), face: () => ({ look: [-8, 3], head: [-10, 4] }),
            draw: (tm) => {
                const on = between(tm, .3, dur - .2);
                $('#akLight').setAttribute('fill', on ? '#FFB45A' : '#5A3A1C');
                $('#akNeedle').setAttribute('transform', `rotate(${on ? f1(60 + Math.sin(tm * 8) * 4) : 0} 300 388)`);
                const top = p.cup === 'iced' ? 430 : 486;
                return { fx: on ? `<path d="M374 446 Q373 ${f1(462 + Math.sin(tm * 20))} 376 ${top}" stroke="#5A2E1A" stroke-width="3" fill="none"/><path d="M386 446 Q387 ${f1(462 + Math.cos(tm * 20))} 384 ${top}" stroke="#5A2E1A" stroke-width="3" fill="none"/>` : '' };
            } });
        fills.push({ c: '#4A2414', a: shotA, t0: brT + .3, t1: brT + dur - .2 });
    }
    let home = [380, 505];
    const pourSeg = (cap, tool, color, amount, withArt) => {
        const st = q.add({ dur: withArt ? 4.4 : 3.8, cap, L: [[0, 625, 505], [.5, 408, 505], [1.2, 650, 452], [withArt ? 3.6 : 3.0, 650, 452], [withArt ? 4.2 : 3.6, 700, 505], [withArt ? 4.4 : 3.8, 625, 505]],
            R: [[0, 775, 505], [.6, tool === 'pitcher' ? 605 : 720, tool === 'pitcher' ? 505 : 545], [1.2, 716, 408], [withArt ? 3.6 : 3.0, 716, 408], [withArt ? 4.0 : 3.4, tool === 'pitcher' ? 600 : 720, tool === 'pitcher' ? 505 : 545], [withArt ? 4.4 : 3.8, 775, 505]],
            face: (tm) => (between(tm, 1.2, 3.4) ? { look: [-2, 7], head: [-2, 10] } : {}),
            draw: (tm, h) => {
                const tip = -58 * ease(win(tm, 1.3, 1.9)) * (1 - win(tm, withArt ? 3.4 : 2.8, withArt ? 3.7 : 3.1));
                let props = '', fx = '';
                if (tool !== 'pitcher' && between(tm, .7, withArt ? 3.9 : 3.3))
                    props += tool === 'carton' ? carton(h.R.hx, h.R.hy, tip) : kettle(h.R.hx, h.R.hy, tip);
                if (between(tm, 1.6, withArt ? 3.4 : 2.8)) {
                    const sx = h.R.hx - (tool === 'kettle' ? 96 : 64), sy = h.R.hy - (tool === 'kettle' ? 46 : 30);
                    fx += `<path d="M${f1(sx)} ${f1(sy)} Q${f1(sx - 4)} ${f1((sy + h.L.hy - 40) / 2)} ${f1(h.L.hx - 30)} ${f1(h.L.hy - (p.cup === 'iced' ? 82 : 42))}" stroke="${color}" stroke-width="${tool === 'kettle' ? 3 : 5}" fill="none" stroke-linecap="round" opacity="${tool === 'kettle' ? .6 : 1}"/>`;
                }
                if (withArt && p.art) {
                    const ins = clamp(win(tm, 1.0, 1.5) - win(tm, 3.8, 4.3));
                    $('#akInset').setAttribute('opacity', f1(ins));
                    const art = win(tm, 1.6, 3.4);
                    $('#akArt').innerHTML = art > 0 ? `<g transform="translate(1010 196) scale(${(.4 + art * .6).toFixed(2)}) translate(-1010 -196)" opacity="${f1(Math.min(1, art * 2))}">${latteArt(p.art, 1010, 196, 4.2, '#F7EEE2')}</g>` : '';
                }
                return { props, fx };
            } });
        if (tool === 'pitcher')
            pitPath.push([st + .6, 'R'], [st + (withArt ? 4.0 : 3.4), [600, 505]]);
        cupPath.push([st + .5, 'L'], [st + (withArt ? 4.2 : 3.6), [700, 505]]);
        tilts.push([st + 1.2, st + (withArt ? 3.6 : 3.0)]);
        fills.push({ c: color, a: amount, t0: st + 1.6, t1: st + (withArt ? 3.4 : 2.8) });
        home = [700, 505];
        return st;
    };
    if (p.milk === 'steam') {
        const stT = q.add({ dur: 2.8, cap: () => tf('k.steam', { m: p.milkN() }), L: [[0, 625, 505], [.4, 600, 505], [.8, 552, 470], [1.3, 552, 480], [1.8, 552, 470], [2.3, 552, 480], [2.8, 600, 505]], face: () => ({ look: [-6, 4], head: [-8, 6] }),
            draw: (tm) => { let fx = ''; if (between(tm, .9, 2.4))
                for (let i = 0; i < 6; i++) {
                    const f = ((tm * .9 + i / 6) % 1);
                    fx += `<circle cx="${f1(546 + Math.sin(i * 3 + tm * 2) * 14 * f)}" cy="${f1(452 - f * 120)}" r="${f1(10 + f * 26)}" fill="#fff" opacity="${f1((1 - f) * .35)}" filter="url(#aBlur)"/>`;
                } return { fx }; } });
        pitPath.push([stT + .4, 'L'], [stT + 2.8, [600, 505]]);
        const aT = pourSeg(() => (p.art ? t('k.art.' + p.art) : t('k.foam')), 'pitcher', p.milkC, p.cup === 'small' ? .3 : .5, true);
        foamT = aT + 3.0;
    }
    else if (p.milk === 'cold')
        pourSeg(() => tf('k.cold', { m: p.milkN() }), 'carton', p.milkC, .42, false);
    else if (p.milk === 'water')
        pourSeg(() => t('k.water'), 'kettle', '#6B3A1C', .55, false);
    if (home[0] === 380) {
        const pT = q.add({ dur: 1.4, cap: () => t('k.present'), L: [[0, 625, 505], [.5, 408, 505], [1.1, 700, 505], [1.4, 625, 505]] });
        cupPath.push([pT + .5, 'L'], [pT + 1.1, [700, 505]]);
    }
    for (const k of p.tops) {
        const dur = k === 'cream' ? 1.9 : 1.7, topY = p.cup === 'iced' ? 330 : 400;
        const tT = q.add({ dur, cap: () => t('k.top.' + k), R: [[0, 775, 505], [.3, 720, 545], [.7, 708, topY], [dur - .5, 714, topY], [dur, 775, 505]], face: () => ({ look: [0, 7], head: [0, 10] }),
            draw: (tm, h) => {
                let props = '', fx = '';
                if (between(tm, .35, dur - .3))
                    props += k === 'cream' ? creamCan(h.R.hx, h.R.hy) : k === 'mallow' ? [0, 1, 2].filter(i => tm < .8 + i * .25).map(i => `<rect x="${f1(h.R.hx - 6 + i * 4)}" y="${f1(h.R.hy + 8)}" width="10" height="8" rx="2.5" fill="#FFF4F8" stroke="#E9D6D7"/>`).join('') : shaker(h.R.hx, h.R.hy, k === 'cocoa' ? '#3A1F14' : '#8A4B1F');
                if ((k === 'cocoa' || k === 'cinnamon') && between(tm, .7, dur - .4))
                    for (let i = 0; i < 8; i++) {
                        const f = ((tm * 2 + i / 8) % 1);
                        fx += `<circle cx="${f1(h.R.hx + Math.sin(i * 2.7) * 8)}" cy="${f1(h.R.hy + 40 + f * 40)}" r="1.4" fill="${k === 'cocoa' ? '#3A1F14' : '#8A4B1F'}"/>`;
                    }
                return { props, fx };
            } });
        tops.push({ k, t0: tT + .7, t1: tT + dur - .4 });
    }
    if (p.cup === 'iced')
        strawT = q.T + .2;
    serveT = q.add({ dur: 4.4, cap: () => tf('k.serve', { name: p.name() }), R: wave.map(([tt, x, y]) => [tt + .9, x, y]), face: smileFace(.8) });
    cupPath.push([serveT + .4, 'S']);
    const act = mkAct({ station: 'coffee', name: p.name, qty, segs: q.segs, order,
        draw: (T, h) => {
            $('#akLight').setAttribute('fill', '#5A3A1C');
            $('#akNeedle').setAttribute('transform', 'rotate(0 300 388)');
            $('#akGrinder').removeAttribute('transform');
            $('#akInset').setAttribute('opacity', '0');
            const g = grindT >= 0 ? win(T, grindT + .9, grindT + 3.1) : 0;
            $('#akBeans').setAttribute('height', f1(38 - 8 * g));
            $('#akBeans').setAttribute('y', f1(318 + 8 * g));
            let props = '', serve = '', fx = '';
            const pf = at(pfPath, T);
            if (pf === 'R')
                props += portafilter(h.R.hx, h.R.hy);
            else if (pf === 'L')
                props += portafilter(h.L.hx, h.L.hy, -8);
            else if (Array.isArray(pf))
                props += portafilter(pf[0], pf[1]);
            const pit = at(pitPath, T);
            if (pit === 'R') {
                const s = act.segs.find(s => T >= s.start && T < s.start + s.dur);
                const tm = T - s.start;
                props += pitcher(h.R.hx, h.R.hy, -58 * ease(win(tm, 1.3, 1.9)) * (1 - win(tm, 3.4, 3.7)));
            }
            else if (pit === 'L')
                props += pitcher(h.L.hx, h.L.hy);
            else if (Array.isArray(pit))
                props += pitcher(pit[0], pit[1]);
            const layers = fills.map(f => ({ c: f.c, a: f.a * win(T, f.t0, f.t1) }));
            const topv = tops.map(x => ({ k: x.k, v: win(T, x.t0, x.t1) }));
            const tilt = tilts.reduce((a, [a0, a1]) => a + (between(T, a0 - .4, a1 + .6) ? -14 * ease(win(T, a0 - .4, a0)) * (1 - win(T, a1, a1 + .6)) : 0), 0);
            const opt = { foam: T > foamT, ice: T > iceT ? 1 : 0, straw: T > strawT, tops: topv, clipId: 'akCupClip', scale: p.size };
            const cl = at(cupPath, T);
            if (cl === 'L')
                props += drawCup(p.cup, h.L.hx - 28, h.L.hy, layers, { ...opt, rot: tilt });
            else if (cl === 'S') {
                const k = ease(win(T, serveT + .4, serveT + 1.5));
                const sp = servePose(k, 700, 505, 28, 70, .55);
                serve += drawCup(p.cup, sp.x, sp.y, layers, { ...opt, scale: p.size * sp.s });
                if (p.cup !== 'iced' && T > serveT + 1.2)
                    fx += servedSteam(sp.x, sp.y - 70, T);
            }
            else if (Array.isArray(cl))
                props += drawCup(p.cup, cl[0], cl[1], layers, opt);
            return { props, serve, fx };
        } });
    return act;
}
const MEAT = ['beef', 'chicken'];
function burgerAct(p, qty = 1, order) {
    const stackIds = ['bunB', ...p.layers, 'bunT'];
    const L = (id) => (id === 'bunB' ? bunBottom(p.bun) : id === 'bunT' ? bunTop(p.bun) : LAYERS[id]);
    const totalH = stackIds.reduce((a, id) => a + L(id).h - 4, 0);
    const S = clamp(118 / totalH, .34, .5);
    const base = (i) => BY - stackIds.slice(0, i).reduce((a, id) => a + (L(id).h - 4) * S, 0);
    const TOP = base(stackIds.length);
    const prt = (id, x, y, rot = 0, sx = S, sy = S) => { const l = L(id); return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})">${l.svg(-l.h, 0, 240)}</g>`; };
    const slots = [846, 934, 890], GS = Math.min(S, .36);
    const meatIdx = stackIds.map((id, i) => (MEAT.includes(id) ? i : -1)).filter(i => i >= 0);
    const slotOf = (i) => slots[meatIdx.indexOf(i) % slots.length];
    const land = stackIds.map(() => Infinity);
    land[0] = -1;
    const pick = stackIds.map(() => Infinity);
    const grow = {};
    const q = new Seq();
    let splatT = Infinity, flagT = Infinity;
    if (meatIdx.length) {
        const s0 = slotOf(meatIdx[0]);
        q.add({ dur: 4.2, cap: () => t(meatIdx.length > 1 ? 'k.grillN' : 'k.grill1').replace('{n}', String(meatIdx.length)), R: [[0, 775, 505], [.6, s0, 452], [1.3, s0, 460], [1.7, s0, 452], [2.3, s0, 460], [3.2, s0, 455], [4.2, 775, 505]],
            face: () => ({ look: [7, 4], head: [8, 6] }), draw: (tm, h) => ({ props: tm < 3.9 ? spatula(h.R.hx, h.R.hy) : '' }) });
    }
    let firstMeat = true, firstCheese = true, firstKetchup = true, hand = 0;
    stackIds.forEach((id, i) => {
        if (i === 0 || id === 'bunT')
            return;
        const by = base(i);
        if (MEAT.includes(id)) {
            const sx = slotOf(i);
            if (firstMeat) {
                firstMeat = false;
                const st = q.add({ dur: 3.6, cap: () => t('k.flip'), R: [[0, 775, 505], [.4, sx + 25, 470], [.8, sx, 462], [1.05, sx - 60, 400], [1.7, 775, 505], [3.6, 775, 505]],
                    face: (tm) => (between(tm, .9, 2.4) ? { head: [-4, -16], look: [2, -8], brows: 4 } : between(tm, 2.4, 3.0) ? { look: [-6, 4] } : tm >= 3.0 ? { look: [0, 0], head: [0, 0], brows: 6, mouth: 'smirk', wink: between(tm, 3.15, 3.45) } : {}),
                    draw: (tm, h) => { let props = tm < 1.6 ? spatula(h.R.hx, h.R.hy) : ''; if (between(tm, .8, 3.0)) {
                        const f = win(tm, .8, 3.0);
                        props += prt(id, sx + (BX - sx) * f, 466 + (by - 466) * f - 420 * 4 * f * (1 - f), 900 * f);
                    } return { props }; } });
                pick[i] = st + .8;
                land[i] = st + 3.0;
            }
            else {
                const st = q.add({ dur: 1.7, cap: () => tf('k.meat2', { x: fillName(id) }), R: [[0, 775, 505], [.45, sx + 22, 464], [1.0, BX + 54, TOP - 26], [1.25, BX + 44, TOP - 20], [1.7, 775, 505]],
                    draw: (tm, h) => { let props = tm < 1.5 ? spatula(h.R.hx, h.R.hy) : ''; if (between(tm, .45, 1.15))
                        props += prt(id, h.R.hx - 32, h.R.hy + 8); if (between(tm, 1.15, 1.4)) {
                        const f = win(tm, 1.15, 1.4);
                        props += prt(id, BX + 12 * (1 - f), TOP - 12 + (by - TOP + 12) * f * f);
                    } return { props }; } });
                pick[i] = st + .45;
                land[i] = st + 1.4;
            }
            return;
        }
        if (id === 'cheese' && firstCheese) {
            firstCheese = false;
            const st = q.add({ dur: 1.4, cap: () => t('k.toss'), R: [[0, 775, 505], [.3, 720, 545], [.6, 745, 470], [.9, 690, 418], [1.4, 775, 505]],
                draw: (tm, h) => { let props = ''; if (between(tm, .45, .9))
                    props += prt(id, h.R.hx - 4, h.R.hy - 6, -18); if (between(tm, .9, 1.35)) {
                    const f = win(tm, .9, 1.35);
                    props += prt(id, 690 + (BX - 690) * f, 412 + (by - 412) * f - 70 * 4 * f * (1 - f), 360 * f - 18);
                } return { props }; } });
            land[i] = st + 1.35;
            return;
        }
        if (id === 'ketchup' && firstKetchup) {
            firstKetchup = false;
            const kx = BX + 48;
            const st = q.add({ dur: 3.3, cap: () => t('k.ketchup'), R: [[0, 775, 505], [.3, 720, 545], [.75, kx, 372], [1.15, kx, 372], [1.2, kx + 14, 372], [1.3, kx - 14, 372], [1.4, kx + 14, 372], [1.5, kx - 14, 372], [1.6, kx + 14, 372], [1.7, kx - 14, 372], [1.8, kx + 14, 372], [1.95, kx, 372], [2.25, kx - 20, 380], [2.55, kx, 388], [2.85, kx + 22, 380], [3.05, kx, 372], [3.3, 775, 505]],
                face: (tm) => (between(tm, .7, .95) ? { mouth: 'o', look: [-4, -3] } : between(tm, .95, 1.3) ? { look: [-2, 8], head: [2, 14], brows: -2 } : { look: [-4, 0] }),
                draw: (tm, h) => { let fx = ''; if (between(tm, .7, 1.2)) {
                    const f = win(tm, .7, 1.2);
                    fx += `<circle cx="${f1(h.R.hx - 4)}" cy="${f1(h.R.hy + 62)}" r="${f1(6 + f * 26)}" fill="#fff" opacity="${f1((1 - f) * .5)}" filter="url(#aBlur)"/>`;
                } return { props: between(tm, .2, 3.25) ? bottle(h.R.hx, h.R.hy) : '', fx }; } });
            splatT = st + .85;
            grow[i] = [st + 2.05, st + 3.05];
            land[i] = st + 2.05;
            return;
        }
        // everything else: fetched from under the counter and laid on, alternating hands
        const useR = hand++ % 2 === 0, side = useR ? 'R' : 'L';
        const rest = useR ? REST_R : REST_L, under = useR ? [720, 545] : [620, 545];
        const sauce = id === 'sauce' || id === 'ketchup';
        const st = q.add({ dur: sauce ? 1.6 : 1.2, cap: () => tf(sauce ? 'k.sauce' : 'k.place', { x: fillName(id) }),
            [side]: sauce ? [[0, ...rest], [.3, ...under], [.6, BX + (useR ? 40 : -40), TOP - 70], [1.3, BX + (useR ? 40 : -40), TOP - 70], [1.6, ...rest]] : [[0, ...rest], [.3, ...under], [.65, BX + (useR ? 4 : -4), TOP - 44], [.8, BX + (useR ? 4 : -4), TOP - 40], [1.2, ...rest]],
            draw: (tm, h) => { const hh = useR ? h.R : h.L; if (sauce)
                return { props: between(tm, .25, 1.45) ? (id === 'ketchup' ? bottle(hh.hx, hh.hy) : squeeze(hh.hx, hh.hy)) : '' }; let props = ''; if (between(tm, .35, .78))
                props += prt(id, hh.hx, hh.hy + 12); if (between(tm, .78, 1.0)) {
                const f = win(tm, .78, 1.0);
                props += prt(id, BX, TOP - 26 + (by - TOP + 26) * f * f);
            } return { props }; } });
        if (sauce) {
            grow[i] = [st + .6, st + 1.3];
            land[i] = st + .6;
        }
        else
            land[i] = st + 1.0;
    });
    const ti = stackIds.length - 1, tb = base(ti);
    const topT = q.add({ dur: 2.0, cap: () => t('k.bunTop'), L: [[0, 625, 505], [.3, 618, 470], [.65, BX + 2, TOP - 130], [.72, BX + 2, TOP - 130], [1.2, 600, 470], [2.0, 625, 505]], face: (tm) => (between(tm, .5, 1.1) ? { look: [-4, -8], head: [-4, -10] } : {}),
        draw: (tm, h) => { let props = ''; if (between(tm, .3, .72))
            props += prt('bunT', h.L.hx, h.L.hy + 20); if (between(tm, .72, 1.05)) {
            const f = win(tm, .72, 1.05);
            const y0 = TOP - 110;
            props += prt('bunT', BX, y0 + (tb - y0) * f * f);
        } return { props }; } });
    pick[ti] = topT + .3;
    land[ti] = topT + 1.05;
    flagT = q.add({ dur: 1.0, cap: () => t('k.flag'), R: [[0, 775, 505], [.3, 720, 545], [.6, BX + 4, TOP - 22], [.75, BX + 4, TOP - 18], [1.0, 775, 505]], draw: (tm, h) => ({ props: between(tm, .35, .62) ? flag(h.R.hx + 4, h.R.hy + 4) : '' }) }) + .62;
    const serveT = q.add({ dur: 3.4, cap: () => tf('k.serve', { name: p.name() }), face: smileFace(.6) });
    return mkAct({ station: 'grill', name: p.name, qty, segs: q.segs, order,
        draw: (T) => {
            let stack = '', props = '', fx = '';
            stackIds.forEach((id, i) => {
                const by = base(i);
                if (T >= land[i]) {
                    if (grow[i]) {
                        const g = win(T, grow[i][0], grow[i][1]);
                        if (g > 0)
                            stack += prt(id, BX, by, 0, S * g, S);
                        return;
                    }
                    const sq = (() => { const f = win(T, land[i], land[i] + .3); return f > 0 && f < 1 ? .16 * Math.sin(Math.PI * f) * (1 - f) : 0; })();
                    if (id === 'bunT' && T < land[i] + .4) {
                        const f = win(T, land[i], land[i] + .4);
                        stack += prt(id, BX, by - 16 * Math.sin(Math.PI * f) * (1 - f * .3), 0, S * (1 + sq), S * (1 - sq));
                    }
                    else
                        stack += prt(id, BX, by, 0, S * (1 + sq), S * (1 - sq));
                }
                else if (MEAT.includes(id) && T < pick[i])
                    props += prt(id, slotOf(i), 466, 0, GS * (1 + (between(T % 1, .3, .4) ? .03 : 0)), GS);
                else if (id === 'bunT' && T < pick[i])
                    props += prt(id, 628, BY);
            });
            if (T >= flagT)
                stack += flag(BX + 4, TOP - 4);
            if (meatIdx.some(i => T < pick[i]))
                for (let i = 0; i < 5; i++) {
                    const f = ((T * .7 + i / 5) % 1);
                    fx += `<circle cx="${f1(880 + Math.sin(i * 2.3 + T * 1.5) * 20 * f)}" cy="${f1(448 - f * 110)}" r="${f1(8 + f * 22)}" fill="#fff" opacity="${f1((1 - f) * .26)}" filter="url(#aBlur)"/>`;
                }
            if (T > splatT) {
                const f = win(T, splatT - .05, splatT + .1);
                fx += [[488, 487], [602, 486], [560, 488]].map(([x, y]) => `<ellipse cx="${x}" cy="${f1(440 + (y - 440) * f)}" rx="${f > .99 ? 5 : 2.5}" ry="${f > .99 ? 1.8 : 2.5}" fill="#B71C1C"/>`).join('');
            }
            $('#akSplat').innerHTML = T > splatT + .1 ? '<circle cx="692" cy="466" r="3.4" fill="#B71C1C"/><circle cx="696" cy="470" r="1.6" fill="#B71C1C"/>' : '';
            const k = ease(win(T, serveT + .2, serveT + 1.2));
            if (k > 0)
                return { props, fx: fx + servedSteam(BX + 90 * k, TOP + 30, T), serve: `<g transform="translate(${f1(BX + 90 * k)} ${f1(BY + 84 * k)}) scale(${(1 + .5 * k).toFixed(3)}) translate(${-BX} ${-BY})">${stack}</g>` };
            return { props: stack + props, fx };
        } });
}
const fillName = (id) => (FILLINGS.find(f => f.id === id)?.name[state.lang] ?? id).toLowerCase();
let WP;
function wrapAct(p, qty = 1, order) {
    const caps = ['w1', 'w2', 'w3', 'w4', 'w5'];
    const durs = [3.4, 4.6, 2.1, 2.5, 3.0, 2.9];
    return mkAct({ station: 'wrap', name: p.name, qty, order, setup: () => { WP = p; $('#akCone')?.setAttribute('fill', `url(#${p.doner})`); },
        segs: durs.map((d, i) => ({ dur: d, cap: () => (i < 5 ? t('afk.' + caps[i]) : tf('k.serve', { name: p.name() })) })),
        pose: (T) => ({ R: track(W_RIGHT, T), L: track(W_LEFT, T), head: track(W_HEAD, T), look: track(W_LOOK, T), lean: track(W_LEAN, T)[0],
            brows: between(T, 10.4, 11.4) ? 8 : between(T, 11.4, 12.4) ? 4 : T > 15 ? 2 : 0, mouth: between(T, 10.4, 11.4) ? 'o' : between(T, 11.5, 12.4) ? 'smirk' : T > 14.8 ? 'smile' : 'neutral', wink: between(T, 15.0, 15.35) }),
        draw: (T, h) => wrapDraw(T, h) });
}
/* ---------- fryer: fries, cheese fries, nuggets ---------- */
function fryerAct(id, qty = 1, order) {
    const it = ITEM(id), cheese = id === 'cheese-fries', nug = ['nuggets', 'kfc-1kg', 'spicy-bite', 'ffs-mega-mix'].includes(id);
    const plain = cheese ? ITEM('fries').art : it.art;
    const R = [[0, 775, 505], [.6, 905, 418], [1.2, 905, 440], [4.2, 905, 440], [4.8, 905, 396], [4.9, 920, 396], [5.0, 890, 396], [5.1, 920, 396], [5.2, 890, 396], [5.3, 920, 396], [5.4, 890, 396], [5.6, 905, 396], [6.4, 640, 396], [7.4, 640, 396], [7.8, 775, 505]];
    if (cheese)
        R.push([8.2, 720, 545], [8.6, 600, 392], [9.6, 600, 392], [10.0, 775, 505]);
    const tail = cheese ? 10.0 : 7.8, serveT = tail + .2, dur = serveT + 3.2;
    const segs = [{ dur: 4.2, cap: () => tf('k.fry1', { name: it.name[state.lang] }) }, { dur: 1.6, cap: () => t('k.fry2') }, { dur: 2.0, cap: () => t(nug ? 'k.fry3n' : 'k.fry3') }];
    if (cheese)
        segs.push({ dur: 2.2, cap: () => t('k.fryCheese') });
    segs.push({ dur: dur - segs.reduce((a, s) => a + s.dur, 0), cap: () => tf('k.serve', { name: it.name[state.lang] }) });
    const box = (x, y, s, reveal, art = plain) => `<clipPath id="akBoxClip"><rect x="-210" y="${f1(270 - 280 * reveal)}" width="420" height="${f1(280 * reveal + 4)}"/></clipPath>${artAt(art, x, y, s, reveal < 1 ? ` clip-path="url(#akBoxClip)"` : '')}`;
    return mkAct({ station: 'fryer', name: () => it.name[state.lang], qty, order, segs,
        pose: (T) => ({ R: track(R, T), L: REST_L, ...(T > serveT ? smileFace(.3)(T - serveT) : between(T, 1.2, 4.2) ? { look: [7, 6], head: [8, 8] } : {}) }),
        draw: (T, h) => {
            let props = '', fx = '', serve = '';
            const inHand = T < 7.8, tip = -55 * ease(win(T, 6.5, 7.0)) * (1 - win(T, 7.3, 7.6));
            const done = T > 4.2, contents = done ? (nug ? '#C98A3C' : '#F2C14E') : (nug ? '#E9D3B0' : '#F6E7B8');
            const basket = (x, y, rot, full) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})"><line x1="0" y1="0" x2="-46" y2="18" stroke="#2D2929" stroke-width="6" stroke-linecap="round"/>
        ${full ? (nug ? [[-80, 26], [-64, 24], [-72, 16], [-56, 30]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="9" ry="6.5" fill="${contents}"/>`).join('') : Array.from({ length: 9 }, (_, i) => `<rect x="${-96 + i * 6}" y="${12 + (i % 3) * 3}" width="4" height="22" rx="2" fill="${contents}" transform="rotate(${(i % 2 ? 1 : -1) * 12} ${-94 + i * 6} 24)"/>`).join('')) : ''}
        <path d="M-104 16 h62 v24 q0 4 -4 4 h-54 q-4 0 -4 -4z" fill="none" stroke="url(#aSteel)" stroke-width="3"/><path d="M-104 24 h62 M-104 32 h62 M-88 16 v28 M-72 16 v28 M-56 16 v28" stroke="rgba(200,200,210,.7)" stroke-width="1.2"/></g>`;
            if (inHand)
                props += basket(h.R.hx, h.R.hy, tip, T < 6.9);
            else
                props += basket(950, 420, 0, false);
            const reveal = win(T, 6.6, 7.3);
            if (T > 6.6 && T < serveT + .2)
                props += box(560, 488, .42, reveal, cheese && T > 8.6 ? (T > 9.6 ? it.art : plain) : plain);
            if (between(T, 6.6, 7.3))
                for (let i = 0; i < 6; i++) {
                    const f = ((T * 3 + i / 6) % 1);
                    fx += `<rect x="${f1(560 + Math.sin(i * 2) * 14)}" y="${f1(420 + f * 50)}" width="4" height="14" rx="2" fill="${contents}"/>`;
                }
            if (cheese && between(T, 8.8, 9.6))
                fx += `<path d="M${f1(h.R.hx - 40)} ${f1(h.R.hy - 10)} Q${f1(h.R.hx - 46)} ${f1(h.R.hy + 30)} 560 446" stroke="#F4B731" stroke-width="6" fill="none"/>`;
            if (cheese && between(T, 8.4, 9.9))
                props += `<g transform="translate(${f1(h.R.hx)} ${f1(h.R.hy)}) rotate(${f1(-50 * ease(win(T, 8.6, 8.9)))})"><path d="M-40 -26 h30 l3 30 q0 4 -4 4 h-28 q-4 0 -4 -4z M-40 -26 l-8 -2 l5 6z" fill="url(#aSteel)"/></g>`;
            // oil: bubbles while frying, the front of the fryer hides the lowered basket
            if (between(T, 1.2, 4.4))
                for (let i = 0; i < 10; i++) {
                    const f = ((T * 1.4 + i / 10) % 1);
                    fx += `<circle cx="${f1(840 + ((i * 53) % 130))}" cy="${f1(452 - f * 6)}" r="${f1(2 + (i % 3))}" fill="#FFE7A0" opacity="${f1(1 - f)}"/>`;
                }
            if (between(T, 1.2, 4.6))
                for (let i = 0; i < 4; i++) {
                    const f = ((T * .6 + i / 4) % 1);
                    fx += `<circle cx="${f1(880 + Math.sin(i * 2 + T) * 20 * f)}" cy="${f1(440 - f * 120)}" r="${f1(10 + f * 24)}" fill="#fff" opacity="${f1((1 - f) * .25)}" filter="url(#aBlur)"/>`;
                }
            fx += `<rect x="818" y="452" width="170" height="52" rx="4" fill="#3A3640"/><rect x="818" y="448" width="170" height="7" rx="3" fill="url(#aSteel)"/><rect x="832" y="470" width="140" height="18" rx="3" fill="rgba(255,255,255,.06)"/><circle cx="960" cy="480" r="5" fill="#FF7A3A" class="ak-flicker"/>`;
            const k = ease(win(T, serveT + .2, serveT + 1.2));
            if (k > 0) {
                const sp = servePose(k, 560, 488, 90, 84, .5);
                serve = artAt(it.art, sp.x, sp.y, .42 * sp.s) + servedSteam(sp.x, sp.y - 120 * sp.s, T);
            }
            return { props, fx, serve };
        } });
}
const GARNISH = { hotdog: 'ketchupMustard', 'french-hotdog': 'frenchSauce', club: 'picks', 'pizza-slice': 'herbs', croissant: 'sugar', 'almond-croissant': 'sugar', cheesecake: 'berries', tiramisu: 'cocoa', medovik: 'honey' };
function plateAct(id, qty = 1, order, custom) {
    const base = ITEM(id), g = custom?.garnish ?? GARNISH[id] ?? 'sugar', S = .4, PX = 560, PY = 486;
    const it = { art: custom?.art ?? base.art };
    const nm = custom?.name ?? (() => base.name[state.lang]);
    const R = [[0, 775, 505], [.4, 720, 545], [1.0, 600, 430], [1.5, 572, 462], [1.8, 775, 505], [2.0, 720, 545], [2.4, 520, 410], [3.4, 610, 410], [3.8, 775, 505]];
    const serveT = 4.2, dur = 7.2;
    return mkAct({ station: 'plain', name: () => nm(), qty, order,
        segs: [{ dur: 1.9, cap: () => tf('k.plate', { name: nm() }) }, { dur: 2.3, cap: () => t(custom?.cap ?? 'k.g.' + g) }, { dur: dur - 4.2, cap: () => tf('k.serve', { name: nm() }) }],
        pose: (T) => ({ R: track(R, T), L: REST_L, ...(T > serveT ? smileFace(.3)(T - serveT) : between(T, 2.2, 3.6) ? { look: [-2, 7], head: [-2, 10] } : {}) }),
        draw: (T, h) => {
            let props = `<ellipse cx="${PX}" cy="${PY + 2}" rx="70" ry="9" fill="url(#g-plate)"/><ellipse cx="${PX}" cy="${PY}" rx="52" ry="6" fill="url(#g-plate-well)"/>`, fx = '', serve = '';
            let food = '';
            if (between(T, .45, 1.5))
                food = artAt(it.art, h.R.hx - 20, h.R.hy + 30, S);
            else if (T >= 1.5)
                food = artAt(it.art, PX, PY + 4, S);
            // garnish appears where the hand passes
            const gk = win(T, 2.4, 3.4);
            let gar = '';
            if (gk > 0) {
                const x0 = PX - 50, w = 100 * gk;
                if (g === 'ketchupMustard') {
                    let d1 = `M${x0} 448`, d2 = `M${x0 + 6} 452`;
                    for (let x = x0; x < x0 + w; x += 10) {
                        d1 += ` L${x + 5} ${(x / 10) % 2 ? 444 : 452}`;
                        d2 += ` L${x + 9} ${(x / 10) % 2 ? 456 : 448}`;
                    }
                    gar = `<path d="${d1}" stroke="#C62828" stroke-width="3.5" fill="none" stroke-linejoin="round"/><path d="${d2}" stroke="#F4B731" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
                }
                else if (g === 'frenchSauce')
                    gar = `<ellipse cx="${PX + 44}" cy="460" rx="${f1(6 * gk)}" ry="${f1(4 * gk)}" fill="#F1E0C7"/>`;
                else if (g === 'picks')
                    gar = [PX - 22, PX + 22].filter((_, i) => gk > i * .5).map(x => flag(x, 432)).join('');
                else if (g === 'herbs')
                    gar = Array.from({ length: Math.round(14 * gk) }, (_, i) => `<path d="M${x0 + 10 + ((i * 37) % 80)} ${452 + ((i * 13) % 14)} l4 -3 l4 3" stroke="#3F7D3A" stroke-width="2.5" fill="none"/>`).join('');
                else if (g === 'sugar' || g === 'cocoa')
                    gar = Array.from({ length: Math.round(30 * gk) }, (_, i) => `<circle cx="${x0 + 8 + ((i * 37) % 84)}" cy="${448 + ((i * 13) % 16)}" r="1.5" fill="${g === 'sugar' ? '#FFFFFF' : '#3A1F14'}" opacity=".9"/>`).join('');
                else if (g === 'berries')
                    gar = [[-16, 438], [4, 434], [22, 440]].slice(0, Math.ceil(gk * 3)).map(([dx, y], i) => `<circle cx="${PX + dx}" cy="${y}" r="6.5" fill="${i % 2 ? '#9A1B21' : '#C2185B'}" stroke="#1A1414" stroke-width="1"/>`).join('');
                else if (g === 'honey')
                    gar = `<path d="M${x0 + 10} 444 q12 8 24 0 t24 0 t24 0" stroke="#E0A42A" stroke-width="4" fill="none" stroke-dasharray="${f1(w * 1.2)} 400"/>`;
            }
            if (between(T, 2.3, 3.5) && (g === 'sugar' || g === 'cocoa' || g === 'herbs'))
                for (let i = 0; i < 6; i++) {
                    const f = ((T * 2.2 + i / 6) % 1);
                    fx += `<circle cx="${f1(h.R.hx + Math.sin(i * 2.7) * 8)}" cy="${f1(h.R.hy + 30 + f * 30)}" r="1.5" fill="${g === 'cocoa' ? '#3A1F14' : g === 'herbs' ? '#3F7D3A' : '#fff'}"/>`;
                }
            if (between(T, 2.2, 3.6))
                props += g === 'ketchupMustard' ? bottle(h.R.hx, h.R.hy) : g === 'frenchSauce' || g === 'honey' ? squeeze(h.R.hx, h.R.hy) : g === 'picks' || g === 'berries' ? '' : shaker(h.R.hx, h.R.hy, g === 'cocoa' ? '#3A1F14' : g === 'herbs' ? '#3F7D3A' : '#FFFFFF');
            const k = ease(win(T, serveT + .2, serveT + 1.2));
            if (k > 0) {
                const sp = servePose(k, PX, PY, 90, 84, .5);
                serve = `<g transform="translate(${f1(sp.x)} ${f1(sp.y)}) scale(${sp.s.toFixed(3)}) translate(${-PX} ${-PY})">${props}${food}${gar}</g>`;
                return { serve, fx };
            }
            return { props: props + food + gar, fx };
        } });
}
/* ---------- cold drinks: lemonade, soda ---------- */
function coldAct(id, qty = 1, order) {
    const it = ITEM(id), soda = id === 'soda', c = soda ? '#3A1A10' : id === 'berry-lemonade' ? '#E05A8A' : '#F4E06A';
    const GX = 560, GY = 488;
    const R = [[0, 775, 505], [.4, 720, 545], [.95, GX, 380], [1.25, GX, 380], [1.6, 775, 505], [4.4, 775, 505], [4.7, 720, 545], [5.0, GX + 6, 392], [5.3, GX + 6, 392], [5.6, 775, 505]];
    const L = [[0, 625, 505], [1.6, 625, 505], [2.0, 600, 545], [2.4, 500, 370], [4.0, 500, 370], [4.4, 625, 505]];
    const serveT = 5.8, dur = 9.0;
    return mkAct({ station: 'plain', name: () => it.name[state.lang], qty, order,
        segs: [{ dur: 1.7, cap: () => t('k.ice') }, { dur: 2.8, cap: () => tf('k.pour', { name: it.name[state.lang] }) }, { dur: 1.3, cap: () => t(soda ? 'k.straw' : id === 'berry-lemonade' ? 'k.berry' : 'k.garnish') }, { dur: dur - 5.8, cap: () => tf('k.serve', { name: it.name[state.lang] }) }],
        pose: (T) => ({ R: track(R, T), L: track(L, T), ...(T > serveT ? smileFace(.3)(T - serveT) : between(T, 2.4, 4.0) ? { look: [-4, 5], head: [-4, 8] } : {}) }),
        draw: (T, h) => {
            let props = '', fx = '', serve = '';
            const fill = .78 * win(T, 2.6, 3.9), tip = -70 * ease(win(T, 2.4, 2.7)) * (1 - win(T, 3.9, 4.2));
            if (between(T, .5, 1.25))
                props += [[-8, 0], [8, -4], [0, -12]].map(([dx, dy]) => `<rect x="${f1(h.R.hx + dx - 8)}" y="${f1(h.R.hy + dy + 6)}" width="16" height="15" rx="4" fill="rgba(255,255,255,.55)" stroke="#fff"/>`).join('');
            if (between(T, 1.25, 1.55)) {
                const f = win(T, 1.25, 1.55);
                props += [[-8, 0], [8, -4], [0, -12]].map(([dx, dy]) => `<rect x="${f1(GX + dx - 8)}" y="${f1(386 + dy + f * 50)}" width="16" height="15" rx="4" fill="rgba(255,255,255,.55)" stroke="#fff"/>`).join('');
            }
            if (between(T, 2.0, 4.3))
                props += soda ? `<g transform="translate(${f1(h.L.hx)} ${f1(h.L.hy)}) rotate(${f1(tip * 1.6)})"><rect x="-12" y="-36" width="24" height="44" rx="5" fill="#C62828"/><rect x="-12" y="-36" width="24" height="5" rx="2" fill="url(#aSteel)"/><rect x="-12" y="-10" width="24" height="8" fill="#fff" opacity=".8"/></g>`
                    : `<g transform="translate(${f1(h.L.hx)} ${f1(h.L.hy)}) rotate(${f1(-tip)})"><path d="M10 -40 h40 l-4 46 q0 4 -4 4 h-24 q-4 0 -4 -4z" fill="rgba(255,255,255,.25)" stroke="rgba(255,255,255,.8)" stroke-width="2"/><rect x="14" y="-20" width="32" height="26" fill="${c}" opacity=".85"/><path d="M50 -36 q12 4 6 22" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="3"/></g>`;
            if (between(T, 2.6, 3.9))
                fx += `<path d="M${f1(h.L.hx + (soda ? 14 : 12))} ${f1(h.L.hy - (soda ? 30 : 36))} Q${f1(GX - 30)} 380 ${GX} ${f1(GY - 10 - 74 * fill)}" stroke="${c}" stroke-width="5" fill="none" opacity=".9"/>`;
            const gl = (x, y, s) => `${drawCup('iced', x, y, [{ c, a: fill }], { ice: T > 1.5 ? 1 : 0, straw: T > 5.3, clipId: 'akGlassClip', scale: s })}${!soda && T > 5.0 ? (id === 'berry-lemonade' ? `<circle cx="${f1(x - 18 * s)}" cy="${f1(y - 84 * s)}" r="${f1(7 * s)}" fill="#C2185B" stroke="#1A1414"/>` : `<circle cx="${f1(x - 22 * s)}" cy="${f1(y - 82 * s)}" r="${f1(11 * s)}" fill="#F7D94C" stroke="#C9A52A"/><circle cx="${f1(x - 22 * s)}" cy="${f1(y - 82 * s)}" r="${f1(7 * s)}" fill="#FCEB8E"/>`) : ''}`;
            const k = ease(win(T, serveT + .2, serveT + 1.2));
            if (k > 0) {
                const sp = servePose(k, GX, GY, 90, 84, .55);
                serve = gl(sp.x, sp.y, sp.s);
            }
            else
                props += gl(GX, GY, 1);
            return { props, fx, serve };
        } });
}
/* ---------- tea, poured the Uzbek way ---------- */
function teaAct(id, qty = 1, order) {
    const it = ITEM(id), black = id !== 'green-tea', c = black ? '#9A4A1C' : '#C9B44C';
    const R = [[0, 775, 505], [.5, 540, 452], [1.0, 600, 388], [2.0, 600, 388], [2.4, 540, 470], [2.6, 775, 505], [4.2, 775, 505], [4.6, 540, 452], [5.0, 600, 388], [6.0, 600, 388], [6.4, 540, 470], [6.6, 775, 505]];
    const L = [[0, 625, 505], [2.6, 625, 505], [2.9, 640, 476], [3.3, 560, 404], [3.9, 560, 404], [4.2, 625, 505], [6.7, 625, 505], [7.0, 620, 545], [7.4, 650, 440], [7.6, 650, 446], [7.9, 625, 505]];
    const serveT = black ? 8.0 : 6.8, dur = serveT + 3.0;
    const potX = 500, cupX = 640;
    const segs = [{ dur: 2.6, cap: () => tf('k.tea1', { name: it.name[state.lang] }) }, { dur: 1.6, cap: () => t('k.tea2') }, { dur: 2.4, cap: () => t('k.tea3') }];
    if (black)
        segs.push({ dur: 1.4, cap: () => t('k.lemon') });
    segs.push({ dur: dur - segs.reduce((a, s) => a + s.dur, 0), cap: () => tf('k.serve', { name: it.name[state.lang] }) });
    const pot = (x, y, rot) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})"><path d="M-58 -10 c-18 -2 -22 -20 -28 -26" fill="none" stroke="#3E6FB8" stroke-width="6" stroke-linecap="round"/><path d="M-50 -34 h52 c4 30 -4 46 -26 46 c-22 0 -30 -16 -26 -46z" fill="#3E6FB8"/><path d="M-46 -12 q22 12 44 0" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/><ellipse cx="-24" cy="-34" rx="26" ry="5" fill="#5C8BD0"/><circle cx="-24" cy="-42" r="5" fill="#F4B731"/><path d="M2 -26 q18 2 14 22" fill="none" stroke="#2A4F8A" stroke-width="5"/></g>`;
    const piyola = (x, y, fill, rot = 0, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s.toFixed(3)})"><path d="M-24 -26 h48 c-2 16 -10 26 -24 26 c-14 0 -22 -10 -24 -26z" fill="#FFFDFC"/><path d="M-20 -14 q20 8 40 0" fill="none" stroke="#3E6FB8" stroke-width="3"/>${fill > 0 ? `<ellipse cx="0" cy="${f1(-24 + 6 * (1 - fill))}" rx="${f1(20 - 4 * (1 - fill))}" ry="3.5" fill="${c}"/>` : ''}${black && T_ > 7.6 ? `<path d="M-6 -27 a7 4 0 0 1 14 0z" fill="#F7D94C"/>` : ''}</g>`;
    let T_ = 0;
    return mkAct({ station: 'plain', name: () => it.name[state.lang], qty, order, segs,
        pose: (T) => ({ R: track(R, T), L: track(L, T), ...(T > serveT ? smileFace(.3)(T - serveT) : between(T, 2.6, 4.2) ? { look: [-2, 2], mouth: 'smirk' } : {}) }),
        draw: (T, h) => {
            T_ = T;
            let props = '', fx = '', serve = '';
            const pouring = (a, b) => -48 * ease(win(T, a, a + .3)) * (1 - win(T, b - .2, b + .1));
            const holdPot = between(T, .5, 2.4) || between(T, 4.6, 6.4);
            const potRot = between(T, .5, 2.4) ? pouring(1.0, 2.0) : pouring(5.0, 6.0);
            props += holdPot ? pot(h.R.hx + 30, h.R.hy + 34, potRot) : pot(potX, 488, 0);
            const cupFill = win(T, 1.2, 2.0) * (1 - win(T, 3.3, 3.9)) + win(T, 5.2, 6.0);
            const cupHeld = between(T, 2.9, 4.1);
            if (!cupHeld && T < serveT + .2)
                props += piyola(cupX, 488, cupFill);
            if (cupHeld)
                props += piyola(h.L.hx + 18, h.L.hy + 24, cupFill, between(T, 3.3, 3.9) ? -60 : 0);
            if (between(T, 1.2, 2.0) || between(T, 5.2, 6.0))
                fx += `<path d="M${f1(h.R.hx - 58)} ${f1(h.R.hy + 4)} Q${f1(h.R.hx - 30)} ${f1(h.R.hy + 50)} ${cupX} 466" stroke="${c}" stroke-width="3.5" fill="none" opacity=".85"/>`;
            if (between(T, 3.4, 3.9))
                fx += `<path d="M${f1(h.L.hx + 2)} ${f1(h.L.hy + 4)} Q${f1(h.L.hx - 20)} ${f1(h.L.hy + 40)} ${potX - 24} 452" stroke="${c}" stroke-width="3.5" fill="none" opacity=".85"/>`;
            if (black && between(T, 7.0, 7.6))
                props += `<path d="M${f1(h.L.hx - 7)} ${f1(h.L.hy + 10)} a7 4 0 0 1 14 0z" fill="#F7D94C"/>`;
            const k = ease(win(T, serveT + .2, serveT + 1.2));
            if (k > 0) {
                const sp = servePose(k, cupX, 488, 40, 84, .9);
                serve = piyola(sp.x, sp.y, 1, 0, sp.s) + servedSteam(sp.x, sp.y - 40 * sp.s, T);
            }
            else if (T > 2.2)
                fx += servedSteam(cupX, 450, T);
            return { props, fx, serve };
        } });
}
/* ---------- from a menu item / cart line to acts ---------- */
const MILK_C = { cow: '#F4EFEF', oat: '#EFE2CC', coconut: '#FAF7F2' };
const sizeScale = (s) => (s === 'S' ? .88 : s === 'L' ? 1.14 : 1);
const withSize = (n, size, extras) => () => `${n()}${size ? ' ' + size : ''}${extras?.length ? ' + ' + extras.map(e => EXTRAS[e].name[state.lang].toLowerCase()).join(', ') : ''}`;
function coffeeFromItem(id, size, extras = [], qty = 1) {
    const it = ITEM(id);
    const syr = (k) => ({ c: LAB.syrupC[k] ?? '#F08A8D', n: () => t('syrup.' + k).toLowerCase() });
    const base = { name: withSize(() => it.name[state.lang], it.sized ? size : undefined, extras), cup: 'hot', size: sizeScale(size), base: 'espresso', shots: 1, milk: 'steam', milkC: MILK_C.cow, milkN: () => t('milk.cow').toLowerCase(), tops: [] };
    const P = {
        espresso: { cup: 'small', milk: 'none' }, americano: { milk: 'water' }, cappuccino: { art: 'heart' }, latte: { art: 'rosetta' }, 'violette-latte': { syrup: syr('lavender'), art: 'heart' },
        'flat-white': { shots: 2, art: 'rosetta' }, raf: { syrup: syr('vanilla'), art: 'tulip' }, mocha: { syrup: { c: '#5A2A18', n: () => t('k.choc') }, tops: ['cream', 'cocoa'] },
        'iced-violette': { cup: 'iced', syrup: syr('lavender'), milk: 'cold' }, 'iced-latte': { cup: 'iced', milk: 'cold' }, frappe: { cup: 'iced', syrup: syr('caramel'), milk: 'cold', tops: ['cream'] },
        matcha: { cup: 'iced', base: 'matcha', milk: 'cold' }, cocoa: { base: 'choc', tops: ['mallow'] },
    };
    const p = { ...base, ...(P[id] ?? {}) };
    if (extras.includes('shot'))
        p.shots += 1;
    if (extras.includes('oat')) {
        p.milkC = MILK_C.oat;
        p.milkN = () => t('milk.oat').toLowerCase();
    }
    if (extras.includes('syrup') && !p.syrup)
        p.syrup = syr('vanilla');
    if (extras.includes('cream') && !p.tops.includes('cream'))
        p.tops = ['cream', ...p.tops];
    return coffeeAct(p, qty, { item: id, size });
}
function coffeeFromSpec(c, qty = 1) {
    const p = { name: () => `${coffeeName(c, state.lang)} ${c.size}`, cup: c.temp === 'iced' ? 'iced' : c.milk === 'none' && c.size === 'S' ? 'small' : 'hot', size: sizeScale(c.size), base: 'espresso', shots: c.shots,
        syrup: c.syrup !== 'none' ? { c: LAB.syrupC[c.syrup] ?? '#F08A8D', n: () => t('syrup.' + c.syrup).toLowerCase() } : undefined,
        milk: c.milk === 'none' ? (c.size === 'S' ? 'none' : 'water') : c.temp === 'iced' ? 'cold' : 'steam', milkC: MILK_C[c.milk] ?? MILK_C.cow, milkN: () => t('milk.' + (c.milk === 'none' ? 'cow' : c.milk)).toLowerCase(),
        art: c.foam === 'thick' ? 'heart' : c.foam === 'thin' ? 'rosetta' : undefined, tops: c.topping !== 'none' ? [c.topping] : [] };
    return coffeeAct(p, qty);
}
function burgerFromItem(id, extras = [], qty = 1) {
    const it = ITEM(id), art = it.art;
    const bun = art.layers.find(l => l.startsWith('bun:'))?.slice(4) ?? 'classic';
    const layers = art.layers.filter(l => !l.startsWith('bun:'));
    const firstMeat = layers.findIndex(l => MEAT.includes(l));
    if (extras.includes('patty'))
        layers.splice(firstMeat + 1, 0, 'beef');
    if (extras.includes('cheese'))
        layers.splice(Math.max(0, firstMeat) + 1, 0, 'cheese');
    if (extras.includes('jalapeno'))
        layers.splice(Math.max(1, layers.length - 1), 0, 'jalapeno');
    if (extras.includes('sauce'))
        layers.push('sauce');
    return burgerAct({ name: withSize(() => it.name[state.lang], undefined, extras), bun, layers }, qty, { item: id });
}
function wrapFromItem(id, extras = [], qty = 1) {
    const it = ITEM(id), beef = id === 'lavash-beef' || id === 'shaurma-pita';
    return wrapAct({ name: withSize(() => it.name[state.lang], undefined, extras), meatC: beef ? '#7A3E1E' : '#B8743A', doner: beef ? 'aDoner' : 'aDonerC', fries: id !== 'shaurma-pita',
        cheese: id === 'lavash-cheese' || extras.includes('cheese'), jalapeno: id === 'lavash-spicy' || extras.includes('jalapeno'), spicy: id === 'lavash-spicy', extraSauce: extras.includes('sauce') }, qty, { item: id });
}
function actsForItem(id, size, extras = [], qty = 1) {
    const it = ITEM(id);
    if (!it)
        return [];
    if (it.id === 'crunch-duo')
        return [fryerAct('kfc-1kg', qty), burgerFromItem('cheeseburger', [], qty)];
    if (it.id === 'madina-combo')
        return [wrapFromItem('lavash-chicken', [], qty), fryerAct('fries', qty), coldAct('soda', qty)];
    if (it.id === 'solo-combo')
        return [burgerAct({ name: () => ITEM('cheeseburger').name[state.lang], bun: 'classic', layers: ['beef', 'cheese', 'lettuce'] }, qty), fryerAct('fries', qty), coldAct('soda', qty)];
    if (['coffee'].includes(it.cat) || ['iced-violette', 'iced-latte', 'frappe', 'matcha', 'cocoa'].includes(id))
        return [coffeeFromItem(id, size, extras, qty)];
    if (['lemonade', 'berry-lemonade', 'soda'].includes(id))
        return [coldAct(id, qty, { item: id, size })];
    if (['green-tea', 'black-tea', 'glass-tea', 'turkish-tea'].includes(id))
        return [teaAct(id, qty, { item: id })];
    if (it.cat === 'burger')
        return [burgerFromItem(id, extras, qty)];
    if (it.cat === 'lavash')
        return [wrapFromItem(id, extras, qty)];
    if (['fries', 'cheese-fries', 'nuggets', 'kfc-1kg', 'spicy-bite', 'ffs-mega-mix'].includes(id))
        return [fryerAct(id, qty, { item: id })];
    return [plateAct(id, qty, { item: id })];
}
export function actsForLines(lines) {
    const out = [];
    for (const l of lines) {
        if (l.kind === 'item')
            out.push(...actsForItem(l.item, l.size, l.extras ?? [], l.qty));
        else if (l.kind === 'burger' && l.burger)
            out.push(burgerAct({ name: () => burgerName(l.burger, state.lang), bun: l.burger.bun, layers: [...l.burger.fill] }, l.qty));
        else if (l.kind === 'coffee' && l.coffee)
            out.push(coffeeFromSpec(l.coffee, l.qty));
        else if (l.kind === 'wrap' && l.wrap) {
            const w = l.wrap, beef = w.meat !== 'chicken';
            out.push(wrapAct({ name: () => wrapName(w, state.lang), meatC: w.meat === 'beef' ? '#7A3E1E' : w.meat === 'mix' ? '#94552A' : '#B8743A', doner: beef ? 'aDoner' : 'aDonerC', fries: w.add.includes('fries'),
                cheese: w.add.includes('cheese') || w.sauces.includes('cheese'), jalapeno: w.add.includes('jalapeno'), spicy: w.sauces.includes('spicy'), extraSauce: w.sauces.length > 1 }, l.qty));
        }
        else if (l.kind === 'hotdog' && l.hotdog) {
            const h = l.hotdog;
            out.push(plateAct('hotdog', l.qty, undefined, { art: { k: 'chotdog', h }, name: () => hotdogName(h, state.lang), garnish: h.sauces.length ? 'ketchupMustard' : 'picks', cap: h.sauces.includes('ketchup') && h.sauces.includes('mustard') ? undefined : h.sauces.length ? 'k.g.sauces' : 'k.g.dog' }));
        }
        else if (l.kind === 'set' && l.set)
            out.push(...actsForItem(l.set.drink, 'M', [], l.qty), ...actsForItem(l.set.burger, undefined, [], l.qty));
    }
    return out.slice(0, 10);
}
const idleActs = () => [coffeeFromItem('latte', 'M'), burgerFromItem('classic-burger'), wrapFromItem('lavash-chicken')];
let el = null, raf = 0, t0 = 0, shownAt = 0, segI = -1, actI = -1, idleTimer = 0, lastMove = { x: -1, y: -1 };
let mode = 'idle', ACTS = [], TOTAL = 1, orderEta = '';
const smooth = { look: [0, 0], head: [0, 0] };
const STATIONS = { coffee: ['#stCoffee'], grill: ['#stGrill'], wrap: ['#stWrap', '#stWrapBack'], fryer: ['#stFryer'], plain: ['#stPlain'] };
const ALL_ST = ['#stCoffee', '#stGrill', '#stWrap', '#stWrapBack', '#stFryer', '#stPlain'];
function setActs(list) { ACTS = list.length ? list : idleActs(); TOTAL = ACTS.reduce((a, x) => a + x.dur, 0); actI = -1; segI = -1; }
const nameOf = (a) => a.name() + (a.qty > 1 ? ` ×${a.qty}` : '');
const trunc = (s, n = 24) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
function priceOf(a) { const it = ITEM(a.order.item); return it.price + (it.sized ? (SIZES.find(s => s.id === (a.order.size ?? 'M'))?.add ?? 0) : 0); }
function build() {
    el = document.createElement('div');
    el.className = 'afk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'akTitle');
    el.innerHTML = `<div class="ak-top"><span class="ak-logo">FFS</span><p id="akTitle"></p><span class="ak-clock" id="akClock"></span><button type="button" class="ak-close" id="akClose"><span aria-hidden="true">×</span></button></div>
    <svg class="ak-scene" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sceneSVG()}</svg>
    <div class="ak-bottom"><div class="ak-steps" id="akSteps"></div><p class="ak-caption" id="akCaption" aria-live="polite"></p>
      <button type="button" class="btn btn-acc ak-order" id="akOrder"><span id="akOrderT"></span><kbd>Enter</kbd></button><p class="ak-hint" id="akHint"></p></div>`;
    document.body.appendChild(el);
    $('#akOrder', el).addEventListener('click', e => { e.stopPropagation(); addServed(); });
    $('#akClose', el).addEventListener('click', e => { e.stopPropagation(); hide(); });
}
/** Idle mode: the dish he just served goes into the cart (button tap, or Enter on a keyboard). */
function addServed() {
    const a = ACTS[actI];
    if (mode !== 'idle' || !a?.order || !el?.classList.contains('serving'))
        return;
    const it = ITEM(a.order.item);
    addLine({ kind: 'item', item: it.id, size: it.sized ? a.order.size ?? 'M' : undefined, extras: [] }, 1);
    hide();
    toast(`${a.name()} — ${t('card.added').toLowerCase()}`);
}
function texts() {
    if (!el || actI < 0)
        return;
    const a = ACTS[actI];
    el.classList.toggle('order', mode === 'order');
    $('#akTitle', el).textContent = mode === 'idle' ? tf('afk.making', { name: a.name() }) : tf('afk.yours', { name: nameOf(a), i: actI + 1, n: ACTS.length });
    $('#akHint', el).textContent = mode === 'idle' ? t(finePointer ? 'afk.hint' : 'afk.hintTouch') : t('afk.hintOrder');
    $('#akClose', el).setAttribute('aria-label', t('afk.close'));
    if (a.order)
        $('#akOrderT', el).textContent = `${tf('afk.add', { name: a.name() })} · ${money(priceOf(a))}`;
    let rows;
    if (mode === 'order')
        rows = [[trunc(nameOf(a)), `${actI + 1}/${ACTS.length}`], [t('afk.eta'), orderEta]];
    else {
        const pair = a.station === 'coffee' ? ['latte', 'cappuccino'] : a.station === 'grill' ? ['classic-burger', 'cheeseburger'] : ['lavash-chicken', 'lavash-beef'];
        rows = pair.map(id => { const x = ITEM(id); return [trunc(x.name[state.lang]), money(x.price)]; });
    }
    rows.forEach(([n, p], i) => { $('#akBoardN' + (i + 1), el).textContent = n; $('#akBoardP' + (i + 1), el).textContent = p; });
    if (segI >= 0)
        $('#akCaption', el).textContent = a.segs[segI].cap();
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
let lastDraw = 0;
function frame(now) {
    if (!el)
        return;
    lastDraw = now;
    let T = ((now - t0) / 1000) % TOTAL, ai = 0;
    while (ai < ACTS.length - 1 && T >= ACTS[ai].dur) {
        T -= ACTS[ai].dur;
        ai++;
    }
    const a = ACTS[ai];
    if (ai !== actI) {
        actI = ai;
        segI = -1;
        a.setup?.();
        $('#akSplat', el).innerHTML = '';
        $('#akInset', el).setAttribute('opacity', '0');
        $('#akArt', el).innerHTML = '';
        $('#akSteps', el).innerHTML = a.segs.map((_, i) => `<i data-i="${i}"></i>`).join('');
        el.dataset.station = a.station;
        texts();
    }
    // stations cross-fade only when the next dish needs a different one
    const prev = ACTS[(ai - 1 + ACTS.length) % ACTS.length], next = ACTS[(ai + 1) % ACTS.length];
    const fin = prev.station === a.station ? 1 : clamp(T / .5), fout = next.station === a.station ? 1 : clamp((a.dur - T) / .5);
    ALL_ST.forEach(id => $(id, el).setAttribute('opacity', STATIONS[a.station].includes(id) ? f1(Math.min(fin, fout)) : '0'));
    const si = a.segs.reduce((acc, s, i) => (T >= s.start ? i : acc), 0), s = a.segs[si], tm = T - s.start;
    let pose;
    if (a.pose) {
        const p = a.pose(T);
        pose = { R: p.R, L: p.L, head: p.head ?? [0, 0], look: p.look ?? [0, 0], brows: p.brows ?? 0, mouth: p.mouth ?? 'neutral', wink: !!p.wink, lean: p.lean ?? 0 };
    }
    else {
        const R = s.R ? track(s.R, tm) : REST_R, L = s.L ? track(s.L, tm) : REST_L;
        const f = s.face?.(tm) ?? {};
        // the eyes follow whichever hand is busy, unless the segment says otherwise
        const dR = Math.hypot(R[0] - REST_R[0], R[1] - REST_R[1]), dL = Math.hypot(L[0] - REST_L[0], L[1] - REST_L[1]);
        const tgt = dR < 14 && dL < 14 ? null : dR >= dL ? R : L;
        const auto = tgt ? [clamp((tgt[0] - 700) / 22, -8, 8), clamp((tgt[1] - 260) / 24, -8, 8)] : [0, 0];
        const look = f.look ?? auto, head = f.head ?? [look[0] * 1.2, look[1] * 1.3];
        smooth.look = [smooth.look[0] + (look[0] - smooth.look[0]) * .15, smooth.look[1] + (look[1] - smooth.look[1]) * .15];
        smooth.head = [smooth.head[0] + (head[0] - smooth.head[0]) * .12, smooth.head[1] + (head[1] - smooth.head[1]) * .12];
        pose = { R, L, head: smooth.head, look: smooth.look, brows: f.brows ?? 0, mouth: f.mouth ?? 'neutral', wink: !!f.wink, lean: f.lean ?? 0 };
    }
    const h = drawCook(pose, T);
    const out = merge(a.draw?.(T, h), s.draw?.(tm, h, T));
    const g = $('#akProps', el), fxg = $('#akFx', el), sv = $('#akServe', el);
    const op = f1(clamp(Math.min(T / .4, (a.dur - T) / .4)));
    g.innerHTML = out.props;
    fxg.innerHTML = out.fx;
    sv.innerHTML = out.serve;
    [g, fxg, sv].forEach(x => x.setAttribute('opacity', op));
    if (si !== segI) {
        segI = si;
        const cap = $('#akCaption', el);
        cap.textContent = s.cap();
        cap.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'ease-out' });
        el.querySelectorAll('#akSteps i').forEach((d, i) => d.classList.toggle('on', i <= si));
        el.classList.toggle('serving', mode === 'idle' && !!a.order && si === a.segs.length - 1);
    }
    const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 300) * 60000);
    $('#akClock', el).textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    raf = requestAnimationFrame(frame);
}
function open() {
    if (!el)
        build();
    t0 = performance.now() - START_AT * 1000;
    shownAt = Date.now();
    el.classList.remove('serving');
    el.hidden = false;
    fit();
    requestAnimationFrame(() => el.classList.add('on'));
    document.documentElement.classList.add('afk-on');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
}
/** Not while someone is in the middle of something: an open cart, item, checkout or tracker, a menu, or a focused field. */
function busy() {
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))
        return true;
    const r = document.documentElement;
    return r.classList.contains('locked') || r.classList.contains('menu-open') || !!document.querySelector('.modal.open, .drawer.open');
}
function show() {
    if (el?.classList.contains('on') || document.hidden || mode !== 'idle')
        return;
    if (busy()) {
        clearTimeout(idleTimer);
        idleTimer = window.setTimeout(show, IDLE_MS);
        return;
    }
    setActs(idleActs());
    open();
}
/** The order-confirmation screen's "watch it being made": the customer's exact order, dish by dish, until they close it. */
export function showOrder(lines, eta = '') {
    clearTimeout(idleTimer);
    mode = 'order';
    orderEta = eta;
    setActs(actsForLines(lines));
    open();
    setTimeout(() => $('#akClose', el).focus({ preventScroll: true }), 80);
}
function hide() {
    if (!el || !el.classList.contains('on'))
        return;
    el.classList.remove('on', 'serving');
    document.documentElement.classList.remove('afk-on');
    cancelAnimationFrame(raf);
    const was = mode;
    mode = 'idle';
    // when the page is being left (tab switch, app switch, back/forward cache) hide at once: iOS Safari freezes the
    // fade and the timer, and the half-faded overlay would come back over the page
    if (document.hidden || reduced)
        el.hidden = true;
    else
        setTimeout(() => { if (el && !el.classList.contains('on'))
            el.hidden = true; }, 600);
    if (was === 'order')
        document.querySelector('#coDone [data-watch]')?.focus({ preventScroll: true });
    clearTimeout(idleTimer);
    if (!reduced)
        idleTimer = window.setTimeout(show, IDLE_MS);
}
function activity(e) {
    if (el?.classList.contains('on')) {
        const target = e.target;
        if (mode === 'order') {
            // the order show stays until it's closed on purpose
            if (e.type === 'keydown' && e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                hide();
            }
            return;
        }
        if (e.type === 'keydown' && e.key === 'Enter' && el.classList.contains('serving')) {
            e.preventDefault();
            e.stopPropagation();
            addServed();
            return;
        }
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
        if (target?.closest?.('#akOrder, #akClose'))
            return;
        if (e.type === 'keydown') {
            e.preventDefault();
            e.stopPropagation();
        }
        hide();
        return;
    }
    if (mode === 'order' || reduced)
        return;
    lastMove = { x: -1, y: -1 };
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(show, IDLE_MS);
}
export function initAfk() {
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, activity, { passive: ev !== 'keydown', capture: true }));
    on('lang', texts);
    const settle = () => { if (el && mode === 'idle') {
        if (el.classList.contains('on'))
            hide();
        el.hidden = true;
        el.classList.remove('on', 'serving');
        document.documentElement.classList.remove('afk-on');
    } };
    addEventListener('pagehide', settle);
    addEventListener('pageshow', e => { settle(); if (e.persisted && !reduced) {
        clearTimeout(idleTimer);
        idleTimer = window.setTimeout(show, IDLE_MS);
    } });
    if (reduced)
        return; // the idle show is off for reduced motion; the order show still opens when asked for
    document.addEventListener('visibilitychange', () => { if (document.hidden) {
        if (mode === 'idle')
            hide();
        clearTimeout(idleTimer);
    }
    else
        activity(new Event('visible')); });
    idleTimer = window.setTimeout(show, IDLE_MS);
}
