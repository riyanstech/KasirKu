/* ==========================================
   KasirKu — Service Worker
   Auto-update + Offline support
   ========================================== */
const CACHE_VERSION = 'kasirku-' + Date.now(); // ← otomatis berubah tiap deploy
const ASSETS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/core.js',
  './assets/js/auth.js',
  './assets/js/vision.js',
  './assets/js/pos.js',
  './assets/js/app.js',
];

/* Install — cache semua file */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Cache partial failed', err);
      });
    })
  );
  // Langsung aktif (tidak tunggu user close tab)
  self.skipWaiting();
});

/* Activate — hapus cache versi lama */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION && key.startsWith('kasirku-'))
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

/* Fetch — Network First, Cache Fallback */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip request non-GET atau ke API eksternal
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        // Update cache dengan response terbaru
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => {
        // Kalau offline → pakai cache
        return caches.match(req).then(cached => {
          if (cached) return cached;
          // Kalau tidak ada cache, return index.html (SPA fallback)
          return caches.match('./index.html');
        });
      })
  );
});

/* Message handler — untuk force update */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
