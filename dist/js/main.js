import { CAFE, CATS, ITEMS, ITEM, SIZES, EXTRAS, ZONES, STAMPS_FOR_GIFT } from './data.js';
import { svg, steam, LAYERS, bunTop, bunBottom, latteArt } from './art.js';
import { $, $$, clamp, ease, reduced, finePointer, esc, store, state, t, tf, money, on, emit, cart, saveCart, setCart, addLine, unitPrice, lineName, lineSub, linePrep, isCoffeeLine, subtotal, count, toast, openOverlay, closeOverlay, tashkentNow, hhmm, ddmmyyyy, pad, isLang, itemPic, lineVisual, } from './shared.js';
import { initLab } from './lab.js';
import { initBudget } from './budget.js';
const root = document.documentElement;
const sysDark = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');
function paintTheme(th) {
    root.dataset.theme = th;
    $('#themeBtn').setAttribute('aria-pressed', String(th === 'dark'));
    $('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#170D22' : '#F1EAF7');
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
    document.title = { uz: 'Violette — kofe va fast-food, Andijon', ru: 'Violette — кофе и фастфуд, Андижан', en: 'Violette — coffee & fast food, Andijan' }[state.lang];
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
function renderStatus() {
    const now = tashkentNow(), h = now.getHours() + now.getMinutes() / 60;
    const open = h >= CAFE.open && h < CAFE.close;
    const pill = $('#openPill');
    pill.classList.toggle('closed', !open);
    $('span', pill).textContent = open ? tf('open.now', { t: `${pad(CAFE.close)}:00` }) : tf('open.closed', { t: `${pad(CAFE.open)}:00` });
    const g = h < 5 ? 'night' : h < 11.5 ? 'morning' : h < 17 ? 'day' : h < 22.5 ? 'evening' : 'night';
    $('#greet').textContent = t('greet.' + g);
    $('#hoursV').textContent = tf('visit.hoursV', { o: `${pad(CAFE.open)}:00`, c: `${pad(CAFE.close)}:00` });
}
setInterval(renderStatus, 60000);
/* =============== HERO: scroll-driven latte + burger =============== */
const scene = $('#scene');
const HL = ITEM('violette-latte'), HB = ITEM('violette-burger');
const GLASS = { cx: 320, top: 330, bot: 650, wt: 210, wb: 172 };
const BURGER = { cx: 700, base: 648, w: 310, layers: ['bottom', 'sauce', 'beef', 'cheese', 'onion', 'lettuce', 'top'] };
let burgerY = [];
function buildScene() {
    const { cx, top, bot, wt, wb } = GLASS;
    const gp = `M${cx - wt / 2} ${top} L${cx - wb / 2} ${bot - 6} Q${cx} ${bot + 10} ${cx + wb / 2} ${bot - 6} L${cx + wt / 2} ${top}z`;
    let stars = '';
    for (let i = 0; i < 38; i++) {
        const x = (i * 157) % 1200, y = (i * 71) % 300 + 10, r = 1 + (i % 3) * .7;
        stars += `<circle class="star" style="--d:${(i % 7) * .4}s" cx="${x}" cy="${y}" r="${r}"/>`;
    }
    let layersSvg = '', y = BURGER.base;
    burgerY = [];
    BURGER.layers.forEach((id, i) => {
        const L = id === 'bottom' ? bunBottom('violet') : id === 'top' ? bunTop('violet') : LAYERS[id];
        y -= L.h - 4;
        burgerY.push(y);
        layersSvg += `<g class="bl" data-i="${i}"><g class="bl-in">${L.svg(y, BURGER.cx, BURGER.w)}</g></g>`;
    });
    scene.innerHTML = `
    <defs>
      <clipPath id="glassClip"><path d="${gp}"/></clipPath>
      <radialGradient id="discG" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="var(--disc-a)"/><stop offset="1" stop-color="var(--disc-b)"/></radialGradient>
    </defs>
    <g class="sky">${stars}</g>
    <circle id="disc" cx="510" cy="440" r="330" fill="url(#discG)"/>
    <g id="discRing" fill="none" stroke="var(--ring)" stroke-width="2" stroke-dasharray="3 12"><circle cx="510" cy="440" r="372"/></g>
    <text class="neon" x="510" y="128" text-anchor="middle">Violette</text>
    <path class="counter-edge" d="M110 652 H920"/>
    <ellipse cx="${cx}" cy="660" rx="150" ry="16" fill="#2A1440" opacity=".18"/>
    <ellipse cx="${BURGER.cx}" cy="662" rx="200" ry="22" fill="#2A1440" opacity=".14"/>
    <ellipse class="plate" cx="${BURGER.cx}" cy="652" rx="196" ry="26"/>
    <rect id="stream" x="${cx - 7}" y="-20" width="14" height="0" rx="7"/>
    <path d="${gp}" fill="var(--glass)"/>
    <g clip-path="url(#glassClip)">
      <rect id="lqSyrup" x="${cx - 130}" width="260" fill="#B79AD8"/>
      <rect id="lqMilk" x="${cx - 130}" width="260" fill="#F4ECF8"/>
      <rect id="lqCoffee" x="${cx - 130}" width="260" fill="#C69C72"/>
      <rect id="lqFoam" x="${cx - 130}" width="260" fill="#F2E7F8"/>
      <path id="lqWave" fill="none" stroke-width="6" opacity=".55"/>
      <g id="splash"></g>
    </g>
    <g id="heart" opacity="0">${latteArt('heart', cx, 0, 2.2, '#9D7BD1')}</g>
    <path d="${gp}" fill="none" stroke="#2A1440" stroke-width="5" stroke-linejoin="round"/>
    <path d="M${cx - wt / 2 + 18} ${top + 30} L${cx - wb / 2 + 14} ${bot - 40}" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".55"/>
    <ellipse cx="${cx}" cy="${top}" rx="${wt / 2}" ry="10" fill="none" stroke="#2A1440" stroke-width="5"/>
    <g id="glassBadge"><rect x="${cx - 52}" y="${top + 150}" width="104" height="62" rx="31" fill="#FBF8FD" stroke="#2A1440" stroke-width="4"/>
      <text x="${cx}" y="${top + 192}" text-anchor="middle" class="badge-v">V</text></g>
    <g id="heroSteam" opacity="0">${steam(cx, top - 26, 1.4)}</g>
    <g id="burger">${layersSvg}</g>
    <g id="crumbs"></g>
    <g class="sparkle" id="sparkles" opacity="0">${[[880, 380], [560, 400], [900, 520], [540, 290]].map(([x, yy], i) => `<path style="--d:${i * .3}s" d="M${x} ${yy - 14} l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#F4B731"/>`).join('')}</g>`;
}
function fitScene() { scene.setAttribute('viewBox', innerWidth <= 960 ? '150 170 790 540' : '0 0 1200 800'); }
const stageKeys = ['hero.s0', 'hero.s1', 'hero.s2', 'hero.s3', 'hero.s4', 'hero.s5', 'hero.s6'];
let stageIdx = -1, heroP = -1;
function setAttrs(el, a) { for (const k in a)
    el.setAttribute(k, String(a[k])); }
function updateHero(p) {
    if (Math.abs(p - heroP) < .0005)
        return;
    heroP = p;
    const { cx, top, bot } = GLASS;
    const floor = bot + 4, inner = bot - top - 22;
    const pour = clamp((p - .03) / .3);
    const syrupH = inner * .1 * clamp(pour / .22), milkH = inner * .5 * clamp((pour - .22) / .43), coffeeH = inner * .22 * clamp((pour - .65) / .35);
    const foamH = inner * .1 * ease(clamp((p - .33) / .05));
    let yy = floor;
    const lay = (id, h) => { yy -= h; setAttrs($('#' + id, scene), { y: yy, height: Math.max(0, h + (h > 0 ? 2 : 0)) }); };
    lay('lqSyrup', syrupH);
    lay('lqMilk', milkH);
    lay('lqCoffee', coffeeH);
    lay('lqFoam', foamH);
    const surface = yy;
    const wave = $('#lqWave', scene);
    const ph = p * 60;
    wave.setAttribute('d', surface < floor - 2 ? `M${cx - 130} ${surface} ${Array.from({ length: 9 }, (_, i) => `q14 ${i % 2 ? -7 : 7} 30 0`).join(' ')}`.replace(/q/g, 'q') : '');
    wave.setAttribute('stroke', foamH > 0 ? '#E6D6F3' : coffeeH > 0 ? '#A97F5A' : milkH > 0 ? '#FFFFFF' : '#C9B2E8');
    wave.setAttribute('transform', `translate(${(ph % 30) - 30} 0)`);
    const streaming = pour > 0 && pour < 1;
    const sCol = pour < .22 ? '#B79AD8' : pour < .65 ? '#F4ECF8' : '#7A4B30';
    setAttrs($('#stream', scene), { height: streaming ? Math.max(0, surface + 4) : 0, fill: sCol, width: streaming ? 14 - 6 * Math.abs(Math.sin(p * 80)) * .3 : 0, x: cx - 7 });
    $('#splash', scene).innerHTML = streaming ? [-30, -12, 10, 28].map((d, i) => `<circle cx="${cx + d + Math.sin(p * 90 + i) * 6}" cy="${surface - 6 - Math.abs(Math.sin(p * 70 + i * 2)) * 18}" r="${4 + (i % 2) * 2}" fill="${sCol}"/>`).join('') : '';
    const hk = ease(clamp((p - .35) / .05));
    const heart = $('#heart', scene);
    heart.setAttribute('opacity', String(hk));
    heart.setAttribute('transform', `translate(0 ${surface + 2}) scale(1 ${.4 * hk}) translate(${cx * (1 - 1)} 0)`);
    $('#heroSteam', scene).setAttribute('opacity', String(clamp((p - .36) / .06) * .9));
    // burger
    const n = BURGER.layers.length;
    $$('.bl', scene).forEach((g, i) => {
        const start = .4 + i * .042, k = clamp((p - start) / .075);
        let dy, sq = 1;
        if (k < .72) {
            const f = k / .72;
            dy = -760 * (1 - f * f);
        }
        else {
            const f = (k - .72) / .28;
            dy = -22 * Math.sin(Math.PI * f) * (1 - f * .4);
            sq = 1 - .12 * Math.sin(Math.PI * Math.min(1, f * 2)) * (1 - f);
        }
        if (k <= 0)
            dy = -900;
        const yb = burgerY[i] + 30;
        g.setAttribute('transform', `translate(0 ${dy})`);
        g.firstElementChild.setAttribute('transform', `translate(${BURGER.cx} ${yb}) scale(${2 - sq} ${sq}) translate(${-BURGER.cx} ${-yb})`);
        g.setAttribute('opacity', k <= 0 ? '0' : '1');
    });
    const done = clamp((p - (.4 + (n - 1) * .042 + .075)) / .04);
    $('#sparkles', scene).setAttribute('opacity', String(done));
    $('#disc', scene).setAttribute('r', String(330 + p * 30));
    $('#discRing', scene).setAttribute('transform', `rotate(${p * 90} 510 440)`);
    // receipt
    const rk = clamp((p - .76) / .18);
    const paper = $('#rcPaper');
    paper.style.setProperty('--k', String(rk));
    $('#receipt').classList.toggle('on', rk > 0);
    $$('.rc-row', paper).forEach((r, i, arr) => r.classList.toggle('in', rk > (i + 1) / (arr.length + 1)));
    const st = p < .03 ? 0 : pour < .22 ? 1 : pour < 1 ? 2 : p < .4 ? 3 : p < .74 ? 4 : p < .94 ? 5 : 6;
    if (st !== stageIdx) {
        stageIdx = st;
        $('#heroStage').textContent = t(stageKeys[st]);
    }
}
function renderReceipt() {
    const now = tashkentNow();
    const total = HL.price + HB.price;
    $('#rcPaper').innerHTML = `
    <div class="rc-row rc-title">${t('rc.title')}</div>
    <div class="rc-row rc-meta"><span>${ddmmyyyy(now)}</span><span>${hhmm(now)}</span></div>
    <div class="rc-row"><span>${esc(HL.name[state.lang])} M</span><span>${money(HL.price + SIZES[1].add)}</span></div>
    <div class="rc-row"><span>${esc(HB.name[state.lang])}</span><span>${money(HB.price)}</span></div>
    <div class="rc-row rc-total"><span>${t('rc.total')}</span><span>${money(total + SIZES[1].add)}</span></div>
    <div class="rc-row rc-bar" aria-hidden="true">${Array.from({ length: 34 }, (_, i) => `<i style="width:${1 + ((i * 7) % 4)}px"></i>`).join('')}</div>
    <div class="rc-row rc-thanks">${t('rc.thanks')}</div>`;
    $('#heroComboPrice').textContent = money(total + SIZES[1].add);
    stageIdx = -1;
    const p = heroP;
    heroP = -1;
    updateHero(Math.max(0, p));
}
$('#heroCombo').addEventListener('click', e => {
    addLine({ kind: 'item', item: HL.id, size: 'M', extras: [] }, 1, e.currentTarget);
    addLine({ kind: 'item', item: HB.id, extras: [] }, 1);
    toast(t('card.added'));
});
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
    const words = ['Violette latte', 'Lavash', 'Cheesecake', 'Double beef', 'Raf', 'Hot-dog', 'Medovik', 'Iced Violette', 'Fri'];
    const seq = words.map((w, i) => `<span class="${i % 2 ? 'tw-a' : 'tw-b'}">${w}</span><svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7" ry="10"/><path d="M12 3c-4 5 4 13 0 18" fill="none" stroke-width="1.8"/></svg>`).join('');
    $('#tape').innerHTML = seq + seq + seq;
}
/* =============== menu =============== */
let world = tashkentNow().getHours() < 12 ? 'coffee' : 'food';
const view = { cat: 'all', q: '' };
const norm = (s) => s.toLowerCase().replace(/[ʻʼ'`’]/g, '').replace(/ё/g, 'е');
function visibleItems() {
    const q = norm(view.q.trim());
    let list = ITEMS.filter(i => (q ? true : CATS.find(c => c.id === i.cat).world === world));
    if (!q && view.cat !== 'all')
        list = list.filter(i => i.cat === view.cat);
    if (q)
        list = list.filter(i => ['uz', 'ru', 'en'].some(l => norm(i.name[l] + ' ' + i.desc[l]).includes(q)));
    return list.sort((a, b) => b.pop - a.pop);
}
function renderChips() {
    const cats = CATS.filter(c => c.world === world);
    $('#chips').innerHTML = [`<button role="tab" data-cat="all" aria-selected="${view.cat === 'all'}">${t('menu.all')}</button>`, ...cats.map(c => `<button role="tab" data-cat="${c.id}" aria-selected="${view.cat === c.id}">${esc(c.name[state.lang])}</button>`)].join('');
    $('#chips').classList.toggle('dim', !!view.q.trim());
}
const tagHTML = (tags = []) => tags.map(g => `<span class="tag tag-${g}">${t('tag.' + g)}</span>`).join('');
function cardHTML(i, k) {
    const hot = i.art.k === 'drink' && ['cup', 'small', 'pot'].includes(i.art.d.v);
    return `<article class="card${hot ? ' hot' : ''}" data-id="${i.id}" style="--k:${k}">
    <button class="card-hit" data-open="${i.id}" aria-label="${esc(i.name[state.lang])} — ${t('card.open')}"></button>
    <div class="card-art">${itemPic(i, 520, i.name[state.lang])}</div>
    <div class="card-tags">${tagHTML(i.tags)}</div>
    <h3>${esc(i.name[state.lang])}</h3>
    <p class="card-desc">${esc(i.desc[state.lang])}</p>
    <div class="card-foot">
      <span class="card-meta">${i.kcal} ${t('card.kcal')} · ${i.prep} ${t('card.min')}</span>
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
        empty.textContent = tf('menu.empty', { q: view.q.trim() });
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
    $('#imSizes').innerHTML = it.sized ? `<h4>${t('im.size')}</h4><div class="seg" role="radiogroup">${SIZES.map(s => `<button type="button" role="radio" data-size="${s.id}" aria-checked="${im.size === s.id}"><b>${s.id}</b><small>${s.ml} ml${s.add ? ` · +${money(s.add)}` : ''}</small></button>`).join('')}</div>` : '';
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
const PCOL = ['#7A4FB0', '#E2452F', '#F4B731', '#3E8E6A', '#3E6FB8', '#C2185B', '#8A5A3B', '#4B4F5C'];
const split = { on: false, n: 2 };
function eta() {
    const prep = cart.length ? Math.max(...cart.map(linePrep)) : 0;
    const load = Math.min(10, Math.floor(count() / 4) * 2);
    return new Date(tashkentNow().getTime() + (prep + 5 + load) * 60000);
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
    $('#cartEta').textContent = tf('cart.eta', { t: hhmm(eta()) });
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
function renderStamps() {
    const k = Number(store.get('vc-stamps')) || 0;
    const have = k % STAMPS_FOR_GIFT;
    const gift = k > 0 && have === 0;
    $('#stamps').innerHTML = `<div class="st-head"><b>${t('stamps.title')}</b><small>${gift ? t('stamps.gift') : tf('stamps.text', { n: STAMPS_FOR_GIFT, k: have })}</small></div>
    <div class="st-cups">${Array.from({ length: STAMPS_FOR_GIFT }, (_, i) => `<span class="${gift || i < have ? 'got' : ''}${i === STAMPS_FOR_GIFT - 1 ? ' gift' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h12v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6z M17 10h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>`).join('')}</div>`;
}
$('#cartBtn').addEventListener('click', () => { renderCart(); openOverlay($('#cart')); });
$('#cart').addEventListener('click', e => {
    const tg = e.target;
    if (tg.closest('[data-close]')) {
        closeOverlay($('#cart'));
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
$('#splitOn').addEventListener('change', e => { split.on = e.target.checked; renderCart(); });
$('#toCheckout').addEventListener('click', () => { closeOverlay($('#cart')); openCheckout(); });
on('cart', renderCart);
const params = new URLSearchParams(location.search);
const tableParam = (params.get('stol') ?? params.get('table') ?? '').replace(/\D/g, '').slice(0, 3);
const saved = (store.get('vc-contact') ?? {});
const order = {
    step: 1, method: (tableParam ? 'table' : 'pickup'), zone: 'near', table: tableParam,
    name: typeof saved.name === 'string' ? saved.name.slice(0, 60) : '', phone: typeof saved.phone === 'string' ? saved.phone.replace(/\D/g, '').slice(0, 9) : '',
    address: typeof saved.address === 'string' ? saved.address.slice(0, 160) : '', time: 'asap', payment: 'cash', comment: '',
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
function timeSlots() {
    const now = tashkentNow();
    const lead = order.method === 'delivery' ? 45 : 20;
    const start = new Date(now.getTime() + lead * 60000);
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    const out = [];
    for (let d = new Date(start); out.length < 9; d = new Date(d.getTime() + 15 * 60000)) {
        const h = d.getHours() + d.getMinutes() / 60;
        if (d.getDate() !== now.getDate() || h >= CAFE.close || h < CAFE.open)
            break;
        out.push(hhmm(d));
    }
    return out;
}
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
            x.innerHTML = `<h4>${t('how.zone')}</h4><div class="zones" role="radiogroup">${ZONES.map(z => `<button type="button" role="radio" data-zone="${z.id}" aria-checked="${order.zone === z.id}"><b>${esc(z.name[state.lang])}</b><small>${money(z.fee)} · ${tf('how.free', { s: money(z.freeFrom) })} · ~${z.mins} ${t('card.min')}</small></button>`).join('')}</div>`;
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
        const slots = timeSlots();
        if (order.time !== 'asap' && !slots.includes(order.time))
            order.time = 'asap';
        $('#coTimes').innerHTML = ['asap', ...slots].map(s => `<button type="button" role="radio" data-time="${s}" aria-checked="${order.time === s}">${s === 'asap' ? t('time.asap') : s}</button>`).join('');
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
        ${order.method !== 'table' ? `<div><dt>${t('rv.time')}</dt><dd>${order.time === 'asap' ? `${t('time.asap')} (~${hhmm(eta())})` : order.time}</dd></div>` : ''}
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
let sending = false;
async function sendOrder() {
    if (sending || !cart.length)
        return;
    sending = true;
    const btn = $('#coNext');
    btn.disabled = true;
    btn.textContent = t('co.sending');
    const id = 'V' + Date.now().toString(36).slice(-5).toUpperCase();
    const due = order.method === 'table' || order.time === 'asap' ? hhmm(eta()) : order.time;
    const items = cart.map(l => `${l.qty} × ${lineName(l)}${lineSub(l) ? ` (${lineSub(l)})` : ''} — ${money(unitPrice(l) * l.qty)}${split.on && l.who >= 0 && l.who < split.n ? ` [${l.who + 1}]` : ''}`).join('\n');
    const data = {
        'form-name': 'order', 'bot-field': '', order_id: id, method: order.method, table: order.method === 'table' ? order.table : '',
        name: order.name, phone: '+998 ' + fmtPhone(order.phone), address: order.method === 'delivery' ? order.address : '',
        zone: order.method === 'delivery' ? (ZONES.find(z => z.id === order.zone) ?? ZONES[0]).name.uz : '', time: order.time === 'asap' ? `ASAP ~${due}` : order.time,
        payment: order.payment, comment: order.comment, items, split: split.on ? splitShares().map((s, i) => `${i + 1}: ${money(Math.ceil(s / 500) * 500)}`).join('; ') : '',
        subtotal: String(subtotal()), delivery: String(deliveryFee()), total: String(orderTotal()), lang: state.lang,
    };
    const coffees = cart.filter(isCoffeeLine).reduce((a, l) => a + l.qty, 0);
    try {
        const ctl = new AbortController();
        const tm = setTimeout(() => ctl.abort(), 12000);
        const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString(), signal: ctl.signal });
        clearTimeout(tm);
        if (!res.ok)
            throw new Error(String(res.status));
        const prev = Number(store.get('vc-stamps')) || 0;
        store.set('vc-stamps', prev + coffees);
        setCart([]);
        $('#coForm').hidden = true;
        $('#coSteps').hidden = true;
        const done = $('#coDone');
        done.hidden = false;
        done.innerHTML = `<div class="done-cup" aria-hidden="true">${svg(ITEM('cappuccino').art)}</div><h4>${t('done.title')}</h4>
      <p>${tf('done.text', { id, phone: '+998 ' + fmtPhone(order.phone) })}</p><p class="eta-big">${tf('done.eta', { t: due })}</p>
      ${coffees ? `<p class="stamp-plus">${tf('done.stamp', { n: coffees })}</p>` : ''}
      <button class="btn btn-acc" data-close>${t('done.close')}</button>`;
        $('[data-close].btn', done).focus();
    }
    catch {
        fail(t('err.send'));
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
        const body = new URLSearchParams({ 'form-name': 'booking', 'bot-field': '', name, phone: '+998 ' + fmtPhone(phone), date: bk.date, time: bk.time, guests: String(bk.guests), comment: $('#bkComment').value.trim(), lang: state.lang });
        const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
        if (!res.ok)
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
    $('#phoneV').textContent = CAFE.phone;
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
/* =============== bean cursor companion =============== */
function initBean() {
    const bean = $('#bean');
    if (!finePointer || reduced) {
        bean.remove();
        return;
    }
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, vx = 0, rot = 0, shown = false, big = false;
    addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse')
            return;
        tx = e.clientX + 18;
        ty = e.clientY + 22;
        if (!shown) {
            shown = true;
            x = tx;
            y = ty;
            bean.classList.add('on');
        }
        const el = e.target.closest?.('a,button,.card,input,label,[role=radio],[role=tab]');
        if (!!el !== big) {
            big = !!el;
            bean.classList.toggle('big', big);
        }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { shown = false; bean.classList.remove('on'); });
    addEventListener('pointerdown', () => { bean.classList.remove('tap'); void bean.offsetWidth; bean.classList.add('tap'); });
    const loop = () => {
        const nx = x + (tx - x) * .2, ny = y + (ty - y) * .2;
        vx = nx - x;
        x = nx;
        y = ny;
        rot += (clamp(vx * 3, -40, 40) - rot) * .15;
        bean.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}
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
let ticking = false;
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
        $('#tape').style.transform = `translate3d(${-(scrollY * .35) % ($('#tape').scrollWidth / 3 || 1)}px,0,0)`;
    });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { heroP = -1; fitScene(); onScroll(); });
/* =============== boot =============== */
on('lang', () => { renderStatus(); renderReceipt(); renderChips(); renderGrid(); renderCart(); renderBooking(); renderTable(); if (!$('#itemModal').hidden && im.id)
    renderItem(); if (!$('#checkout').hidden && !$('#coForm').hidden) {
    if (order.step === 2)
        captureStep2();
    renderCheckout();
} });
buildScene();
fitScene();
renderTape();
renderVisit();
setWorldUI();
applyLang();
initLab();
initBudget();
initBean();
initReveal();
if (reduced)
    root.classList.add('reduced');
updateHero(heroProgress());
onScroll();
const hideLoader = () => { const l = document.getElementById('loader'); if (!l || l.classList.contains('gone'))
    return; l.classList.add('gone'); setTimeout(() => l.remove(), 700); root.classList.add('ready'); };
if (document.readyState === 'complete')
    setTimeout(hideLoader, 500);
else
    addEventListener('load', () => setTimeout(hideLoader, 400));
setTimeout(hideLoader, 3500);
