const NONE = { kind: 'none', el: null, box: null, label: '' };
const INTERACTIVE = 'a[href], button:not(:disabled), [role="button"], [role="option"], [role="tab"], [role="radio"], label.check, label.switch, input:not([type="hidden"]), textarea, summary';
const TEXTY = 'input:not([type]), input[type="text"], input[type="tel"], input[type="search"], input[type="email"], textarea, #bgAmount';
/** Buttons that spend money, remove things or send something must be hit on purpose. */
const NO_MAGNET = '[data-add], [data-repeat], #repeatLast, [data-bq], #imAdd, #bAdd, #cAdd, #bgAdd, #bgSurprise, #bgClear, #heroCombo, #coNext, #toCheckout, #bkSend, [data-rm], #bClear, input[type="range"]';
const SURFACE = '.sheet, .drawer-panel, .menu.open, .top, main, footer';
const MAGNET = 18;
export function initPointer(t) {
    const ZONES = [['.card', '[data-open]', 'card.open']];
    function nearest(x, y, hit) {
        const surf = hit.closest(SURFACE);
        let best = null;
        let bd = Infinity;
        const d = MAGNET, e = Math.round(MAGNET * .72);
        for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d], [e, e], [-e, e], [e, -e], [-e, -e]]) {
            const c = document.elementFromPoint(x + ox, y + oy)?.closest(INTERACTIVE);
            if (!c || c.matches(NO_MAGNET) || c.matches(TEXTY) || c.matches('.card-hit') || c.closest(SURFACE) !== surf)
                continue;
            const r = c.getBoundingClientRect();
            const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
            const dist = Math.hypot(dx, dy);
            if (dist < bd) {
                bd = dist;
                best = c;
            }
        }
        return bd <= MAGNET ? best : null;
    }
    /** What the pointer at (x, y) would use, and what the outline should wrap. */
    function resolve(x, y, magnet) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || hit.tagName === 'IFRAME')
            return NONE;
        const tx = hit.closest(TEXTY);
        if (tx)
            return { kind: 'text', el: tx, box: tx.closest('.phone-in, .money-in, .search') ?? tx, label: '' };
        const dis = hit.closest('button:disabled');
        if (dis)
            return { kind: 'disabled', el: null, box: dis, label: '' };
        const direct = hit.closest(INTERACTIVE);
        if (direct) {
            if (direct.matches('.card-hit')) {
                const card = direct.closest('.card');
                return { kind: 'zone', el: direct, box: card ?? direct, label: t('card.open') };
            }
            if (direct.matches('input[type="checkbox"]')) {
                const lab = direct.closest('label');
                return { kind: 'snap', el: lab ?? direct, box: lab ?? direct, label: '' };
            }
            return { kind: 'snap', el: direct, box: direct, label: '' };
        }
        if (magnet) {
            const n = nearest(x, y, hit);
            if (n)
                return { kind: 'snap', el: n, box: n, label: '' };
        }
        for (const [z, p, k] of ZONES) {
            const zone = hit.closest(z);
            const prim = zone?.querySelector(p);
            if (zone && prim)
                return { kind: 'zone', el: prim, box: zone, label: t(k) };
        }
        return NONE;
    }
    /* -- click assist: a near miss beside a small control does what the outline shows -- */
    let lastType = 'mouse';
    let cursorOn = false;
    document.addEventListener('pointerdown', e => { lastType = e.pointerType; }, true);
    document.addEventListener('click', e => {
        if (e.detail === 0 || e.defaultPrevented)
            return; // keyboard or our own forwarded click
        const t0 = e.target;
        if (!(t0 instanceof Element))
            return;
        if (t0.closest(INTERACTIVE) || t0.closest('.scrim, iframe, input, textarea, select, svg#burgerSvg, svg#cupSvg'))
            return;
        if ((getSelection()?.toString() ?? '').trim())
            return; // the visitor was selecting text
        const h = resolve(e.clientX, e.clientY, cursorOn && lastType === 'mouse');
        if ((h.kind === 'zone' || h.kind === 'snap') && h.el && !h.el.contains(t0)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            h.el.click();
        }
    }, true);
    /* -- the cursor itself -- */
    const ok = matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches && !matchMedia('(forced-colors: active)').matches;
    if (!ok)
        return;
    cursorOn = true;
    const root = document.documentElement;
    const dot = document.createElement('div');
    dot.className = 'cur-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.innerHTML = '<svg viewBox="0 0 24 32"><defs><radialGradient id="curBean" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#B8763F"/><stop offset=".55" stop-color="#7A3F1E"/><stop offset="1" stop-color="#3E1E0C"/></radialGradient></defs><ellipse cx="12" cy="16" rx="10" ry="14" fill="url(#curBean)"/><path d="M12 3c-5 6 5 14 0 26" fill="none" stroke="#2A1206" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="8" cy="9" rx="2.6" ry="4" fill="#fff" opacity=".28"/></svg>';
    const ring = document.createElement('div');
    ring.className = 'cur-ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<span class="cur-label"></span>';
    document.body.append(ring, dot);
    root.classList.add('has-cursor');
    const lab = ring.firstElementChild;
    let mx = -100, my = -100, shown = false, dirty = true, down = false, raf = 0, still = 0;
    let cur = NONE;
    let radius = 14;
    const g = { x: -100, y: -100, w: 30, h: 30, r: 15 };
    const radiusOf = (el) => { const v = parseFloat(getComputedStyle(el).borderTopLeftRadius); return Number.isFinite(v) ? v : 12; };
    function apply(h) {
        if (h.kind === cur.kind && h.box === cur.box && h.el === cur.el)
            return;
        cur = h;
        root.dataset.cur = h.kind;
        if (h.label)
            lab.textContent = h.label;
        root.classList.toggle('cur-labelled', !!h.label);
        radius = h.box ? radiusOf(h.box) : 15;
    }
    /** Small hysteresis so the outline doesn't flicker in the gaps between neighbouring things. */
    function keepCurrent(next) {
        if (next.kind !== 'none' || !cur.box || (cur.kind !== 'zone' && cur.kind !== 'snap'))
            return false;
        const r = cur.box.getBoundingClientRect();
        const pad = cur.kind === 'zone' ? 14 : MAGNET + 6;
        return mx > r.left - pad && mx < r.right + pad && my > r.top - pad && my < r.bottom + pad && cur.box.isConnected;
    }
    const kick = () => { still = 0; if (!raf)
        raf = requestAnimationFrame(loop); };
    function loop() {
        raf = 0;
        if (dirty && !down) {
            dirty = false;
            const n = resolve(mx, my, true);
            if (!keepCurrent(n))
                apply(n);
        }
        let tx, ty, tw, th, tr;
        const box = cur.box && cur.box.isConnected ? cur.box : null;
        if (box && cur.kind !== 'none' && cur.kind !== 'disabled') {
            const r = box.getBoundingClientRect();
            const pad = cur.kind === 'zone' ? 8 : cur.kind === 'text' ? 4 : 6;
            tx = r.left - pad;
            ty = r.top - pad;
            tw = r.width + pad * 2;
            th = r.height + pad * 2;
            tr = Math.min(radius + pad, Math.min(tw, th) / 2);
        }
        else {
            const s = 30;
            tx = mx - s / 2;
            ty = my - s / 2;
            tw = s;
            th = s;
            tr = s / 2;
        }
        const k = .26;
        g.x += (tx - g.x) * k;
        g.y += (ty - g.y) * k;
        g.w += (tw - g.w) * k;
        g.h += (th - g.h) * k;
        g.r += (tr - g.r) * k;
        ring.style.translate = `${g.x.toFixed(1)}px ${g.y.toFixed(1)}px`;
        ring.style.width = `${g.w.toFixed(1)}px`;
        ring.style.height = `${g.h.toFixed(1)}px`;
        ring.style.borderRadius = `${g.r.toFixed(1)}px`;
        const moving = Math.abs(tx - g.x) + Math.abs(ty - g.y) + Math.abs(tw - g.w) + Math.abs(th - g.h) > .4;
        if (moving || down || dirty)
            still = 0;
        if (++still < 30)
            raf = requestAnimationFrame(loop); // a few calm frames after settling, then rest
    }
    addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse')
            return;
        mx = e.clientX;
        my = e.clientY;
        dirty = true;
        dot.style.translate = `${mx}px ${my}px`;
        if (!shown) {
            shown = true;
            root.classList.add('cur-on');
            g.x = mx - 15;
            g.y = my - 15;
        }
        kick();
    }, { passive: true });
    document.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse')
            return;
        down = true;
        root.classList.add('cur-down');
        if (cur.kind !== 'text')
            ripple(e.clientX, e.clientY);
        kick();
    }, true);
    addEventListener('pointerup', e => {
        if (e.pointerType !== 'mouse')
            return;
        down = false;
        root.classList.remove('cur-down');
        dirty = true;
        root.dataset.cur = cur.kind;
        kick();
    }, true);
    document.addEventListener('pointerout', e => { if (!e.relatedTarget && e.pointerType === 'mouse') {
        shown = false;
        root.classList.remove('cur-on');
    } });
    document.addEventListener('pointerover', e => { if (e.target.tagName === 'IFRAME') {
        shown = false;
        root.classList.remove('cur-on');
    } });
    addEventListener('scroll', () => { dirty = true; kick(); }, { passive: true });
    addEventListener('blur', () => { shown = false; root.classList.remove('cur-on'); });
    // things open and close under a still pointer (menus, dialogs): re-check what's underneath
    new MutationObserver(() => { dirty = true; kick(); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });
    function ripple(x, y) {
        const r = document.createElement('span');
        r.className = 'cur-ripple';
        r.style.left = `${x}px`;
        r.style.top = `${y}px`;
        document.body.appendChild(r);
        r.addEventListener('animationend', () => r.remove(), { once: true });
        setTimeout(() => r.remove(), 800);
    }
}
