// Scroll-driven motion for the rest of the page (the hero has its own timeline in main.ts).
// Every element with data-sr gets a --p value from 0 (just entering the screen) to 1 (settled);
// the CSS turns that into slides, 3D flips, reveals and tilts. Without JS, or with reduced motion, --p stays 1.
import { $, $$, clamp, reduced, on as onBus } from './shared.js';
import { perf } from './perf.js';
let items = [];
let beans = [];
let lastY = scrollY, vel = 0, docH = 0, vh = innerHeight, on = false, tape = null, lastSkew = '';
// Positions come from layout (offsetTop), not getBoundingClientRect, so an element's own scroll motion never feeds back into its progress.
function absTop(el) { let y = 0, n = el; while (n) {
    y += n.offsetTop;
    n = n.offsetParent;
} return y; }
/** All layout reads happen here (on load, resize and menu changes), never inside the scroll frame. */
function collect() {
    const cards = $$('#grid .card');
    const x0 = cards[0]?.offsetLeft ?? 0, cw = (cards[0]?.offsetWidth ?? 1) + 12;
    items = $$('[data-sr]').map(el => ({ el, top: absTop(el), col: el.dataset.sr === 'card' ? Math.round((el.offsetLeft - x0) / cw) : 0, last: -1 }));
    docH = document.documentElement.scrollHeight;
    vh = innerHeight;
    tape = $('#tape');
}
function makeBeans() {
    const layer = document.createElement('div');
    layer.className = 'beans';
    layer.setAttribute('aria-hidden', 'true');
    const spots = [[6, 18, 34], [88, 30, 26], [14, 62, 22], [93, 72, 38], [48, 90, 20], [72, 12, 18], [30, 40, 16], [62, 55, 24]];
    layer.innerHTML = spots.map(([x, y, s], i) => `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s * 1.35}px" data-i="${i}"><svg viewBox="0 0 24 32"><ellipse cx="12" cy="16" rx="8" ry="14" fill="url(#beanG)"/><ellipse cx="9" cy="10" rx="2.2" ry="4.5" fill="#fff" opacity=".45"/></svg></i>`).join('')
        + '<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="beanG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFF6DC"/><stop offset=".6" stop-color="#F1D9A0"/><stop offset="1" stop-color="#C99B55"/></radialGradient></defs></svg>';
    document.body.prepend(layer);
    beans = $$('i', layer).filter(el => getComputedStyle(el).display !== 'none').map((el, i) => ({ el, speed: .08 + (i % 4) * .07, spin: (i % 2 ? 1 : -1) * (.04 + (i % 3) * .03), x: 0, y: 0 }));
}
function frame() {
    if (!on)
        return;
    const y = scrollY;
    for (const it of items) {
        const top = it.top - y;
        if (top > vh + 200 || top < -3000)
            continue;
        const kind = it.el.dataset.sr;
        let p;
        if (kind === 'fill')
            p = clamp(1 - (docH - vh - y) / (vh * .55)); // full when the page bottom is reached
        else if (kind === 'card')
            p = clamp((vh - top) / (vh * .42) - it.col * .12);
        else
            p = clamp((vh - top) / (vh * .5));
        p = Math.round(p * 250) / 250; // only write when it visibly changes
        if (p !== it.last) {
            it.last = p;
            it.el.style.setProperty('--p', String(p));
        }
    }
    vel += ((y - lastY) - vel) * .2;
    lastY = y;
    for (const b of beans)
        b.el.style.transform = `translate3d(0, ${((-y * b.speed) % (vh * 1.6)).toFixed(1)}px, 0) rotate(${(y * b.spin).toFixed(1)}deg)`;
    const skew = `${clamp(vel * .35, -12, 12).toFixed(1)}deg`;
    if (tape && skew !== lastSkew) {
        lastSkew = skew;
        tape.style.setProperty('--skew', skew);
    }
}
let raf = 0;
const kick = () => { if (on && !raf)
    raf = requestAnimationFrame(() => { raf = 0; frame(); if (Math.abs(vel) > .2)
        kick(); }); };
/** Light mode: everything simply sits in place. */
function stop() {
    on = false;
    cancelAnimationFrame(raf);
    raf = 0;
    const r = document.documentElement;
    r.classList.remove('sr-on');
    r.classList.add('sr-off');
    items.forEach(it => it.el.style.removeProperty('--p'));
    document.querySelector('.beans')?.remove();
    beans = [];
    tape?.style.removeProperty('--skew');
}
export function initScroll() {
    if (reduced || perf.lite) {
        document.documentElement.classList.add('sr-off');
        return;
    }
    on = true;
    document.documentElement.classList.add('sr-on');
    collect();
    makeBeans();
    // menu cards are re-rendered when filters change: pick them up again
    new MutationObserver(() => { if (on) {
        collect();
        frame();
    } }).observe($('#grid'), { childList: true });
    addEventListener('scroll', kick, { passive: true });
    addEventListener('pageshow', () => { if (on) {
        collect();
        frame();
    } });
    addEventListener('resize', () => { if (on) {
        collect();
        kick();
    } });
    new ResizeObserver(() => { if (on) {
        collect();
        frame();
    } }).observe(document.body);
    onBus('perf', lite => { if (lite)
        stop(); });
    frame();
}
