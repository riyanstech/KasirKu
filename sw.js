/* ==========================================
   KasirKu — Service Worker v3
   Network-First untuk HTML/JS/CSS
   Cache-First untuk CDN & gambar
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

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function (err) {
        console.warn('[SW] cache addAll', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k.indexOf(CACHE_VERSION) !== 0; })
          .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // GitHub API — selalu fresh
  if (url.hostname === 'api.github.com') return;

  // Cache-first untuk CDN & gambar
  const isCDN =
    url.hostname.indexOf('unpkg.com') !== -1 ||
    url.hostname.indexOf('fonts.googleapis.com') !== -1 ||
    url.hostname.indexOf('fonts.gstatic.com') !== -1 ||
    url.hostname.indexOf('raw.githubusercontent.com') !== -1;

  if (isCDN) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(function (cache) {
        return cache.match(req).then(function (cached) {
          if (cached) return cached;
          return fetch(req).then(function (res) {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Network-first untuk file lokal
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(function (c) { c.put(req, clone); }).catch(function () {});
          }
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
  }
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
