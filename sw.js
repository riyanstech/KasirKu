/* ==========================================
   KasirKu — Service Worker v3
   Network-First untuk HTML/JS/CSS, Cache-First untuk gambar CDN
   ========================================== */
const CACHE_VERSION = 'kasirku-v3';
const STATIC_CACHE = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/core.js',
  './assets/js/auth.js',
  './assets/js/vision.js',
  './assets/js/pos.js',
  './assets/js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(err => console.warn('[SW]', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip GitHub API — selalu fresh
  if (url.hostname === 'api.github.com') return;

  // Cache-first untuk CDN & gambar
  const isCDN = url.hostname.includes('unpkg.com') ||
                url.hostname.includes('fonts.googleapis.com') ||
                url.hostname.includes('fonts.gstatic.com') ||
                url.hostname.includes('raw.githubusercontent.com');

  if (isCDN) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(req).then(cached => {
          if (cached) return cached;
          return fetch(req).then(res => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Network-first untuk HTML/JS/CSS lokal
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match('./index.html'))
        )
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
