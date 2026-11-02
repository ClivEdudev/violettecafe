import { CAFE, CATS, ITEMS, ITEM, SIZES, EXTRAS, BUNS, FILLINGS, WRAP_BASES, WRAP_MEATS, WRAP_ADDS, WRAP_SAUCES, HD_SAUSAGES, HD_TOPS, HD_SAUCES, ZONES, MIN_DELIVERY, FRIDAY_EVERY, isVeg, isSpicy, allergens } from './data.js';
import { svg, REAL_DEFS } from './art.js';
import { initScroll } from './scroll.js';
import { initAfk, showOrder } from './afk.js';
import { initPerf } from './perf.js';
import { initTrack, startTrack, openTrack, langTrack, onStatus, statusTitle, unlockSound, mountNotify } from './track.js';
document.body.insertAdjacentHTML('afterbegin', REAL_DEFS);
import { $, $$, clamp, ease, reduced, finePointer, esc, store, state, t, tf, money, plural, on, emit, cart, saveCart, setCart, addLine, unitPrice, lineName, lineSub, linePrep, subtotal, count, toast, openOverlay, closeOverlay, tashkentNow, hhmm, ddmmyyyy, pad, isLang, itemPic, lineVisual, addSavedLines, } from './shared.js';
import { initLab } from './lab.js';
import { initBudget } from './budget.js';
import { buildHero, updateHero as drawHero, renderHeroTexts, addDeal } from './hero.js';
const root = document.documentElement;
const sysDark = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');
function paintTheme(th) {
    root.dataset.theme = th;
    $('#themeBtn').setAttribute('aria-pressed', String(th === 'dark'));
    $('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#141010' : '#FAF7F6');
}
function setTheme(next, origin) {
    store.set('vc-theme', next);
    const doc = document;
    if (!doc.startViewTransition || reduced || !origin) {
        paintTheme(next);
        return;
    }
    const r = origin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = doc.startViewTransition(() => paintTheme(next));
    vt.ready.then(() => root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 650, easing: 'cubic-bezier(.6,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => { });
}
paintTheme(currentTheme());
$('#themeBtn').addEventListener('click', e => setTheme(currentTheme() === 'dark' ? 'light' : 'dark', e.currentTarget));
sysDark.addEventListener('change', e => { if (store.get('vc-theme') !== 'light' && store.get('vc-theme') !== 'dark')
    paintTheme(e.matches ? 'dark' : 'light'); });
/* =============== language =============== */
function splitWords(el) {
    const words = (el.textContent ?? '').trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
}
function applyLang() {
    root.lang = state.lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); if (el.hasAttribute('data-split'))
        splitWords(el); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $$('[data-i18n-ph]').forEach(el => (el.placeholder = t(el.dataset.i18nPh)));
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    document.title = { uz: 'FFS — Fresh Fried Soul, Andijon', ru: 'FFS — Fresh Fried Soul, Андижан', en: 'FFS — Fresh Fried Soul, Andijan' }[state.lang];
    emit('lang');
}
$$('.lang button').forEach(b => b.addEventListener('click', () => {
    const l = b.dataset.lang;
    if (!isLang(l) || l === state.lang)
        return;
    state.lang = l;
    store.set('vc-lang', l);
    applyLang();
}));
/* =============== header, progress, mobile menu =============== */
const menuBtn = $('#menuBtn'), menu = $('#menu');
function setMenu(open) {
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    root.classList.toggle('menu-open', open);
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
$$('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open'))
    setMenu(false); });
/* =============== open status & greeting =============== */
const hourStr = (h) => `${pad(h % 24)}:00`;
function renderStatus() {
    const now = tashkentNow(), h = now.getHours() + now.getMinutes() / 60;
    const open = h >= CAFE.open && h < CAFE.close;
    const pill = $('#openPill');
    pill.classList.toggle('closed', !open);
    $('span', pill).textContent = open ? tf('open.now', { t: hourStr(CAFE.close) }) : tf('open.closed', { t: hourStr(CAFE.open) });
    const g = h < 5 ? 'night' : h < 11.5 ? 'morning' : h < 17 ? 'day' : h < 22.5 ? 'evening' : 'late';
    $('#greet').textContent = t('greet.' + g);
    $('#hoursV').textContent = tf('visit.hoursV', { o: hourStr(CAFE.open), c: hourStr(CAFE.close) });
}
setInterval(renderStatus, 60000);
/* =============== HERO: one of the shop's real deals, made piece by piece as you scroll (see hero.ts) =============== */
const scene = $('#scene');
let heroP = -1;
function buildScene() { buildHero(scene); }
function fitScene() { scene.setAttribute('viewBox', innerWidth <= 960 ? '160 34 840 676' : '0 0 1200 800'); }
function updateHero(p) { if (Math.abs(p - heroP) < .0005)
    return; heroP = p; drawHero(p); }
function renderReceipt() { renderHeroTexts(scene); const p = heroP; heroP = -1; updateHero(Math.max(0, p)); }
$('#heroCombo').addEventListener('click', e => addDeal(e.currentTarget));
const hero = $('#top');
function heroProgress() {
    if (reduced)
        return 1;
    const r = hero.getBoundingClientRect();
    const span = hero.offsetHeight - innerHeight;
    return span > 0 ? clamp(-r.top / span) : 1;
}
/* =============== tape =============== */
function renderTape() {
    const words = ['1 kg KFC', 'Boss burger', 'Lavash', 'Hot-dog', 'Fri', 'Crunch duo', 'Donar', 'Turkcha choy', 'Kofe'];
    const seq = words.map((w, i) => `<span class="${i % 2 ? 'tw-a' : 'tw-b'}">${w}</span><svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7" ry="10"/><path d="M12 3c-4 5 4 13 0 18" fill="none" stroke-width="1.8"/></svg>`).join('');
    $('#tape').innerHTML = seq + seq + seq;
}
/* =============== menu =============== */
let world = 'food'; // a fast-food place: food first, drinks one tap away
const view = { cat: 'all', q: '' };
const DIETS = ['veg', 'noNuts', 'noGluten', 'noLactose', 'spicy'];
const diet = new Set();
const favs = new Set((store.get('vc-favs') ?? []).filter((x) => typeof x === 'string' && !!ITEM(x)));
const saveFavs = () => store.set('vc-favs', [...favs]);
const dietOK = (i) => {
    const a = allergens(i);
    return (!diet.has('veg') || isVeg(i)) && (!diet.has('spicy') || isSpicy(i)) && (!diet.has('noNuts') || !a.includes('nuts')) && (!diet.has('noGluten') || !a.includes('gluten')) && (!diet.has('noLactose') || !a.includes('lactose'));
};
const norm = (s) => s.toLowerCase().replace(/[ʻʼ'`’]/g, '').replace(/ё/g, 'е');
function visibleItems() {
    const q = norm(view.q.trim());
    let list = ITEMS.filter(i => (q || view.cat === 'fav' ? true : CATS.find(c => c.id === i.cat).world === world));
    if (!q && view.cat === 'fav')
        list = list.filter(i => favs.has(i.id));
    else if (!q && view.cat !== 'all')
        list = list.filter(i => i.cat === view.cat);
    list = list.filter(dietOK);
    if (q)
        list = list.filter(i => ['uz', 'ru', 'en'].some(l => norm(i.name[l] + ' ' + i.desc[l]).includes(q)));
    return list.sort((a, b) => b.pop - a.pop);
}
function renderChips() {
    const cats = CATS.filter(c => c.world === world);
    if (view.cat === 'fav' && !favs.size)
        view.cat = 'all';
    $('#chips').innerHTML = [`<button role="tab" data-cat="all" aria-selected="${view.cat === 'all'}">${t('menu.all')}</button>`,
        ...(favs.size ? [`<button role="tab" data-cat="fav" class="chip-fav" aria-selected="${view.cat === 'fav'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>${t('fav.chip')} <small>${favs.size}</small></button>`] : []),
        ...cats.map(c => `<button role="tab" data-cat="${c.id}" aria-selected="${view.cat === c.id}">${esc(c.name[state.lang])}</button>`)].join('');
    renderDiet();
    renderLast();
    $('#chips').classList.toggle('dim', !!view.q.trim());
}
function renderDiet() {
    $('#diets').innerHTML = DIETS.map(d => `<button type="button" data-diet="${d}" aria-pressed="${diet.has(d)}"><i class="dot dot-${d}"></i>${t('diet.' + d)}</button>`).join('');
}
function renderLast() {
    const last = store.get('vc-last');
    const btn = $('#repeatLast');
    btn.hidden = !last || !last.n;
    if (last && last.n)
        btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t('last.chip')} <small>${last.at ? ddmmyyyy(new Date(last.at)) : ''} · ${money(last.total ?? 0)}</small>`;
}
const allergenHTML = (i) => { const a = allergens(i); return (isVeg(i) ? `<i class="dt dt-veg" title="${t('diet.veg')}">V</i>` : '') + a.map(x => `<i class="dt dt-${x}" title="${t('diet.' + x)}">${{ nuts: 'N', gluten: 'G', lactose: 'L' }[x]}</i>`).join(''); };
const tagHTML = (tags = []) => tags.map(g => `<span class="tag tag-${g}">${t('tag.' + g)}</span>`).join('');
function cardHTML(i, k) {
    const hot = i.art.k === 'drink' && ['cup', 'small', 'pot'].includes(i.art.d.v);
    return `<article class="card${hot ? ' hot' : ''}" data-id="${i.id}" data-sr="card" style="--k:${k}">
    <button class="card-hit" data-open="${i.id}" aria-label="${esc(i.name[state.lang])} — ${t('card.open')}"></button>
    <div class="card-art">${itemPic(i, 520, i.name[state.lang])}</div>
    <div class="card-tags">${tagHTML(i.tags)}</div>
    <button class="fav" data-fav="${i.id}" aria-pressed="${favs.has(i.id)}" aria-label="${t(favs.has(i.id) ? 'fav.remove' : 'fav.add')}: ${esc(i.name[state.lang])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>
    <h3>${esc(i.name[state.lang])}</h3>
    <p class="card-desc">${esc(i.desc[state.lang])}</p>
    <div class="card-foot">
      <span class="card-meta">${i.kcal} ${t('card.kcal')} · ${i.prep} ${t('card.min')} <span class="dts">${allergenHTML(i)}</span></span>
      <b class="price">${money(i.price)}</b>
      <button class="add" data-add="${i.id}" aria-label="${t('card.add')}: ${esc(i.name[state.lang])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
    </div>
  </article>`;
}
function renderGrid() {
    const list = visibleItems();
    $('#grid').innerHTML = list.map(cardHTML).join('');
    const empty = $('#empty');
    empty.hidden = list.length > 0;
    if (!list.length)
        empty.textContent = view.q.trim() ? tf('menu.empty', { q: view.q.trim() }) : view.cat === 'fav' && !diet.size ? t('fav.empty') : t('menu.emptyFilter');
    if (finePointer && !reduced)
        $$('.card', $('#grid')).forEach(attachTilt);
}
function attachTilt(el) {
    const art = $('.card-art', el);
    el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        art.style.transform = `translate(${x * 14}px, ${y * 10 - 6}px) rotate(${x * 6}deg) scale(1.04)`;
    });
    el.addEventListener('pointerleave', () => { art.style.transform = ''; });
}
function setWorldUI() {
    root.dataset.world = world;
    $$('.world button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.world === world)));
}
const wipePath = $('#wipePath');
let wiping = false;
function wavePath(yTop, yBot, ph) {
    const seg = (y, dir) => { let d = ''; for (let i = 0; i <= 10; i++) {
        const x = dir === 1 ? i * 10 : 100 - i * 10;
        const yy = y + Math.sin(i * .9 + ph) * 3.2;
        d += `${i === 0 ? (dir === 1 ? 'M' : 'L') : 'L'}${x} ${yy} `;
    } return d; };
    return seg(yTop, 1) + seg(yBot, -1) + 'Z';
}
function switchWorld(next) {
    if (next === world || wiping)
        return;
    if (reduced) {
        world = next;
        view.cat = 'all';
        setWorldUI();
        renderChips();
        renderGrid();
        return;
    }
    wiping = true;
    const wipe = $('#wipe');
    wipe.style.setProperty('--wc', next === 'coffee' ? 'var(--violet)' : 'var(--ketchup)');
    wipe.classList.add('on');
    const t0 = performance.now(), D1 = 520, D2 = 560;
    let swapped = false;
    const tick = (now) => {
        const e = now - t0;
        if (e < D1) {
            const k = ease(e / D1);
            wipePath.setAttribute('d', wavePath(124 - k * 140, 130, e / 90));
        }
        else {
            if (!swapped) {
                swapped = true;
                world = next;
                view.cat = 'all';
                setWorldUI();
                renderChips();
                renderGrid();
                const top = $('#menuSec').getBoundingClientRect().top;
                if (top < -10 || top > innerHeight * .5)
                    scrollTo({ top: scrollY + top - 70, behavior: 'instant' });
            }
            const k = ease(Math.min(1, (e - D1) / D2));
            wipePath.setAttribute('d', wavePath(-20, 130 - k * 150, e / 90));
            if (k >= 1) {
                wipe.classList.remove('on');
                wiping = false;
                return;
            }
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
$$('.world button').forEach(b => b.addEventListener('click', () => switchWorld(b.dataset.world)));
$('.world').addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = world === 'coffee' ? 'food' : 'coffee';
        switchWorld(next);
        $(`.world [data-world="${next}"]`).focus();
    }
});
$('#chips').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b)
        return;
    view.cat = b.dataset.cat;
    if (view.q) {
        view.q = '';
        $('#q').value = '';
        $('#qClear').hidden = true;
    }
    renderChips();
    renderGrid();
});
const qIn = $('#q');
let qTimer = 0;
qIn.addEventListener('input', () => { $('#qClear').hidden = !qIn.value; clearTimeout(qTimer); qTimer = window.setTimeout(() => { view.q = qIn.value; renderChips(); renderGrid(); }, 140); });
$('#qClear').addEventListener('click', () => { qIn.value = ''; view.q = ''; $('#qClear').hidden = true; renderChips(); renderGrid(); qIn.focus(); });
$('#grid').addEventListener('click', e => {
    const target = e.target;
    const fv = target.closest('[data-fav]');
    if (fv) {
        const id = fv.dataset.fav, on = !favs.has(id);
        on ? favs.add(id) : favs.delete(id);
        saveFavs();
        fv.setAttribute('aria-pressed', String(on));
        fv.setAttribute('aria-label', `${t(on ? 'fav.remove' : 'fav.add')}: ${ITEM(id).name[state.lang]}`);
        fv.classList.remove('pop');
        void fv.offsetWidth;
        fv.classList.add('pop');
        if (on)
            toast(t('fav.added'));
        renderChips();
        if (view.cat === 'fav' && !on)
            renderGrid();
        return;
    }
    const add = target.closest('[data-add]');
    if (add) {
        const it = ITEM(add.dataset.add);
        addLine({ kind: 'item', item: it.id, size: it.sized ? 'M' : undefined, extras: [] }, 1, add.closest('.card').querySelector('.card-art'));
        add.classList.remove('pop');
        void add.offsetWidth;
        add.classList.add('pop');
        toast(`${it.name[state.lang]} — ${t('card.added').toLowerCase()}`);
        return;
    }
    const open = target.closest('[data-open]');
    if (open)
        openItem(open.dataset.open);
});
/* =============== item dialog =============== */
const im = { id: '', size: 'M', extras: new Set(), qty: 1 };
function imPrice() {
    const it = ITEM(im.id);
    return (it.price + (it.sized ? SIZES.find(s => s.id === im.size).add : 0) + [...im.extras].reduce((a, e) => a + EXTRAS[e].price, 0)) * im.qty;
}
function renderItem() {
    const it = ITEM(im.id);
    $('#imArt').innerHTML = itemPic(it, 760, it.name[state.lang], true);
    $('#imTags').innerHTML = tagHTML(it.tags);
    $('#imName').textContent = it.name[state.lang];
    $('#imDesc').textContent = it.desc[state.lang];
    $('#imMeta').textContent = `${tf('im.kcal', { k: it.kcal })} · ${tf('im.prep', { m: it.prep })}`;
    const al = allergens(it);
    $('#imDiet').innerHTML = `<span class="dts">${allergenHTML(it)}</span>${isVeg(it) ? `<b>${t('diet.veg')}</b>` : ''}${al.length ? `<span>${tf('diet.has', { list: al.map(a => t('diet.' + a)).join(', ') })}</span>` : `<span>${t('diet.free')}</span>`}<small>${t('diet.note')}</small>`;
    $('#imSizes').innerHTML = it.sized ? `<h4>${t('im.size')}</h4><div class="seg" role="radiogroup">${SIZES.map(s => `<button type="button" role="radio" data-size="${s.id}" aria-checked="${im.size === s.id}"><b>${it.role === 'drink' ? s.id : t('size.' + s.id)}</b><small>${it.role === 'drink' ? `${s.ml} ml` : ''}${s.add ? `${it.role === 'drink' ? ' · ' : ''}+${money(s.add)}` : ''}</small></button>`).join('')}</div>` : '';
    $('#imExtras').innerHTML = it.extras?.length ? `<h4>${t('im.extras')}</h4><div class="extras">${it.extras.map(x => `<label class="check"><input type="checkbox" data-extra="${x}" ${im.extras.has(x) ? 'checked' : ''}><i></i><span>${esc(EXTRAS[x].name[state.lang])}</span><small>+${money(EXTRAS[x].price)}</small></label>`).join('')}</div>` : '';
    $('output', $('#imQty')).textContent = String(im.qty);
    $('#imPrice').textContent = money(imPrice());
}
function openItem(id) {
    im.id = id;
    im.size = 'M';
    im.extras = new Set();
    im.qty = 1;
    renderItem();
    openOverlay($('#itemModal'));
}
$('#itemModal').addEventListener('click', e => {
    const tg = e.target;
    if (tg.closest('[data-close]')) {
        closeOverlay($('#itemModal'));
        return;
    }
    const s = tg.closest('[data-size]');
    if (s) {
        im.size = s.dataset.size;
        renderItem();
        $(`[data-size="${im.size}"]`, $('#itemModal')).focus();
    }
    const d = tg.closest('#imQty [data-d]');
    if (d) {
        im.qty = clamp(im.qty + Number(d.dataset.d), 1, 20);
        $('output', $('#imQty')).textContent = String(im.qty);
        $('#imPrice').textContent = money(imPrice());
    }
});
$('#itemModal').addEventListener('change', e => {
    const c = e.target;
    if (c.dataset.extra) {
        c.checked ? im.extras.add(c.dataset.extra) : im.extras.delete(c.dataset.extra);
        $('#imPrice').textContent = money(imPrice());
    }
});
$('#imAdd').addEventListener('click', () => {
    const it = ITEM(im.id);
    addLine({ kind: 'item', item: it.id, size: it.sized ? im.size : undefined, extras: [...im.extras] }, im.qty, $('#imArt'));
    toast(`${it.name[state.lang]} — ${t('card.added').toLowerCase()}`);
    closeOverlay($('#itemModal'));
});
/* =============== cart drawer =============== */
const PCOL = ['#E11D24', '#E11D24', '#F4B731', '#3E8E6A', '#3E6FB8', '#C2185B', '#8A5A3B', '#5C4B4C'];
const split = { on: false, n: 2 };
/** What the kitchen set from Telegram: online orders paused, extra minutes when it's busy. Cached by the CDN. */
const shop = { paused: false, extra: 0, at: 0 };
async function loadShop(force = false) {
    if (!force && Date.now() - shop.at < 20000)
        return;
    try {
        const r = await fetch('/api/telegram?cfg=1');
        if (!r.ok)
            return;
        const j = await r.json();
        shop.paused = !!j.paused;
        shop.extra = Math.max(0, Math.min(180, Number(j.extra) || 0));
        shop.at = Date.now();
    }
    catch { /* keep the last known */ }
}
function eta() {
    const prep = (cart.length ? Math.max(...cart.map(linePrep)) : 0) + shop.extra;
    const load = Math.min(10, Math.floor(count() / 4) * 2);
    const ride = order.method === 'delivery' ? (ZONES.find(z => z.id === order.zone) ?? ZONES[0]).mins : 0;
    return new Date(tashkentNow().getTime() + (prep + 5 + load + ride) * 60000);
}
function renderCart() {
    const c = count();
    const badge = $('#cartCount');
    badge.hidden = c === 0;
    badge.textContent = String(c);
    $('#cartBtn').setAttribute('aria-label', `${t('aria.cart')}: ${c}`);
    const empty = cart.length === 0;
    $('#cartEmpty').hidden = !empty;
    $('#cartFoot').hidden = empty;
    $('#split').hidden = cart.length < 1;
    $('#lines').innerHTML = cart.map((l, i) => `<li class="line" data-i="${i}">
      <div class="ln-art">${lineVisual(l, 140)}</div>
      <div class="ln-main"><b>${esc(lineName(l))}</b><small>${esc(lineSub(l))}</small>
        <div class="ln-row">
          <div class="stepper sm"><button type="button" data-q="-1" aria-label="${t('aria.less')}">−</button><output>${l.qty}</output><button type="button" data-q="1" aria-label="${t('aria.more')}">+</button></div>
          <span class="ln-price">${money(unitPrice(l) * l.qty)}</span>
        </div>
      </div>
      ${split.on ? `<button type="button" class="who" data-who style="--pc:${l.who >= 0 && l.who < split.n ? PCOL[l.who] : 'transparent'}" aria-label="${l.who >= 0 && l.who < split.n ? tf('split.pays', { n: l.who + 1 }) : t('split.shared')}">${l.who >= 0 && l.who < split.n ? l.who + 1 : '∗'}</button>` : ''}
      <button type="button" class="rm" data-rm aria-label="${t('aria.remove')}">×</button>
    </li>`).join('');
    $('#cartSub').textContent = money(subtotal());
    const near = ZONES[0], sub = subtotal(), toFree = Math.max(0, near.freeFrom - sub), short = Math.max(0, MIN_DELIVERY - sub);
    $('#cartDeliv').innerHTML = `<div class="dv-row"><span>${t('cart.delivery')}</span><b>${toFree ? tf('cart.delivFrom', { s: money(Math.min(...ZONES.map(z => z.fee))) }) : t('rv.free')}</b></div>
    <div class="dv-bar"><i style="width:${Math.min(100, (sub / near.freeFrom) * 100)}%"></i></div>
    <small>${short ? tf('cart.minDelivery', { s: money(MIN_DELIVERY), d: money(short) }) : toFree ? tf('cart.toFree', { s: money(toFree) }) : t('cart.freeOk')} · ${t('cart.pickupFree')}</small>`;
    const last = store.get('vc-last');
    $('#cartLast').hidden = !last || !last.n;
    if (last && last.n)
        $('#cartLast').innerHTML = `<div><b>${t('last.title')}</b><small>${last.at ? ddmmyyyy(new Date(last.at)) + ' · ' : ''}${last.n} ${plural(last.n, 'items')} · ${money(last.total ?? 0)}</small></div><button type="button" class="btn btn-mini" data-repeat>${t('last.repeat')}</button>`;
    if (acceptingNow())
        $('#cartEta').textContent = tf('cart.eta', { t: hhmm(eta()) });
    else {
        const s = timeSlots();
        $('#cartEta').textContent = tf('cart.closedEta', { t: timeInline(s.slots[0] ?? hourStr(CAFE.open), s.tomorrow) });
    }
    renderSplit();
    renderStamps();
}
function splitShares() {
    const shares = Array(split.n).fill(0);
    let shared = 0;
    cart.forEach(l => { const v = unitPrice(l) * l.qty; if (l.who >= 0 && l.who < split.n)
        shares[l.who] += v;
    else
        shared += v; });
    return shares.map(s => s + shared / split.n);
}
function renderSplit() {
    $('#splitOn').checked = split.on;
    $('#splitBody').hidden = !split.on;
    $('output', $('#splitN')).textContent = String(split.n);
    if (!split.on)
        return;
    $('#splitRes').innerHTML = splitShares().map((s, i) => `<div style="--pc:${PCOL[i]}"><i>${i + 1}</i><b>${money(Math.ceil(s / 500) * 500)}</b></div>`).join('');
}
/** Friday deal: dishes in the cart (drinks, sides and desserts don't count) and how many extra the order earns. */
const isFriday = () => tashkentNow().getDay() === 5;
const dishCount = () => cart.reduce((a, l) => a + (l.kind !== 'item' || ITEM(l.item).role === 'main' ? l.qty : 0), 0);
const fridayGifts = () => (isFriday() ? Math.floor(dishCount() / FRIDAY_EVERY) : 0);
function renderStamps() {
    const n = dishCount(), have = n % FRIDAY_EVERY, gifts = fridayGifts();
    $('#stamps').innerHTML = `<div class="st-head"><b>${t('fri.title')}</b><small>${!isFriday() ? tf('fri.other', { n: FRIDAY_EVERY }) : gifts && !have ? tf('fri.got', { g: gifts }) : tf('fri.more', { k: FRIDAY_EVERY - have, g: gifts })}</small></div>
    <div class="st-cups fri">${Array.from({ length: FRIDAY_EVERY + 1 }, (_, i) => `<span class="${isFriday() && (i < have || (gifts && !have)) ? 'got' : ''}${i === FRIDAY_EVERY ? ' gift' : ''}"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 70 q-14 -2 -14 -20 q0 -22 22 -26 q22 -2 34 12 q8 10 2 22 q-6 12 -22 14z" fill="currentColor"/><path d="M62 66 l14 10 q6 2 6 -4 q4 -2 0 -6 l-12 -8" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg></span>`).join('')}</div>`;
}
$('#cartBtn').addEventListener('click', () => { renderCart(); openOverlay($('#cart')); });
$('#cart').addEventListener('click', e => {
    const tg = e.target;
    if (tg.closest('[data-close]')) {
        closeOverlay($('#cart'));
        return;
    }
    if (tg.closest('[data-repeat]')) {
        repeatLast();
        return;
    }
    const li = tg.closest('.line');
    if (li) {
        const i = Number(li.dataset.i), l = cart[i];
        const q = tg.closest('[data-q]');
        if (q) {
            l.qty = clamp(l.qty + Number(q.dataset.q), 1, 30);
            saveCart();
            return;
        }
        if (tg.closest('[data-who]')) {
            l.who = l.who + 1 >= split.n ? -1 : l.who + 1;
            saveCart();
            $(`.line[data-i="${i}"] [data-who]`)?.focus();
            return;
        }
        if (tg.closest('[data-rm]')) {
            const done = () => { setCart(cart.filter((_, k) => k !== i)); toast(t('cart.removed')); const next = $('#lines .rm') ?? $('#cart .x'); next?.focus(); };
            if (reduced)
                done();
            else {
                li.classList.add('out');
                setTimeout(done, 260);
            }
        }
    }
    const sn = tg.closest('#splitN [data-d]');
    if (sn) {
        split.n = clamp(split.n + Number(sn.dataset.d), 2, 8);
        renderCart();
    }
});
/** The order as the kitchen needs it: always in Uzbek, with every custom build spelled out. */
function kitchenLines() {
    const was = state.lang;
    state.lang = 'uz';
    const nm = (list, id) => list.find(p => p.id === id)?.name.uz ?? id;
    const counted = (ids, list) => {
        const out = [];
        ids.forEach((id, i) => { if (ids.indexOf(id) !== i)
            return; const c = ids.filter(x => x === id).length; out.push(nm(list, id) + (c > 1 ? ` ×${c}` : '')); });
        return out;
    };
    try {
        return cart.map(l => {
            const d = [];
            if (l.kind === 'burger') {
                const b = l.burger;
                d.push(`Non: ${nm(BUNS, b.bun)}`, `Pastdan yuqoriga: ${b.fill.map(f => nm(FILLINGS, f)).join(' → ') || '—'}`);
            }
            else if (l.kind === 'coffee') {
                const c = l.coffee;
                d.push(`${c.size} · ${t('lab.temp.' + c.temp)} · ${c.shots} shot`);
                d.push(c.milk === 'none' ? t('milk.none') : `${t('milk.' + c.milk)} ${c.milkAmt}%${c.temp === 'hot' && c.foam !== 'none' ? ` · koʻpik: ${t('foam.' + c.foam).toLowerCase()}` : ''}`);
                if (c.syrup !== 'none')
                    d.push(`Sirop: ${t('syrup.' + c.syrup)}`);
                if (c.topping !== 'none')
                    d.push(`Ustiga: ${t('top.' + c.topping)}`);
            }
            else if (l.kind === 'wrap') {
                const w = l.wrap;
                d.push(`${nm(WRAP_BASES, w.base)} · ${nm(WRAP_MEATS, w.meat)}${w.double ? ' ×2' : ''}`);
                if (w.add.length)
                    d.push(counted(w.add, WRAP_ADDS).join(', '));
                if (w.sauces.length)
                    d.push(`Sous: ${counted(w.sauces, WRAP_SAUCES).join(', ')}`);
            }
            else if (l.kind === 'hotdog') {
                const h = l.hotdog;
                d.push(`${nm(BUNS, h.bun)} non · ${nm(HD_SAUSAGES, h.sausage)} sosiska${h.xl ? ' XL' : ''}`);
                if (h.tops.length)
                    d.push(counted(h.tops, HD_TOPS).join(', '));
                if (h.sauces.length)
                    d.push(`Sous: ${counted(h.sauces, HD_SAUCES).join(', ')}`);
            }
            else if (l.kind === 'set') {
                d.push(`${ITEM(l.set.burger).name.uz} + ${ITEM(l.set.drink).name.uz}${ITEM(l.set.drink).sized ? ' (M)' : ''}`);
            }
            else {
                if (l.size)
                    d.push(`Hajmi: ${l.size}`);
                (l.extras ?? []).forEach(e => d.push('+ ' + EXTRAS[e].name.uz));
                if (l.item === 'kfc-1kg')
                    d.push(t('promo.kfcGift'));
            }
            const custom = ['burger', 'coffee', 'wrap', 'hotdog'].includes(l.kind ?? '');
            return { q: l.qty, n: lineName(l), c: custom, d, p: unitPrice(l) * l.qty, w: split.on && l.who >= 0 && l.who < split.n ? l.who + 1 : 0 };
        });
    }
    finally {
        state.lang = was;
    }
}
function repeatLast() {
    const last = store.get('vc-last');
    const n = addSavedLines(last?.lines);
    toast(n ? t('last.added') : t('last.none'));
}
$('#repeatLast').addEventListener('click', e => { repeatLast(); const b = e.currentTarget; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
$('#diets').addEventListener('click', e => {
    const b = e.target.closest('[data-diet]');
    if (!b)
        return;
    const d = b.dataset.diet;
    diet.has(d) ? diet.delete(d) : diet.add(d);
    if (d === 'veg' && diet.has('veg'))
        diet.delete('spicy');
    if (d === 'spicy' && diet.has('spicy'))
        diet.delete('veg');
    renderDiet();
    renderGrid();
    $(`[data-diet="${d}"]`).focus();
});
$('#splitOn').addEventListener('change', e => { split.on = e.target.checked; renderCart(); });
$('#toCheckout').addEventListener('click', () => { closeOverlay($('#cart')); openCheckout(); });
on('cart', renderCart);
const params = new URLSearchParams(location.search);
const tableParam = (params.get('stol') ?? params.get('table') ?? '').replace(/\D/g, '').slice(0, 3);
const saved = (store.get('vc-contact') ?? {});
const order = {
    step: 1, method: (tableParam ? 'table' : 'pickup'), zone: 'near', table: tableParam,
    name: typeof saved.name === 'string' ? saved.name.slice(0, 60) : '', phone: typeof saved.phone === 'string' ? saved.phone.replace(/\D/g, '').slice(0, 9) : '',
    address: typeof saved.address === 'string' ? saved.address.slice(0, 160) : '', time: 'asap', tomorrow: false, payment: 'cash', comment: '',
};
const phoneDigits = (raw) => { let d = raw.replace(/\D/g, ''); if (d.length > 9 && d.startsWith('998'))
    d = d.slice(3); return d.slice(0, 9); };
const fmtPhone = (raw) => { const d = phoneDigits(raw); return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' '); };
function bindPhone(el) {
    el.addEventListener('input', () => {
        const before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;
        el.value = fmtPhone(el.value);
        let pos = 0, seen = 0;
        while (pos < el.value.length && seen < before) {
            if (/\d/.test(el.value[pos]))
                seen++;
            pos++;
        }
        el.setSelectionRange(pos, pos);
    });
}
const deliveryFee = () => { if (order.method !== 'delivery')
    return 0; const z = ZONES.find(z => z.id === order.zone) ?? ZONES[0]; return subtotal() >= z.freeFrom ? 0 : z.fee; };
const orderTotal = () => subtotal() + deliveryFee();
/** "As soon as possible" orders are taken until the last-order time (23:40). */
function acceptingNow() { const n = tashkentNow(), h = n.getHours() + n.getMinutes() / 60; return h >= CAFE.open && h < CAFE.lastOrder; }
/** Times to choose from: today's if there are any left, otherwise tomorrow's from opening (never while the cafe is closed). */
function timeSlots() {
    const now = tashkentNow();
    const lead = order.method === 'delivery' ? 45 : 20;
    const build = (day, from) => {
        const open = new Date(day);
        open.setHours(CAFE.open, 0, 0, 0);
        let d = new Date(Math.max(from.getTime(), open.getTime() + lead * 60000));
        d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
        const out = [];
        for (; out.length < 9; d = new Date(d.getTime() + 15 * 60000)) {
            const h = d.getHours() + d.getMinutes() / 60;
            if (d.getDate() !== day.getDate() || h > CAFE.close - .25)
                break;
            out.push(hhmm(d));
        }
        return out;
    };
    const today = build(now, new Date(now.getTime() + lead * 60000));
    if (today.length)
        return { slots: today, tomorrow: false };
    const tm = new Date(now);
    tm.setDate(tm.getDate() + 1);
    tm.setHours(0, 0, 0, 0);
    return { slots: build(tm, tm), tomorrow: true };
}
const timeLabel = (time, tomorrow) => (tomorrow ? `${t('time.tomorrow')}, ${time}` : time);
/** "tomorrow at 08:45" inside a sentence. */
const timeInline = (time, tomorrow) => (tomorrow ? tf('time.tomorrowAt', { t: time }) : time);
function renderCheckout() {
    $$('#coSteps li').forEach((li, i) => { li.classList.toggle('on', i + 1 === order.step); li.classList.toggle('done', i + 1 < order.step); });
    $$('.co-step').forEach(s => (s.hidden = Number(s.dataset.step) !== order.step));
    $('#coBack').hidden = order.step === 1;
    $('#coNext').textContent = order.step === 3 ? t('co.send') : t('co.next');
    $('#coErr').textContent = '';
    if (order.step === 1) {
        const how = ['pickup', 'delivery', 'table'];
        const ico = {
            pickup: '<path d="M6 8h12l-1 12H7z M9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
            delivery: '<path d="M3 16V7h11v9 M14 10h4l3 3v3h-7 M7 18.5a1.5 1.5 0 1 0 0-.01 M17 18.5a1.5 1.5 0 1 0 0-.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
            table: '<path d="M4 9h16 M7 9v10 M17 9v10 M10 5h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
        };
        $('#coHow').innerHTML = how.map(m => `<button type="button" role="radio" data-how="${m}" aria-checked="${order.method === m}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico[m]}</svg><b>${t('how.' + m)}</b><small>${t('how.' + m + 'D')}</small></button>`).join('');
        const x = $('#coHowExtra');
        if (order.method === 'delivery')
            x.innerHTML = `<h4>${t('how.zone')}</h4><div class="zones" role="radiogroup">${ZONES.map(z => `<button type="button" role="radio" data-zone="${z.id}" aria-checked="${order.zone === z.id}"><b>${esc(z.name[state.lang])}</b><small>${money(z.fee)}${Number.isFinite(z.freeFrom) ? ` · ${tf('how.free', { s: money(z.freeFrom) })}` : ''} · ~${z.mins} ${t('card.min')}</small></button>`).join('')}</div>`;
        else if (order.method === 'table')
            x.innerHTML = `<label class="field"><span>${t('how.tableNo')}</span><input id="coTable" inputmode="numeric" maxlength="3" value="${esc(order.table)}"></label>`;
        else
            x.innerHTML = '';
    }
    if (order.step === 2) {
        $('#coName').value = order.name;
        $('#coPhone').value = fmtPhone(order.phone);
        $('#coAddr').value = order.address;
        $('#coComment').value = order.comment;
        $('#coAddrWrap').hidden = order.method !== 'delivery';
        $('#coTimeWrap').hidden = order.method === 'table';
        $('#coTimeLabel').textContent = t(order.method === 'delivery' ? 'time.delivery' : 'time.pickup');
        const { slots, tomorrow } = timeSlots(), asap = acceptingNow();
        order.tomorrow = tomorrow;
        if ((order.time === 'asap' && !asap) || (order.time !== 'asap' && !slots.includes(order.time)))
            order.time = asap ? 'asap' : slots[0] ?? 'asap';
        $('#coTimes').innerHTML = (asap ? ['asap', ...slots] : slots).map(s => `<button type="button" role="radio" data-time="${s}" aria-checked="${order.time === s}">${s === 'asap' ? t('time.asap') : s}</button>`).join('')
            + (asap ? '' : `<p class="time-note">${tf(tomorrow ? 'time.closedTomorrow' : 'time.closedToday', { t: slots[0] ?? '' })}</p>`);
        $('#coPay').innerHTML = ['cash', 'card', 'click'].map(p => `<button type="button" role="radio" data-pay="${p}" aria-checked="${order.payment === p}">${t('pay.' + p)}</button>`).join('');
    }
    if (order.step === 3) {
        const fee = deliveryFee();
        const howLine = order.method === 'table' ? `${t('how.table')} · ${order.table}` : order.method === 'delivery' ? `${t('how.delivery')} · ${(ZONES.find(z => z.id === order.zone) ?? ZONES[0]).name[state.lang]}` : t('how.pickup');
        $('#coReview').innerHTML = `
      <h4>${t('rv.items')}</h4>
      <ul>${cart.map(l => `<li><span>${l.qty} × ${esc(lineName(l))}${lineSub(l) ? `<small>${esc(lineSub(l))}</small>` : ''}</span><b>${money(unitPrice(l) * l.qty)}</b></li>`).join('')}</ul>
      <dl>
        <div><dt>${t('rv.how')}</dt><dd>${esc(howLine)}</dd></div>
        ${order.method !== 'table' ? `<div><dt>${t('rv.time')}</dt><dd>${order.time === 'asap' ? `${t('time.asap')} (~${hhmm(eta())})` : timeLabel(order.time, order.tomorrow)}</dd></div>` : ''}
        ${order.method === 'delivery' ? `<div><dt>${t('rv.delivery')}</dt><dd>${fee ? money(fee) : t('rv.free')}</dd></div>` : ''}
        <div><dt>${t('rv.contact')}</dt><dd>${esc(order.name)}, +998 ${fmtPhone(order.phone)}</dd></div>
        <div class="rv-total"><dt>${t('rv.total')}</dt><dd>${money(orderTotal())}</dd></div>
      </dl>
      <p class="hint">${t('pay.note')}</p>`;
    }
}
function captureStep2() {
    order.name = $('#coName').value.trim();
    order.phone = phoneDigits($('#coPhone').value);
    order.address = $('#coAddr').value.trim();
    order.comment = $('#coComment').value.trim();
}
function openCheckout() {
    if (!cart.length)
        return;
    void loadShop().then(() => { if (shop.paused && !$('#checkout').hidden)
        fail(t('err.paused')); });
    order.step = 1;
    $('#coForm').hidden = false;
    $('#coDone').hidden = true;
    $('#coSteps').hidden = false;
    renderCheckout();
    openOverlay($('#checkout'));
}
$('#checkout').addEventListener('click', e => {
    const tg = e.target;
    if (tg.closest('[data-close]')) {
        closeOverlay($('#checkout'));
        return;
    }
    const h = tg.closest('[data-how]');
    if (h) {
        order.method = h.dataset.how;
        renderCheckout();
        $(`[data-how="${order.method}"]`).focus();
        return;
    }
    const z = tg.closest('[data-zone]');
    if (z) {
        order.zone = z.dataset.zone;
        renderCheckout();
        $(`[data-zone="${order.zone}"]`).focus();
        return;
    }
    const tm = tg.closest('[data-time]');
    if (tm) {
        captureStep2();
        order.time = tm.dataset.time;
        renderCheckout();
        $(`[data-time="${order.time}"]`).focus();
        return;
    }
    const p = tg.closest('[data-pay]');
    if (p) {
        captureStep2();
        order.payment = p.dataset.pay;
        renderCheckout();
        $(`[data-pay="${order.payment}"]`).focus();
    }
});
$('#checkout').addEventListener('input', e => { const el = e.target; if (el.id === 'coTable') {
    el.value = el.value.replace(/\D/g, '').slice(0, 3);
    order.table = el.value;
} });
bindPhone($('#coPhone'));
$('#coBack').addEventListener('click', () => { if (order.step === 2)
    captureStep2(); order.step = Math.max(1, order.step - 1); renderCheckout(); });
const hasLetters = (s) => /\p{L}/u.test(s);
function fail(msg, focus) { $('#coErr').textContent = msg; if (focus)
    $(focus)?.focus(); }
$('#coForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (order.step === 1) {
        if (order.method === 'table' && !order.table)
            return fail(t('err.table'), '#coTable');
        if (order.method === 'delivery' && subtotal() < MIN_DELIVERY)
            return fail(tf('err.minDelivery', { s: money(MIN_DELIVERY), d: money(MIN_DELIVERY - subtotal()) }));
        if (order.method === 'table' && !acceptingNow())
            return fail(t('err.tableClosed'));
        order.step = 2;
        renderCheckout();
        $('#coName').focus();
        return;
    }
    if (order.step === 2) {
        captureStep2();
        if (order.name.length < 2 || !hasLetters(order.name))
            return fail(t('err.name'), '#coName');
        if (order.phone.length !== 9)
            return fail(t('err.phone'), '#coPhone');
        if (order.method === 'delivery' && order.address.length < 5)
            return fail(t('err.address'), '#coAddr');
        store.set('vc-contact', { name: order.name, phone: order.phone, address: order.address });
        order.step = 3;
        renderCheckout();
        $('#coNext').focus();
        return;
    }
    await sendOrder();
});
async function sendBoth(data, signal) {
    let why = '';
    try {
        const r = await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok !== false)
            return { ok: true, live: !!j.live, bot: /^[A-Za-z0-9_]{5,40}$/.test(j.bot ?? '') ? j.bot : '' };
        why = j.error ?? String(r.status);
        // these are answers, not breakdowns: don't route around them
        if (why === 'paused' || why === 'id-taken' || why === 'too-many' || why === 'bad-contact')
            return { ok: false, live: false, bot: '', why };
    }
    catch {
        why = 'network';
    }
    try {
        const nf = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString(), signal });
        return { ok: nf.ok, live: false, bot: '', why };
    }
    catch {
        return { ok: false, live: false, bot: '', why };
    }
}
async function submitForm(data, signal) { return (await sendBoth(data, signal)).ok; }
const ID_ABC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O, 1/I: easy to read out over the phone
const newOrderId = () => 'F' + Array.from(crypto.getRandomValues(new Uint8Array(5)), b => ID_ABC[b % ID_ABC.length]).join('');
let pending = null; // kept until the order goes through
const cartSig = () => JSON.stringify([cart.map(l => [l.sig, l.qty]), order.method, order.name, order.phone, order.address, order.table]);
const trackKey = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
// the "order sent" screen mirrors the kitchen's answer as soon as it comes in
onStatus(x => { const el = document.querySelector('#coDone .co-live'); if (!el)
    return; el.dataset.st = x.st; $('span', el).textContent = statusTitle(x); });
let sending = false;
async function sendOrder() {
    if (sending || !cart.length)
        return;
    // the cafe may have closed while the form was open
    if (order.time === 'asap' && !acceptingNow()) {
        sending = false;
        order.step = order.method === 'table' ? 1 : 2;
        renderCheckout();
        return fail(t(order.method === 'table' ? 'err.tableClosed' : 'err.closedNow'));
    }
    sending = true;
    unlockSound(); // this tap is what allows the "it's ready" chime later
    const btn = $('#coNext');
    btn.disabled = true;
    btn.textContent = t('co.sending');
    void loadShop();
    if (!pending || pending.sig !== cartSig())
        pending = { id: newOrderId(), key: trackKey(), sig: cartSig() };
    const id = pending.id;
    const due = order.method === 'table' || order.time === 'asap' ? hhmm(eta()) : order.time;
    const dueLabel = order.time === 'asap' || order.method === 'table' ? due : timeLabel(due, order.tomorrow);
    const items = cart.map(l => `${l.qty} × ${lineName(l)}${lineSub(l) ? ` (${lineSub(l)})` : ''} — ${money(unitPrice(l) * l.qty)}${split.on && l.who >= 0 && l.who < split.n ? ` [${l.who + 1}]` : ''}`).join('\n');
    const gifts = fridayGifts();
    const itemsText = items + (gifts ? `\n+ ${tf('fri.orderNote', { g: gifts })}` : '');
    const data = {
        'form-name': 'order', 'bot-field': '', order_id: id, method: order.method, table: order.method === 'table' ? order.table : '',
        name: order.name, phone: '+998 ' + fmtPhone(order.phone), address: order.method === 'delivery' ? order.address : '',
        zone: order.method === 'delivery' ? (ZONES.find(z => z.id === order.zone) ?? ZONES[0]).name.uz : '', time: order.time === 'asap' ? `ASAP ~${due}` : `${order.tomorrow ? 'ERTAGA / TOMORROW ' : ''}${order.time}`,
        payment: order.payment, comment: order.comment, items: itemsText, split: split.on ? splitShares().map((s, i) => `${i + 1}: ${money(Math.ceil(s / 500) * 500)}`).join('; ') : '',
        subtotal: String(subtotal()), delivery: String(deliveryFee()), total: String(orderTotal()), lang: state.lang,
        kitchen: JSON.stringify(kitchenLines()), gifts: String(gifts), track_key: pending.key,
    };
    try {
        const ctl = new AbortController();
        const tm = setTimeout(() => ctl.abort(), 12000);
        let res = await sendBoth(data, ctl.signal);
        if (res.why === 'id-taken') { // another order already has this number (very rare): new number, same order
            pending = { id: newOrderId(), key: trackKey(), sig: cartSig() };
            res = await sendBoth({ ...data, order_id: pending.id, track_key: pending.key }, ctl.signal);
        }
        clearTimeout(tm);
        if (res.why === 'paused') {
            shop.paused = true;
            throw new Error('paused');
        }
        if (res.why === 'too-many')
            throw new Error('too-many');
        if (!res.ok)
            throw new Error('send');
        const { live, bot } = res;
        const sentId = pending.id, sentKey = pending.key;
        pending = null;
        store.set('vc-last', { at: Date.now(), n: count(), total: subtotal(), lines: cart.map(({ sig: _s, who: _w, ...l }) => l) });
        const made = cart.map(l => ({ ...l }));
        // the tracker follows only what the kitchen presses in Telegram; without that link there is nothing honest to show
        if (live) {
            const cookMin = Math.max(...made.map(linePrep)) + 5 + Math.min(10, Math.floor(count() / 4) * 2);
            startTrack({ id: sentId, key: sentKey, kind: order.method === 'delivery' ? 'd' : order.method === 'table' ? 't' : 'p', placed: Date.now(), zone: order.zone, address: order.address, total: orderTotal(), lines: made, cookMin, bot });
        }
        setCart([]);
        $('#coForm').hidden = true;
        $('#coSteps').hidden = true;
        const done = $('#coDone');
        done.hidden = false;
        done.innerHTML = `<div class="done-cup" aria-hidden="true">${svg(ITEM('kfc-1kg').art)}</div><h4>${t('done.sent')}</h4>
      <p>${tf('done.no', { id: sentId })}</p>
      ${live ? `<p class="co-live" data-st="new" aria-live="polite"><i aria-hidden="true"></i><span>${t('tk.t.new')}</span></p><p class="hint">${t('done.live')}</p><div class="co-nt" data-nt-slot></div>` : `<p>${tf('done.call', { phone: '+998 ' + fmtPhone(order.phone) })}</p>`}<p class="eta-big">${tf((order.method === 'delivery' ? 'done.etaDelivery' : 'done.eta') + (order.time !== 'asap' && order.method !== 'table' && order.tomorrow ? 'Tm' : ''), { t: due })}</p>
      ${gifts ? `<p class="stamp-plus">${tf('fri.got', { g: gifts })}</p>` : ''}
      ${live ? `<button type="button" class="btn btn-ink tk-done-btn" data-track>${t('tk.open')}</button>` : ''}
      <button type="button" class="watch-btn" data-watch><span class="wb-play" aria-hidden="true"></span><span><b>${t('afk.watch')}</b><small>${t('afk.watchSub')}</small></span></button>
      <button class="btn btn-acc" data-close>${t('done.close')}</button>`;
        $('[data-watch]', done).addEventListener('click', () => showOrder(made, dueLabel));
        const slot = done.querySelector('[data-nt-slot]');
        if (slot)
            mountNotify(slot);
        done.querySelector('[data-track]')?.addEventListener('click', () => { closeOverlay($('#checkout')); setTimeout(openTrack, 250); });
        $('[data-close].btn', done).focus();
    }
    catch (e) {
        const m = e.message;
        fail(t(m === 'paused' ? 'err.paused' : m === 'too-many' ? 'err.tooMany' : 'err.send'));
    }
    finally {
        sending = false;
        btn.disabled = false;
        if (order.step === 3)
            btn.textContent = t('co.send');
    }
}
/* =============== booking =============== */
const bk = { date: '', time: '', guests: 2 };
function renderBooking() {
    const now = tashkentNow();
    const fmt = new Intl.DateTimeFormat(state.lang === 'uz' ? 'uz-UZ' : state.lang === 'ru' ? 'ru-RU' : 'en-GB', { weekday: 'short' });
    const days = [];
    for (let i = 0; i < 14; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        days.push(d);
    }
    if (!bk.date)
        bk.date = ddmmyyyy(days[now.getHours() >= CAFE.close - 2 ? 1 : 0]);
    $('#bkDates').innerHTML = days.map(d => { const v = ddmmyyyy(d); return `<button type="button" role="radio" data-date="${v}" aria-checked="${bk.date === v}"><small>${esc(fmt.format(d))}</small><b>${pad(d.getDate())}/${pad(d.getMonth() + 1)}</b></button>`; }).join('');
    const isToday = bk.date === ddmmyyyy(now);
    const times = [];
    for (let h = CAFE.open + 1; h <= CAFE.close - 1; h++)
        for (const m of [0, 30]) {
            if (h === CAFE.close - 1 && m === 30)
                continue;
            if (isToday && h + m / 60 < now.getHours() + now.getMinutes() / 60 + 1)
                continue;
            times.push(`${pad(h)}:${pad(m)}`);
        }
    if (!times.includes(bk.time))
        bk.time = '';
    $('#bkTimes').innerHTML = times.map(s => `<button type="button" role="radio" data-btime="${s}" aria-checked="${bk.time === s}">${s}</button>`).join('');
    $('output', $('#bkGuests')).textContent = String(bk.guests);
}
$('#bookForm').addEventListener('click', e => {
    const tg = e.target;
    const d = tg.closest('[data-date]');
    if (d) {
        bk.date = d.dataset.date;
        renderBooking();
        $(`[data-date="${bk.date}"]`).focus();
        return;
    }
    const tm = tg.closest('[data-btime]');
    if (tm) {
        bk.time = tm.dataset.btime;
        $$('[data-btime]').forEach(b => b.setAttribute('aria-checked', String(b === tm)));
        return;
    }
    const g = tg.closest('#bkGuests [data-d]');
    if (g) {
        bk.guests = clamp(bk.guests + Number(g.dataset.d), 1, 30);
        $('output', $('#bkGuests')).textContent = String(bk.guests);
        return;
    }
    if (tg.closest('#bkAgain')) {
        $('#bookDone').hidden = true;
        $$('.book-form > :not(#bookDone)').forEach(x => x.classList.remove('gone'));
    }
});
bindPhone($('#bkPhone'));
if (order.name)
    $('#bkName').value = order.name;
if (order.phone)
    $('#bkPhone').value = fmtPhone(order.phone);
$('#bookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#bkErr');
    err.textContent = '';
    const name = $('#bkName').value.trim(), phone = phoneDigits($('#bkPhone').value);
    if (name.length < 2 || !hasLetters(name)) {
        err.textContent = t('err.name');
        $('#bkName').focus();
        return;
    }
    if (phone.length !== 9) {
        err.textContent = t('err.phone');
        $('#bkPhone').focus();
        return;
    }
    if (!bk.date) {
        err.textContent = t('err.date');
        return;
    }
    if (!bk.time) {
        err.textContent = t('err.time');
        $('#bkTimes button')?.focus();
        return;
    }
    const btn = $('#bkSend');
    btn.disabled = true;
    try {
        const body = ({ 'form-name': 'booking', 'bot-field': '', name, phone: '+998 ' + fmtPhone(phone), date: bk.date, time: bk.time, guests: String(bk.guests), comment: $('#bkComment').value.trim(), lang: state.lang });
        if (!(await submitForm(body)))
            throw new Error();
        store.set('vc-contact', { ...(store.get('vc-contact') ?? {}), name, phone });
        $$('.book-form > :not(#bookDone)').forEach(x => x.classList.add('gone'));
        const done = $('#bookDone');
        done.hidden = false;
        done.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/><path class="tick" d="M14 25l7 7 13-15" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p>${esc(tf('book.done', { name, date: bk.date, time: bk.time, g: bk.guests }))}</p><button type="button" class="btn btn-line" id="bkAgain">${t('book.again')}</button>`;
    }
    catch {
        err.textContent = t('err.send');
    }
    finally {
        btn.disabled = false;
    }
});
/* =============== visit =============== */
function renderVisit() {
    // until the cafe's real number is in, show Telegram instead of a placeholder
    const realPhone = /\d{2}\s?\d{3}/.test(CAFE.phone) && !/X/i.test(CAFE.phone);
    const tel = (n) => `<a href="tel:${n.replace(/\s/g, '')}">${esc(n)}</a>`;
    $('#phoneV').innerHTML = realPhone ? [CAFE.phone, CAFE.phone2].filter(Boolean).map(tel).join('<br>') : `<a href="https://t.me/${CAFE.telegram}" target="_blank" rel="noopener">Telegram @${esc(CAFE.telegram)}</a>`;
    const tg = $('#tgLink'), ig = $('#igLink');
    tg.href = `https://t.me/${CAFE.telegram}`;
    tg.textContent = `Telegram @${CAFE.telegram}`;
    ig.href = `https://instagram.com/${CAFE.instagram}`;
    ig.textContent = `Instagram @${CAFE.instagram}`;
    $('#routeLink').href = `https://www.google.com/maps/dir/?api=1&destination=${CAFE.lat},${CAFE.lng}`;
    $('#year').textContent = String(new Date().getFullYear());
}
/* =============== table mode =============== */
function renderTable() {
    const b = $('#tableBanner');
    b.hidden = !order.table || order.method !== 'table';
    if (!b.hidden)
        $('span', b).textContent = tf('table.banner', { n: order.table });
}
$('#tableExit').addEventListener('click', () => { order.table = ''; order.method = 'pickup'; renderTable(); history.replaceState(null, '', location.pathname + location.hash); });
/* =============== reveal (headings) =============== */
function initReveal() {
    if (reduced || !('IntersectionObserver' in window)) {
        $$('[data-split]').forEach(el => el.classList.add('in'));
        return;
    }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
    } }), { threshold: .4 });
    $$('[data-split]').forEach(el => io.observe(el));
}
/* =============== scroll loop =============== */
let ticking = false, tapeW = 0;
function onScroll() {
    if (ticking)
        return;
    ticking = true;
    requestAnimationFrame(() => {
        ticking = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        $('#progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
        root.classList.toggle('scrolled', scrollY > 20);
        const hr = hero.getBoundingClientRect();
        if (hr.bottom > 0)
            updateHero(heroProgress());
        if (!tapeW)
            tapeW = $('#tape').scrollWidth / 3 || 1;
        $('#tape').style.transform = `translate3d(${(-(scrollY * .35) % tapeW).toFixed(1)}px,0,0) skewX(var(--skew, 0deg))`;
    });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { heroP = -1; tapeW = 0; fitScene(); onScroll(); });
/* =============== boot =============== */
on('lang', () => { renderStatus(); renderReceipt(); renderChips(); renderGrid(); renderCart(); renderBooking(); renderTable(); if (!$('#itemModal').hidden && im.id)
    renderItem(); if (!$('#checkout').hidden && !$('#coForm').hidden) {
    if (order.step === 2)
        captureStep2();
    renderCheckout();
} });
initPerf();
buildScene();
renderReceipt();
fitScene();
renderTape();
renderVisit();
setWorldUI();
applyLang();
initLab();
initBudget();
initReveal();
initScroll();
initAfk();
initTrack();
on('lang', langTrack);
if (reduced)
    root.classList.add('reduced');
// iOS Safari brings pages back from its back/forward cache with frozen transitions, a stale scroll state and the pinned
// hero scene unpinned. Instead of patching that state, load the page fresh (from cache, so it's instant).
addEventListener('pageshow', e => { if (e.persisted)
    location.reload(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) {
    heroP = -1;
    fitScene();
    onScroll();
} });
updateHero(heroProgress());
onScroll();
const hideLoader = () => { const l = document.getElementById('loader'); if (!l || l.classList.contains('gone'))
    return; l.classList.add('gone'); setTimeout(() => l.remove(), 700); root.classList.add('ready'); };
if (document.readyState === 'complete')
    setTimeout(hideLoader, 500);
else
    addEventListener('load', () => setTimeout(hideLoader, 400));
setTimeout(hideLoader, 3500);
