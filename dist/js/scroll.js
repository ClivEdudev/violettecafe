// Scroll-driven motion for the rest of the page (the hero has its own timeline in main.ts).
// Every element with data-sr gets a --p value from 0 (just entering the screen) to 1 (settled);
// the CSS turns that into slides, 3D flips, reveals and tilts. Without JS, or with reduced motion, --p stays 1.
import { $, $$, clamp, reduced } from './shared.js';
let items = [];
let beans = [];
let lastY = scrollY, vel = 0;
// Positions come from layout (offsetTop), not getBoundingClientRect, so an element's own scroll motion never feeds back into its progress.
function absTop(el) { let y = 0, n = el; while (n) {
    y += n.offsetTop;
    n = n.offsetParent;
} return y; }
function collect() {
    const cards = $$('#grid .card');
    const x0 = cards[0]?.offsetLeft ?? 0, cw = (cards[0]?.offsetWidth ?? 1) + 12;
    items = $$('[data-sr]').map(el => ({ el, top: absTop(el), col: el.dataset.sr === 'card' ? Math.round((el.offsetLeft - x0) / cw) : 0 }));
}
function makeBeans() {
    const layer = document.createElement('div');
    layer.className = 'beans';
    layer.setAttribute('aria-hidden', 'true');
    const spots = [[6, 18, 34], [88, 30, 26], [14, 62, 22], [93, 72, 38], [48, 90, 20], [72, 12, 18], [30, 40, 16], [62, 55, 24]];
    layer.innerHTML = spots.map(([x, y, s], i) => `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s * 1.35}px" data-i="${i}"><svg viewBox="0 0 24 32"><ellipse cx="12" cy="16" rx="10" ry="14" fill="url(#beanG)"/><path d="M12 3c-5 6 5 14 0 26" fill="none" stroke="#2A1206" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="8" cy="9" rx="2.4" ry="3.8" fill="#fff" opacity=".3"/></svg></i>`).join('')
        + '<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="beanG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#B8763F"/><stop offset=".55" stop-color="#7A3F1E"/><stop offset="1" stop-color="#3E1E0C"/></radialGradient></defs></svg>';
    document.body.prepend(layer);
    beans = $$('i', layer).map((el, i) => ({ el, speed: .08 + (i % 4) * .07, spin: (i % 2 ? 1 : -1) * (.04 + (i % 3) * .03), x: 0, y: 0 }));
}
function frame() {
    const vh = innerHeight;
    for (const { el, top: t0, col } of items) {
        const top = t0 - scrollY;
        if (top > vh + 200 || top < -3000)
            continue;
        const kind = el.dataset.sr;
        let p;
        if (kind === 'spread')
            p = clamp((vh - top) / (vh * .7));
        else if (kind === 'card')
            p = clamp((vh - top) / (vh * .42) - col * .12);
        else
            p = clamp((vh - top) / (vh * .5));
        el.style.setProperty('--p', p.toFixed(3));
    }
    const y = scrollY;
    vel += ((y - lastY) - vel) * .2;
    lastY = y;
    for (const b of beans)
        b.el.style.transform = `translate3d(0, ${(-y * b.speed) % (vh * 1.6)}px, 0) rotate(${y * b.spin}deg)`;
    const tape = $('#tape');
    if (tape)
        tape.style.setProperty('--skew', `${clamp(vel * .35, -12, 12).toFixed(2)}deg`);
}
let raf = 0;
const kick = () => { if (!raf)
    raf = requestAnimationFrame(() => { raf = 0; frame(); if (Math.abs(vel) > .2)
        kick(); }); };
export function initScroll() {
    if (reduced) {
        document.documentElement.classList.add('sr-off');
        return;
    }
    document.documentElement.classList.add('sr-on');
    collect();
    makeBeans();
    // menu cards are re-rendered when filters change: pick them up again
    new MutationObserver(() => { collect(); frame(); }).observe($('#grid'), { childList: true });
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { collect(); kick(); });
    new ResizeObserver(() => { collect(); frame(); }).observe(document.body);
    frame();
}
