/* ==========================================
   KasirKu — Offline Sync Module
   Queue transaksi, auto-push saat online
   ========================================== */
window.KR = window.KR || {};

KR.sync = (function () {
  'use strict';

  const QUEUE_KEY = 'syncQueue';
  const STOCK_QUEUE_KEY = 'stockQueue';
  let syncing = false;

  const isOnline = () => navigator.onLine;

  /* ---------- QUEUE MANAGEMENT ---------- */
  function getQueue() { return KR.store.get(QUEUE_KEY, []); }
  function saveQueue(arr) { KR.store.set(QUEUE_KEY, arr); updateBadge(); }

  function getStockQueue() { return KR.store.get(STOCK_QUEUE_KEY, []); }
  function saveStockQueue(arr) { KR.store.set(STOCK_QUEUE_KEY, arr); }

  /* ---------- ENQUEUE ---------- */
  function enqueueTransaction(trx) {
    const q = getQueue();
    q.push({
      localId: trx.id,
      trx: {
        id: trx.id,
        at: trx.at,
        items: trx.items,
        subtotal: trx.subtotal,
        discount: trx.discount || 0,
        total: trx.total,
        paid: trx.paid,
        change: trx.change,
        method: trx.method,
        itemCount: trx.itemCount,
      },
      queuedAt: Date.now(),
      retries: 0,
    });
    saveQueue(q);
    console.log('[Sync] Enqueued trx', trx.id, '| total pending:', q.length);
  }

  function enqueueStockUpdate(productId, newStock) {
    const q = getStockQueue();
    const existing = q.find(x => x.productId === productId);
    if (existing) {
      existing.newStock = newStock; // overwrite — yang terbaru yang menang
      existing.queuedAt = Date.now();
    } else {
      q.push({ productId, newStock, queuedAt: Date.now() });
    }
    saveStockQueue(q);
  }

  /* ---------- PUSH TO CLOUD ---------- */
  async function syncAll(silent = false) {
    if (syncing) return;
    if (!KR.auth.isLoggedIn()) return;
    if (!isOnline()) {
      if (!silent) KR.toast.warn('Tidak ada internet');
      return;
    }

    const q = getQueue();
    const sq = getStockQueue();
    if (!q.length && !sq.length) {
      if (!silent) KR.toast.info('Semua data sudah tersinkron ✅');
      return;
    }

    syncing = true;
    let okTrx = 0, failTrx = 0, okStock = 0, failStock = 0;

    try {
      // 1. Push transaksi
      const remaining = [];
      for (const item of q) {
        try {
          await KR.sb.insertTransaction(item.trx);
          okTrx++;
        } catch (e) {
          console.warn('[Sync] Trx fail', item.localId, e);
          // Kalau error duplicate (sudah pernah terkirim), anggap sukses
          if (e.code === '23505' || String(e.message || '').includes('duplicate')) {
            okTrx++;
          } else {
            item.retries = (item.retries || 0) + 1;
            if (item.retries < 5) remaining.push(item); // max 5 kali retry
            else failTrx++;
          }
        }
      }
      saveQueue(remaining);

      // 2. Push stock updates
      const remainingStock = [];
      for (const item of sq) {
        try {
          await KR.sb.updateProductDb(item.productId, { stock: item.newStock });
          okStock++;
        } catch (e) {
          console.warn('[Sync] Stock fail', item.productId, e);
          remainingStock.push(item);
        }
      }
      saveStockQueue(remainingStock);

      // Notifikasi hasil
      const totalOk = okTrx + okStock;
      const totalFail = failTrx + failStock;
      if (totalOk > 0 && !silent) {
        KR.toast.success(`✅ Tersinkron: ${okTrx} transaksi, ${okStock} update stok`);
      }
      if (totalFail > 0) {
        KR.toast.warn(`⚠ ${totalFail} item gagal sync (akan retry otomatis)`);
      }
      if (okTrx > 0) {
        window.dispatchEvent(new Event('sync:done'));
      }
    } finally {
      syncing = false;
      updateBadge();
    }
  }

  /* ---------- BADGE / INDICATOR ---------- */
  function getPendingCount() {
    return getQueue().length + getStockQueue().length;
  }

  function updateBadge() {
    const count = getPendingCount();
    const badge = document.getElementById('sync-badge');
    const offlineBadge = document.getElementById('offline-badge');
    const online = isOnline();

    // Offline indicator di header
    if (offlineBadge) {
      offlineBadge.classList.toggle('hidden', online);
    }

    // Sync badge
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
        badge.title = `${count} data pending — klik untuk sync sekarang`;
        badge.style.cursor = 'pointer';
        badge.onclick = () => syncAll(false);
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  /* ---------- SETUP LISTENERS ---------- */
  function setupListeners() {
    window.addEventListener('online', () => {
      console.log('[Sync] 🌐 Online — auto-sync...');
      KR.toast.success('Internet kembali! Sinkronisasi otomatis...', 2000);
      updateBadge();
      setTimeout(() => syncAll(true), 1500);
    });

    window.addEventListener('offline', () => {
      console.log('[Sync] 📴 Offline');
      KR.toast.warn('Mode offline aktif — transaksi tetap bisa', 4000);
      updateBadge();
    });

    // Periodic sync setiap 60 detik kalau ada pending
    setInterval(() => {
      if (isOnline() && getPendingCount() > 0) syncAll(true);
    }, 60000);

    // Initial state
    updateBadge();

    // Hook ke login — kalau habis login dan ada pending, langsung sync
    window.addEventListener('kasirku:ready', () => {
      if (isOnline() && getPendingCount() > 0) {
        setTimeout(() => syncAll(true), 2000);
      }
    });
  }

  return {
    enqueueTransaction,
    enqueueStockUpdate,
    syncAll,
    getPendingCount,
    updateBadge,
    isOnline,
    setupListeners,
  };
})();
