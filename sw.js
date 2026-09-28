/* ==========================================
   KasirKu — Service Worker
   Auto-update + Offline support
   v9 — Performance Sprint 1 (cache strategy optimized)
   ========================================== */
const CACHE_VERSION = 'kasirku-v18-tailwind-rebuild';

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

/* ==================== INSTALL ==================== */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(ASSETS).catch(err => console.warn('[SW] Cache partial failed', err));
    })
  );
  self.skipWaiting();
});

/* ==================== ACTIVATE ==================== */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_VERSION && key.startsWith('kasirku-'))
          .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

/* ============================================================
   FETCH STRATEGIES
   ============================================================ */

/**
 * Cache-first: cek cache dulu, baru network.
 * Cocok untuk: CSS, JS, font, gambar, icon (jarang berubah)
 */
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type === 'basic') {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (e) {
    // Fallback: kalau HTML, kasih index.html; kalau bukan, biarkan gagal
    const accept = req.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw e;
  }
}

/**
 * Network-first: coba network dulu, fallback ke cache.
 * Cocok untuk: API data, JSON dinamis
 */
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type === 'basic') {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fallback = await caches.match('./index.html');
    if (fallback) return fallback;
    throw e;
  }
}

/**
 * Stale-while-revalidate: kasih cache INSTAN, update di background.
 * Cocok untuk: HTML halaman (user dapat versi cepat, tapi tetap update)
 */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(req);

  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);

  // Kalau ada cache → langsung return + update di background
  // Kalau nggak ada cache → tunggu network
  return cached || networkPromise || caches.match('./index.html');
}

/* ==================== FETCH ROUTER ==================== */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Hanya handle GET
  if (req.method !== 'GET') return;

  // 2. Hanya same-origin (skip Supabase, Google Fonts, CDN)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 3. Skip protokol non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // 4. Skip request khusus (range, upload, dll)
  if (req.headers.has('range')) return;

  const accept = req.headers.get('accept') || '';
  const pathname = url.pathname;

  // ---- HTML → stale-while-revalidate (instant load) ----
  const isHtml = accept.includes('text/html')
              || pathname === '/'
              || pathname.endsWith('.html')
              || !pathname.includes('.'); // route tanpa ekstensi (misal /toko/slug)

  if (isHtml) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ---- Static assets → cache-first (JS, CSS, font, gambar) ----
  const isStatic = /\.(css|js|mjs|woff2?|ttf|otf|eot|png|jpe?g|svg|webp|gif|ico|json|xml|txt)$/i.test(pathname);

  if (isStatic) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ---- Default → network-first dengan fallback cache ----
  event.respondWith(networkFirst(req));
});

/* ==================== MESSAGE HANDLER ==================== */
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

/* ==================== NOTIFICATION CLICK ==================== */
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
