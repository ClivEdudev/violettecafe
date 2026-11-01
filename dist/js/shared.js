// Small shared core: DOM helpers, storage, language, cart, overlays, toasts.
import { DICT } from './i18n.js';
import { ITEM, EXTRAS, SIZES, photoURL, SET_DISCOUNTS, SET_DRINKS, SET_BURGERS, setPrice, BUNS, WRAP_ADDS, WRAP_SAUCES, HD_TOPS, HD_SAUCES } from './data.js';
import { burgerPrice, burgerName, burgerArt, burgerPrep, coffeePrice, coffeeName, coffeeArt, coffeePrep, sanitizeBurger, sanitizeCoffee, wrapPrice, wrapName, wrapArt, wrapPrep, sanitizeWrap, hotdogPrice, hotdogName, hotdogArt, hotdogPrep, sanitizeHotdog } from './recipes.js';
import { svg } from './art.js';
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
export const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const parse = (s) => { try {
    return s ? JSON.parse(s) : null;
}
catch {
    return null;
} };
export const store = {
    get: (k) => { try {
        return parse(localStorage.getItem(k));
    }
    catch {
        return null;
    } },
    set: (k, v) => { try {
        localStorage.setItem(k, JSON.stringify(v));
    }
    catch { /* private mode */ } },
};
/* ---------- language ---------- */
export const LANGS = ['uz', 'ru', 'en'];
export const isLang = (v) => LANGS.includes(v);
const urlLang = new URLSearchParams(location.search).get('lang');
export const state = {
    lang: (isLang(urlLang) ? urlLang : isLang(store.get('vc-lang')) ? store.get('vc-lang') : 'uz'),
};
export const t = (k) => DICT[state.lang]?.[k] ?? DICT.uz[k] ?? k;
export const tf = (k, vars) => t(k).replace(/\{(\w+)\}/g, (_, v) => String(vars[v] ?? ''));
export const money = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/\s/g, '\u00A0')}\u00A0${t('cur')}`;
export const plural = (n, key) => {
    if (state.lang === 'ru') {
        const m10 = n % 10, m100 = n % 100;
        const f = m10 === 1 && m100 !== 11 ? 'one' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'few' : 'many';
        return t(`${key}.${f}`);
    }
    if (state.lang === 'en')
        return t(n === 1 ? `${key}.one` : `${key}.many`);
    return t(`${key}.one`);
};
const bus = new Map();
export const on = (ev, h) => { bus.set(ev, [...(bus.get(ev) ?? []), h]); };
export const emit = (ev, d) => (bus.get(ev) ?? []).forEach(h => h(d));
export const MAX_QTY = 30, MAX_LINES = 40;
const sigOf = (l) => {
    if (l.kind === 'item')
        return `i:${l.item}:${l.size ?? ''}:${(l.extras ?? []).slice().sort().join(',')}`;
    if (l.kind === 'burger')
        return `b:${l.burger.bun}:${l.burger.fill.join(',')}`;
    if (l.kind === 'set')
        return `s:${l.set.drink}:${l.set.burger}:${l.set.pct}`;
    if (l.kind === 'wrap') {
        const w = l.wrap;
        return `w:${w.base}:${w.meat}:${w.double ? 2 : 1}:${w.add.slice().sort().join(',')}:${w.sauces.slice().sort().join(',')}`;
    }
    if (l.kind === 'hotdog') {
        const h = l.hotdog;
        return `h:${h.bun}:${h.sausage}:${h.xl ? 'xl' : ''}:${h.tops.slice().sort().join(',')}:${h.sauces.slice().sort().join(',')}`;
    }
    const c = l.coffee;
    return `c:${[c.temp, c.size, c.shots, c.milk, c.milkAmt, c.foam, c.syrup, c.topping].join(',')}`;
};
function sanitize(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const r of raw.slice(0, MAX_LINES)) {
        if (!r || typeof r !== 'object')
            continue;
        const o = r;
        const qty = Math.min(MAX_QTY, Math.max(1, Math.round(Number(o.qty) || 1)));
        const who = Number.isInteger(o.who) ? Math.max(-1, Math.min(7, Number(o.who))) : -1;
        let base = null;
        if (o.kind === 'item' && typeof o.item === 'string' && ITEM(o.item)) {
            const it = ITEM(o.item);
            const size = it.sized && SIZES.some(s => s.id === o.size) ? o.size : it.sized ? 'M' : undefined;
            const extras = Array.isArray(o.extras) ? o.extras.filter(e => (it.extras ?? []).includes(e)) : [];
            base = { kind: 'item', item: it.id, size, extras };
        }
        else if (o.kind === 'burger') {
            const b = sanitizeBurger(o.burger);
            if (b && b.fill.length)
                base = { kind: 'burger', burger: b };
        }
        else if (o.kind === 'coffee') {
            const c = sanitizeCoffee(o.coffee);
            if (c)
                base = { kind: 'coffee', coffee: c };
        }
        else if (o.kind === 'wrap') {
            const w = sanitizeWrap(o.wrap);
            if (w)
                base = { kind: 'wrap', wrap: w };
        }
        else if (o.kind === 'hotdog') {
            const h = sanitizeHotdog(o.hotdog);
            if (h)
                base = { kind: 'hotdog', hotdog: h };
        }
        else if (o.kind === 'set' && o.set && typeof o.set === 'object') {
            const st = o.set;
            if (SET_DRINKS.includes(st.drink) && SET_BURGERS.includes(st.burger) && SET_DISCOUNTS.includes(Number(st.pct)))
                base = { kind: 'set', set: { drink: String(st.drink), burger: String(st.burger), pct: Number(st.pct) } };
        }
        if (base)
            out.push({ ...base, sig: sigOf(base), qty, who });
    }
    return out;
}
export let cart = sanitize(store.get('vc-cart'));
export const saveCart = () => { store.set('vc-cart', cart); emit('cart'); };
export function unitPrice(l) {
    if (l.kind === 'set')
        return setPrice(l.set.drink, l.set.burger, l.set.pct);
    if (l.kind === 'burger')
        return burgerPrice(l.burger);
    if (l.kind === 'coffee')
        return coffeePrice(l.coffee);
    if (l.kind === 'wrap')
        return wrapPrice(l.wrap);
    if (l.kind === 'hotdog')
        return hotdogPrice(l.hotdog);
    const it = ITEM(l.item);
    return it.price + (it.sized ? SIZES.find(s => s.id === l.size)?.add ?? 0 : 0) + (l.extras ?? []).reduce((a, e) => a + EXTRAS[e].price, 0);
}
export function lineName(l) {
    if (l.kind === 'set')
        return `${t('set.name')}: ${ITEM(l.set.drink).name[state.lang]} + ${ITEM(l.set.burger).name[state.lang]}`;
    if (l.kind === 'burger')
        return burgerName(l.burger, state.lang);
    if (l.kind === 'coffee')
        return coffeeName(l.coffee, state.lang);
    if (l.kind === 'wrap')
        return wrapName(l.wrap, state.lang);
    if (l.kind === 'hotdog')
        return hotdogName(l.hotdog, state.lang);
    return ITEM(l.item).name[state.lang];
}
export function lineSub(l) {
    if (l.kind === 'set')
        return `${ITEM(l.set.drink).sized ? 'M · ' : ''}${tf('set.off', { p: l.set.pct })}`;
    if (l.kind === 'burger')
        return `${t('lab.custom')} · ${l.burger.fill.length} ${t('lab.layersShort')}`;
    if (l.kind === 'coffee')
        return `${t('lab.custom')} · ${l.coffee.size} · ${t('lab.temp.' + l.coffee.temp)}`;
    if (l.kind === 'wrap') {
        const w = l.wrap;
        return [t('lab.custom'), ...w.add.map(a => WRAP_ADDS.find(p => p.id === a).name[state.lang]), ...w.sauces.map(a => WRAP_SAUCES.find(p => p.id === a).name[state.lang])].join(' · ');
    }
    if (l.kind === 'hotdog') {
        const h = l.hotdog;
        return [t('lab.custom'), BUNS.find(b => b.id === h.bun)?.name[state.lang] ?? '', ...h.tops.map(a => HD_TOPS.find(p => p.id === a).name[state.lang]), ...h.sauces.map(a => HD_SAUCES.find(p => p.id === a).name[state.lang])].join(' · ');
    }
    const parts = [];
    if (l.size)
        parts.push(l.size);
    (l.extras ?? []).forEach(e => parts.push('+ ' + EXTRAS[e].name[state.lang]));
    return parts.join(' · ');
}
export function lineArt(l) {
    if (l.kind === 'set')
        return { k: 'combo', parts: [ITEM(l.set.drink).art, ITEM(l.set.burger).art] };
    if (l.kind === 'burger')
        return burgerArt(l.burger);
    if (l.kind === 'coffee')
        return coffeeArt(l.coffee);
    if (l.kind === 'wrap')
        return wrapArt(l.wrap);
    if (l.kind === 'hotdog')
        return hotdogArt(l.hotdog);
    return ITEM(l.item).art;
}
export function linePrep(l) {
    if (l.kind === 'set')
        return Math.max(ITEM(l.set.drink).prep, ITEM(l.set.burger).prep);
    if (l.kind === 'burger')
        return burgerPrep(l.burger);
    if (l.kind === 'coffee')
        return coffeePrep(l.coffee);
    if (l.kind === 'wrap')
        return wrapPrep(l.wrap);
    if (l.kind === 'hotdog')
        return hotdogPrep(l.hotdog);
    return ITEM(l.item).prep;
}
export const isCoffeeLine = (l) => l.kind === 'coffee' || (l.kind === 'set' && l.set.drink !== 'matcha') || (l.kind === 'item' && ['coffee', 'cold'].includes(ITEM(l.item).cat) && ITEM(l.item).id !== 'soda' && !ITEM(l.item).id.includes('lemonade'));
export const subtotal = () => cart.reduce((a, l) => a + unitPrice(l) * l.qty, 0);
export const count = () => cart.reduce((a, l) => a + l.qty, 0);
export function addLine(base, qty = 1, from) {
    const sig = sigOf(base);
    const ex = cart.find(l => l.sig === sig);
    if (ex)
        ex.qty = Math.min(MAX_QTY, ex.qty + qty);
    else {
        if (cart.length >= MAX_LINES) {
            toast(t('cart.full'));
            return false;
        }
        cart.push({ ...base, sig, qty: Math.min(MAX_QTY, qty), who: -1 });
    }
    saveCart();
    if (from)
        flyToCart(from, lineVisual(base, 200));
    return true;
}
export function setCart(next) { cart = next; saveCart(); }
/** Adds previously saved lines (e.g. the last order) after checking them like a stored cart. Returns how many items were added. */
export function addSavedLines(raw) {
    let n = 0;
    for (const l of sanitize(raw)) {
        const { sig: _s, qty, who: _w, ...base } = l;
        if (addLine(base, qty))
            n += qty;
    }
    return n;
}
/* ---------- photos (with the drawn illustration as fallback) ---------- */
export function itemPic(it, w, alt = '', eager = false) {
    if (!it.photo)
        return svg(it.art, 'art', alt);
    return `<img class="ph" src="${photoURL(it.photo, w)}" srcset="${photoURL(it.photo, w)} 1x, ${photoURL(it.photo, w * 2)} 2x" alt="${esc(alt)}" ${eager ? '' : 'loading="lazy"'} decoding="async" data-fb="${it.id}">`;
}
export function lineVisual(l, w) {
    return l.kind === 'item' ? itemPic(ITEM(l.item), w) : svg(lineArt(l));
}
document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.fb)
        return;
    const it = ITEM(img.dataset.fb);
    if (it)
        img.outerHTML = svg(it.art, 'art', img.alt);
}, true);
document.addEventListener('load', e => { const img = e.target; if (img instanceof HTMLImageElement && img.classList.contains('ph'))
    img.classList.add('in'); }, true);
/* ---------- fly to cart ---------- */
export function flyToCart(from, artSvg) {
    const btn = $('#cartBtn');
    const bump = () => { btn.classList.remove('gulp'); void btn.offsetWidth; btn.classList.add('gulp'); };
    if (reduced) {
        bump();
        return;
    }
    const a = from.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'flyer';
    el.innerHTML = artSvg;
    const size = 92;
    el.style.cssText = `left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px;width:${size}px;height:${size}px`;
    document.body.appendChild(el);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const arc = Math.min(-120, dy * .5 - 160);
    const anim = el.animate([
        { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
        { transform: `translate(${dx * .45}px, ${arc}px) scale(.9) rotate(-160deg)`, opacity: 1, offset: .5 },
        { transform: `translate(${dx}px, ${dy}px) scale(.18) rotate(-330deg)`, opacity: .4 },
    ], { duration: 820, easing: 'cubic-bezier(.45,0,.3,1)' });
    anim.onfinish = () => { el.remove(); bump(); };
}
/* ---------- toast ---------- */
let toastTimer = 0;
export function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600);
}
/* ---------- overlays (dialogs and drawer) ---------- */
const stack = [];
const focusBack = new Map();
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])';
export function openOverlay(el) {
    if (stack.includes(el))
        return;
    focusBack.set(el, document.activeElement);
    stack.push(el);
    el.hidden = false;
    requestAnimationFrame(() => { el.classList.add('open'); (el.querySelector('[data-autofocus]') ?? el.querySelector(FOCUSABLE))?.focus({ preventScroll: true }); });
    document.documentElement.classList.add('locked');
    emit('overlay');
}
export function closeOverlay(el) {
    const i = stack.indexOf(el);
    if (i < 0)
        return;
    stack.splice(i, 1);
    el.classList.remove('open');
    setTimeout(() => { if (!stack.includes(el))
        el.hidden = true; }, reduced ? 0 : 380);
    if (!stack.length)
        document.documentElement.classList.remove('locked');
    focusBack.get(el)?.focus?.({ preventScroll: true });
    emit('overlay');
}
export const topOverlay = () => stack[stack.length - 1];
/** Puts overlays back in a consistent state: anything that isn't open is hidden, and the page is unlocked when nothing is. */
function heal() {
    document.querySelectorAll('.modal, .drawer').forEach(m => { if (!stack.includes(m) && !m.classList.contains('open'))
        m.hidden = true; });
    if (!stack.length && !document.querySelector('.modal.open, .drawer.open'))
        document.documentElement.classList.remove('locked');
    if (!document.querySelector('.afk.on'))
        document.documentElement.classList.remove('afk-on');
    document.getElementById('wipe')?.classList.remove('on');
}
addEventListener('pageshow', heal);
document.addEventListener('visibilitychange', () => { if (!document.hidden)
    heal(); });
document.addEventListener('keydown', e => {
    const top = topOverlay();
    if (!top)
        return;
    if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay(top);
    }
    if (e.key === 'Tab') {
        const f = Array.from(top.querySelectorAll(FOCUSABLE)).filter(x => x.offsetParent !== null);
        if (!f.length)
            return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});
/* ---------- time (Tashkent) ---------- */
export function tashkentNow() {
    const now = new Date();
    return new Date(now.getTime() + (now.getTimezoneOffset() + 300) * 60000);
}
export const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const ddmmyyyy = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
/* ---------- animation helper ---------- */
export function tween(ms, step, done) {
    if (reduced || ms <= 0) {
        step(1);
        done?.();
        return () => { };
    }
    const t0 = performance.now();
    let raf = 0, stopped = false;
    const tick = (now) => { if (stopped)
        return; const k = clamp((now - t0) / ms); step(k); if (k < 1)
        raf = requestAnimationFrame(tick);
    else
        done?.(); };
    raf = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(raf); };
}
