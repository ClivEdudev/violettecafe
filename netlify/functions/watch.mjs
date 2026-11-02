// Every minute: posts orders that Telegram refused earlier (busy or down), and reminds the group
// about orders nobody has accepted for 4+ minutes. The logic lives in telegram.mjs.
import { watchOrders } from './telegram.mjs';

export default async () => {
  const r = await watchOrders().catch(e => ({ ok: false, error: String(e) }));
  return new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '* * * * *' };
