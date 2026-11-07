// Frans Burger service worker. Two jobs:
// 1. Keep the site on the phone: the first screen opens instantly on repeat visits and works with no internet.
//    Pages: try the network for 3 seconds, then use the saved copy (and refresh it in the background).
//    /assets/* files never change (their names carry a hash), so the saved copy is always right.
//    /api/* (orders, status) is never cached.
// 2. Open the order tracker when the customer taps an "order ready" notification.
// The build fills in VERSION and the file lists.
const VERSION = '__VERSION__';
const SHELL = '__SHELL__';
const LATER = '__LATER__';
const CACHE = 'ffs-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    // the on-demand parts too, but without holding up the install if one fails
    await Promise.allSettled(LATER.map(u => c.add(u)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('ffs-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

const timeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms))]);
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const net = fetch(req).then(r => { if (r.ok) c.put('/', r.clone()); return r; });
      e.waitUntil(net.catch(() => null));
      try { return await timeout(net, 3000); }
      catch { return (await c.match('/')) ?? (await net); }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE), hit = await c.match(req, { ignoreSearch: url.pathname.startsWith('/assets/') });
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok && (url.pathname.startsWith('/assets/') || /\.(svg|png|jpg|webp|woff2|webmanifest)$/.test(url.pathname))) c.put(req, r.clone());
    return r;
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find(c => new URL(c.url).origin === self.location.origin);
    if (open) { await open.focus(); open.postMessage({ type: 'open-track' }); return; }
    await self.clients.openWindow('/?track=1');
  })());
});
