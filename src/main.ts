import { CAFE, CATS, ITEMS, ITEM, SIZES, EXTRAS, ZONES, STAMPS_FOR_GIFT, MIN_DELIVERY, FRIDAY_EVERY, SET_DRINKS, SET_BURGERS, SET_DISCOUNTS, setFull, setPrice, isVeg, isSpicy, allergens, type World, type CatId, type Item, type ExtraId, type Lang } from './data.js';
import { svg, steam, LAYERS, bunTop, bunBottom, latteArt, plateSVG, REAL_DEFS } from './art.js';
import { initPointer } from './ui.js';
import { initScroll } from './scroll.js';
import { initAfk, showOrder } from './afk.js';
import { initPerf, choosePerf, perfChoice, perf } from './perf.js';
import { initTrack, startTrack, openTrack, langTrack } from './track.js';
document.body.insertAdjacentHTML('afterbegin', REAL_DEFS);
import {
  $, $$, clamp, ease, reduced, finePointer, esc, store, state, t, tf, money, plural, on, emit, cart, saveCart, setCart, addLine,
  unitPrice, lineName, lineSub, lineArt, linePrep, isCoffeeLine, subtotal, count, toast, openOverlay, closeOverlay, tashkentNow, hhmm, ddmmyyyy, pad,
  isLang, itemPic, lineVisual, addSavedLines, type Line, type Size,
} from './shared.js';
import { initLab } from './lab.js';
import { initBudget } from './budget.js';
import { buildHero, updateHero as drawHero, renderHeroTexts, addDeal } from './hero.js';

const root = document.documentElement;

/* =============== theme =============== */
type Theme = 'light' | 'dark';
const sysDark = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = (): Theme => (root.dataset.theme === 'dark' ? 'dark' : 'light');
function paintTheme(th: Theme) {
  root.dataset.theme = th;
  $('#themeBtn').setAttribute('aria-pressed', String(th === 'dark'));
  $('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#141010' : '#FAF7F6');
}
function setTheme(next: Theme, origin?: HTMLElement) {
  store.set('vc-theme', next);
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduced || !origin) { paintTheme(next); return; }
  const r = origin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = doc.startViewTransition(() => paintTheme(next));
  vt.ready.then(() => root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 650, easing: 'cubic-bezier(.6,0,.2,1)', pseudoElement: '::view-transition-new(root)' } as KeyframeAnimationOptions)).catch(() => {});
}
paintTheme(currentTheme());
$('#themeBtn').addEventListener('click', e => setTheme(currentTheme() === 'dark' ? 'light' : 'dark', e.currentTarget as HTMLElement));
sysDark.addEventListener('change', e => { if (store.get('vc-theme') !== 'light' && store.get('vc-theme') !== 'dark') paintTheme(e.matches ? 'dark' : 'light'); });

/* =============== language =============== */
function splitWords(el: HTMLElement) {
  const words = (el.textContent ?? '').trim().split(/\s+/);
  el.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
}
function applyLang() {
  root.lang = state.lang;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n!); if (el.hasAttribute('data-split')) splitWords(el); });
  $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria!)));
  $$<HTMLInputElement>('[data-i18n-ph]').forEach(el => (el.placeholder = t(el.dataset.i18nPh!)));
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  document.title = { uz: 'FFS — Fresh Fried Soul, Andijon', ru: 'FFS — Fresh Fried Soul, Андижан', en: 'FFS — Fresh Fried Soul, Andijan' }[state.lang];
  emit('lang');
}
$$('.lang button').forEach(b => b.addEventListener('click', () => {
  const l = b.dataset.lang; if (!isLang(l) || l === state.lang) return;
  state.lang = l as Lang; store.set('vc-lang', l); applyLang();
}));

/* =============== header, progress, mobile menu =============== */
const menuBtn = $('#menuBtn'), menu = $('#menu');
function setMenu(open: boolean) {
  menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open));
  root.classList.toggle('menu-open', open);
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
$$('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

/* =============== open status & greeting =============== */
const hourStr = (h: number) => `${pad(h % 24)}:00`;
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
const scene = $<SVGSVGElement>('#scene');
let heroP = -1;
function buildScene() { buildHero(scene); }
function fitScene() { scene.setAttribute('viewBox', innerWidth <= 960 ? '160 34 840 676' : '0 0 1200 800'); }
function updateHero(p: number) { if (Math.abs(p - heroP) < .0005) return; heroP = p; drawHero(p); }
function renderReceipt() { renderHeroTexts(scene); const p = heroP; heroP = -1; updateHero(Math.max(0, p)); }
$('#heroCombo').addEventListener('click', e => addDeal(e.currentTarget as Element));
const hero = $('#top');
function heroProgress() {
  if (reduced) return 1;
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
let world: World = 'food'; // a fast-food place: food first, drinks one tap away
const view = { cat: 'all' as 'all' | CatId | 'fav', q: '' };
type Diet = 'veg' | 'noNuts' | 'noGluten' | 'noLactose' | 'spicy';
const DIETS: Diet[] = ['veg', 'noNuts', 'noGluten', 'noLactose', 'spicy'];
const diet = new Set<Diet>();
const favs = new Set<string>(((store.get('vc-favs') as unknown[]) ?? []).filter((x): x is string => typeof x === 'string' && !!ITEM(x)));
const saveFavs = () => store.set('vc-favs', [...favs]);
const dietOK = (i: Item) => {
  const a = allergens(i);
  return (!diet.has('veg') || isVeg(i)) && (!diet.has('spicy') || isSpicy(i)) && (!diet.has('noNuts') || !a.includes('nuts')) && (!diet.has('noGluten') || !a.includes('gluten')) && (!diet.has('noLactose') || !a.includes('lactose'));
};
const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’]/g, '').replace(/ё/g, 'е');
function visibleItems(): Item[] {
  const q = norm(view.q.trim());
  let list = ITEMS.filter(i => (q || view.cat === 'fav' ? true : CATS.find(c => c.id === i.cat)!.world === world));
  if (!q && view.cat === 'fav') list = list.filter(i => favs.has(i.id));
  else if (!q && view.cat !== 'all') list = list.filter(i => i.cat === view.cat);
  list = list.filter(dietOK);
  if (q) list = list.filter(i => (['uz', 'ru', 'en'] as Lang[]).some(l => norm(i.name[l] + ' ' + i.desc[l]).includes(q)));
  return list.sort((a, b) => b.pop - a.pop);
}
function renderChips() {
  const cats = CATS.filter(c => c.world === world);
  if (view.cat === 'fav' && !favs.size) view.cat = 'all';
  $('#chips').innerHTML = [`<button role="tab" data-cat="all" aria-selected="${view.cat === 'all'}">${t('menu.all')}</button>`,
    ...(favs.size ? [`<button role="tab" data-cat="fav" class="chip-fav" aria-selected="${view.cat === 'fav'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>${t('fav.chip')} <small>${favs.size}</small></button>`] : []),
    ...cats.map(c => `<button role="tab" data-cat="${c.id}" aria-selected="${view.cat === c.id}">${esc(c.name[state.lang])}</button>`)].join('');
  renderDiet(); renderLast();
  $('#chips').classList.toggle('dim', !!view.q.trim());
}
function renderDiet() {
  $('#diets').innerHTML = DIETS.map(d => `<button type="button" data-diet="${d}" aria-pressed="${diet.has(d)}"><i class="dot dot-${d}"></i>${t('diet.' + d)}</button>`).join('');
}
function renderLast() {
  const last = store.get('vc-last') as { at?: number; n?: number; total?: number } | null;
  const btn = $('#repeatLast');
  btn.hidden = !last || !last.n;
  if (last && last.n) btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t('last.chip')} <small>${last.at ? ddmmyyyy(new Date(last.at)) : ''} · ${money(last.total ?? 0)}</small>`;
}
const allergenHTML = (i: Item) => { const a = allergens(i); return (isVeg(i) ? `<i class="dt dt-veg" title="${t('diet.veg')}">V</i>` : '') + a.map(x => `<i class="dt dt-${x}" title="${t('diet.' + x)}">${{ nuts: 'N', gluten: 'G', lactose: 'L' }[x]}</i>`).join(''); };
const tagHTML = (tags: Item['tags'] = []) => tags.map(g => `<span class="tag tag-${g}">${t('tag.' + g)}</span>`).join('');
function cardHTML(i: Item, k: number) {
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
  if (!list.length) empty.textContent = view.q.trim() ? tf('menu.empty', { q: view.q.trim() }) : view.cat === 'fav' && !diet.size ? t('fav.empty') : t('menu.emptyFilter');
  if (finePointer && !reduced) $$('.card', $('#grid')).forEach(attachTilt);
}
function attachTilt(el: HTMLElement) {
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
const wipePath = $<SVGPathElement>('#wipePath');
let wiping = false;
function wavePath(yTop: number, yBot: number, ph: number) {
  const seg = (y: number, dir: 1 | -1) => { let d = ''; for (let i = 0; i <= 10; i++) { const x = dir === 1 ? i * 10 : 100 - i * 10; const yy = y + Math.sin(i * .9 + ph) * 3.2; d += `${i === 0 ? (dir === 1 ? 'M' : 'L') : 'L'}${x} ${yy} `; } return d; };
  return seg(yTop, 1) + seg(yBot, -1) + 'Z';
}
function switchWorld(next: World) {
  if (next === world || wiping) return;
  if (reduced) { world = next; view.cat = 'all'; setWorldUI(); renderChips(); renderGrid(); return; }
  wiping = true;
  const wipe = $('#wipe');
  wipe.style.setProperty('--wc', next === 'coffee' ? 'var(--violet)' : 'var(--ketchup)');
  wipe.classList.add('on');
  const t0 = performance.now(), D1 = 520, D2 = 560;
  let swapped = false;
  const tick = (now: number) => {
    const e = now - t0;
    if (e < D1) { const k = ease(e / D1); wipePath.setAttribute('d', wavePath(124 - k * 140, 130, e / 90)); }
    else {
      if (!swapped) {
        swapped = true; world = next; view.cat = 'all'; setWorldUI(); renderChips(); renderGrid();
        const top = $('#menuSec').getBoundingClientRect().top;
        if (top < -10 || top > innerHeight * .5) scrollTo({ top: scrollY + top - 70, behavior: 'instant' as ScrollBehavior });
      }
      const k = ease(Math.min(1, (e - D1) / D2));
      wipePath.setAttribute('d', wavePath(-20, 130 - k * 150, e / 90));
      if (k >= 1) { wipe.classList.remove('on'); wiping = false; return; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
$$('.world button').forEach(b => b.addEventListener('click', () => switchWorld(b.dataset.world as World)));
$('.world').addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = world === 'coffee' ? 'food' : 'coffee'; switchWorld(next); $<HTMLButtonElement>(`.world [data-world="${next}"]`).focus(); }
});
$('#chips').addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLElement>('[data-cat]'); if (!b) return;
  view.cat = b.dataset.cat as CatId | 'all' | 'fav';
  if (view.q) { view.q = ''; $<HTMLInputElement>('#q').value = ''; $('#qClear').hidden = true; }
  renderChips(); renderGrid();
});
const qIn = $<HTMLInputElement>('#q');
let qTimer = 0;
qIn.addEventListener('input', () => { $('#qClear').hidden = !qIn.value; clearTimeout(qTimer); qTimer = window.setTimeout(() => { view.q = qIn.value; renderChips(); renderGrid(); }, 140); });
$('#qClear').addEventListener('click', () => { qIn.value = ''; view.q = ''; $('#qClear').hidden = true; renderChips(); renderGrid(); qIn.focus(); });
$('#grid').addEventListener('click', e => {
  const target = e.target as Element;
  const fv = target.closest<HTMLElement>('[data-fav]');
  if (fv) {
    const id = fv.dataset.fav!, on = !favs.has(id);
    on ? favs.add(id) : favs.delete(id); saveFavs();
    fv.setAttribute('aria-pressed', String(on));
    fv.setAttribute('aria-label', `${t(on ? 'fav.remove' : 'fav.add')}: ${ITEM(id)!.name[state.lang]}`);
    fv.classList.remove('pop'); void fv.offsetWidth; fv.classList.add('pop');
    if (on) toast(t('fav.added'));
    renderChips();
    if (view.cat === 'fav' && !on) renderGrid();
    return;
  }
  const add = target.closest<HTMLElement>('[data-add]');
  if (add) {
    const it = ITEM(add.dataset.add!)!;
    addLine({ kind: 'item', item: it.id, size: it.sized ? 'M' : undefined, extras: [] }, 1, add.closest('.card')!.querySelector('.card-art'));
    add.classList.remove('pop'); void add.offsetWidth; add.classList.add('pop');
    toast(`${it.name[state.lang]} — ${t('card.added').toLowerCase()}`);
    return;
  }
  const open = target.closest<HTMLElement>('[data-open]');
  if (open) openItem(open.dataset.open!);
});

/* =============== item dialog =============== */
const im = { id: '', size: 'M' as Size, extras: new Set<ExtraId>(), qty: 1 };
function imPrice() {
  const it = ITEM(im.id)!;
  return (it.price + (it.sized ? SIZES.find(s => s.id === im.size)!.add : 0) + [...im.extras].reduce((a, e) => a + EXTRAS[e].price, 0)) * im.qty;
}
function renderItem() {
  const it = ITEM(im.id)!;
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
function openItem(id: string) {
  im.id = id; im.size = 'M'; im.extras = new Set(); im.qty = 1;
  renderItem(); openOverlay($('#itemModal'));
}
$('#itemModal').addEventListener('click', e => {
  const tg = e.target as Element;
  if (tg.closest('[data-close]')) { closeOverlay($('#itemModal')); return; }
  const s = tg.closest<HTMLElement>('[data-size]');
  if (s) { im.size = s.dataset.size as Size; renderItem(); $<HTMLElement>(`[data-size="${im.size}"]`, $('#itemModal')).focus(); }
  const d = tg.closest<HTMLElement>('#imQty [data-d]');
  if (d) { im.qty = clamp(im.qty + Number(d.dataset.d), 1, 20); $('output', $('#imQty')).textContent = String(im.qty); $('#imPrice').textContent = money(imPrice()); }
});
$('#itemModal').addEventListener('change', e => {
  const c = e.target as HTMLInputElement;
  if (c.dataset.extra) { c.checked ? im.extras.add(c.dataset.extra as ExtraId) : im.extras.delete(c.dataset.extra as ExtraId); $('#imPrice').textContent = money(imPrice()); }
});
$('#imAdd').addEventListener('click', () => {
  const it = ITEM(im.id)!;
  addLine({ kind: 'item', item: it.id, size: it.sized ? im.size : undefined, extras: [...im.extras] }, im.qty, $('#imArt'));
  toast(`${it.name[state.lang]} — ${t('card.added').toLowerCase()}`);
  closeOverlay($('#itemModal'));
});

/* =============== cart drawer =============== */
const PCOL = ['#E11D24', '#E11D24', '#F4B731', '#3E8E6A', '#3E6FB8', '#C2185B', '#8A5A3B', '#5C4B4C'];
const split = { on: false, n: 2 };
function eta(): Date {
  const prep = cart.length ? Math.max(...cart.map(linePrep)) : 0;
  const load = Math.min(10, Math.floor(count() / 4) * 2);
  const ride = order.method === 'delivery' ? (ZONES.find(z => z.id === order.zone) ?? ZONES[0]).mins : 0;
  return new Date(tashkentNow().getTime() + (prep + 5 + load + ride) * 60000);
}
function renderCart() {
  const c = count();
  const badge = $('#cartCount');
  badge.hidden = c === 0; badge.textContent = String(c);
  $('#cartBtn').setAttribute('aria-label', `${t('aria.cart')}: ${c}`);
  const empty = cart.length === 0;
  $('#cartEmpty').hidden = !empty; $('#cartFoot').hidden = empty; $('#split').hidden = cart.length < 1;
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
  const last = store.get('vc-last') as { n?: number; total?: number; at?: number } | null;
  $('#cartLast').hidden = !last || !last.n;
  if (last && last.n) $('#cartLast').innerHTML = `<div><b>${t('last.title')}</b><small>${last.at ? ddmmyyyy(new Date(last.at)) + ' · ' : ''}${last.n} ${plural(last.n, 'items')} · ${money(last.total ?? 0)}</small></div><button type="button" class="btn btn-mini" data-repeat>${t('last.repeat')}</button>`;
  if (acceptingNow()) $('#cartEta').textContent = tf('cart.eta', { t: hhmm(eta()) });
  else { const s = timeSlots(); $('#cartEta').textContent = tf('cart.closedEta', { t: timeInline(s.slots[0] ?? hourStr(CAFE.open), s.tomorrow) }); }
  renderSplit(); renderStamps();
}
function splitShares(): number[] {
  const shares = Array(split.n).fill(0);
  let shared = 0;
  cart.forEach(l => { const v = unitPrice(l) * l.qty; if (l.who >= 0 && l.who < split.n) shares[l.who] += v; else shared += v; });
  return shares.map(s => s + shared / split.n);
}
function renderSplit() {
  $<HTMLInputElement>('#splitOn').checked = split.on;
  $('#splitBody').hidden = !split.on;
  $('output', $('#splitN')).textContent = String(split.n);
  if (!split.on) return;
  $('#splitRes').innerHTML = splitShares().map((s, i) => `<div style="--pc:${PCOL[i]}"><i>${i + 1}</i><b>${money(Math.ceil(s / 500) * 500)}</b></div>`).join('');
}
/** Friday deal: dishes in the cart (drinks, sides and desserts don't count) and how many extra the order earns. */
const isFriday = () => tashkentNow().getDay() === 5;
const dishCount = () => cart.reduce((a, l) => a + (l.kind !== 'item' || ITEM(l.item!)!.role === 'main' ? l.qty : 0), 0);
const fridayGifts = () => (isFriday() ? Math.floor(dishCount() / FRIDAY_EVERY) : 0);
function renderStamps() {
  const n = dishCount(), have = n % FRIDAY_EVERY, gifts = fridayGifts();
  $('#stamps').innerHTML = `<div class="st-head"><b>${t('fri.title')}</b><small>${!isFriday() ? tf('fri.other', { n: FRIDAY_EVERY }) : gifts && !have ? tf('fri.got', { g: gifts }) : tf('fri.more', { k: FRIDAY_EVERY - have, g: gifts })}</small></div>
    <div class="st-cups fri">${Array.from({ length: FRIDAY_EVERY + 1 }, (_, i) => `<span class="${isFriday() && (i < have || (gifts && !have)) ? 'got' : ''}${i === FRIDAY_EVERY ? ' gift' : ''}"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 70 q-14 -2 -14 -20 q0 -22 22 -26 q22 -2 34 12 q8 10 2 22 q-6 12 -22 14z" fill="currentColor"/><path d="M62 66 l14 10 q6 2 6 -4 q4 -2 0 -6 l-12 -8" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg></span>`).join('')}</div>`;
}
$('#cartBtn').addEventListener('click', () => { renderCart(); openOverlay($('#cart')); });
$('#cart').addEventListener('click', e => {
  const tg = e.target as Element;
  if (tg.closest('[data-close]')) { closeOverlay($('#cart')); return; }
  if (tg.closest('[data-repeat]')) { repeatLast(); return; }
  const li = tg.closest<HTMLElement>('.line');
  if (li) {
    const i = Number(li.dataset.i), l = cart[i];
    const q = tg.closest<HTMLElement>('[data-q]');
    if (q) { l.qty = clamp(l.qty + Number(q.dataset.q), 1, 30); saveCart(); return; }
    if (tg.closest('[data-who]')) { l.who = l.who + 1 >= split.n ? -1 : l.who + 1; saveCart(); $<HTMLElement>(`.line[data-i="${i}"] [data-who]`)?.focus(); return; }
    if (tg.closest('[data-rm]')) {
      const done = () => { setCart(cart.filter((_, k) => k !== i)); toast(t('cart.removed')); const next = $<HTMLElement>('#lines .rm') ?? $<HTMLElement>('#cart .x'); next?.focus(); };
      if (reduced) done(); else { li.classList.add('out'); setTimeout(done, 260); }
    }
  }
  const sn = tg.closest<HTMLElement>('#splitN [data-d]');
  if (sn) { split.n = clamp(split.n + Number(sn.dataset.d), 2, 8); renderCart(); }
});
function repeatLast() {
  const last = store.get('vc-last') as { lines?: unknown } | null;
  const n = addSavedLines(last?.lines);
  toast(n ? t('last.added') : t('last.none'));
}
$('#repeatLast').addEventListener('click', e => { repeatLast(); const b = e.currentTarget as HTMLElement; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
$('#diets').addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLElement>('[data-diet]'); if (!b) return;
  const d = b.dataset.diet as Diet; diet.has(d) ? diet.delete(d) : diet.add(d);
  if (d === 'veg' && diet.has('veg')) diet.delete('spicy');
  if (d === 'spicy' && diet.has('spicy')) diet.delete('veg');
  renderDiet(); renderGrid();
  $<HTMLElement>(`[data-diet="${d}"]`).focus();
});
$('#splitOn').addEventListener('change', e => { split.on = (e.target as HTMLInputElement).checked; renderCart(); });
$('#toCheckout').addEventListener('click', () => { closeOverlay($('#cart')); openCheckout(); });
on('cart', renderCart);

/* =============== checkout =============== */
type Method = 'delivery' | 'pickup' | 'table';
const params = new URLSearchParams(location.search);
const tableParam = (params.get('stol') ?? params.get('table') ?? '').replace(/\D/g, '').slice(0, 3);
const saved = (store.get('vc-contact') ?? {}) as Record<string, string>;
const order = {
  step: 1, method: (tableParam ? 'table' : 'pickup') as Method, zone: 'near', table: tableParam,
  name: typeof saved.name === 'string' ? saved.name.slice(0, 60) : '', phone: typeof saved.phone === 'string' ? saved.phone.replace(/\D/g, '').slice(0, 9) : '',
  address: typeof saved.address === 'string' ? saved.address.slice(0, 160) : '', time: 'asap', tomorrow: false, payment: 'cash', comment: '',
};
const phoneDigits = (raw: string) => { let d = raw.replace(/\D/g, ''); if (d.length > 9 && d.startsWith('998')) d = d.slice(3); return d.slice(0, 9); };
const fmtPhone = (raw: string) => { const d = phoneDigits(raw); return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' '); };
function bindPhone(el: HTMLInputElement) {
  el.addEventListener('input', () => {
    const before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;
    el.value = fmtPhone(el.value);
    let pos = 0, seen = 0; while (pos < el.value.length && seen < before) { if (/\d/.test(el.value[pos])) seen++; pos++; }
    el.setSelectionRange(pos, pos);
  });
}
const deliveryFee = () => { if (order.method !== 'delivery') return 0; const z = ZONES.find(z => z.id === order.zone) ?? ZONES[0]; return subtotal() >= z.freeFrom ? 0 : z.fee; };
const orderTotal = () => subtotal() + deliveryFee();
/** "As soon as possible" orders are taken until the last-order time (23:40). */
function acceptingNow() { const n = tashkentNow(), h = n.getHours() + n.getMinutes() / 60; return h >= CAFE.open && h < CAFE.lastOrder; }
/** Times to choose from: today's if there are any left, otherwise tomorrow's from opening (never while the cafe is closed). */
function timeSlots(): { slots: string[]; tomorrow: boolean } {
  const now = tashkentNow();
  const lead = order.method === 'delivery' ? 45 : 20;
  const build = (day: Date, from: Date) => {
    const open = new Date(day); open.setHours(CAFE.open, 0, 0, 0);
    let d = new Date(Math.max(from.getTime(), open.getTime() + lead * 60000));
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    const out: string[] = [];
    for (; out.length < 9; d = new Date(d.getTime() + 15 * 60000)) {
      const h = d.getHours() + d.getMinutes() / 60;
      if (d.getDate() !== day.getDate() || h > CAFE.close - .25) break;
      out.push(hhmm(d));
    }
    return out;
  };
  const today = build(now, new Date(now.getTime() + lead * 60000));
  if (today.length) return { slots: today, tomorrow: false };
  const tm = new Date(now); tm.setDate(tm.getDate() + 1); tm.setHours(0, 0, 0, 0);
  return { slots: build(tm, tm), tomorrow: true };
}
const timeLabel = (time: string, tomorrow: boolean) => (tomorrow ? `${t('time.tomorrow')}, ${time}` : time);
/** "tomorrow at 08:45" inside a sentence. */
const timeInline = (time: string, tomorrow: boolean) => (tomorrow ? tf('time.tomorrowAt', { t: time }) : time);
function renderCheckout() {
  $$('#coSteps li').forEach((li, i) => { li.classList.toggle('on', i + 1 === order.step); li.classList.toggle('done', i + 1 < order.step); });
  $$('.co-step').forEach(s => (s.hidden = Number(s.dataset.step) !== order.step));
  $('#coBack').hidden = order.step === 1;
  $('#coNext').textContent = order.step === 3 ? t('co.send') : t('co.next');
  $('#coErr').textContent = '';
  if (order.step === 1) {
    const how: Method[] = ['pickup', 'delivery', 'table'];
    const ico: Record<Method, string> = {
      pickup: '<path d="M6 8h12l-1 12H7z M9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
      delivery: '<path d="M3 16V7h11v9 M14 10h4l3 3v3h-7 M7 18.5a1.5 1.5 0 1 0 0-.01 M17 18.5a1.5 1.5 0 1 0 0-.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
      table: '<path d="M4 9h16 M7 9v10 M17 9v10 M10 5h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    };
    $('#coHow').innerHTML = how.map(m => `<button type="button" role="radio" data-how="${m}" aria-checked="${order.method === m}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico[m]}</svg><b>${t('how.' + m)}</b><small>${t('how.' + m + 'D')}</small></button>`).join('');
    const x = $('#coHowExtra');
    if (order.method === 'delivery') x.innerHTML = `<h4>${t('how.zone')}</h4><div class="zones" role="radiogroup">${ZONES.map(z => `<button type="button" role="radio" data-zone="${z.id}" aria-checked="${order.zone === z.id}"><b>${esc(z.name[state.lang])}</b><small>${money(z.fee)}${Number.isFinite(z.freeFrom) ? ` · ${tf('how.free', { s: money(z.freeFrom) })}` : ''} · ~${z.mins} ${t('card.min')}</small></button>`).join('')}</div>`;
    else if (order.method === 'table') x.innerHTML = `<label class="field"><span>${t('how.tableNo')}</span><input id="coTable" inputmode="numeric" maxlength="3" value="${esc(order.table)}"></label>`;
    else x.innerHTML = '';
  }
  if (order.step === 2) {
    $<HTMLInputElement>('#coName').value = order.name;
    $<HTMLInputElement>('#coPhone').value = fmtPhone(order.phone);
    $<HTMLInputElement>('#coAddr').value = order.address;
    $<HTMLInputElement>('#coComment').value = order.comment;
    $('#coAddrWrap').hidden = order.method !== 'delivery';
    $('#coTimeWrap').hidden = order.method === 'table';
    $('#coTimeLabel').textContent = t(order.method === 'delivery' ? 'time.delivery' : 'time.pickup');
    const { slots, tomorrow } = timeSlots(), asap = acceptingNow();
    order.tomorrow = tomorrow;
    if ((order.time === 'asap' && !asap) || (order.time !== 'asap' && !slots.includes(order.time))) order.time = asap ? 'asap' : slots[0] ?? 'asap';
    $('#coTimes').innerHTML = (asap ? ['asap', ...slots] : slots).map(s => `<button type="button" role="radio" data-time="${s}" aria-checked="${order.time === s}">${s === 'asap' ? t('time.asap') : s}</button>`).join('')
      + (asap ? '' : `<p class="time-note">${tf(tomorrow ? 'time.closedTomorrow' : 'time.closedToday', { t: slots[0] ?? '' })}</p>`);
    $('#coPay').innerHTML = ['cash', 'card', 'click'].map(p => `<button type="button" role="radio" data-pay="${p}" aria-checked="${order.payment === p}">${t('pay.' + p)}</button>`).join('') ;
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
  order.name = $<HTMLInputElement>('#coName').value.trim();
  order.phone = phoneDigits($<HTMLInputElement>('#coPhone').value);
  order.address = $<HTMLInputElement>('#coAddr').value.trim();
  order.comment = $<HTMLInputElement>('#coComment').value.trim();
}
function openCheckout() {
  if (!cart.length) return;
  order.step = 1;
  $('#coForm').hidden = false; $('#coDone').hidden = true; $('#coSteps').hidden = false;
  renderCheckout(); openOverlay($('#checkout'));
}
$('#checkout').addEventListener('click', e => {
  const tg = e.target as Element;
  if (tg.closest('[data-close]')) { closeOverlay($('#checkout')); return; }
  const h = tg.closest<HTMLElement>('[data-how]'); if (h) { order.method = h.dataset.how as Method; renderCheckout(); $<HTMLElement>(`[data-how="${order.method}"]`).focus(); return; }
  const z = tg.closest<HTMLElement>('[data-zone]'); if (z) { order.zone = z.dataset.zone!; renderCheckout(); $<HTMLElement>(`[data-zone="${order.zone}"]`).focus(); return; }
  const tm = tg.closest<HTMLElement>('[data-time]'); if (tm) { captureStep2(); order.time = tm.dataset.time!; renderCheckout(); $<HTMLElement>(`[data-time="${order.time}"]`).focus(); return; }
  const p = tg.closest<HTMLElement>('[data-pay]'); if (p) { captureStep2(); order.payment = p.dataset.pay!; renderCheckout(); $<HTMLElement>(`[data-pay="${order.payment}"]`).focus(); }
});
$('#checkout').addEventListener('input', e => { const el = e.target as HTMLInputElement; if (el.id === 'coTable') { el.value = el.value.replace(/\D/g, '').slice(0, 3); order.table = el.value; } });
bindPhone($<HTMLInputElement>('#coPhone'));
$('#coBack').addEventListener('click', () => { if (order.step === 2) captureStep2(); order.step = Math.max(1, order.step - 1); renderCheckout(); });
const hasLetters = (s: string) => /\p{L}/u.test(s);
function fail(msg: string, focus?: string) { $('#coErr').textContent = msg; if (focus) $<HTMLElement>(focus)?.focus(); }
$('#coForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (order.step === 1) {
    if (order.method === 'table' && !order.table) return fail(t('err.table'), '#coTable');
    if (order.method === 'delivery' && subtotal() < MIN_DELIVERY) return fail(tf('err.minDelivery', { s: money(MIN_DELIVERY), d: money(MIN_DELIVERY - subtotal()) }));
    if (order.method === 'table' && !acceptingNow()) return fail(t('err.tableClosed'));
    order.step = 2; renderCheckout(); $<HTMLElement>('#coName').focus(); return;
  }
  if (order.step === 2) {
    captureStep2();
    if (order.name.length < 2 || !hasLetters(order.name)) return fail(t('err.name'), '#coName');
    if (order.phone.length !== 9) return fail(t('err.phone'), '#coPhone');
    if (order.method === 'delivery' && order.address.length < 5) return fail(t('err.address'), '#coAddr');
    store.set('vc-contact', { name: order.name, phone: order.phone, address: order.address });
    order.step = 3; renderCheckout(); $<HTMLElement>('#coNext').focus(); return;
  }
  await sendOrder();
});
/* Orders and bookings go to the shop's Telegram group (netlify/functions/telegram.mjs); a copy is also kept in
   Netlify Forms, so nothing is lost if Telegram isn't set up yet or is briefly unreachable. Either one landing counts. */
async function submitForm(data: Record<string, string>, signal?: AbortSignal): Promise<boolean> {
  const [tg, nf] = await Promise.allSettled([
    fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal }),
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString(), signal }),
  ]);
  return (tg.status === 'fulfilled' && tg.value.ok) || (nf.status === 'fulfilled' && nf.value.ok);
}
let sending = false;
async function sendOrder() {
  if (sending || !cart.length) return;
  // the cafe may have closed while the form was open
  if (order.time === 'asap' && !acceptingNow()) { sending = false; order.step = order.method === 'table' ? 1 : 2; renderCheckout(); return fail(t(order.method === 'table' ? 'err.tableClosed' : 'err.closedNow')); }
  sending = true;
  const btn = $<HTMLButtonElement>('#coNext');
  btn.disabled = true; btn.textContent = t('co.sending');
  const id = 'F' + Date.now().toString(36).slice(-5).toUpperCase();
  const due = order.method === 'table' || order.time === 'asap' ? hhmm(eta()) : order.time;
  const dueLabel = order.time === 'asap' || order.method === 'table' ? due : timeLabel(due, order.tomorrow);
  const items = cart.map(l => `${l.qty} × ${lineName(l)}${lineSub(l) ? ` (${lineSub(l)})` : ''} — ${money(unitPrice(l) * l.qty)}${split.on && l.who >= 0 && l.who < split.n ? ` [${l.who + 1}]` : ''}`).join('\n');
  const gifts = fridayGifts();
  const itemsText = items + (gifts ? `\n+ ${tf('fri.orderNote', { g: gifts })}` : '');
  const data: Record<string, string> = {
    'form-name': 'order', 'bot-field': '', order_id: id, method: order.method, table: order.method === 'table' ? order.table : '',
    name: order.name, phone: '+998 ' + fmtPhone(order.phone), address: order.method === 'delivery' ? order.address : '',
    zone: order.method === 'delivery' ? (ZONES.find(z => z.id === order.zone) ?? ZONES[0]).name.uz : '', time: order.time === 'asap' ? `ASAP ~${due}` : `${order.tomorrow ? 'ERTAGA / TOMORROW ' : ''}${order.time}`,
    payment: order.payment, comment: order.comment, items: itemsText, split: split.on ? splitShares().map((s, i) => `${i + 1}: ${money(Math.ceil(s / 500) * 500)}`).join('; ') : '',
    subtotal: String(subtotal()), delivery: String(deliveryFee()), total: String(orderTotal()), lang: state.lang,
  };
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 12000);
    const ok = await submitForm(data, ctl.signal);
    clearTimeout(tm);
    if (!ok) throw new Error('send');
    store.set('vc-last', { at: Date.now(), n: count(), total: subtotal(), lines: cart.map(({ sig: _s, who: _w, ...l }) => l) });
    const made = cart.map(l => ({ ...l }));
    const isDelivery = order.method === 'delivery';
    if (isDelivery) {
      // real timestamps for the tracker: when the courier is due, and when the kitchen has to start to make it
      const zone = ZONES.find(z => z.id === order.zone) ?? ZONES[0];
      const tn = tashkentNow(), [hh, mm] = due.split(':').map(Number), target = new Date(tn); target.setHours(hh, mm, 0, 0);
      if (target.getTime() < tn.getTime() - 60000) target.setDate(target.getDate() + 1);
      const now = Date.now(), dueAt = now + (target.getTime() - tn.getTime());
      const cookMin = Math.max(...made.map(linePrep)) + 5 + Math.min(10, Math.floor(count() / 4) * 2);
      const cooked = Math.max(now + 3 * 60000, dueAt - zone.mins * 60000);
      const start = Math.max(now, cooked - cookMin * 60000);
      startTrack({ id, placed: now, start, cooked, due: dueAt, zone: zone.id, address: order.address, total: orderTotal(), lines: made });
    }
    setCart([]);
    $('#coForm').hidden = true; $('#coSteps').hidden = true;
    const done = $('#coDone');
    done.hidden = false;
    done.innerHTML = `<div class="done-cup" aria-hidden="true">${svg(ITEM('kfc-1kg')!.art)}</div><h4>${t('done.title')}</h4>
      <p>${tf('done.text', { id, phone: '+998 ' + fmtPhone(order.phone) })}</p><p class="eta-big">${tf((order.method === 'delivery' ? 'done.etaDelivery' : 'done.eta') + (order.time !== 'asap' && order.method !== 'table' && order.tomorrow ? 'Tm' : ''), { t: due })}</p>
      ${gifts ? `<p class="stamp-plus">${tf('fri.got', { g: gifts })}</p>` : ''}
      ${isDelivery ? `<button type="button" class="btn btn-ink tk-done-btn" data-track>${t('tr.open')}</button>` : ''}
      <button type="button" class="watch-btn" data-watch><span class="wb-play" aria-hidden="true"></span><span><b>${t('afk.watch')}</b><small>${t('afk.watchSub')}</small></span></button>
      <button class="btn btn-acc" data-close>${t('done.close')}</button>`;
    $('[data-watch]', done).addEventListener('click', () => showOrder(made, dueLabel));
    done.querySelector('[data-track]')?.addEventListener('click', () => { closeOverlay($('#checkout')); setTimeout(openTrack, 250); });
    $<HTMLElement>('[data-close].btn', done).focus();
  } catch {
    fail(t('err.send'));
  } finally {
    sending = false; btn.disabled = false; if (order.step === 3) btn.textContent = t('co.send');
  }
}

/* =============== booking =============== */
const bk = { date: '', time: '', guests: 2 };
function renderBooking() {
  const now = tashkentNow();
  const fmt = new Intl.DateTimeFormat(state.lang === 'uz' ? 'uz-UZ' : state.lang === 'ru' ? 'ru-RU' : 'en-GB', { weekday: 'short' });
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) { const d = new Date(now); d.setDate(now.getDate() + i); days.push(d); }
  if (!bk.date) bk.date = ddmmyyyy(days[now.getHours() >= CAFE.close - 2 ? 1 : 0]);
  $('#bkDates').innerHTML = days.map(d => { const v = ddmmyyyy(d); return `<button type="button" role="radio" data-date="${v}" aria-checked="${bk.date === v}"><small>${esc(fmt.format(d))}</small><b>${pad(d.getDate())}/${pad(d.getMonth() + 1)}</b></button>`; }).join('');
  const isToday = bk.date === ddmmyyyy(now);
  const times: string[] = [];
  for (let h = CAFE.open + 1; h <= CAFE.close - 1; h++) for (const m of [0, 30]) { if (h === CAFE.close - 1 && m === 30) continue; if (isToday && h + m / 60 < now.getHours() + now.getMinutes() / 60 + 1) continue; times.push(`${pad(h)}:${pad(m)}`); }
  if (!times.includes(bk.time)) bk.time = '';
  $('#bkTimes').innerHTML = times.map(s => `<button type="button" role="radio" data-btime="${s}" aria-checked="${bk.time === s}">${s}</button>`).join('');
  $('output', $('#bkGuests')).textContent = String(bk.guests);
}
$('#bookForm').addEventListener('click', e => {
  const tg = e.target as Element;
  const d = tg.closest<HTMLElement>('[data-date]'); if (d) { bk.date = d.dataset.date!; renderBooking(); $<HTMLElement>(`[data-date="${bk.date}"]`).focus(); return; }
  const tm = tg.closest<HTMLElement>('[data-btime]'); if (tm) { bk.time = tm.dataset.btime!; $$('[data-btime]').forEach(b => b.setAttribute('aria-checked', String(b === tm))); return; }
  const g = tg.closest<HTMLElement>('#bkGuests [data-d]'); if (g) { bk.guests = clamp(bk.guests + Number(g.dataset.d), 1, 30); $('output', $('#bkGuests')).textContent = String(bk.guests); return; }
  if (tg.closest('#bkAgain')) { $('#bookDone').hidden = true; $$('.book-form > :not(#bookDone)').forEach(x => x.classList.remove('gone')); }
});
bindPhone($<HTMLInputElement>('#bkPhone'));
if (order.name) $<HTMLInputElement>('#bkName').value = order.name;
if (order.phone) $<HTMLInputElement>('#bkPhone').value = fmtPhone(order.phone);
$('#bookForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#bkErr'); err.textContent = '';
  const name = $<HTMLInputElement>('#bkName').value.trim(), phone = phoneDigits($<HTMLInputElement>('#bkPhone').value);
  if (name.length < 2 || !hasLetters(name)) { err.textContent = t('err.name'); $<HTMLElement>('#bkName').focus(); return; }
  if (phone.length !== 9) { err.textContent = t('err.phone'); $<HTMLElement>('#bkPhone').focus(); return; }
  if (!bk.date) { err.textContent = t('err.date'); return; }
  if (!bk.time) { err.textContent = t('err.time'); $<HTMLElement>('#bkTimes button')?.focus(); return; }
  const btn = $<HTMLButtonElement>('#bkSend'); btn.disabled = true;
  try {
    const body = ({ 'form-name': 'booking', 'bot-field': '', name, phone: '+998 ' + fmtPhone(phone), date: bk.date, time: bk.time, guests: String(bk.guests), comment: $<HTMLInputElement>('#bkComment').value.trim(), lang: state.lang });
    if (!(await submitForm(body))) throw new Error();
    store.set('vc-contact', { ...(store.get('vc-contact') as object ?? {}), name, phone });
    $$('.book-form > :not(#bookDone)').forEach(x => x.classList.add('gone'));
    const done = $('#bookDone'); done.hidden = false;
    done.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/><path class="tick" d="M14 25l7 7 13-15" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p>${esc(tf('book.done', { name, date: bk.date, time: bk.time, g: bk.guests }))}</p><button type="button" class="btn btn-line" id="bkAgain">${t('book.again')}</button>`;
  } catch { err.textContent = t('err.send'); }
  finally { btn.disabled = false; }
});

/* =============== visit =============== */
function renderVisit() {
  // until the cafe's real number is in, show Telegram instead of a placeholder
  const realPhone = /\d{2}\s?\d{3}/.test(CAFE.phone) && !/X/i.test(CAFE.phone);
  const tel = (n: string) => `<a href="tel:${n.replace(/\s/g, '')}">${esc(n)}</a>`;
  $('#phoneV').innerHTML = realPhone ? [CAFE.phone, CAFE.phone2].filter(Boolean).map(tel).join('<br>') : `<a href="https://t.me/${CAFE.telegram}" target="_blank" rel="noopener">Telegram @${esc(CAFE.telegram)}</a>`;
  const tg = $<HTMLAnchorElement>('#tgLink'), ig = $<HTMLAnchorElement>('#igLink');
  tg.href = `https://t.me/${CAFE.telegram}`; tg.textContent = `Telegram @${CAFE.telegram}`;
  ig.href = `https://instagram.com/${CAFE.instagram}`; ig.textContent = `Instagram @${CAFE.instagram}`;
  $<HTMLAnchorElement>('#routeLink').href = `https://www.google.com/maps/dir/?api=1&destination=${CAFE.lat},${CAFE.lng}`;
  $('#year').textContent = String(new Date().getFullYear());
}

/* =============== table mode =============== */
function renderTable() {
  const b = $('#tableBanner');
  b.hidden = !order.table || order.method !== 'table';
  if (!b.hidden) $('span', b).textContent = tf('table.banner', { n: order.table });
}
$('#tableExit').addEventListener('click', () => { order.table = ''; order.method = 'pickup'; renderTable(); history.replaceState(null, '', location.pathname + location.hash); });

/* =============== reveal (headings) =============== */
function initReveal() {
  if (reduced || !('IntersectionObserver' in window)) { $$('[data-split]').forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .4 });
  $$('[data-split]').forEach(el => io.observe(el));
}

/* =============== scroll loop =============== */
let ticking = false, tapeW = 0;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    root.classList.toggle('scrolled', scrollY > 20);
    const hr = hero.getBoundingClientRect();
    if (hr.bottom > 0) updateHero(heroProgress());
    if (!tapeW) tapeW = $('#tape').scrollWidth / 3 || 1;
    $('#tape').style.transform = `translate3d(${(-(scrollY * .35) % tapeW).toFixed(1)}px,0,0) skewX(var(--skew, 0deg))`;
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { heroP = -1; tapeW = 0; fitScene(); onScroll(); });

/* =============== boot =============== */
on('lang', () => { renderStatus(); renderReceipt(); renderChips(); renderGrid(); renderCart(); renderBooking(); renderTable(); if (!$('#itemModal').hidden && im.id) renderItem(); if (!$('#checkout').hidden && !$('#coForm').hidden) { if (order.step === 2) captureStep2(); renderCheckout(); } });
initPerf();
buildScene(); renderReceipt(); fitScene(); renderTape(); renderVisit(); setWorldUI();
applyLang();
initLab(); initBudget();
initPointer(t); initReveal(); initScroll(); initAfk(); initTrack();
on('lang', langTrack);
/* animations: full / light (automatic unless the visitor picks) */
function renderPerf() {
  const c = perfChoice();
  $('#perfSeg').innerHTML = (['auto', 'full', 'lite'] as const).map(k => `<button type="button" role="radio" data-perf="${k}" aria-checked="${(c ?? 'auto') === k}">${t('perf.' + k)}</button>`).join('');
  $('#perfNow').textContent = c ? '' : t(perf.lite ? 'perf.nowLite' : 'perf.nowFull');
}
$('#perfSeg').addEventListener('click', e => { const b = (e.target as Element).closest<HTMLElement>('[data-perf]'); if (!b || b.getAttribute('aria-checked') === 'true') return; const k = b.dataset.perf!; choosePerf(k === 'auto' ? null : (k as 'full' | 'lite')); });
on('lang', renderPerf); on('perf', renderPerf); renderPerf();
on('perf-auto', () => toast(t('perf.switched')));
if (reduced) root.classList.add('reduced');
// iOS Safari brings pages back from its back/forward cache with frozen transitions, a stale scroll state and the pinned
// hero scene unpinned. Instead of patching that state, load the page fresh (from cache, so it's instant).
addEventListener('pageshow', e => { if ((e as PageTransitionEvent).persisted) location.reload(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { heroP = -1; fitScene(); onScroll(); } });
updateHero(heroProgress()); onScroll();
const hideLoader = () => { const l = document.getElementById('loader'); if (!l || l.classList.contains('gone')) return; l.classList.add('gone'); setTimeout(() => l.remove(), 700); root.classList.add('ready'); };
if (document.readyState === 'complete') setTimeout(hideLoader, 500); else addEventListener('load', () => setTimeout(hideLoader, 400));
setTimeout(hideLoader, 3500);
