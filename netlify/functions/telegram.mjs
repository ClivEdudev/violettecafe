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

function orderText(d) {
  const k = kitchen(d);
  const head = METHOD[d.method] ?? esc(cut(d.method, 20));
  const L = [
    `${head}${d.method === 'table' && d.table ? ` · STOL ${esc(cut(d.table, 6))}` : ''}`,
    `<b>Buyurtma <code>${esc(cut(d.order_id, 12))}</code></b>`,
    `⏰ <b>${esc(whenText(d.time))}</b>`,
    '',
    `🍳 <b>OSHXONA${k.count ? ` — ${k.count} ta` : ''}</b>`,
    LINE,
    k.text,
  ];
  if (d.comment) L.push('', `⚠️ <b>Izoh:</b>`, `<blockquote>${esc(cut(d.comment, MAX.comment))}</blockquote>`);
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

/** Telegram → us: a staff member pressed a status button, typed /id, or the bot was added to a group. */
async function onUpdate(u, token, chat) {
  // helper for moving to the shop's group: the bot tells any chat its id
  const m = u.message, added = u.my_chat_member;
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
  if (String(q.message.chat.id) !== String(chat)) return answer('Bu chat ulanmagan');
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

  const who = [q.from?.first_name, q.from?.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Xodim';
  const add = `${text.includes('\n📋 HOLAT') ? '' : '\n\n📋 HOLAT'}\n${name} · ${who} · ${now()}`;
  const rows = step === 'cy' ? [] : statusRows(step, kind, id);
  const r = await tgCall(token, 'editMessageText', {
    ...msg, text: (text + add).slice(0, 4096), entities: q.message.entities ?? [],
    link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: [...rows, ...keep] },
  });
  if (r.ok && ID_RE.test(id)) {
    // tell the customer's page: the status and when each step happened
    const rec = await blobGet(id);
    if (rec) { rec.st = step; rec.h = { ...(rec.h ?? {}), [step]: Date.now() }; await blobSet(id, rec); }
  }
  return answer(r.ok ? name : 'Xatolik, qayta bosing');
}

export default async (req, context) => {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');

  // Telegram's own calls carry the secret we gave it in setWebhook
  const hookSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (req.method === 'POST' && hookSecret !== null) {
    if (!token || hookSecret !== await secretOf(token)) return json({ ok: false }, 403);
    try { await onUpdate(await req.json(), token, chat); } catch { /* always 200, or Telegram retries the same update */ }
    return json({ ok: true });
  }

  if (req.method === 'GET') {
    const qs = new URL(req.url).searchParams;
    if (qs.has('order')) {
      const id = qs.get('order') ?? '', k = qs.get('k') ?? '';
      if (!ID_RE.test(id) || !KEY_RE.test(k)) return json({ ok: false }, 400);
      const rec = await blobGet(id);
      if (!rec || rec.k !== k) return json({ ok: false, st: 'unknown' }, 404);
      return json({ ok: true, st: rec.st, h: rec.h ?? {} });
    }
    if (!token) return json({ ok: false, step: 'Set TELEGRAM_BOT_TOKEN in Netlify, then redeploy.' });
    if (chat) {
      const h = await ensureWebhook(token, req);
      const probe = { t: Date.now() };
      const stored = (await blobSet('SELFTEST', probe)) && (await blobGet('SELFTEST'))?.t === probe.t;
      return json({ ok: true, ready: true, buttons: h.ok ? 'on' : `off (${h.description ?? 'error'})`,
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
  if (!token || !chat) return json({ ok: false, error: 'not-configured' }, 503);

  const ip = context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'x', nowMs = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => nowMs - t < 10 * 60000);
  if (recent.length >= 8) return json({ ok: false, error: 'too-many' }, 429);
  hits.set(ip, [...recent, nowMs]);

  let d;
  try { d = await req.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  if (!d || typeof d !== 'object' || d['bot-field']) return json({ ok: true }); // bots get a quiet "ok"
  const kind = d['form-name'];
  if (kind !== 'order' && kind !== 'booking') return json({ ok: false, error: 'bad-kind' }, 400);
  if (cut(d.name, MAX.name).length < 2 || !/\d{9}/.test(String(d.phone ?? '').replace(/\D/g, ''))) return json({ ok: false, error: 'bad-contact' }, 400);
  if (kind === 'order' && !cut(d.items, MAX.items)) return json({ ok: false, error: 'empty' }, 400);

  const text = kind === 'order' ? orderText(d) : bookingText(d);
  const k = kind === 'order' ? (KIND[d.method] ?? 'p') : 'b';
  const id = kind === 'order' && ID_RE.test(String(d.order_id ?? '')) ? String(d.order_id) : '';
  const res = await tgCall(token, 'sendMessage', {
    chat_id: chat, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [...statusRows('new', k, id), ...(kind === 'order' ? mapRow(d) : [])] },
  });
  if (!res?.ok) return json({ ok: false, error: 'telegram' }, 502);
  // first order after a deploy switches the buttons on by itself
  const hook = await ensureWebhook(token, req).catch(() => ({ ok: false }));
  // live status on the customer's page needs both: the buttons reaching us, and somewhere to keep the status
  let live = false;
  if (id && KEY_RE.test(String(d.track_key ?? '')) && hook.ok) live = await blobSet(id, { k: String(d.track_key), kind: k, st: 'new', h: { new: Date.now() } });
  return json({ ok: true, live });
};

export const config = { path: '/api/telegram' };
