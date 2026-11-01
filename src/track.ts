// Delivery tracking. After a delivery order is sent, a "track" record is kept in this browser. While that delivery is
// actually running (from when the kitchen starts until a little after the promised time) a pulsing pill sits in the
// bottom corner of every page; it opens a tracker with the stage, a countdown and a map with the courier on the route.
// There is no courier GPS behind this site: stages are estimated from the order time, prep time and the zone's ride
// time, and the tracker says so. Preview with ?trackdemo (a demo delivery that started 6 minutes ago) or ?trackdemo=25 (25 minutes in: on the way).
import { $, clamp, reduced, esc, state, t, tf, store, money, toast, type Line } from './shared.js';
import { CAFE, ZONES } from './data.js';
import { showOrder } from './afk.js';

export interface Track { id: string; placed: number; start: number; cooked: number; due: number; zone: string; address: string; total: number; lines: Line[] }
type Stage = 'accepted' | 'cooking' | 'pickup' | 'road' | 'near' | 'late';
const STAGES: Stage[] = ['accepted', 'cooking', 'pickup', 'road', 'near'];
const GRACE = 20 * 60000; // after the promised time the pill stays this long ("any minute now"), then it's considered delivered
const MIN = 60000;

let tr: Track | null = null, pill: HTMLButtonElement | null = null, panel: HTMLElement | null = null, timer = 0, lastStage: Stage | null = null;
const load = (): Track | null => { const v = store.get('vc-track') as Track | null; return v && typeof v.due === 'number' && typeof v.id === 'string' ? v : null; };
const tk = (ms: number) => { const d = new Date(ms + (new Date().getTimezoneOffset() + 300) * MIN); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const running = (x: Track | null, now = Date.now()) => !!x && now >= x.start && now < x.due + GRACE;

function stageAt(x: Track, now: number): Stage {
  if (now >= x.due) return 'late';
  if (now < x.start + Math.min(2 * MIN, (x.cooked - x.start) * .2)) return 'accepted';
  if (now < x.cooked) return 'cooking';
  if (now < x.cooked + 2 * MIN) return 'pickup';
  if (now < x.due - 3 * MIN) return 'road';
  return 'near';
}
/** 0 at the cafe, 1 at the door. */
const rideK = (x: Track, now: number) => clamp((now - (x.cooked + 2 * MIN)) / Math.max(MIN, x.due - x.cooked - 2 * MIN));

/** Records a delivery that was just sent. */
export function startTrack(x: Track) {
  tr = x; store.set('vc-track', x); lastStage = null; refresh();
}
export function openTrack() { if (tr && running(tr)) { build(); render(); panel!.hidden = false; requestAnimationFrame(() => panel!.classList.add('open')); document.documentElement.classList.add('locked'); $<HTMLElement>('.tk-x', panel!).focus({ preventScroll: true }); tick(); } }
function closeTrack() {
  if (!panel || panel.hidden) return;
  panel.classList.remove('open'); document.documentElement.classList.remove('locked');
  if (document.hidden || reduced) panel.hidden = true;
  else setTimeout(() => { if (panel && !panel.classList.contains('open')) panel.hidden = true; }, 350);
  pill?.focus({ preventScroll: true });
  tick();
}
function finish() { store.set('vc-track', null); tr = null; closeTrack(); refresh(); toast(t('tr.thanks')); }

/* ---------- the map: a few Andijan-ish blocks, a canal, the route, the cafe and the door ---------- */
const ROUTE_NEAR = 'M70 210 H150 Q166 210 166 194 V120 Q166 104 182 104 H300 Q316 104 316 88 V58 H372';
const ROUTE_CITY = 'M70 210 H110 Q126 210 126 194 V160 Q126 144 142 144 H236 Q252 144 252 128 V70 Q252 54 268 54 H372';
function mapSVG(zone: string) {
  const blocks: string[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = 8 + c * 72 + (r % 2) * 10, y = 8 + r * 62;
    blocks.push(`<rect x="${x}" y="${y}" width="${52 + ((r * 3 + c) % 3) * 6}" height="${40 + ((r + c) % 2) * 6}" rx="8" class="tk-block"/>`);
  }
  const d = zone === 'city' ? ROUTE_CITY : ROUTE_NEAR;
  return `<svg viewBox="0 0 440 260" class="tk-svg" aria-hidden="true">
    <rect width="440" height="260" class="tk-ground"/>${blocks.join('')}
    <path d="M-10 236 C80 222 140 250 230 236 S380 214 450 230" class="tk-canal"/>
    <path d="M0 210 H440 M0 104 H440 M0 144 H440 M166 0 V260 M316 0 V260 M126 0 V260 M252 0 V260 M0 54 H440" class="tk-street"/>
    <path id="tkRoute" d="${d}" class="tk-route"/><path id="tkDone" d="${d}" class="tk-route-done"/>
    <g transform="translate(70 210)" class="tk-cafe"><circle r="17"/><text y="4" text-anchor="middle" style="font-size:10px">FFS</text><g id="tkSteam"></g></g>
    <g transform="translate(372 58)" class="tk-home"><circle r="22" class="tk-pulse"/><path d="M-11 2 L0 -9 L11 2 V12 H-11z"/><rect x="-3" y="4" width="6" height="8" rx="1"/></g>
    <g id="tkBike"><circle r="15" class="tk-bike-bg"/><g transform="scale(.9)"><circle cx="-7" cy="5" r="4" class="tk-wheel"/><circle cx="8" cy="5" r="4" class="tk-wheel"/><path d="M-7 5 L-1 -3 H6 L8 5 M-1 -3 L-4 -7 M4 -3 V-8 H9" class="tk-frame"/><rect x="-11" y="-11" width="9" height="8" rx="2" class="tk-box"/></g></g>
  </svg>`;
}

function build() {
  if (panel) return;
  panel = document.createElement('div');
  panel.className = 'modal tk-modal'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'tkTitle');
  panel.innerHTML = `<div class="scrim" data-tk-close></div><div class="sheet tk-sheet"><button class="x tk-x" data-tk-close>×</button><div id="tkBody"></div></div>`;
  document.body.appendChild(panel);
  panel.addEventListener('click', e => {
    const tg = e.target as Element;
    if (tg.closest('[data-tk-close]')) closeTrack();
    else if (tg.closest('[data-tk-got]')) finish();
    else if (tg.closest('[data-tk-watch]') && tr) showOrder(tr.lines, tk(tr.due));
  });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeTrack(); } });
}
const contactHref = () => (/\d{3}/.test(CAFE.phone) && !/X/.test(CAFE.phone) ? `tel:${CAFE.phone.replace(/\s/g, '')}` : `https://t.me/${CAFE.telegram}`);
function render() {
  if (!panel || !tr) return;
  const x = tr, now = Date.now(), st = stageAt(x, now);
  const zone = ZONES.find(z => z.id === x.zone) ?? ZONES[0];
  const n = x.lines.reduce((a, l) => a + l.qty, 0);
  $('.tk-x', panel).setAttribute('aria-label', t('aria.close'));
  $('#tkBody', panel).innerHTML = `
    <p class="tk-id">${tf('tr.order', { id: esc(x.id) })} · ${tf('tr.items', { n })} · ${money(x.total)}</p>
    <h3 id="tkTitle">${t('tr.s.' + st)}</h3>
    <div class="tk-eta"><b id="tkMins"></b><span>${tf('tr.arrive', { t: tk(x.due) })}</span></div>
    <div class="tk-map">${mapSVG(x.zone)}<span class="tk-dist" id="tkDist"></span></div>
    <ol class="tk-steps">${STAGES.map((s, i) => { const at = STAGES.indexOf(st === 'late' ? 'near' : st); return `<li class="${i < at ? 'done' : i === at ? 'now' : ''}"><i></i><div><b>${t('tr.s.' + s)}</b><small>${t('tr.d.' + s)}</small>${s === 'cooking' && i === at ? `<button type="button" class="btn btn-mini" data-tk-watch>${t('tr.watch')}</button>` : ''}</div></li>`; }).join('')}</ol>
    <p class="tk-addr"><span>${t('tr.to')}</span> ${esc(x.address)} <small>· ${esc(zone.name[state.lang])}</small></p>
    <div class="tk-acts"><a class="btn btn-line" href="${contactHref()}" target="_blank" rel="noopener">${t('tr.call')}</a><button type="button" class="btn btn-acc" data-tk-got>${t('tr.got')}</button></div>
    <p class="hint tk-note">${t('tr.note')}</p>`;
  lastStage = st;
  tickMap();
}
function tickMap() {
  if (!panel || !tr || panel.hidden) return;
  const now = Date.now(), st = stageAt(tr, now);
  if (st !== lastStage) { render(); return; }
  const left = Math.max(0, Math.ceil((tr.due - now) / MIN));
  $('#tkMins', panel).textContent = st === 'late' ? t('tr.anyMin') : tf('tr.mins', { n: left });
  const route = panel.querySelector<SVGPathElement>('#tkRoute'), done = panel.querySelector<SVGPathElement>('#tkDone');
  if (!route || !done) return;
  const L = route.getTotalLength(), k = st === 'late' ? .97 : rideK(tr, now);
  const p = route.getPointAtLength(L * k), q = route.getPointAtLength(Math.min(L, L * k + 2));
  const flip = q.x < p.x ? -1 : 1, bob = reduced ? 0 : Math.sin(now / 160) * (k > 0 && k < 1 ? 1.2 : 0);
  const bike = panel.querySelector('#tkBike')!;
  // before the ride the courier waits next to the cafe (only once it's his turn), so the cafe pin stays visible
  if (k <= 0) { bike.setAttribute('transform', 'translate(104 180)'); bike.setAttribute('opacity', st === 'pickup' ? '1' : '0'); }
  else { bike.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - 2 + bob).toFixed(1)}) scale(${flip} 1)`); bike.setAttribute('opacity', '1'); }
  done.style.strokeDasharray = `${L * k} ${L}`;
  const km = (tr.zone === 'city' ? 5.2 : 2.4) * (1 - k);
  $('#tkDist', panel).textContent = k > 0 ? tf('tr.km', { n: km.toFixed(1) }) : t('tr.atCafe');
  const steam = panel.querySelector('#tkSteam');
  if (steam) steam.innerHTML = st === 'cooking' || st === 'accepted' ? [0, 1, 2].map(i => { const f = ((now / 1400 + i / 3) % 1); return `<circle cx="${(i - 1) * 7}" cy="${(-20 - f * 22).toFixed(1)}" r="${(3 + f * 4).toFixed(1)}" opacity="${(1 - f).toFixed(2)}" class="tk-steam"/>`; }).join('') : '';
}

/** Shows or hides the pill and updates its text. */
function refresh() {
  tr = tr ?? load();
  if (tr && Date.now() >= tr.due + GRACE) { store.set('vc-track', null); tr = null; }
  const on = running(tr);
  if (!pill) {
    pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'tk-pill'; pill.hidden = true;
    pill.innerHTML = `<span class="tk-dot" aria-hidden="true"></span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17 L10 9 H15 L18 17 M10 9 L8 6 M14 9 V5 H19"/></svg><span class="tk-pt"><b></b><small></small></span>`;
    pill.addEventListener('click', openTrack);
    document.body.appendChild(pill);
  }
  pill.hidden = !on;
  document.documentElement.classList.toggle('tracking', on);
  if (on && tr) {
    const now = Date.now(), st = stageAt(tr, now);
    $('b', pill).textContent = t('tr.s.' + st);
    $('small', pill).textContent = st === 'late' ? t('tr.anyMin') : `${tf('tr.order', { id: tr.id })} · ${tf('tr.mins', { n: Math.max(0, Math.ceil((tr.due - now) / MIN)) })}`;
    pill.setAttribute('aria-label', `${t('tr.open')}: ${t('tr.s.' + st)}`);
  }
  if (!on && panel && !panel.hidden) closeTrack();
}
function tick() {
  clearTimeout(timer);
  refresh();
  const open = !!panel && !panel.hidden;
  if (open) tickMap();
  // a scheduled delivery that hasn't started yet: check again when the kitchen starts
  const wait = open ? 60 : tr && Date.now() < tr.start ? Math.min(60000, tr.start - Date.now() + 50) : 15000;
  timer = window.setTimeout(tick, wait);
}

export function initTrack() {
  const demo = new URLSearchParams(location.search).get('trackdemo');
  if (demo !== null) {
    const now = Date.now(), start = now - (Number(demo) || 6) * MIN;
    tr = { id: 'DEMO1', placed: start, start, cooked: start + 14 * MIN, due: start + 42 * MIN, zone: 'near', address: 'Bobur shoh koʻchasi, 12', total: 96000,
      lines: [{ sig: 'd1', kind: 'item', item: 'violette-burger', extras: [], qty: 1, who: -1 }, { sig: 'd2', kind: 'item', item: 'fries', extras: [], qty: 1, who: -1 }, { sig: 'd3', kind: 'item', item: 'iced-violette', size: 'M', extras: [], qty: 1, who: -1 }] };
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  addEventListener('pageshow', () => { if (panel && !panel.classList.contains('open')) panel.hidden = true; tick(); });
  addEventListener('storage', e => { if (e.key === 'vc-track') { tr = null; tick(); } });
  tick();
}
export const langTrack = () => { refresh(); if (panel && !panel.hidden) render(); };
