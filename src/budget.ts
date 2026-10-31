// "Will it fit my budget?" — a slot machine that builds a filling set for each person within the money they have.
import { ITEMS, SIZES, type Item } from './data.js';
import { svg } from './art.js';
import { $, $$, clamp, reduced, esc, state, t, tf, money, on, addLine, toast, itemPic } from './shared.js';

type Mood = 'food' | 'coffee' | 'both';
const bg = { amount: 100000, people: 2, mood: 'both' as Mood };
let last: (Item | null)[][] | null = null;

const priceOf = (i: Item) => i.price + (i.sized ? SIZES[1].add : 0);
function pools(m: Mood): Item[][] {
  const main = ITEMS.filter(i => ['burger', 'lavash', 'hotdog'].includes(i.cat));
  const sides = ITEMS.filter(i => i.cat === 'sides');
  const sweets = ITEMS.filter(i => i.cat === 'sweet');
  const coffee = ITEMS.filter(i => ['coffee', 'cold'].includes(i.cat) && i.role === 'drink');
  const colds = ITEMS.filter(i => i.cat === 'cold' || i.cat === 'tea');
  if (m === 'food') return [main, sides, colds];
  if (m === 'coffee') return [sweets, sweets.filter(s => s.id.includes('croissant')), coffee];
  return [main, [...sides, ...sweets], coffee];
}
const sum = (set: (Item | null)[]) => set.reduce((a, i) => a + (i ? priceOf(i) : 0), 0);
function pickSets(): { sets: (Item | null)[][]; min: number } {
  const [A, Bp, Cp] = pools(bg.mood);
  const per = bg.amount / bg.people;
  const minA = Math.min(...A.map(priceOf)), minC = Math.min(...Cp.map(priceOf));
  const minPossible = Math.min(minA, minC);
  if (per < minPossible) return { sets: [], min: Math.ceil(minPossible * bg.people / 1000) * 1000 };
  const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const used = new Map<string, number>();
  const sets: (Item | null)[][] = [];
  for (let p = 0; p < bg.people; p++) {
    let best: (Item | null)[] | null = null, bestScore = -1;
    for (let k = 0; k < 500; k++) {
      const shape = k < 300 ? 3 : k < 420 ? 2 : 1;
      const cand: (Item | null)[] = shape === 3 ? [rnd(A), rnd(Bp), rnd(Cp)] : shape === 2 ? [rnd(A), null, rnd(Cp)] : [Math.random() < .5 ? rnd(A) : null, null, null];
      if (shape === 1 && !cand[0]) cand[2] = rnd(Cp);
      const s = sum(cand);
      if (s > per || s === 0) continue;
      const rep = cand.reduce((a, i) => a + (i ? used.get(i.id) ?? 0 : 0), 0);
      const score = s / per + (shape === 3 ? .35 : shape === 2 ? .15 : 0) - rep * .12 + Math.random() * .1;
      if (score > bestScore) { bestScore = score; best = cand; }
    }
    if (!best) return { sets: [], min: Math.ceil(minPossible * bg.people / 1000) * 1000 };
    best.forEach(i => i && used.set(i.id, (used.get(i.id) ?? 0) + 1));
    sets.push(best);
  }
  return { sets, min: 0 };
}

const REEL_H = () => $('.reel').getBoundingClientRect().height || 120;
function cellHTML(i: Item | null) {
  return `<div class="cell">${i ? itemPic(i, 300, '', true) : '<span class="cell-none">—</span>'}</div>`;
}
function spinReels(final: (Item | null)[], done: () => void) {
  const strips = $$('.reel .strip');
  const [A, Bp, Cp] = pools(bg.mood);
  const pool = [A, Bp, Cp];
  const N = 16;
  let finished = 0;
  strips.forEach((s, r) => {
    const cells: (Item | null)[] = Array.from({ length: N - 1 }, () => pool[r][Math.floor(Math.random() * pool[r].length)]);
    cells.push(final[r]);
    s.innerHTML = cells.map(cellHTML).join('');
    const h = REEL_H();
    if (reduced) { s.style.transform = `translateY(${-(N - 1) * h}px)`; if (++finished === 3) done(); return; }
    const a = s.animate([{ transform: 'translateY(0)', filter: 'blur(0)' }, { transform: `translateY(${-(N - 4) * h}px)`, filter: 'blur(2px)', offset: .7 }, { transform: `translateY(${-(N - 1) * h - 12}px)`, filter: 'blur(0)', offset: .92 }, { transform: `translateY(${-(N - 1) * h}px)` }],
      { duration: 1300 + r * 380, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'forwards' });
    a.onfinish = () => { s.style.transform = `translateY(${-(N - 1) * h}px)`; a.cancel(); $('#slot').classList.add(`hit${r}`); if (++finished === 3) done(); };
  });
}
function renderResult() {
  const box = $('#bgResult');
  if (!last) { box.innerHTML = ''; return; }
  const total = last.reduce((a, s) => a + sum(s), 0);
  box.innerHTML = `<ul class="bg-people">${last.map((s, p) => `<li style="--k:${p}"><span class="bg-who">${tf('budget.person', { n: p + 1 })}</span>
      <div class="bg-items">${s.filter(Boolean).map(i => `<span class="bg-item">${itemPic(i!, 120)}<small>${esc(i!.name[state.lang])}</small></span>`).join('')}</div>
      <b>${money(sum(s))}</b></li>`).join('')}</ul>
    <div class="bg-sum"><div><span>${t('budget.total')}</span><b>${money(total)}</b></div><div><span>${t('budget.left')}</span><b>${money(bg.amount - total)}</b></div>
    <button type="button" class="btn btn-ink" id="bgAdd">${t('budget.addAll')}</button></div>`;
}
const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/\s/g, ' ');
function setAmount(v: number, fromRange = false) {
  bg.amount = clamp(Math.round(v / 1000) * 1000, 0, 5000000);
  if (!fromRange) $<HTMLInputElement>('#bgRange').value = String(clamp(bg.amount, 20000, 600000));
  const inp = $<HTMLInputElement>('#bgAmount');
  if (document.activeElement !== inp) inp.value = fmt(bg.amount);
  const r = $<HTMLInputElement>('#bgRange');
  r.style.setProperty('--fill', `${((Number(r.value) - 20000) / (600000 - 20000)) * 100}%`);
}
function renderMood() {
  $('#bgMood').innerHTML = (['both', 'food', 'coffee'] as Mood[]).map(m => `<button type="button" role="radio" data-mood="${m}" aria-checked="${bg.mood === m}">${t('mood.' + m)}</button>`).join('');
  $('output', $('#bgPeople')).textContent = String(bg.people);
}
export function initBudget() {
  renderMood(); setAmount(bg.amount);
  // idle reels show a teaser
  const teaser = pools('both');
  $$('.reel .strip').forEach((s, r) => { s.innerHTML = cellHTML(teaser[r][r + 1]); });
  $('#bgRange').addEventListener('input', e => setAmount(Number((e.target as HTMLInputElement).value), true));
  const amt = $<HTMLInputElement>('#bgAmount');
  amt.addEventListener('input', () => { const d = amt.value.replace(/\D/g, '').slice(0, 7); amt.value = d ? fmt(Number(d)) : ''; setAmount(Number(d) || 0); });
  amt.addEventListener('blur', () => { amt.value = fmt(bg.amount); });
  $('#budgetForm').addEventListener('click', e => {
    const tg = e.target as Element;
    const m = tg.closest<HTMLElement>('[data-mood]'); if (m) { bg.mood = m.dataset.mood as Mood; renderMood(); $<HTMLElement>(`[data-mood="${bg.mood}"]`).focus(); return; }
    const d = tg.closest<HTMLElement>('#bgPeople [data-d]'); if (d) { bg.people = clamp(bg.people + Number(d.dataset.d), 1, 10); renderMood(); }
  });
  let spinning = false;
  $('#budgetForm').addEventListener('submit', e => {
    e.preventDefault();
    if (spinning) return;
    const { sets, min } = pickSets();
    const slot = $('#slot');
    slot.classList.remove('hit0', 'hit1', 'hit2');
    if (!sets.length) { last = null; $('#bgResult').innerHTML = `<p class="bg-low">${esc(tf('budget.low', { n: bg.people, m: money(min) }))}</p>`; slot.classList.remove('shake'); void slot.offsetWidth; slot.classList.add('shake'); return; }
    spinning = true;
    slot.classList.remove('pull'); void slot.offsetWidth; slot.classList.add('pull');
    $('#bgResult').classList.add('wait');
    spinReels(sets[0], () => {
      spinning = false; last = sets; renderResult();
      $('#bgResult').classList.remove('wait');
      $('#bgSpin span').textContent = t('budget.again');
    });
  });
  $('#bgResult').addEventListener('click', e => {
    if (!(e.target as Element).closest('#bgAdd') || !last) return;
    let first = true;
    last.forEach(s => s.forEach(i => { if (!i) return; addLine({ kind: 'item', item: i.id, size: i.sized ? 'M' : undefined, extras: [] }, 1, first ? $('#bgAdd') : null); first = false; }));
    toast(t('budget.added'));
  });
  on('lang', () => { renderMood(); renderResult(); if (last) $('#bgSpin span').textContent = t('budget.again'); });
}
