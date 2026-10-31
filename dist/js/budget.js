// "Will it fit my budget?" — a live budget tracker. Set the money and how many people, then tap dishes:
// each pick is taken off the budget, dishes that no longer fit are marked, and the split per person updates.
import { ITEMS, CATS, SIZES } from './data.js';
import { $, $$, clamp, reduced, esc, state, t, tf, money, on, addLine, toast, itemPic, tween } from './shared.js';
const bg = { amount: 150000, people: 2, cat: 'all' };
const picks = new Map();
const MAX_EACH = 20;
const priceOf = (i) => i.price + (i.sized ? SIZES[1].add : 0);
const spent = () => [...picks].reduce((a, [id, q]) => a + priceOf(ITEMS.find(i => i.id === id)) * q, 0);
const count = () => [...picks.values()].reduce((a, b) => a + b, 0);
const round500 = (n) => Math.ceil(n / 500) * 500;
const fmt = (n) => n.toLocaleString('ru-RU').replace(/\s/g, ' ');
const PCOL = ['#7A4FB0', '#E2452F', '#F4B731', '#3E8E6A', '#3E6FB8', '#C2185B', '#8A5A3B', '#4B4F5C', '#9D7BD1', '#E07B39'];
let shownLeft = bg.amount, stopCount = null;
function animateLeft(to) {
    stopCount?.();
    const from = shownLeft, el = $('#bgLeft');
    stopCount = tween(450, k => { shownLeft = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); el.textContent = money(Math.abs(shownLeft)); });
}
function renderCats() {
    $('#bgCats').innerHTML = [`<button role="tab" data-bcat="all" aria-selected="${bg.cat === 'all'}">${t('menu.all')}</button>`,
        ...CATS.map(c => `<button role="tab" data-bcat="${c.id}" aria-selected="${bg.cat === c.id}">${esc(c.name[state.lang])}</button>`)].join('');
}
function renderList() {
    const left = bg.amount - spent();
    const list = ITEMS.filter(i => bg.cat === 'all' || i.cat === bg.cat).sort((a, b) => (bg.cat === 'all' ? b.pop - a.pop : priceOf(a) - priceOf(b)));
    $('#bgList').innerHTML = list.map(i => {
        const q = picks.get(i.id) ?? 0, p = priceOf(i), fits = p <= left;
        return `<li class="pick${q ? ' on' : ''}${fits || q ? '' : ' nofit'}" data-id="${i.id}">
      <div class="pk-art">${itemPic(i, 120)}</div>
      <div class="pk-main"><b>${esc(i.name[state.lang])}${i.sized ? ' <small>M</small>' : ''}</b>
        <span>${money(p)}${fits || q ? '' : ` · <em>${t('budget.noFit')} (${tf('budget.need', { s: money(p - left) })})</em>`}</span></div>
      <div class="stepper sm pk-q">${q ? `<button type="button" data-bq="-1" aria-label="${t('aria.less')}: ${esc(i.name[state.lang])}">−</button><output>${q}</output>` : ''}<button type="button" data-bq="1" ${fits && q < MAX_EACH ? '' : 'disabled'} aria-label="${t('aria.more')}: ${esc(i.name[state.lang])}">+</button></div>
    </li>`;
    }).join('');
}
function renderMeter() {
    const s = spent(), left = bg.amount - s, n = count();
    const over = left < 0;
    $('#bgMeter').classList.toggle('over', over);
    $('#bgLeftLabel').textContent = over ? t('budget.overLabel') : t('budget.left');
    animateLeft(left);
    $('#bgBar').style.width = `${bg.amount > 0 ? clamp(s / bg.amount, 0, 1) * 100 : 0}%`;
    $('#bgSpent').textContent = `${money(s)}${n ? ` · ${tf('budget.items', { n })}` : ''}`;
    $('#bgEach').textContent = money(round500(s / bg.people));
    $('#bgPer').textContent = money(Math.floor(bg.amount / bg.people / 500) * 500);
    const fitN = ITEMS.filter(i => priceOf(i) <= left).length;
    $('#bgHint').textContent = !n ? t('budget.empty') : over ? tf('budget.over', { s: money(-left) }) : fitN ? tf('budget.fits', { n: fitN, s: money(left) }) : t('budget.none');
    $('#bgSplit').innerHTML = Array.from({ length: bg.people }, (_, k) => `<span style="--pc:${PCOL[k % PCOL.length]}"><i>${k + 1}</i>${money(round500(s / bg.people))}</span>`).join('');
    $('#bgHeads').innerHTML = Array.from({ length: bg.people }, (_, k) => `<i style="--pc:${PCOL[k % PCOL.length]};--k:${k}"></i>`).join('');
    const add = $('#bgAdd');
    add.textContent = n ? `${t('budget.addAll')} · ${money(s)}` : t('budget.addAll');
    add.disabled = !n;
    $('#bgClear').disabled = !n;
    $('#bgSurprise').disabled = left < Math.min(...ITEMS.map(priceOf));
    $('output', $('#bgPeople')).textContent = String(bg.people);
}
function render() { renderList(); renderMeter(); }
function flyCost(from, amount) {
    if (reduced)
        return;
    const a = from.getBoundingClientRect(), b = $('#bgLeft').getBoundingClientRect();
    const el = document.createElement('span');
    el.className = 'cost-fly';
    el.textContent = `−${fmt(amount)}`;
    el.style.left = `${a.left + a.width / 2}px`;
    el.style.top = `${a.top}px`;
    document.body.appendChild(el);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - a.top;
    const onScreen = b.top > 0 && b.bottom < innerHeight;
    el.animate(onScreen
        ? [{ transform: 'translate(-50%, 0) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx * .5}px), ${Math.min(-60, dy * .5 - 80)}px) scale(1.15)`, opacity: 1, offset: .5 }, { transform: `translate(calc(-50% + ${dx}px), ${dy}px) scale(.6)`, opacity: 0 }]
        : [{ transform: 'translate(-50%, 0)', opacity: 1 }, { transform: 'translate(-50%, -70px)', opacity: 0 }], { duration: onScreen ? 700 : 600, easing: 'cubic-bezier(.4,0,.3,1)' }).onfinish = () => el.remove();
    const m = $('#bgMeter');
    m.classList.remove('bump');
    void m.offsetWidth;
    m.classList.add('bump');
}
/** Fills what's left of the budget with a random, filling set (a main, then a side or sweet, then a drink, round after round). */
function surprise() {
    let left = bg.amount - spent();
    const main = ITEMS.filter(i => ['burger', 'lavash', 'hotdog'].includes(i.cat));
    const side = ITEMS.filter(i => i.cat === 'sides' || i.cat === 'sweet');
    const drink = ITEMS.filter(i => ['coffee', 'cold', 'tea'].includes(i.cat));
    const rnd = (a) => { const ok = a.filter(i => priceOf(i) <= left); return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null; };
    const added = [];
    for (let round = 0; round < bg.people; round++) {
        for (const pool of [main, side, drink]) {
            const it = rnd(pool);
            if (it && (picks.get(it.id) ?? 0) < MAX_EACH) {
                picks.set(it.id, (picks.get(it.id) ?? 0) + 1);
                left -= priceOf(it);
                added.push(it);
            }
        }
    }
    if (!added.length)
        return;
    render();
    if (!reduced)
        $$('#bgList .pick.on').forEach((li, k) => li.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)', offset: .4 }, { transform: 'scale(1)' }], { duration: 380, delay: k * 40 }));
}
export function initBudget() {
    renderCats();
    render();
    $('#budgetForm').addEventListener('submit', e => e.preventDefault());
    const range = $('#bgRange'), amt = $('#bgAmount');
    const setAmount = (v, fromRange = false) => {
        bg.amount = clamp(Math.round(v / 1000) * 1000, 0, 5000000);
        if (!fromRange)
            range.value = String(clamp(bg.amount, 20000, 600000));
        if (document.activeElement !== amt)
            amt.value = fmt(bg.amount);
        range.style.setProperty('--fill', `${((Number(range.value) - 20000) / (600000 - 20000)) * 100}%`);
        render();
    };
    setAmount(bg.amount);
    range.addEventListener('input', () => setAmount(Number(range.value), true));
    amt.addEventListener('input', () => { const d = amt.value.replace(/\D/g, '').slice(0, 7); amt.value = d ? fmt(Number(d)) : ''; setAmount(Number(d) || 0); });
    amt.addEventListener('blur', () => { amt.value = fmt(bg.amount); });
    $('#bgPeople').addEventListener('click', e => { const d = e.target.closest('[data-d]'); if (d) {
        bg.people = clamp(bg.people + Number(d.dataset.d), 1, 10);
        renderMeter();
    } });
    $('#bgCats').addEventListener('click', e => { const b = e.target.closest('[data-bcat]'); if (!b)
        return; bg.cat = b.dataset.bcat; renderCats(); renderList(); });
    $('#bgList').addEventListener('click', e => {
        const b = e.target.closest('[data-bq]');
        if (!b || b.disabled)
            return;
        const id = b.closest('.pick').dataset.id, it = ITEMS.find(i => i.id === id);
        const q = clamp((picks.get(id) ?? 0) + Number(b.dataset.bq), 0, MAX_EACH);
        if (Number(b.dataset.bq) > 0)
            flyCost(b, priceOf(it));
        q ? picks.set(id, q) : picks.delete(id);
        render();
        $(`#bgList [data-id="${id}"] [data-bq="${b.dataset.bq}"]:not(:disabled)`)?.focus({ preventScroll: true });
    });
    $('#bgSurprise').addEventListener('click', surprise);
    $('#bgClear').addEventListener('click', () => { picks.clear(); render(); });
    $('#bgAdd').addEventListener('click', e => {
        if (!picks.size)
            return;
        let first = true;
        picks.forEach((q, id) => { const it = ITEMS.find(i => i.id === id); addLine({ kind: 'item', item: id, size: it.sized ? 'M' : undefined, extras: [] }, q, first ? e.currentTarget : null); first = false; });
        toast(t('budget.added'));
    });
    on('lang', () => { renderCats(); render(); });
}
