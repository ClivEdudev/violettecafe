// Sends every order and table booking from the website to the shop's Telegram group.
// Needs two environment variables in Netlify (Site configuration → Environment variables):
//   TELEGRAM_BOT_TOKEN — the token @BotFather gives when you create the bot
//   TELEGRAM_CHAT_ID   — the group's id (a negative number like -1001234567890)
// While TELEGRAM_CHAT_ID is empty, opening /api/telegram in a browser lists the groups the bot has seen,
// so you can copy the id from there. No packages needed: Node's own fetch talks to the Bot API.

const MAX = { name: 60, phone: 30, address: 200, comment: 400, items: 3500, short: 80 };
const hits = new Map(); // best-effort rate limit per visitor (per function instance)

const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const cut = (s, n) => String(s ?? '').slice(0, n).trim();
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const env = k => (globalThis.Netlify?.env?.get(k) ?? process.env[k] ?? '').trim();
const som = n => `${Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/\s/g, ' ')} soʻm`;

const METHOD = { delivery: '🛵 Yetkazib berish', pickup: '🥡 Olib ketish', table: '🍽 Stolga' };
const PAY = { cash: 'Naqd', card: 'Karta', click: 'Click / Payme / Uzum' };

function orderText(d) {
  const L = [
    `🍗 <b>Yangi buyurtma ${esc(cut(d.order_id, 12))}</b>`,
    `${METHOD[d.method] ?? esc(cut(d.method, 20))}${d.method === 'table' && d.table ? ` — stol ${esc(cut(d.table, 6))}` : ''}`,
    '',
    `👤 ${esc(cut(d.name, MAX.name))}`,
    `📞 ${esc(cut(d.phone, MAX.phone))}`,
  ];
  if (d.method === 'delivery') L.push(`📍 ${esc(cut(d.address, MAX.address))}${d.zone ? ` (${esc(cut(d.zone, MAX.short))})` : ''}`);
  L.push(`⏰ ${esc(cut(d.time, MAX.short))}`, `💳 ${PAY[d.payment] ?? esc(cut(d.payment, 20))}`, '', esc(cut(d.items, MAX.items)), '');
  if (Number(d.delivery) > 0) L.push(`Taomlar: ${som(d.subtotal)}`, `Yetkazish: ${som(d.delivery)}`);
  L.push(`<b>Jami: ${som(d.total)}</b>`);
  if (d.split) L.push(`Boʻlib toʻlash: ${esc(cut(d.split, 300))}`);
  if (d.comment) L.push('', `💬 ${esc(cut(d.comment, MAX.comment))}`);
  L.push('', `<i>Sayt tili: ${esc(cut(d.lang, 4))}</i>`);
  return L.join('\n');
}
function bookingText(d) {
  return [
    `📅 <b>Stol band qilish</b>`, '',
    `👤 ${esc(cut(d.name, MAX.name))}`, `📞 ${esc(cut(d.phone, MAX.phone))}`,
    `🗓 ${esc(cut(d.date, 20))}, ${esc(cut(d.time, 10))}`, `👥 ${esc(cut(d.guests, 3))} kishi`,
    ...(d.comment ? ['', `💬 ${esc(cut(d.comment, MAX.comment))}`] : []),
  ].join('\n');
}

export default async (req, context) => {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');

  if (req.method === 'GET') {
    // setup helper: only while the group isn't chosen yet
    if (!token) return json({ ok: false, step: 'Set TELEGRAM_BOT_TOKEN in Netlify, then redeploy.' });
    if (chat) return json({ ok: true, ready: true });
    const tg = m => fetch(`https://api.telegram.org/bot${token}/${m}`).then(x => x.json()).catch(e => ({ ok: false, description: 'network: ' + e.message }));
    const me = await tg('getMe');
    if (!me.ok) return json({ ok: false, step: 'Telegram rejected the token. Check TELEGRAM_BOT_TOKEN (no spaces, whole token) and redeploy.', telegram: me.description });
    let r = await tg('getUpdates');
    if (!r.ok && /webhook/i.test(r.description ?? '')) { await tg('deleteWebhook'); r = await tg('getUpdates'); }
    if (!r.ok) return json({ ok: false, bot: '@' + me.result.username, telegram: r.description });
    const chats = new Map();
    for (const u of r?.result ?? []) { const c = (u.message ?? u.my_chat_member ?? u.channel_post)?.chat; if (c) chats.set(c.id, { title: c.title ?? [c.first_name, c.last_name].filter(Boolean).join(' '), type: c.type }); }
    return json({ ok: true, bot: '@' + me.result.username, step: 'Copy an id into TELEGRAM_CHAT_ID and redeploy. Groups have negative ids; "private" is a chat with the bot itself (good for testing). If the list is empty, send any message to the bot or in the group, then reload.', chats: [...chats].map(([id, c]) => ({ id, ...c })) });
  }
  if (req.method !== 'POST') return json({ ok: false }, 405);
  if (!token || !chat) return json({ ok: false, error: 'not-configured' }, 503);

  const ip = context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'x', now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 10 * 60000);
  if (recent.length >= 8) return json({ ok: false, error: 'too-many' }, 429);
  hits.set(ip, [...recent, now]);

  let d;
  try { d = await req.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  if (!d || typeof d !== 'object' || d['bot-field']) return json({ ok: true }); // bots get a quiet "ok"
  const kind = d['form-name'];
  if (kind !== 'order' && kind !== 'booking') return json({ ok: false, error: 'bad-kind' }, 400);
  if (cut(d.name, MAX.name).length < 2 || !/\d{9}/.test(String(d.phone ?? '').replace(/\D/g, ''))) return json({ ok: false, error: 'bad-contact' }, 400);
  if (kind === 'order' && !cut(d.items, MAX.items)) return json({ ok: false, error: 'empty' }, 400);

  const text = kind === 'order' ? orderText(d) : bookingText(d);
  // Telegram turns the phone number into a tappable link by itself
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).then(x => x.json()).catch(() => null);
  if (!res?.ok) return json({ ok: false, error: 'telegram' }, 502);
  return json({ ok: true });
};

export const config = { path: '/api/telegram' };
