// Sends every order and table booking from the website to the shop's Telegram group.
// Needs two environment variables in Netlify (Site configuration → Environment variables):
//   TELEGRAM_BOT_TOKEN — the token @BotFather gives when you create the bot
//   TELEGRAM_CHAT_ID   — the group's id (a negative number like -1001234567890)
// While TELEGRAM_CHAT_ID is empty, opening /api/telegram in a browser lists the groups the bot has seen,
// so you can copy the id from there. No packages needed: Node's own fetch talks to the Bot API.
// Order status (what the cook pressed in Telegram) is kept in Netlify Blobs, so the customer's page can show it:
//   GET /api/telegram?order=<id>&k=<key>  →  { st, h }  — the key is random per order, known only to that browser.

const MAX = { name: 60, phone: 30, address: 200, comment: 400, items: 3500, short: 80 }; // kitchen list: max 40 lines × 8 details
const hits = new Map(); // best-effort rate limit per visitor (per function instance)

const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const cut = (s, n) => String(s ?? '').slice(0, n).trim();
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const env = k => (globalThis.Netlify?.env?.get(k) ?? process.env[k] ?? '').trim();
/* ---------- order status storage: Netlify Blobs, spoken to directly over HTTP ----------
   Inside a Netlify function the platform puts the store's address and a short-lived token in NETLIFY_BLOBS_CONTEXT
   (base64 JSON). Two address shapes exist (with and without a region prefix); the first one that works is remembered. */
const STORE = 'site:ffs-orders';
function blobCtx() {
  const raw = globalThis.netlifyBlobsContext ?? env('NETLIFY_BLOBS_CONTEXT');
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); } catch { return null; }
}
let blobShape = null; // 'region' | 'plain'
function blobURLs(c, key) {
  const base = c.uncachedEdgeURL || c.edgeURL;
  const path = `/${c.siteID}/${STORE}/${encodeURIComponent(key)}`;
  const root = String(base).replace(/\/+$/, '');
  const shapes = { region: c.primaryRegion ? `${root}/region:${c.primaryRegion}${path}` : null, plain: root + path };
  const order = blobShape ? [blobShape] : ['region', 'plain'];
  return order.map(k => [k, shapes[k]]).filter(([, u]) => u);
}
async function blobGet(key) {
  const c = blobCtx(); if (!c?.token) return null;
  for (const [shape, url] of blobURLs(c, key)) {
    const r = await fetch(url, { headers: { authorization: `Bearer ${c.token}` } }).catch(() => null);
    if (r?.status === 200) { blobShape = shape; try { return await r.json(); } catch { return null; } }
    if (r?.status === 404 && blobShape) return null;
  }
  return null;
}
async function blobSet(key, value) {
  const c = blobCtx(); if (!c?.token) return false;
  for (const [shape, url] of blobURLs(c, key)) {
    const r = await fetch(url, { method: 'PUT', headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' }, body: JSON.stringify(value) }).catch(() => null);
    if (r?.ok) { blobShape = shape; return true; }
  }
  return false;
}
const ID_RE = /^[A-Z0-9]{4,12}$/, KEY_RE = /^[a-f0-9]{16,40}$/;

/* ---------- shop settings the kitchen changes from Telegram (/pauza, /davom, /kutish N) ----------
   Also remembers the group's new id if Telegram upgrades the group (its id changes when that happens). */
let cfgCache = null, cfgAt = 0;
async function getCfg(fresh = false) {
  if (!fresh && cfgCache && Date.now() - cfgAt < 15000) return cfgCache;
  cfgCache = (await blobGet('CONFIG')) ?? {}; cfgAt = Date.now();
  return cfgCache;
}
async function setCfg(patch) { const c = { ...(await getCfg(true)), ...patch }; cfgCache = c; cfgAt = Date.now(); await blobSet('CONFIG', c); return c; }
const chatOf = async () => (await getCfg()).chat ?? env('TELEGRAM_CHAT_ID');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Telegram call that survives the usual trouble at busy times: "too many requests" (waits as told, if short),
    a network blip (one quick retry) and a group that was upgraded to a supergroup (follows the new id). */
async function tgSafe(token, method, params, budgetMs = 6000) {
  const until = Date.now() + budgetMs;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await tgCall(token, method, params);
    if (r.ok) return r;
    const wait = (r.parameters?.retry_after ?? 0) * 1000;
    const moved = r.parameters?.migrate_to_chat_id;
    if (moved && params?.chat_id) {
      if (String(params.chat_id) === String(await chatOf())) await setCfg({ chat: String(moved) });
      params = { ...params, chat_id: moved }; continue;
    }
    if (r.error_code === 429 && Date.now() + wait < until) { await sleep(wait + 50); continue; }
    if (String(r.description ?? '').startsWith('network') && attempt === 0 && Date.now() + 400 < until) { await sleep(300); continue; }
    return r;
  }
  return { ok: false, description: 'gave up' };
}

/* ---------- open orders: a small list the every-minute check walks (resend if Telegram was down, remind if nobody accepted) ---------- */
// split into 16 small lists so a rush of orders doesn't fight over one
const SHARDS = 16;
const shardOf = id => 'OPEN-' + ([...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % SHARDS);
async function shardGet(name) { const v = await blobGet(name); return Array.isArray(v) ? v : []; }
async function openList() { return (await Promise.all(Array.from({ length: SHARDS }, (_, i) => shardGet('OPEN-' + i)))).flat(); }
async function openAdd(id) {
  // read-change-write can lose an entry if two orders land in the same instant, so check and retry
  const name = shardOf(id);
  for (let i = 0; i < 8; i++) {
    const list = (await shardGet(name)).filter(x => x.id !== id);
    list.push({ id, t: Date.now() });
    await blobSet(name, list.slice(-100));
    await sleep(30 + Math.random() * 60);
    if ((await shardGet(name)).some(x => x.id === id)) return true;
    await sleep(50 + Math.random() * 250 * (i + 1));
  }
  return false;
}
/** Writes a shard back without dropping entries another order added meanwhile. */
async function shardPut(name, keep, seenIds) {
  const latest = await shardGet(name);
  await blobSet(name, [...keep, ...latest.filter(x => !seenIds.has(x.id))].slice(-100));
}

const som = n => `${Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/\s/g, ' ')} soʻm`;

const METHOD = { delivery: '🛵 YETKAZIB BERISH', pickup: '🥡 OLIB KETISH', table: '🍽 ZALDA' };
const PAY = { cash: '💵 Naqd', card: '💳 Karta', click: '📲 Click / Payme / Uzum' };
const LINE = '────────────';
const now = () => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }).format(new Date());
const phoneLink = p => String(p ?? '').replace(/[^\d+]/g, '').slice(0, 16); // Telegram makes +998901234567 tappable

/** "ASAP ~19:25" → "Imkon qadar tez · ~19:25"; "ERTAGA / TOMORROW 14:00" → "ERTAGA 14:00" */
function whenText(t) {
  const s = cut(t, MAX.short);
  const asap = s.match(/^ASAP\s*~?\s*(\d{1,2}:\d{2})?/i);
  if (asap) return `Imkon qadar tez${asap[1] ? ` · ~${asap[1]}` : ''}`;
  return s.replace(/ERTAGA\s*\/\s*TOMORROW/i, 'ERTAGA');
}

/** The kitchen list the site sends (already in Uzbek); falls back to the plain items text. */
function kitchen(d) {
  let lines;
  try { lines = JSON.parse(String(d.kitchen ?? '')); } catch { lines = null; }
  if (!Array.isArray(lines) || !lines.length) return { text: esc(cut(d.items, MAX.items)), count: 0 };
  lines = lines.slice(0, 40);
  let count = 0, size = 0, hidden = 0;
  const out = [];
  for (const l of lines) {
    const q = Math.max(1, Math.min(99, Math.round(Number(l?.q) || 1))); count += q;
    const head = `<b>${q} ×  ${esc(cut(l?.n, 80))}</b>${l?.c ? '  ✏️' : ''}${Number(l?.w) > 0 ? `  [${Math.round(l.w)}]` : ''}`;
    const det = (Array.isArray(l?.d) ? l.d : []).slice(0, 8).map(x => `      ▸ ${esc(cut(x, 160))}`);
    const block = [head, ...det].join('\n');
    // Telegram allows 4096 characters per message; keep room for the rest of the order
    if (size + block.length > 2600) { hidden++; continue; }
    size += block.length + 1; out.push(block);
  }
  if (hidden) out.push(`<i>… yana ${hidden} ta qator — toʻliq roʻyxat Netlify Forms da</i>`);
  const g = Math.max(0, Math.round(Number(d.gifts) || 0));
  if (g) out.push(`🎁 <b>Juma 4+1: +${g} ta bepul taom</b> (mijoz bilan kelishing)`);
  return { text: out.join('\n'), count };
}

/* ---------- the big status line at the top of each order in the group ----------
   It's the first thing staff see, and Telegram shows it in the chat preview, so open orders stand out from finished ones. */
const STATUS_LINE = {
  new: '❓❓❓ TASDIQLANMAGAN', acc: '👨‍🍳 TAYYORLANMOQDA',
  rdy_d: '🔔 TAYYOR — KURYERGA BERING', rdy_p: '🔔 TAYYOR — MIJOZ OLIB KETADI', rdy_t: '🔔 TAYYOR — STOLGA OLIB BORING',
  out: '🚀 YOʻLDA — KURYERDA', done_d: '✅✅✅ YETKAZILDI', done_p: '✅✅✅ BERILDI', done_t: '✅✅✅ BERILDI',
  acc_b: '✅✅✅ TASDIQLANDI', cy: '❌❌❌ BEKOR QILINDI',
};
const statusLine = (st, kind) => STATUS_LINE[`${st}_${kind}`] ?? STATUS_LINE[st] ?? STATUS_LINE.new;
const KNOWN_LINES = new Set(Object.values(STATUS_LINE));
// a reaction on the message too, so the state shows while scrolling (best effort: groups can switch reactions off)
const REACTION = { acc: '✍', rdy: '🔥', out: '⚡', done: '👍', cy: '👎' };

/** Swaps the status line at the top (or adds one to older messages) and keeps Telegram's formatting offsets right. */
function withStatus(text, entities, st, kind) {
  const nl = text.indexOf('\n'), first = nl < 0 ? text : text.slice(0, nl);
  const line = statusLine(st, kind);
  const oldLen = KNOWN_LINES.has(first) ? first.length : 0;
  const body = oldLen ? text.slice(oldLen) : '\n' + text;
  const delta = line.length - oldLen + (oldLen ? 0 : 1);
  const ents = (entities ?? []).filter(e => e.offset >= oldLen).map(e => ({ ...e, offset: e.offset + delta }));
  const word = line.search(/[A-ZÀ-ÿА-Я]/);
  return { text: line + body, entities: [{ type: 'bold', offset: Math.max(0, word), length: line.length - Math.max(0, word) }, ...ents] };
}

function orderText(d) {
  const k = kitchen(d);
  const head = METHOD[d.method] ?? esc(cut(d.method, 20));
  const L = [
    `❓❓❓ <b>TASDIQLANMAGAN</b>`,
    `${head}${d.method === 'table' && d.table ? ` · STOL ${esc(cut(d.table, 6))}` : ''}`,
    `<b>Buyurtma <code>${esc(cut(d.order_id, 12))}</code></b>`,
    `⏰ <b>${esc(whenText(d.time))}</b>`,
    '',
    `🍳 <b>OSHXONA${k.count ? ` — ${k.count} ta` : ''}</b>`,
    LINE,
    k.text,
  ];
  if (d.comment) L.push('', `⚠️ <b>Izoh:</b>`, `<blockquote>${esc(cut(d.comment, MAX.comment))}</blockquote>`);
  const late = Math.round(Number(d.queued_min) || 0);
  if (late >= 2 && late <= 120) L.push('', `📶 <b>Mijozda internet yoʻq edi — buyurtma ${late} daqiqa kechikib keldi.</b> Vaqtini tekshiring.`);
  L.push('', `👤 <b>MIJOZ</b>`, LINE, `${esc(cut(d.name, MAX.name))}`, `📞 ${esc(phoneLink(d.phone))}`);
  if (d.method === 'delivery') L.push(`📍 ${esc(cut(d.address, MAX.address))}`, ...(d.zone ? [`🗺 Hudud: ${esc(cut(d.zone, MAX.short))}`] : []));
  L.push('', `💰 <b>TOʻLOV</b> · ${PAY[d.payment] ?? esc(cut(d.payment, 20))}`, LINE);
  if (Number(d.delivery) > 0) L.push(`Taomlar:  ${som(d.subtotal)}`, `Yetkazish:  ${som(d.delivery)}`);
  L.push(`<b>JAMI:  ${som(d.total)}</b>`);
  if (d.split) L.push(`👥 Boʻlib toʻlash: ${esc(cut(d.split, 300))}`);
  L.push('', `<i>🕒 ${now()} · saytdan · ${esc(cut(d.lang, 4).toUpperCase())}</i>`);
  return L.join('\n');
}
function bookingText(d) {
  return [
    `❓❓❓ <b>TASDIQLANMAGAN</b>`,
    `📅 <b>STOL BAND QILISH</b>`,
    `🗓 <b>${esc(cut(d.date, 20))}, ${esc(cut(d.time, 10))}</b> · 👥 <b>${esc(cut(d.guests, 3))} kishi</b>`,
    '',
    `👤 ${esc(cut(d.name, MAX.name))}`,
    `📞 ${esc(phoneLink(d.phone))}`,
    ...(d.comment ? ['', `⚠️ <b>Izoh:</b>`, `<blockquote>${esc(cut(d.comment, MAX.comment))}</blockquote>`] : []),
    '', `<i>🕒 ${now()} · saytdan</i>`,
  ].join('\n');
}
/** Delivery orders get a button that opens the address on a map for the courier. */
function mapRow(d) {
  if (d.method !== 'delivery' || !cut(d.address, MAX.address)) return [];
  const q = encodeURIComponent(`Andijon, ${cut(d.address, MAX.address)}`);
  return [[{ text: '🗺 Manzil xaritada', url: `https://yandex.uz/maps/?text=${q}` }]];
}

/* ---------- status buttons ----------
   kind: d = delivery, p = pickup, t = table, b = booking. Callback data: "<step>|<kind>", or
   "cx|<kind>|<current>" (ask to confirm a cancel), "cy|<kind>" (cancel confirmed), "cn|<kind>|<current>" (keep the order). */
const KIND = { delivery: 'd', pickup: 'p', table: 't' };
const DONE = { d: '📦 Yetkazildi', p: '🤝 Mijozga berildi', t: '🤝 Stolga berildi' };
const label = (step, kind) => ({ acc: kind === 'b' ? '✅ Tasdiqlandi' : '✅ Qabul qilindi', rdy: '🔥 Tayyor', out: '🛵 Yoʻlga chiqdi', done: DONE[kind] ?? '✔️ Bajarildi', cy: '❌ Bekor qilindi' }[step]);
function nextStep(cur, kind) {
  if (kind === 'b') return cur === 'new' ? 'acc' : null;
  return { new: 'acc', acc: 'rdy', rdy: kind === 'd' ? 'out' : 'done', out: 'done' }[cur] ?? null;
}
function statusRows(cur, kind, id = '') {
  const nx = nextStep(cur, kind);
  if (!nx) return [];
  const go = { acc: kind === 'b' ? '✅ Tasdiqlash' : '✅ Qabul qilish', rdy: '🔥 Tayyor', out: '🛵 Yoʻlga chiqdi', done: DONE[kind] }[nx];
  return [[{ text: go, callback_data: `${nx}|${kind}|${id}` }, { text: '❌ Bekor qilish', callback_data: `cx|${kind}|${cur}|${id}` }]];
}

const secretOf = async token => { const { createHash } = await import('node:crypto'); return createHash('sha256').update('ffs:' + token).digest('hex').slice(0, 48); };
const tgCall = (token, method, params) => fetch(`https://api.telegram.org/bot${token}/${method}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params ?? {}),
}).then(x => x.json()).catch(e => ({ ok: false, description: 'network: ' + e.message }));

/** Points Telegram's button presses at this function. Skipped on deploy previews so they can't steal the hook. */
let hooked = '';
async function ensureWebhook(token, req) {
  const url = new URL('/api/telegram', req.url);
  if (url.hostname.includes('--') || url.hostname === 'localhost') return { ok: false, description: 'preview or local host' };
  if (hooked === url.href) return { ok: true };
  const info = await tgCall(token, 'getWebhookInfo');
  if (info.ok && info.result?.url === url.href) { hooked = url.href; return { ok: true }; }
  const r = await tgCall(token, 'setWebhook', { url: url.href, secret_token: await secretOf(token), allowed_updates: ['callback_query', 'message', 'my_chat_member'] });
  if (r.ok) hooked = url.href;
  return r;
}

const ORDER_STEPS = ['new', 'acc', 'rdy', 'out', 'done', 'cy'];
const prevStep = h => ORDER_STEPS.filter(s => h?.[s]).pop() ?? 'new';
/** Work that can finish after the answer is sent (Netlify keeps the function alive for it). */
let later = p => p;

/* ---------- messages to the customer (they link their Telegram from the order page) ---------- */
const CUST = {
  uz: { link: '🔔 Tayyor! Buyurtma {id} holati shu yerga keladi.', bad: 'Bu havola eskirgan. Buyurtma sahifasidan qayta oching.', hello: 'Salom! Bu Frans Burger buyurtmalar boti. Buyurtma holatini olish uchun saytdagi buyurtma sahifasida «Telegram orqali» tugmasini bosing.',
    acc: '✅ Buyurtma {id} qabul qilindi. Oshxona tayyorlashni boshladi.', rdy_d: '🔥 Buyurtma {id} tayyor, kuryerga berilmoqda.', rdy_p: '🔔 Buyurtma {id} tayyor! Kassadan olib ketishingiz mumkin.', rdy_t: '🔔 Buyurtma {id} tayyor — stolingizga olib kelinmoqda.',
    out: '🛵 Kuryer yoʻlga chiqdi. Buyurtma {id} tez orada yetib keladi.', done_d: '📦 Buyurtma {id} yetkazildi. Yoqimli ishtaha!', done_p: '🍗 Yoqimli ishtaha! Buyurtma {id} berildi.', done_t: '🍗 Yoqimli ishtaha!', cy: '❌ Buyurtma {id} bekor qilindi. Savollar boʻlsa, Frans Burger bilan bogʻlaning.' },
  ru: { link: '🔔 Готово! Статус заказа {id} будет приходить сюда.', bad: 'Ссылка устарела. Откройте её заново со страницы заказа.', hello: 'Здравствуйте! Это бот заказов Frans Burger. Чтобы получать статус заказа, нажмите «Через Telegram» на странице заказа на сайте.',
    acc: '✅ Заказ {id} принят. Кухня начала готовить.', rdy_d: '🔥 Заказ {id} готов, передаём курьеру.', rdy_p: '🔔 Заказ {id} готов! Можно забирать на кассе.', rdy_t: '🔔 Заказ {id} готов — несём к вашему столу.',
    out: '🛵 Курьер выехал. Заказ {id} скоро будет у вас.', done_d: '📦 Заказ {id} доставлен. Приятного аппетита!', done_p: '🍗 Приятного аппетита! Заказ {id} выдан.', done_t: '🍗 Приятного аппетита!', cy: '❌ Заказ {id} отменён. Если есть вопросы, свяжитесь с Frans Burger.' },
  en: { link: '🔔 Done! Updates for order {id} will come here.', bad: 'This link has expired. Open it again from your order page.', hello: 'Hi! This is the Frans Burger order bot. To get your order status, tap “Via Telegram” on your order page on the website.',
    acc: '✅ Order {id} accepted. The kitchen has started cooking.', rdy_d: '🔥 Order {id} is ready and going to the courier.', rdy_p: '🔔 Order {id} is ready! Pick it up at the counter.', rdy_t: '🔔 Order {id} is ready — on its way to your table.',
    out: '🛵 The courier is on the way. Order {id} will arrive soon.', done_d: '📦 Order {id} delivered. Enjoy your meal!', done_p: '🍗 Enjoy your meal! Order {id} picked up.', done_t: '🍗 Enjoy your meal!', cy: '❌ Order {id} was cancelled. If you have questions, contact Frans Burger.' },
};
const custText = (rec, key, id) => { const L = CUST[rec?.lang] ?? CUST.uz; return (L[key] ?? CUST.uz[key] ?? '').replace('{id}', id); };
const custKey = (step, kind) => (step === 'rdy' || step === 'done' ? `${step}_${kind}` : step);
let botName = '';
async function getBotName(token) {
  if (botName) return botName;
  const me = await tgCall(token, 'getMe');
  if (me.ok) botName = me.result.username;
  return botName;
}

/** Telegram → us: a staff member pressed a status button, typed /id, or the bot was added to a group. */
async function onUpdate(u, token) {
  // helper for moving to the shop's group: the bot tells any chat its id
  const m = u.message, added = u.my_chat_member;
  // a customer opened the bot from their order page: t.me/<bot>?start=o_<id>_<first 16 of the key>
  const link = m?.chat?.type === 'private' ? (m.text ?? '').match(/^\/start\s+o_([A-Z0-9]{4,12})_([a-f0-9]{16})$/) : null;
  if (link) {
    const [, id, k] = link, rec = await blobGet(id);
    if (!rec || !String(rec.k).startsWith(k)) { await tgCall(token, 'sendMessage', { chat_id: m.chat.id, text: CUST.uz.bad }); return; }
    await blobSet('cust:' + id, { chat: m.chat.id });
    const now = rec.st && rec.st !== 'new' ? '\n\n' + custText(rec, custKey(rec.st, rec.kind), id) : '';
    await tgCall(token, 'sendMessage', { chat_id: m.chat.id, text: custText(rec, 'link', id) + now });
    return;
  }
  if (m?.chat?.type === 'private' && /^\/start\s*$/.test(m.text ?? '') && String(m.chat.id) !== String(await chatOf())) {
    await tgCall(token, 'sendMessage', { chat_id: m.chat.id, text: `${CUST.uz.hello}\n\n${CUST.ru.hello}\n\nBu chat ID: ${m.chat.id}` });
    return;
  }
  const fromShop = m && String(m.chat.id) === String(await chatOf());
  const cmd = fromShop ? (m.text ?? '').trim().match(/^\/(pauza|davom|kutish|holat)(?:@\w+)?(?:\s+(\d{1,3}))?$/i) : null;
  if (cmd) {
    const c = cmd[1].toLowerCase(), n = Math.min(180, Number(cmd[2] ?? 0));
    let text = '';
    if (c === 'pauza') { await setCfg({ paused: true }); text = '⏸ Onlayn buyurtmalar toʻxtatildi. Saytda «hozir qabul qilinmayapti» deb chiqadi.\nQayta ochish: /davom'; }
    if (c === 'davom') { await setCfg({ paused: false }); text = '▶️ Onlayn buyurtmalar yana qabul qilinmoqda.'; }
    if (c === 'kutish') { await setCfg({ extra: n }); text = n ? `⏳ Saytdagi tayyor boʻlish vaqtiga +${n} daqiqa qoʻshildi.\nOlib tashlash: /kutish 0` : '⏳ Qoʻshimcha kutish olib tashlandi.'; }
    if (c === 'holat') {
      const cfg = await getCfg(true), open = await openList();
      text = `📊 Holat\nOnlayn buyurtma: ${cfg.paused ? '⏸ toʻxtatilgan' : '▶️ ochiq'}\nQoʻshimcha kutish: ${cfg.extra ? `+${cfg.extra} daq` : 'yoʻq'}\nQabul qilinmagan buyurtmalar: ${open.length}`;
    }
    await tgSafe(token, 'sendMessage', { chat_id: m.chat.id, text, reply_to_message_id: m.message_id });
    return;
  }
  if (m && /^\/(id|start)\b/.test(m.text ?? '')) {
    await tgCall(token, 'sendMessage', { chat_id: m.chat.id, text: `Bu chat ID: <code>${m.chat.id}</code>\nBuyurtmalar shu yerga tushishi uchun Netlify’da TELEGRAM_CHAT_ID ga yozing.`, parse_mode: 'HTML' });
    return;
  }
  if (added && ['member', 'administrator'].includes(added.new_chat_member?.status)) {
    await tgCall(token, 'sendMessage', { chat_id: added.chat.id, text: `Salom! Bu guruh ID: <code>${added.chat.id}</code>`, parse_mode: 'HTML' });
    return;
  }
  const q = u.callback_query;
  if (!q?.message || !q.data) return;
  const answer = text => tgCall(token, 'answerCallbackQuery', { callback_query_id: q.id, text });
  if (String(q.message.chat.id) !== String(await chatOf())) return answer('Bu chat ulanmagan');
  const parts = q.data.split('|');
  const [step, kind] = parts;
  // "<step>|<kind>|<id>" or "cx|<kind>|<current>|<id>" / "cn|<kind>|<current>|<id>" / "cy|<kind>|<id>"
  const cur = step === 'cx' || step === 'cn' ? parts[2] : '';
  const id = (step === 'cx' || step === 'cn' ? parts[3] : parts[2]) ?? '';
  if (!['d', 'p', 't', 'b'].includes(kind)) return answer('');
  const keep = (q.message.reply_markup?.inline_keyboard ?? []).filter(row => row.every(b => b.url)); // map button stays
  const msg = { chat_id: q.message.chat.id, message_id: q.message.message_id };

  if (step === 'cx' || step === 'cn') {
    const rows = step === 'cx'
      ? [[{ text: '❌ Ha, bekor qilinsin', callback_data: `cy|${kind}|${id}` }, { text: '↩️ Yoʻq', callback_data: `cn|${kind}|${cur}|${id}` }]]
      : statusRows(cur, kind, id);
    await tgCall(token, 'editMessageReplyMarkup', { ...msg, reply_markup: { inline_keyboard: [...rows, ...keep] } });
    return answer(step === 'cx' ? 'Bekor qilishni tasdiqlang' : '');
  }
  const name = label(step, kind);
  if (!name) return answer('');
  const text = q.message.text ?? '';
  if (text.includes(`\n${name} ·`)) return answer('Allaqachon belgilangan');
  if (text.includes(`\n${label('cy', kind)} ·`)) return answer('Buyurtma bekor qilingan');

  // two people pressing the same button at once: the first one to reach storage wins
  const rec = ID_RE.test(id) ? await blobGet(id) : null;
  if (rec?.h?.[step]) return answer('Allaqachon belgilangan');
  if (rec?.st === 'cy') return answer('Buyurtma bekor qilingan');
  if (rec) { rec.st = step; rec.h = { ...(rec.h ?? {}), [step]: Date.now() }; await blobSet(id, rec); }
  const who = [q.from?.first_name, q.from?.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Xodim';
  const add = `${text.includes('\n📋 HOLAT') ? '' : '\n\n📋 HOLAT'}\n${name} · ${who} · ${now()}`;
  const next = withStatus((text + add).slice(0, 4000), q.message.entities, step, kind);
  const rows = step === 'cy' ? [] : statusRows(step, kind, id);
  const r = await tgSafe(token, 'editMessageText', {
    ...msg, text: next.text, entities: next.entities,
    link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: [...rows, ...keep] },
  });
  if (!r.ok && rec) { delete rec.h[step]; rec.st = prevStep(rec.h); await blobSet(id, rec); } // the group didn't change, so neither does the customer's page
  const done = answer(r.ok ? name : 'Xatolik, qayta bosing');
  if (r.ok && REACTION[step]) later(tgCall(token, 'setMessageReaction', { ...msg, reaction: [{ type: 'emoji', emoji: REACTION[step] }] }));
  // the customer's own Telegram, if they linked it (in the background: the cook doesn't wait for it)
  if (r.ok && rec) { const c = await blobGet('cust:' + id); if (c?.chat) later(tgSafe(token, 'sendMessage', { chat_id: c.chat, text: custText(rec, custKey(step, rec.kind ?? kind), id) }, 3000)); }
  return done;
}

/** Runs every minute (netlify/functions/watch.mjs): sends orders Telegram refused earlier, and nudges the
    group about orders nobody has accepted for a few minutes. */
export async function watchOrders() {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = await chatOf();
  if (!token || !chat) return { ok: false };
  const now = Date.now();
  let resent = 0, nudged = 0, open = 0, slowDown = false;
  for (let sh = 0; sh < SHARDS; sh++) {
    const name = 'OPEN-' + sh, list = await shardGet(name);
    if (!list.length) continue;
    const keep = [];
    let changed = false;
    for (const x of list) {
      const rec = await blobGet(x.id);
      if (!rec || rec.st !== 'new' || now - x.t > 3 * 3600000) { changed = true; continue; }
      if (!rec.msg && rec.payload) {
        if (!slowDown) {
          const r = await tgSafe(token, 'sendMessage', { ...rec.payload, chat_id: chat }, 2500);
          if (r.ok) { rec.msg = r.result.message_id; delete rec.payload; await blobSet(x.id, rec); resent++; }
          else if (r.error_code === 429) slowDown = true; // Telegram says wait: the rest go next minute
        }
        keep.push(x); continue;
      }
      const mins = Math.floor((now - x.t) / 60000);
      if (rec.msg && mins >= 4 && (!x.n || now - x.n > 5 * 60000) && !slowDown) {
        const r = await tgSafe(token, 'sendMessage', { chat_id: chat, text: `⏰ Buyurtma ${x.id} ${mins} daqiqadan beri qabul qilinmadi! Mijoz kutmoqda.`, reply_to_message_id: rec.msg }, 2500);
        if (r.ok) { x.n = now; nudged++; changed = true; } else if (r.error_code === 429) slowDown = true;
      }
      keep.push(x);
    }
    open += keep.length;
    if (changed) await shardPut(name, keep, new Set(list.map(x => x.id)));
  }
  return { ok: true, open, resent, nudged };
}

export default async (req, context) => {
  later = p => { if (context?.waitUntil) { context.waitUntil(p.catch(() => null)); return p; } return p; };
  const token = env('TELEGRAM_BOT_TOKEN');

  // Telegram's own calls carry the secret we gave it in setWebhook
  const hookSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (req.method === 'POST' && hookSecret !== null) {
    if (!token || hookSecret !== await secretOf(token)) return json({ ok: false }, 403);
    try { await onUpdate(await req.json(), token); } catch { /* always 200, or Telegram retries the same update */ }
    return json({ ok: true });
  }

  if (req.method === 'GET') {
    const qs = new URL(req.url).searchParams;
    if (qs.has('order')) {
      const id = qs.get('order') ?? '', k = qs.get('k') ?? '';
      if (!ID_RE.test(id) || !KEY_RE.test(k)) return json({ ok: false }, 400);
      const rec = await blobGet(id);
      if (!rec || rec.k !== k) return json({ ok: false, st: 'unknown' }, 404);
      return json({ ok: true, st: rec.st, h: rec.h ?? {}, now: Date.now(), extra: (await getCfg()).extra ?? 0 });
    }
    if (qs.has('cfg')) {
      const c = await getCfg();
      return new Response(JSON.stringify({ paused: !!c.paused, extra: c.extra ?? 0 }), { headers: {
        'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=10',
        'netlify-cdn-cache-control': 'public, s-maxage=15, stale-while-revalidate=30' } });
    }
    if (!token) return json({ ok: false, step: 'Set TELEGRAM_BOT_TOKEN in Netlify, then redeploy.' });
    const chat = await chatOf();
    if (chat) {
      const h = await ensureWebhook(token, req);
      const probe = { t: Date.now() };
      const stored = (await blobSet('SELFTEST', probe)) && (await blobGet('SELFTEST'))?.t === probe.t;
      const c = await tgCall(token, 'getChat', { chat_id: chat });
      const sendsTo = c.ok ? `${c.result.title ?? [c.result.first_name, c.result.last_name].filter(Boolean).join(' ')} (${c.result.type})` : `NOT FOUND — ${c.description ?? 'check TELEGRAM_CHAT_ID'}`;
      const cfg = await getCfg(true);
      return json({ ok: true, ready: true, sends_to: sendsTo, ...(cfg.chat ? { note: `group was upgraded by Telegram; now sending to ${cfg.chat} — put this id in TELEGRAM_CHAT_ID when convenient` } : {}),
        online_orders: cfg.paused ? 'paused (/davom in the group to reopen)' : 'open', extra_minutes: cfg.extra ?? 0, open_orders: (await openList()).length, buttons: h.ok ? 'on' : `off (${h.description ?? 'error'})`,
        website_status: stored ? `on (${blobShape})` : blobCtx() ? 'off (storage refused)' : 'off (no storage context)' });
    }
    const tg = m => tgCall(token, m);
    const me = await tg('getMe');
    if (!me.ok) return json({ ok: false, step: 'Telegram rejected the token. Check TELEGRAM_BOT_TOKEN (no spaces, whole token) and redeploy.', telegram: me.description });
    let r = await tg('getUpdates');
    if (!r.ok && /webhook/i.test(r.description ?? '')) { await tg('deleteWebhook'); hooked = ''; r = await tg('getUpdates'); }
    if (!r.ok) return json({ ok: false, bot: '@' + me.result.username, telegram: r.description });
    const chats = new Map();
    for (const u of r?.result ?? []) { const c = (u.message ?? u.my_chat_member ?? u.channel_post)?.chat; if (c) chats.set(c.id, { title: c.title ?? [c.first_name, c.last_name].filter(Boolean).join(' '), type: c.type }); }
    return json({ ok: true, bot: '@' + me.result.username, step: 'Copy an id into TELEGRAM_CHAT_ID and redeploy. Groups have negative ids; "private" is a chat with the bot itself (good for testing). If the list is empty, send any message to the bot or in the group, then reload.', chats: [...chats].map(([id, c]) => ({ id, ...c })) });
  }
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const chat = await chatOf();
  if (!token || !chat) return json({ ok: false, error: 'not-configured' }, 503);

  let d;
  try { d = await req.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  if (!d || typeof d !== 'object' || d['bot-field']) return json({ ok: true }); // bots get a quiet "ok"
  const kind = d['form-name'];
  if (kind !== 'order' && kind !== 'booking') return json({ ok: false, error: 'bad-kind' }, 400);
  const phone = String(d.phone ?? '').replace(/\D/g, '');
  if (cut(d.name, MAX.name).length < 2 || !/\d{9}/.test(phone)) return json({ ok: false, error: 'bad-contact' }, 400);
  if (kind === 'order' && !cut(d.items, MAX.items)) return json({ ok: false, error: 'empty' }, 400);

  const cfg = await getCfg();
  if (kind === 'order' && cfg.paused) return json({ ok: false, error: 'paused' }, 423);

  const text = kind === 'order' ? orderText(d) : bookingText(d);
  const k = kind === 'order' ? (KIND[d.method] ?? 'p') : 'b';
  const id = kind === 'order' && ID_RE.test(String(d.order_id ?? '')) ? String(d.order_id) : '';
  const key = KEY_RE.test(String(d.track_key ?? '')) ? String(d.track_key) : '';
  const lang = ['uz', 'ru', 'en'].includes(d.lang) ? d.lang : 'uz';

  // The same order sent twice (slow network, double tap, retry): answer as before, never post it again.
  let rec = id ? await blobGet(id) : null;
  if (rec && rec.k !== key) return json({ ok: false, error: 'id-taken' }, 409);
  const sameAgain = async () => json({ ok: true, live: !!rec.live, bot: rec.live ? await getBotName(token) : '', again: true });
  if (rec && (rec.msg || rec.payload)) return sameAgain();

  // Limits: generous per address (a whole cafe can share one Wi-Fi), tighter per phone number.
  const ip = context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'x', nowMs = Date.now();
  const bump = (key, max) => { const r = (hits.get(key) ?? []).filter(t => nowMs - t < 10 * 60000); if (r.length >= max) return false; hits.set(key, [...r, nowMs]); return true; };
  if (hits.size > 5000) hits.clear();
  if (!bump('ip:' + ip, 200) || !bump('ph:' + phone.slice(-9), 6)) return json({ ok: false, error: 'too-many' }, 429);


  // Two copies of the same order arriving together: each claims the number, the last claim wins, the other waits for it.
  if (id && key) {
    const claim = Math.random().toString(36).slice(2);
    await blobSet(id, { k: key, kind: k, st: 'new', h: { new: nowMs }, lang, claim });
    await sleep(60 + Math.random() * 60);
    const back = await blobGet(id);
    if (back && back.claim !== claim && back.k === key) {
      for (let i = 0; i < 25; i++) { rec = await blobGet(id); if (rec?.msg || rec?.payload) return sameAgain(); await sleep(250); }
      return json({ ok: true, live: false, bot: '', again: true });
    }
  }

  const payload = { chat_id: chat, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [...statusRows('new', k, id), ...(kind === 'order' ? mapRow(d) : [])] } };
  // write the order down first, so it survives Telegram being slow or down
  const stored = id && key ? await blobSet(id, rec = { k: key, kind: k, st: 'new', h: { new: Date.now() }, lang }) : false;

  let res = await tgSafe(token, 'sendMessage', payload);
  const backup = env('TELEGRAM_BACKUP_CHAT_ID');
  if (!res.ok && backup && backup !== String(chat)) res = await tgSafe(token, 'sendMessage', { ...payload, chat_id: backup, text: '⚠️ Asosiy guruhga yuborib boʻlmadi\n\n' + text }, 2500);

  const hook = await ensureWebhook(token, req).catch(() => ({ ok: false }));
  const live = !!(stored && hook.ok);
  if (res.ok) {
    if (stored) { rec.msg = res.result.message_id; rec.live = live; await blobSet(id, rec); later(openAdd(id)); }
    return json({ ok: true, live, bot: live ? await getBotName(token) : '' });
  }
  // Telegram refused for now: keep it and let the every-minute check post it (the customer still gets an honest "sent")
  if (stored) {
    rec.payload = payload; rec.live = live; await blobSet(id, rec);
    if (await openAdd(id)) return json({ ok: true, live, bot: live ? await getBotName(token) : '', queued: true });
    delete rec.payload; await blobSet(id, rec); // not queued after all: let a retry send it fresh
  }
  return json({ ok: false, error: 'telegram' }, 502);
};

export const config = { path: '/api/telegram' };
