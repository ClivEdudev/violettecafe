// Order tracking. The status comes only from the Frans Burger kitchen: staff press buttons under the order in Telegram
// (accept → ready → on the way → delivered, or cancel), the bot saves it, and this page asks for it every few seconds.
// Nothing here moves forward on its own. Works for delivery, pickup and table orders; delivery also gets the map,
// where the courier only starts moving once the kitchen presses "on the way" (his position is an estimate, no GPS).
// Preview with ?trackdemo=new|acc|rdy|out|done|cy (&kind=p for pickup, t for table).
import { $, clamp, reduced, esc, state, t, tf, store, money, toast, unlockSound, audio, slowNet, type Line } from './shared.js';
import { CAFE, ZONES } from './data.js';

export type St = 'new' | 'acc' | 'rdy' | 'out' | 'done' | 'cy';
export type Kind = 'd' | 'p' | 't';
export interface Track {
  id: string; key: string; kind: Kind; placed: number; zone: string; address: string; total: number; lines: Line[];
  cookMin: number; st: St; h: Partial<Record<St, number>>; demo?: boolean;
  bot?: string; notify?: boolean; tg?: boolean; // bot username; system notifications on; customer opened the bot
}
const MIN = 60000;
const KEEP_DONE = 30 * MIN; // a finished order stays visible this long
const GIVE_UP = 5 * 60 * MIN; // stop asking after this
const SLOW = 8 * MIN; // no answer from the kitchen after this → suggest calling
const FLOW: Record<Kind, St[]> = { d: ['new', 'acc', 'rdy', 'out', 'done'], p: ['new', 'acc', 'rdy', 'done'], t: ['new', 'acc', 'rdy', 'done'] };
const ST_OK = new Set<St>(['new', 'acc', 'rdy', 'out', 'done', 'cy']);

let tr: Track | null = null, pill: HTMLButtonElement | null = null, panel: HTMLElement | null = null;
let timer = 0, anim = 0, polling = false, renderedSt: St | null = null, fails = 0;

const load = (): Track | null => {
  const v = store.get('vc-track') as Track | null;
  return v && typeof v.id === 'string' && typeof v.key === 'string' && ST_OK.has(v.st) && v.h && typeof v.placed === 'number' ? v : null;
};
const save = () => { if (tr && !tr.demo) store.set('vc-track', tr); };
const tk = (ms: number) => { const d = new Date(ms + (new Date().getTimezoneOffset() + 300) * MIN); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const zoneOf = (x: Track) => ZONES.find(z => z.id === x.zone) ?? ZONES[0];
const ended = (x: Track) => x.st === 'done' || x.st === 'cy';
const title = (x: Track) => x.st === 'rdy' || x.st === 'done' ? t(`tk.t.${x.st}.${x.kind}`) : t('tk.t.' + x.st);
const stepName = (s: St, kind: Kind) => (s === 'done' ? t('tk.s.done.' + kind) : t('tk.s.' + s));
const expired = (x: Track, now = Date.now()) => (x.st === 'done' && now - (x.h.done ?? now) > KEEP_DONE) || now - x.placed > GIVE_UP;

/** When it should be ready / at the door, from what the kitchen has actually pressed so far. */
function estimate(x: Track): { ready?: number; arrive?: number } {
  const ride = zoneOf(x).mins * MIN;
  const ready = x.h.rdy ?? (x.h.acc ? Math.max(x.h.acc + x.cookMin * MIN, Date.now() + MIN) : undefined);
  if (x.kind !== 'd' || !ready) return { ready };
  const leave = x.h.out ?? Math.max(ready + 3 * MIN, Date.now());
  return { ready, arrive: Math.max(leave + ride, Date.now() + MIN) };
}
/** 0 at the cafe, 1 at the door: only moves after "on the way". */
function rideK(x: Track, now: number) {
  if (x.st === 'done') return 1;
  if (x.st !== 'out' || !x.h.out) return 0;
  return clamp((now - x.h.out) / (zoneOf(x).mins * MIN), 0, .94);
}

/** Starts following an order that was just sent and saved by the bot. */
export function startTrack(x: Omit<Track, 'st' | 'h' | 'notify' | 'tg'>) {
  tr = { ...x, st: 'new', h: { new: x.placed } }; save(); renderedSt = null; tick();
}
export function openTrack() {
  if (!tr) return;
  build(); render(); panel!.hidden = false; requestAnimationFrame(() => panel!.classList.add('open'));
  document.documentElement.classList.add('locked'); $<HTMLElement>('.tk-x', panel!).focus({ preventScroll: true });
  loop();
}
function closeTrack() {
  if (!panel || panel.hidden) return;
  panel.classList.remove('open'); document.documentElement.classList.remove('locked'); cancelAnimationFrame(anim);
  if (document.hidden || reduced) panel.hidden = true;
  else setTimeout(() => { if (panel && !panel.classList.contains('open')) panel.hidden = true; }, 350);
  pill?.focus({ preventScroll: true });
}
function finish() { const was = tr; store.set('vc-track', null); tr = null; closeTrack(); refresh(); if (was?.st === 'done' || was?.st === 'out') toast(t('tk.enjoy')); }

/* ---------- telling the customer: sound + vibration, a system notification, and the tab title ---------- */
let baseTitle = '';
function chime(strong: boolean) {
  const actx = audio();
  if (!actx) return;
  try {
    void actx.resume();
    const t0 = actx.currentTime, notes = strong ? [784, 1047, 1319] : [880, 1175];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), at = t0 + i * .16;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(.22, at + .02); g.gain.exponentialRampToValueAtTime(.0001, at + .55);
      o.connect(g).connect(actx.destination); o.start(at); o.stop(at + .6);
    });
  } catch { /* no sound is fine */ }
}
const canSystem = () => 'Notification' in window && 'serviceWorker' in navigator && isSecureContext;
async function systemNote(x: Track) {
  if (!x.notify || !canSystem() || Notification.permission !== 'granted') return;
  const opts: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = { body: tf('tr.order', { id: x.id }), icon: '/icon-192.png', badge: '/icon-192.png', tag: 'ffs-' + x.id, renotify: true, vibrate: [200, 100, 200] };
  // the service worker may be blocked (private windows, some browsers): don't wait for it forever
  const ready = Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, no) => setTimeout(() => no(new Error('no sw')), 3000))]);
  try { const reg = await ready; await reg.showNotification('Frans Burger · ' + title(x), opts); }
  catch { try { new Notification('Frans Burger · ' + title(x), opts); } catch { /* not allowed here */ } }
}
/** The big moments: ready to pick up / at the table, courier left, delivered, cancelled. */
function alertUser(x: Track) {
  const big = (x.st === 'rdy' && x.kind !== 'd') || x.st === 'out' || x.st === 'done' || x.st === 'cy';
  chime(big);
  try { navigator.vibrate?.(big ? [250, 120, 250, 120, 400] : [150]); } catch { /* no vibration */ }
  void systemNote(x);
  if (document.hidden) { baseTitle = baseTitle || document.title; document.title = '🔔 ' + title(x); }
}
async function enableSystem() {
  if (!tr || !canSystem()) return;
  unlockSound();
  const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (p !== 'granted') { toast(t('nt.denied')); renderNotify(); return; }
  try { await navigator.serviceWorker.register('/sw.js'); } catch { /* page notifications still work on desktop */ }
  tr.notify = true; save(); renderNotify(); toast(t('nt.webDone'));
}

/** The "tell me when it's ready" box: on the order-sent screen and in the tracker. */
function notifyHTML(x: Track) {
  if (x.demo || ended(x)) return '';
  const tgHref = x.bot ? `https://t.me/${encodeURIComponent(x.bot)}?start=o_${x.id}_${x.key.slice(0, 16)}` : '';
  const sys = canSystem() ? (x.notify && Notification.permission === 'granted'
    ? `<span class="nt-on">${t('nt.webOn')}</span>`
    : Notification.permission === 'denied' ? `<span class="nt-off">${t('nt.denied')}</span>`
    : `<button type="button" class="btn btn-line" data-nt-web>${t('nt.web')}</button>`) : '';
  if (!tgHref && !sys) return '';
  return `<div class="nt"><b>${t('nt.title')}</b><small>${t('nt.sub.' + x.kind)}</small>
    <div class="nt-btns">${tgHref ? `<a class="btn btn-ink nt-tg" href="${tgHref}" target="_blank" rel="noopener" data-nt-tg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 4.3 2.9 11.5c-1 .4-1 1.8.1 2.1l4.6 1.5 1.8 5.5c.3.8 1.3 1 1.9.4l2.6-2.5 4.6 3.4c.7.5 1.7.1 1.9-.7l3.2-15c.2-1.1-.9-2-2-1.4Z" fill="currentColor"/></svg>${t(x.tg ? 'nt.tgAgain' : 'nt.tg')}</a>` : ''}${sys}</div>
    ${tgHref ? `<small class="nt-tip">${t(x.tg ? 'nt.tgOn' : 'nt.tip')}</small>` : ''}</div>`;
}
const notifySlots = new Set<HTMLElement>();
function renderNotify() { notifySlots.forEach(el => { if (!el.isConnected) { notifySlots.delete(el); return; } if (tr) el.innerHTML = notifyHTML(tr); }); }
/** Puts the notify box into an element (the order-sent screen) and keeps it up to date. */
export function mountNotify(el: HTMLElement) { notifySlots.add(el); bindNotify(el); renderNotify(); }
function bindNotify(el: HTMLElement) {
  el.addEventListener('click', e => {
    const tg = e.target as Element;
    if (tg.closest('[data-nt-web]')) { e.preventDefault(); void enableSystem(); }
    else if (tg.closest('[data-nt-tg]') && tr) { tr.tg = true; save(); setTimeout(renderNotify, 300); }
  });
}

/** Lets the order screen show the same status. */
export const onStatus = (fn: (x: Track) => void) => addEventListener('ffs-status', e => fn((e as CustomEvent<Track>).detail));
const announce = () => { if (tr) dispatchEvent(new CustomEvent('ffs-status', { detail: tr })); };

/* ---------- asking the bot ---------- */
async function poll() {
  if (!tr || tr.demo || ended(tr) || polling || (document.hidden && !tr.notify)) return;
  polling = true;
  try {
    const r = await fetch(`/api/telegram?order=${encodeURIComponent(tr.id)}&k=${encodeURIComponent(tr.key)}`, { cache: 'no-store' });
    if (!r.ok) { fails++; return; }
    const j = await r.json() as { ok?: boolean; st?: St; h?: Partial<Record<St, number>>; now?: number };
    if (!tr || !j.ok || !j.st || !ST_OK.has(j.st)) { fails++; return; }
    fails = 0;
    // the kitchen's times are server times; shift them onto this phone's clock (which may be minutes off)
    const skew = typeof j.now === 'number' ? Date.now() - j.now : 0;
    const h: Partial<Record<St, number>> = {};
    for (const [k, v] of Object.entries(j.h ?? {})) if (typeof v === 'number') h[k as St] = v + skew;
    const changed = j.st !== tr.st;
    tr.st = j.st; tr.h = { ...tr.h, ...h }; save();
    if (changed) { toast(t('tk.toast.' + j.st)); alertUser(tr); announce(); refresh(); renderNotify(); if (panel && !panel.hidden) render(); }
  } catch { fails++; /* offline for a moment: try again next round */ } finally { polling = false; }
}

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
    <g transform="translate(70 210)" class="tk-cafe"><circle r="17"/><text y="4" text-anchor="middle" style="font-size:10px">FB</text><g id="tkSteam"></g></g>
    <g transform="translate(372 58)" class="tk-home"><circle r="22" class="tk-pulse"/><path d="M-11 2 L0 -9 L11 2 V12 H-11z"/><rect x="-3" y="4" width="6" height="8" rx="1"/></g>
    <g id="tkBike"><circle r="15" class="tk-bike-bg"/><g transform="scale(.9)"><circle cx="-7" cy="5" r="4" class="tk-wheel"/><circle cx="8" cy="5" r="4" class="tk-wheel"/><path d="M-7 5 L-1 -3 H6 L8 5 M-1 -3 L-4 -7 M4 -3 V-8 H9" class="tk-frame"/><rect x="-11" y="-11" width="9" height="8" rx="2" class="tk-box"/></g></g>
  </svg>`;
}

function build() {
  if (panel) return;
  panel = document.createElement('div');
  panel.className = 'modal tk-modal'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'tkTitle');
  panel.innerHTML = `<div class="scrim" data-tk-close></div><div class="sheet tk-sheet"><button class="x tk-x" data-tk-close>×</button><div id="tkBody" aria-live="polite"></div></div>`;
  document.body.appendChild(panel);
  bindNotify(panel);
  panel.addEventListener('click', e => {
    const tg = e.target as Element;
    if (tg.closest('[data-tk-close]')) closeTrack();
    else if (tg.closest('[data-tk-got]')) finish();
    else if (tg.closest('[data-tk-watch]') && tr) { const e2 = estimate(tr), lines = tr.lines; void import('./afk.js').then(m => m.showOrder(lines, tk(e2.arrive ?? e2.ready ?? Date.now()))); }
  });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeTrack(); } });
}
const contactHref = () => (/\d{3}/.test(CAFE.phone) && !/X/.test(CAFE.phone) ? `tel:${CAFE.phone.replace(/\s/g, '')}` : `https://t.me/${CAFE.telegram}`);

function lead(x: Track) {
  const e = estimate(x);
  if (x.st === 'new') return `<span>${t(Date.now() - x.placed > SLOW ? 'tk.slow' : 'tk.wait')}</span>`;
  if (x.st === 'cy') return `<span>${t('tk.cancel')}</span>`;
  if (x.st === 'done') return `<span>${t('tk.enjoy')}</span>`;
  if (x.kind === 'd' && e.arrive) return `<b id="tkMins"></b><span>${tf('tk.arrive', { t: tk(e.arrive) })}</span>`;
  if (x.st === 'rdy') return `<span>${title(x)}</span>`;
  return e.ready ? `<b id="tkMins"></b><span>${tf('tk.ready', { t: tk(e.ready) })}</span>` : '';
}
function render() {
  if (!panel || !tr) return;
  const x = tr, n = x.lines.reduce((a, l) => a + l.qty, 0), flow = FLOW[x.kind];
  const at = x.st === 'cy' ? -1 : flow.indexOf(x.st);
  $('.tk-x', panel).setAttribute('aria-label', t('aria.close'));
  const steps = flow.map((s, i) => {
    const cls = x.st === 'cy' ? (x.h[s] ? 'done' : 'off') : i < at || (i === at && s === 'done') ? 'done' : i === at ? 'now' : '';
    const when = x.h[s] ? `<small>${tk(x.h[s]!)}</small>` : '';
    const watch = s === 'acc' && x.st === 'acc' ? `<button type="button" class="btn btn-mini" data-tk-watch>${t('tr.watch')}</button>` : '';
    return `<li class="${cls}"><i></i><div><b>${stepName(s, x.kind)}</b>${when}${watch}</div></li>`;
  }).join('') + (x.st === 'cy' ? `<li class="now tk-cy"><i></i><div><b>${t('tk.t.cy')}</b>${x.h.cy ? `<small>${tk(x.h.cy)}</small>` : ''}</div></li>` : '');
  const canGot = x.kind === 'd' ? x.st === 'out' || x.st === 'done' : x.st === 'done';
  $('#tkBody', panel).innerHTML = `
    <p class="tk-id">${tf('tr.order', { id: esc(x.id) })} · ${tf('tr.items', { n })} · ${money(x.total)}</p>
    <h3 id="tkTitle" class="tk-st tk-st-${x.st}">${title(x)}</h3>
    <div class="tk-eta">${lead(x)}</div>
    ${x.kind === 'd' && x.st !== 'cy' ? `<div class="tk-map">${mapSVG(x.zone)}<span class="tk-dist" id="tkDist"></span></div>` : ''}
    <div class="tk-nt" id="tkNotify"></div>
    <ol class="tk-steps">${steps}</ol>
    ${x.kind === 'd' ? `<p class="tk-addr"><span>${t('tr.to')}</span> ${esc(x.address)} <small>· ${esc(zoneOf(x).name[state.lang])}</small></p>` : ''}
    <div class="tk-acts">${x.st !== 'done' ? `<a class="btn btn-line" href="${contactHref()}" target="_blank" rel="noopener">${t('tr.call')}</a>` : ''}
      ${canGot ? `<button type="button" class="btn btn-acc" data-tk-got>${t('tr.got')}</button>` : ended(x) ? `<button type="button" class="btn btn-acc" data-tk-got>${t('tk.close')}</button>` : ''}</div>
    <p class="hint tk-note">${t(x.kind === 'd' ? 'tk.note' : 'tk.noteShort')}</p>`;
  renderedSt = x.st;
  const slot = $('#tkNotify', panel); notifySlots.add(slot); slot.innerHTML = notifyHTML(x);
  frame();
}
/** Countdown, the courier on the map and the steam: drawn every frame while the tracker is open. */
function frame() {
  if (!panel || !tr || panel.hidden) return;
  const x = tr, now = Date.now(), e = estimate(x);
  const target = x.kind === 'd' ? e.arrive : e.ready, mins = $('#tkMins', panel);
  if (mins && target) mins.textContent = target - now > 0 ? tf('tr.mins', { n: Math.max(1, Math.ceil((target - now) / MIN)) }) : t('tr.anyMin');
  const route = panel.querySelector<SVGPathElement>('#tkRoute'), done = panel.querySelector<SVGPathElement>('#tkDone');
  if (route && done) {
    const L = route.getTotalLength(), k = rideK(x, now);
    const p = route.getPointAtLength(L * k), q = route.getPointAtLength(Math.min(L, L * k + 2));
    const flip = q.x < p.x ? -1 : 1, bob = reduced ? 0 : Math.sin(now / 160) * (x.st === 'out' ? 1.2 : 0);
    const bike = panel.querySelector('#tkBike')!;
    // the courier waits next to the cafe once the food is ready; before that he isn't shown
    if (k <= 0) { bike.setAttribute('transform', 'translate(104 180)'); bike.setAttribute('opacity', x.st === 'rdy' ? '1' : '0'); }
    else { bike.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - 2 + bob).toFixed(1)}) scale(${flip} 1)`); bike.setAttribute('opacity', '1'); }
    done.style.strokeDasharray = `${L * k} ${L}`;
    const km = (x.zone === 'city' ? 5.2 : 2.4) * (1 - k);
    $('#tkDist', panel).textContent = x.st === 'done' ? t('tk.s.done.d') : k > 0 ? tf('tr.km', { n: km.toFixed(1) }) : t('tr.atCafe');
    const steam = panel.querySelector('#tkSteam');
    if (steam) steam.innerHTML = x.st === 'acc' ? [0, 1, 2].map(i => { const f = ((now / 1400 + i / 3) % 1); return `<circle cx="${(i - 1) * 7}" cy="${(-20 - f * 22).toFixed(1)}" r="${(3 + f * 4).toFixed(1)}" opacity="${(1 - f).toFixed(2)}" class="tk-steam"/>`; }).join('') : '';
  }
}
function loop() { cancelAnimationFrame(anim); const go = () => { frame(); if (panel && !panel.hidden) anim = requestAnimationFrame(go); }; go(); }

/** Shows or hides the pill and updates its text. */
function refresh() {
  tr = tr ?? load();
  if (tr && !tr.demo && expired(tr)) { store.set('vc-track', null); tr = null; }
  const on = !!tr;
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
    const e = estimate(tr), target = tr.kind === 'd' ? e.arrive : e.ready;
    pill.dataset.st = tr.st;
    $('b', pill).textContent = title(tr);
    $('small', pill).textContent = `${tf('tr.order', { id: tr.id })}${target && !ended(tr) ? ` · ${tf('tr.mins', { n: Math.max(1, Math.ceil((target - Date.now()) / MIN)) })}` : ''}`;
    pill.setAttribute('aria-label', `${t('tk.open')}: ${title(tr)}`);
  }
  if (!on && panel && !panel.hidden) closeTrack();
}
function tick() {
  clearTimeout(timer);
  refresh();
  if (panel && !panel.hidden && tr && renderedSt !== tr.st) render();
  void poll();
  // quick while waiting for the kitchen to answer, slower once it's cooking
  // quick while waiting for the kitchen's first answer, calmer after; back off when the server is struggling;
  // a little randomness so thousands of phones don't all ask in the same second
  const age = tr ? Date.now() - tr.placed : 0;
  const base = (!tr || ended(tr) ? 30000 : document.hidden ? 20000 : tr.st === 'new' ? (age < 2 * MIN ? 5000 : 8000) : 12000) * (slowNet() ? 2 : 1);
  const wait = Math.min(60000, base * 2 ** Math.min(fails, 3)) * (0.85 + Math.random() * 0.3);
  timer = window.setTimeout(tick, wait);
}

export function currentTrack() { return tr; }
export const statusTitle = (x: Track) => title(x);

export function initTrack() {
  const qs = new URLSearchParams(location.search), demo = qs.get('trackdemo');
  if (demo !== null) {
    const st = (ST_OK.has(demo as St) ? demo : 'acc') as St, kind = (['d', 'p', 't'].includes(qs.get('kind') ?? '') ? qs.get('kind') : 'd') as Kind;
    const now = Date.now(), h: Partial<Record<St, number>> = { new: now - 9 * MIN };
    const order: St[] = [...FLOW[kind]];
    for (let i = 1; i < order.length; i++) { if (order.indexOf(st) < i && st !== 'cy') break; h[order[i]] = now - (9 - i * 2) * MIN; if (order[i] === st) break; }
    if (st === 'cy') { h.cy = now - 4 * MIN; delete h.rdy; delete h.out; delete h.done; }
    tr = { id: 'DEMO1', key: 'demo', kind, placed: now - 9 * MIN, zone: 'near', address: 'Bobur shoh koʻchasi, 12', total: 96000, cookMin: 14, st, h, demo: true,
      lines: [{ sig: 'd1', kind: 'item', item: 'frans-burger', extras: [], qty: 1, who: -1 }, { sig: 'd2', kind: 'item', item: 'fries', extras: [], qty: 1, who: -1 }, { sig: 'd3', kind: 'item', item: 'turkish-tea', extras: [], qty: 1, who: -1 }] };
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (baseTitle) { document.title = baseTitle; baseTitle = ''; } tick(); } });
  navigator.serviceWorker?.addEventListener('message', e => { if ((e.data as { type?: string })?.type === 'open-track') openTrack(); });
  if (qs.has('track')) setTimeout(openTrack, 600);
  // keep the notification helper alive on later visits
  if (load()?.notify && canSystem()) navigator.serviceWorker.register('/sw.js').catch(() => null);
  addEventListener('pageshow', () => { if (panel && !panel.classList.contains('open')) panel.hidden = true; tick(); });
  addEventListener('storage', e => { if (e.key === 'vc-track') { tr = null; renderedSt = null; tick(); } });
  tick();
}
export const langTrack = () => { refresh(); if (panel && !panel.hidden) render(); };
