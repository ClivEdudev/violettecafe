// Only here so the order page can show system notifications ("your order is ready") on phones,
// where pages can't create them directly. No caching, no offline mode.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find(c => new URL(c.url).origin === self.location.origin);
    if (open) { await open.focus(); open.postMessage({ type: 'open-track' }); return; }
    await self.clients.openWindow('/?track=1');
  })());
});
