/* ==========================================
   KasirKu — Service Worker
   Auto-update + Offline support
   ========================================== */
const CACHE_VERSION = 'kasirku-' + Date.now();
const ASSETS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/supabase.js',
  './assets/js/core.js',
  './assets/js/auth.js',
  './assets/js/vision.js',
  './assets/js/pos.js',
  './assets/js/orders.js',
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
