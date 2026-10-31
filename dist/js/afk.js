// Away screen: when the visitor leaves the site open and idle, a calm barista scene fades in over the page
// and makes a latte from start to finish, on a loop. Any touch, key, scroll or real mouse move brings the site back.
// Try it fast with ?afk=5 (seconds). Off for reduced motion.
import { $, clamp, reduced, state, t, money, addLine, toast, on } from './shared.js';
import { ITEM } from './data.js';
import { latteArt } from './art.js';
const IDLE_MS = (() => { const v = Number(new URLSearchParams(location.search).get('afk')); return v > 0 ? v * 1000 : 50000; })();
const LOOP = 24;
const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
/** Piecewise path through [time, x, y] keyframes with smooth easing between them. */
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
const win = (tm, a, b) => clamp((tm - a) / (b - a));
const between = (tm, a, b) => tm >= a && tm < b;
/* --- choreography (seconds in a 24 s loop) --- */
const RIGHT = [[0, 775, 505], [.8, 898, 468], [3.2, 898, 468], [4, 818, 500], [4.3, 850, 505], [4.7, 770, 468], [5.2, 770, 488], [5.6, 770, 470], [6, 770, 488], [6.4, 770, 470], [6.9, 850, 505], [7.3, 818, 500], [7.9, 705, 470], [8.3, 775, 505],
    [15.4, 775, 505], [16, 680, 505], [16.6, 716, 408], [19, 716, 408], [19.6, 680, 505], [20.2, 792, 300], [20.7, 815, 292], [21.2, 792, 300], [21.7, 815, 292], [22.2, 792, 300], [22.8, 775, 505], [24, 775, 505]];
const LEFT = [[0, 625, 505], [7.4, 625, 505], [7.9, 705, 470], [8.9, 428, 446], [9.3, 428, 446], [9.8, 560, 505], [10.4, 408, 505], [10.9, 600, 468], [12.6, 600, 468], [13, 600, 505], [13.5, 552, 470], [14, 552, 480], [14.5, 552, 470], [15, 552, 480],
    [15.4, 680, 505], [15.9, 408, 505], [16.6, 650, 452], [19, 650, 452], [19.7, 700, 505], [20.2, 625, 505], [24, 625, 505]];
const HEAD = [[0, 0, 0], [.8, 9, 4], [3.2, 9, 4], [4.4, 5, 8], [6.8, 5, 8], [8, -2, 2], [8.9, -12, 2], [12.6, -12, 4], [13.4, -10, 6], [15, -10, 6], [16.4, -2, 10], [19, -2, 10], [20, 0, 0], [24, 0, 0]];
const STEPS = [0, 4, 7, 12.6, 16, 19.8];
/* --- arm solver (two bones, elbow bends outward) --- */
const UPPER = 106, FORE = 100;
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
/* --- drawing --- */
const DEFS = `<defs>
  <linearGradient id="aWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1934"/><stop offset=".7" stop-color="#1C1024"/><stop offset="1" stop-color="#140B1A"/></linearGradient>
  <radialGradient id="aLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD38A" stop-opacity=".55"/><stop offset=".45" stop-color="#FFB45A" stop-opacity=".18"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient>
  <linearGradient id="aWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5636"/><stop offset=".08" stop-color="#6B3F25"/><stop offset="1" stop-color="#3E2314"/></linearGradient>
  <linearGradient id="aTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DCCB"/><stop offset="1" stop-color="#BBA48B"/></linearGradient>
  <linearGradient id="aChrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5D5B66"/><stop offset=".18" stop-color="#E9E7EF"/><stop offset=".4" stop-color="#9C99A6"/><stop offset=".7" stop-color="#F4F3F8"/><stop offset="1" stop-color="#6B6875"/></linearGradient>
  <linearGradient id="aBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3B2357"/><stop offset=".35" stop-color="#6A3FA0"/><stop offset=".65" stop-color="#5A3590"/><stop offset="1" stop-color="#2E1A45"/></linearGradient>
  <linearGradient id="aShirt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#CFC2B2"/><stop offset=".45" stop-color="#F4ECE1"/><stop offset="1" stop-color="#C4B6A4"/></linearGradient>
  <linearGradient id="aApron" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2C1A3C"/><stop offset=".5" stop-color="#4A2C66"/><stop offset="1" stop-color="#26162F"/></linearGradient>
  <radialGradient id="aSkin" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#F0C9A6"/><stop offset=".7" stop-color="#D9A27C"/><stop offset="1" stop-color="#B98060"/></radialGradient>
  <linearGradient id="aSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7E7B88"/><stop offset=".3" stop-color="#F2F1F6"/><stop offset=".6" stop-color="#ABA8B4"/><stop offset="1" stop-color="#5F5C69"/></linearGradient>
  <linearGradient id="aCup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D8D0DE"/><stop offset=".4" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9BFD2"/></linearGradient>
  <radialGradient id="aCrema" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#D8A06A"/><stop offset=".8" stop-color="#9A5A2E"/><stop offset="1" stop-color="#6B3A1C"/></radialGradient>
  <filter id="aBlur"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="aSoft" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>
  <clipPath id="aInset"><circle cx="1010" cy="190" r="104"/></clipPath>
</defs>`;
function sceneSVG() {
    const jars = [0, 1, 2, 3, 4].map(i => { const x = 120 + i * 70; return `<g transform="translate(${x} 150)"><rect x="-22" y="-56" width="44" height="56" rx="8" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.18)"/><rect x="-18" y="-${20 + (i * 7) % 24}" width="36" height="${16 + (i * 7) % 24}" rx="4" fill="${['#5A3220', '#7A4A2A', '#3E2316', '#8A5A36', '#4A2A1A'][i]}"/><rect x="-24" y="-64" width="48" height="10" rx="4" fill="#3A2A44"/></g>`; }).join('');
    const bokeh = Array.from({ length: 14 }, (_, i) => `<circle class="ak-bokeh" style="--d:${(i * .9) % 8}s;--x:${(i % 2 ? 1 : -1) * (10 + i * 2)}px" cx="${(i * 83) % 1200}" cy="${80 + (i * 47) % 380}" r="${4 + (i % 4) * 3}" fill="#FFC98A" opacity="${.05 + (i % 3) * .04}"/>`).join('');
    const lamp = (x, d) => `<g class="ak-lamp" style="--d:${d}s;transform-origin:${x}px 0px"><line x1="${x}" y1="0" x2="${x}" y2="90" stroke="#0E0812" stroke-width="2"/><path d="M${x - 34} 120 Q${x} 72 ${x + 34} 120z" fill="#1E1428"/><ellipse cx="${x}" cy="120" rx="34" ry="6" fill="#FFE2A8"/><circle cx="${x}" cy="150" r="190" fill="url(#aLamp)"/></g>`;
    return `${DEFS}
  <rect width="1200" height="700" fill="url(#aWall)"/>
  <g opacity=".5">${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 100}" y="0" width="2" height="500" fill="rgba(255,255,255,.025)"/>`).join('')}</g>
  <rect x="60" y="150" width="420" height="10" rx="3" fill="#4A2E22"/>${jars}
  <g transform="translate(860 70)"><rect width="260" height="160" rx="10" fill="#151018" stroke="#3A2A44" stroke-width="6"/><text x="130" y="58" text-anchor="middle" class="ak-chalk-t">Violette</text>
    <text x="24" y="98" class="ak-chalk">Latte</text><text x="236" y="98" text-anchor="end" class="ak-chalk" id="akBoardPrice"></text><text x="24" y="128" class="ak-chalk">Cappuccino</text><text x="236" y="128" text-anchor="end" class="ak-chalk" id="akBoardPrice2"></text></g>
  ${bokeh}
  <!-- espresso machine -->
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
  <!-- grinder -->
  <g id="akGrinder">
    <path d="M818 300 h64 l-10 58 h-44z" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.35)"/>
    <rect id="akBeans" x="826" y="318" width="48" height="38" rx="4" fill="#4A2A18"/>
    <rect x="810" y="356" width="80" height="70" rx="10" fill="url(#aChrome)"/>
    <rect x="838" y="426" width="24" height="16" rx="3" fill="#3A3640"/>
    <rect x="800" y="500" width="100" height="8" rx="3" fill="#2A2630"/>
  </g>
  <!-- barista -->
  <g id="akBarista">
    <path d="M602 345 Q700 300 798 345 L812 560 H588z" fill="url(#aShirt)"/>
    <path d="M640 356 Q700 340 760 356 L768 560 H632z" fill="url(#aApron)"/>
    <path d="M652 356 L640 300 M748 356 L760 300" stroke="#2C1A3C" stroke-width="8"/>
    <text x="700" y="430" text-anchor="middle" class="ak-badge">V</text>
    <path d="M684 300 L700 330 L716 300z" fill="#E6DCCF"/>
    <rect x="686" y="282" width="28" height="28" rx="8" fill="#C98E68"/>
    <g id="akHead">
      <ellipse cx="656" cy="250" rx="8" ry="12" fill="#C98E68"/><ellipse cx="744" cy="250" rx="8" ry="12" fill="#C98E68"/>
      <ellipse cx="700" cy="246" rx="44" ry="52" fill="url(#aSkin)"/>
      <path d="M656 236 Q654 186 700 186 Q748 186 746 236 Q740 210 718 208 Q690 214 664 206 Q660 222 656 236z" fill="#2A1A14"/>
      <path d="M676 228 q8 -5 16 0 M708 228 q8 -5 16 0" stroke="#2A1A14" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <g id="akEyes"><ellipse cx="684" cy="242" rx="4" ry="4.6" fill="#2A1A14"/><ellipse cx="716" cy="242" rx="4" ry="4.6" fill="#2A1A14"/></g>
      <path d="M700 248 q-5 12 2 15" stroke="#B07454" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path id="akMouth" d="M688 274 q12 6 24 0" stroke="#8E4A3A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="676" cy="262" rx="7" ry="4" fill="#E79A88" opacity=".35"/><ellipse cx="724" cy="262" rx="7" ry="4" fill="#E79A88" opacity=".35"/>
    </g>
  </g>
  <g id="akArms"></g>
  <g id="akProps"></g>
  <g id="akFx"></g>
  <!-- counter -->
  <rect x="0" y="504" width="1200" height="20" fill="url(#aTop)"/>
  <rect x="0" y="524" width="1200" height="176" fill="url(#aWood)"/>
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${40 + i * 196}" y="548" width="176" height="128" rx="6" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`).join('')}
  <g id="akServe"></g>
  ${lamp(170, 0)}${lamp(600, 1.4)}
  <g id="akInset" opacity="0"><circle cx="1010" cy="190" r="112" fill="#140B1A" stroke="#FFE2A8" stroke-opacity=".5" stroke-width="3"/>
    <g clip-path="url(#aInset)"><circle cx="1010" cy="190" r="104" fill="url(#aCup)"/><circle cx="1010" cy="190" r="84" fill="url(#aCrema)"/><g id="akArt"></g></g></g>`;
}
const limb = (x1, y1, x2, y2, w, c) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
function arm(sx, sy, tx, ty, side) {
    const { ex, ey, hx, hy } = ik(sx, sy, tx, ty, side);
    return { hx, hy, svg: limb(sx, sy, ex, ey, 36, '#E9DFD2') + limb(sx, sy, ex, ey, 14, 'rgba(255,255,255,.35)') + limb(ex, ey, hx, hy, 26, '#D59C76') + limb(ex, ey, hx, hy, 8, 'rgba(255,255,255,.22)') + `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="16" fill="#E2D6C7"/><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="15" fill="url(#aSkin)"/>` };
}
/* props drawn around an anchor (the point a hand holds) */
const portafilter = (gx, gy, rot = 0) => `<g transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) rotate(${rot})"><rect x="-6" y="-6" width="52" height="12" rx="6" fill="#2A1A14"/><rect x="-62" y="-12" width="44" height="20" rx="6" fill="url(#aSteel)" transform="translate(14 0)"/><path d="M-48 8 h44 l-4 10 h-36z" fill="url(#aSteel)" transform="translate(14 0)"/></g>`;
const tamper = (x, y) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect x="-7" y="-34" width="14" height="30" rx="7" fill="#2A1A14"/><rect x="-20" y="-6" width="40" height="10" rx="3" fill="url(#aSteel)"/></g>`;
function cup(cx, by, fill, rot = 0, scale = 1) {
    const lvl = 34 * fill;
    return `<g transform="translate(${cx.toFixed(1)} ${by.toFixed(1)}) rotate(${rot}) scale(${scale})" filter="url(#aSoft)"><path d="M18 -26 q18 2 14 14 q-3 9 -16 8" fill="none" stroke="#E7DFEA" stroke-width="6"/>
    <path d="M-22 -40 h44 l-5 36 q-1 4 -6 4 h-22 q-5 0 -6 -4z" fill="url(#aCup)"/><rect x="-21" y="-30" width="42" height="5" fill="#7A4FB0" opacity=".9"/>
    ${fill > 0 ? `<clipPath id="akCupClip${Math.round(cx)}"><path d="M-19 -38 h38 l-5 34 h-28z"/></clipPath><rect clip-path="url(#akCupClip${Math.round(cx)})" x="-20" y="${-4 - lvl}" width="40" height="${lvl}" fill="${fill > .5 ? '#C99A6E' : '#6B3A1C'}"/><ellipse cx="0" cy="${-4 - lvl}" rx="${15 + fill * 4}" ry="3" fill="${fill > .5 ? '#F1E3CF' : '#C7864B'}"/>` : ''}
    <ellipse cx="0" cy="0" rx="30" ry="5" fill="#EFE8F2"/></g>`;
}
const pitcher = (gx, gy, rot = 0) => `<g transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) rotate(${rot})"><path d="M-6 -34 q14 2 12 16 q-2 10 -12 10" fill="none" stroke="url(#aSteel)" stroke-width="5"/><path d="M-50 -46 h40 l4 42 q0 4 -4 4 h-40 q-4 0 -4 -4z M-50 -46 l-10 -4 l6 8z" fill="url(#aSteel)" transform="translate(4 0)"/></g>`;
function render(tm) {
    const [rx, ry] = track(RIGHT, tm), [lx, ly] = track(LEFT, tm), [hr, hd] = track(HEAD, tm);
    const head = $('#akHead');
    head.setAttribute('transform', `rotate(${hr * .6} 700 296) translate(${hr * .35} ${hd * .4})`);
    const blink = (tm % 4.2) > 4.05 ? .1 : 1;
    $('#akEyes').setAttribute('transform', `translate(0 ${242 * (1 - blink)}) scale(1 ${blink})`);
    $('#akMouth').setAttribute('d', tm > 19.8 && tm < 23 ? 'M686 272 q14 12 28 0' : 'M688 274 q12 6 24 0');
    const R = arm(760, 340, rx, ry, -1), L = arm(640, 340, lx, ly, 1);
    $('#akArms').innerHTML = L.svg + R.svg;
    let props = '', fx = '';
    // portafilter
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
    // tamper
    props += between(tm, 4.3, 6.9) ? tamper(R.hx, R.hy) : tamper(850, 505);
    // pitcher (held by its handle)
    if (between(tm, 12.6, 15))
        props += pitcher(L.hx, L.hy);
    else if (between(tm, 16, 19.6))
        props += pitcher(R.hx, R.hy, -58 * ease(win(tm, 16.6, 17.4)) + 10 * win(tm, 18.8, 19.3));
    else
        props += pitcher(tm < 12.6 ? 600 : 680, 505);
    // cup
    const espresso = .45 * win(tm, 10.4, 12.6), milk = .45 * win(tm, 16.8, 18.8);
    const fill = espresso + milk;
    let cupX = 532, cupY = 505, cupRot = 0, cupScale = 1, serve = false;
    if (between(tm, 9.8, 10.4)) {
        cupX = L.hx - 28;
        cupY = L.hy;
    }
    else if (between(tm, 10.4, 15.9)) {
        cupX = 380;
    }
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
        serve = k > 0;
    }
    const cupSvg = cup(cupX, cupY, fill, cupRot, cupScale);
    if (serve)
        $('#akServe').innerHTML = cupSvg;
    else {
        $('#akServe').innerHTML = '';
        props += cupSvg;
    }
    $('#akProps').innerHTML = props;
    // grinder: grounds fall and the motor hums
    if (between(tm, .9, 3.1)) {
        for (let i = 0; i < 9; i++) {
            const f = ((tm * 3 + i / 9) % 1);
            fx += `<circle cx="${850 + Math.sin(i * 7 + tm * 10) * 5}" cy="${442 + f * 22}" r="2.2" fill="#3A2214"/>`;
        }
        $('#akGrinder').setAttribute('transform', `translate(${Math.sin(tm * 90) * .8} 0)`);
    }
    else
        $('#akGrinder').removeAttribute('transform');
    $('#akBeans').setAttribute('height', String(38 - 8 * win(tm, .9, 3.1)));
    $('#akBeans').setAttribute('y', String(318 + 8 * win(tm, .9, 3.1)));
    // espresso: two thin streams, the light glows, the needle rises
    const brewing = between(tm, 10.4, 12.6);
    $('#akLight').setAttribute('fill', brewing ? '#FFB45A' : '#5A3A1C');
    $('#akNeedle').setAttribute('transform', `rotate(${brewing ? 60 + Math.sin(tm * 8) * 4 : tm > 12.6 && tm < 16 ? 30 : 0} 300 388)`);
    if (brewing)
        fx += `<path d="M374 446 Q373 ${470 + Math.sin(tm * 20)} 376 ${490 - 34 * espresso}" stroke="#5A2E1A" stroke-width="3" fill="none"/><path d="M386 446 Q387 ${470 + Math.cos(tm * 20)} 384 ${490 - 34 * espresso}" stroke="#5A2E1A" stroke-width="3" fill="none"/>`;
    // steam wand
    if (between(tm, 13.4, 15))
        for (let i = 0; i < 6; i++) {
            const f = ((tm * .9 + i / 6) % 1);
            fx += `<circle cx="${546 + Math.sin(i * 3 + tm * 2) * 14 * f}" cy="${452 - f * 120}" r="${10 + f * 26}" fill="#fff" opacity="${(1 - f) * .35}" filter="url(#aBlur)"/>`;
        }
    // milk pour during latte art
    if (between(tm, 16.8, 18.8)) {
        const sx = R.hx - 66, sy = R.hy - 30;
        fx += `<path d="M${sx} ${sy} Q${sx - 4} ${(sy + L.hy - 40) / 2} ${L.hx - 30} ${L.hy - 42}" stroke="#F4ECE1" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    // steam over the served cup
    if (tm > 20.6)
        for (let i = 0; i < 3; i++) {
            const f = ((tm * .5 + i / 3) % 1);
            fx += `<path d="M${700 + (i - 1) * 16} ${505 - 10 - f * 90} q-10 -14 0 -28 q10 -14 0 -28" stroke="#fff" stroke-width="5" fill="none" opacity="${(1 - f) * .45}" filter="url(#aBlur)"/>`;
        }
    $('#akFx').innerHTML = fx;
    // top-view inset: the heart forms
    const ins = clamp(win(tm, 16.4, 16.9) - win(tm, 19.4, 19.9));
    $('#akInset').setAttribute('opacity', String(ins));
    const art = win(tm, 17, 18.8);
    $('#akArt').innerHTML = art > 0 ? `<g transform="translate(1010 196) scale(${.4 + art * .6}) translate(-1010 -196)" opacity="${Math.min(1, art * 2)}">${latteArt('heart', 1010, 196, 4.2, '#F7EEE2')}</g>` : '';
    return STEPS.reduce((a, s, i) => (tm >= s ? i : a), 0);
}
/* --- overlay & idle detection --- */
let el = null, raf = 0, t0 = 0, shownAt = 0, step = -1, idleTimer = 0, lastMove = { x: -1, y: -1 };
function build() {
    el = document.createElement('div');
    el.className = 'afk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'akTitle');
    el.innerHTML = `<div class="ak-top"><span class="ak-logo">Violette</span><p id="akTitle"></p><span class="ak-clock" id="akClock"></span></div>
    <svg class="ak-scene" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sceneSVG()}</svg>
    <div class="ak-bottom"><div class="ak-steps" id="akSteps">${STEPS.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div><p class="ak-caption" id="akCaption" aria-live="polite"></p>
      <button type="button" class="btn btn-acc ak-order" id="akOrder"></button><p class="ak-hint" id="akHint"></p></div>`;
    document.body.appendChild(el);
    $('#akOrder', el).addEventListener('click', e => {
        e.stopPropagation();
        addLine({ kind: 'item', item: 'latte', size: 'M', extras: [] }, 1);
        hide();
        toast(`${ITEM('latte').name[state.lang]} — ${t('card.added').toLowerCase()}`);
    });
    texts();
}
function texts() {
    if (!el)
        return;
    $('#akTitle', el).textContent = t('afk.title');
    $('#akHint', el).textContent = t('afk.hint');
    const L = ITEM('latte'), C = ITEM('cappuccino');
    $('#akOrder', el).textContent = `${t('afk.order')} · ${money(L.price)}`;
    $('#akBoardPrice', el).textContent = money(L.price);
    $('#akBoardPrice2', el).textContent = money(C.price);
    if (step >= 0)
        $('#akCaption', el).textContent = t('afk.s' + (step + 1));
}
function frame(now) {
    if (!el)
        return;
    const tm = ((now - t0) / 1000) % LOOP;
    const s = render(tm);
    if (s !== step) {
        step = s;
        $('#akCaption', el).textContent = t('afk.s' + (s + 1));
        $('#akCaption', el).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'ease-out' });
        el.querySelectorAll('#akSteps i').forEach((d, i) => d.classList.toggle('on', i <= s));
        el.classList.toggle('serving', s === 5);
    }
    const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 300) * 60000);
    $('#akClock', el).textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    raf = requestAnimationFrame(frame);
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
function show() {
    if (el?.classList.contains('on') || document.hidden)
        return;
    if (!el)
        build();
    step = -1;
    t0 = performance.now();
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
