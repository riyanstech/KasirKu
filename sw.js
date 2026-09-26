/* ==========================================
   KasirKu — Service Worker
   Auto-update + Offline support
   ========================================== */
const CACHE_VERSION = 'kasirku-v8-unit-produk';

const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './order.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/supabase.js',
  './assets/js/core.js',
  './assets/js/auth.js',
  './assets/js/vision.js',
  './assets/js/thermal.js',
  './assets/js/thermal-ui.js',
  './assets/js/sync.js',
  './assets/js/pos.js',
  './assets/js/orders.js',
  './assets/js/customers-admin.js',
  './assets/js/kasbon.js',
  './assets/js/customer-auth.js',
  './assets/js/customer-tasks.js',
  './assets/js/seller-tasks.js',
  './assets/js/pwa.js',
  './assets/js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(ASSETS).catch(err => console.warn('[SW] Cache partial failed', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_VERSION && key.startsWith('kasirku-'))
          .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* ==================== PUSH NOTIFICATION ==================== */
self.addEventListener('push', (event) => {
  let data = { title: 'Order Baru!', body: 'Ada pesanan masuk', icon: '/assets/icons/icon-192.png' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.icon,
      tag: data.tag || 'kasirku-order',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: data.url || '/index.html' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Kalau ada tab yang buka, fokus ke situ
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Kalau tidak ada, buka tab baru
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
