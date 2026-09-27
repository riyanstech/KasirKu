/* ==========================================
   KasirKu — Core Module (Supabase)
   Store, Toast, Helpers, Image Utils
   ========================================== */
window.KR = window.KR || {};

/* ==================== STORE ==================== */
/* Local cache untuk tampilan cepat; sinkronisasi ke Supabase via KR.sb */
KR.store = (function () {
  'use strict';

  const KEYS = {
    products: 'products',
    transactions: 'transactions',
    settings: 'settings',
    authCache: 'authCache',
    aiConfig: 'aiConfig',
    visionCache: 'visionCache',
  };

  const DEFAULT_SETTINGS = {
    storeName: 'KasirKu',
    storeAddress: '',
    storePhone: '',
    receiptFooter: 'Terima kasih, datang lagi!',
    theme: 'light',
  };

  function get(key, defaultValue = null) {
    try {
      const v = localStorage.getItem('kasir:' + key);
      return v ? JSON.parse(v) : defaultValue;
    } catch (e) {
      console.warn('[Store] get failed', key, e);
      return defaultValue;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem('kasir:' + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Store] set failed', key, e);
      if (e.name === 'QuotaExceededError') {
        KR.toast?.error('Storage penuh! Hapus produk lama atau kompres foto.');
      }
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem('kasir:' + key); } catch {}
  }

  /* ---------- Products ---------- */
  function getProducts() {
    return get(KEYS.products, []);
  }
  function setProducts(arr) {
    set(KEYS.products, arr);
    window.dispatchEvent(new Event('products:changed'));
  }
  function addProduct(data) {
    const arr = getProducts();
    const id = 'p-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const newProd = { id, ...data };
    arr.push(newProd);
    setProducts(arr);
    return newProd;
  }
  function updateProduct(id, data) {
    const arr = getProducts();
    const idx = arr.findIndex(p => p.id === id);
    if (idx === -1) return null;
    arr[idx] = { ...arr[idx], ...data };
    setProducts(arr);
    return arr[idx];
  }
  function deleteProduct(id) {
    setProducts(getProducts().filter(p => p.id !== id));
  }
  function findProductBySku(sku) {
    const target = String(sku || '').trim();
    if (!target) return null;
    return getProducts().find(p => String(p.sku || '').trim() === target) || null;
  }
  function findProductById(id) {
    return getProducts().find(p => p.id === id) || null;
  }

  /* ---------- Transactions ---------- */
  function getTransactions() {
    return get(KEYS.transactions, []);
  }
  function setTransactions(arr) {
    set(KEYS.transactions, arr);
    window.dispatchEvent(new Event('transactions:changed'));
  }
  function addTransaction(trx) {
    const arr = getTransactions();
    arr.unshift(trx);
    if (arr.length > 1000) arr.length = 1000;
    setTransactions(arr);
    return trx;
  }
  function deleteTransaction(id) {
    setTransactions(getTransactions().filter(t => t.id !== id));
  }

  /* ---------- Settings ---------- */
  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...get(KEYS.settings, {}) };
  }
  function setSettings(s) {
    set(KEYS.settings, { ...getSettings(), ...s });
  }

  return {
    getProducts, setProducts, addProduct, updateProduct, deleteProduct,
    findProductBySku, findProductById,
    getTransactions, setTransactions, addTransaction, deleteTransaction,
    getSettings, setSettings,
    get, set, remove,
  };
})();

/* ==================== TOAST ==================== */
KR.toast = (function () {
  'use strict';

  function show(msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toasts');
    if (!container) {
      console.log('[Toast]', type, msg);
      return;
    }
    const div = document.createElement('div');
    div.className = 'toast ' + type;
    div.textContent = String(msg);
    container.appendChild(div);
    setTimeout(() => {
      div.style.opacity = '0';
      div.style.transform = 'translateX(24px)';
      setTimeout(() => div.remove(), 250);
    }, duration);
  }

  return {
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    warn: (m, d) => show(m, 'warn', d),
    info: (m, d) => show(m, 'info', d),
  };
})();

/* ==================== HELPERS ==================== */
function formatRupiah(n) {
  return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
}

function formatDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

/* ==========================================
   COMPRESS IMAGE — Support HEIC, big files, fallback
   ========================================== */
function compressImage(file, maxDim = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || (!(file instanceof File) && !(file instanceof Blob))) {
      return reject(new Error('File tidak valid'));
    }
    if (file.size > 25 * 1024 * 1024) {
      return reject(new Error('Foto terlalu besar (max 25MB)'));
    }

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        fileToDataUrl(file).then(resolve).catch(() => reject(new Error('Timeout memproses foto')));
      }
    }, 20000);

    function done(value) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve(value);
    }
    function fail(err) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      reject(err);
    }

    async function processImage(source) {
      try {
        let w = source.width || source.naturalWidth || 0;
        let h = source.height || source.naturalHeight || 0;
        if (!w || !h) throw new Error('Ukuran gambar tidak valid');

        const MAX_PIXELS = 4000000;
        const pixels = w * h;
        let scale = 1;
        if (pixels > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / pixels);
        if (w * scale > maxDim) scale = Math.min(scale, maxDim / w);
        if (h * scale > maxDim) scale = Math.min(scale, maxDim / h);
        scale = Math.min(scale, 1);

        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Canvas tidak didukung');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tw, th);
        try {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        } catch {}

        ctx.drawImage(source, 0, 0, tw, th);

        let dataUrl;
        try {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        } catch (e) {
          dataUrl = canvas.toDataURL('image/png');
        }
        if (!dataUrl || dataUrl.length < 50) throw new Error('Konversi gagal');

        canvas.width = 0;
        canvas.height = 0;
        done(dataUrl);
      } catch (err) {
        fail(err);
      }
    }

    function tryImageElement() {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImage(img);
        img.onerror = () => {
          fileToDataUrl(file)
            .then(dataUrl => {
              if (dataUrl.length > 2 * 1024 * 1024) {
                fail(new Error('Format foto tidak didukung (coba JPG/PNG)'));
              } else {
                done(dataUrl);
              }
            })
            .catch(() => fail(new Error('Format foto tidak didukung')));
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        fileToDataUrl(file).then(done).catch(() => fail(new Error('Gagal membaca file')));
      };
      reader.readAsDataURL(file);
    }

    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file, { imageOrientation: 'from-image' })
        .then(bitmap => processImage(bitmap))
        .catch(() => tryImageElement());
    } else {
      tryImageElement();
    }
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ==========================================
   PHOTO HELPERS — Supabase Storage
   ========================================== */
function extractPhotoFilename(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/product-photos\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function uploadPhotoToCloud(base64DataUrl, productId) {
  return await KR.sb.uploadPhoto(base64DataUrl, productId);
}

async function deletePhotoFromCloud(imageUrl) {
  return await KR.sb.deletePhoto(imageUrl);
}

/* ==========================================
   LAZY SCRIPT LOADER
   Cache script yang sudah dimuat — biar tidak double-load
   ========================================== */
window.__scriptCache = window.__scriptCache || {};

KR.loadScript = function (src) {
  if (window.__scriptCache[src]) return window.__scriptCache[src];
  window.__scriptCache[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Gagal load: ' + src));
    document.head.appendChild(s);
  });
  return window.__scriptCache[src];
};

/* Muat semua library export (Excel + PDF) saat dibutuhkan */
KR.ensureExportLibs = async function () {
  const tasks = [];

  }
  if (typeof XLSX === 'undefined') {
  // xlsx-js-style: fork dari xlsx yang support styling (fill, font, border, dll)
     tasks.push(KR.loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js'));
  }
  if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
    tasks.push(KR.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      .then(() => KR.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js')));
  }

  if (tasks.length) await Promise.all(tasks);
};

/* ==================== EXPOSE ==================== */
window.formatRupiah = formatRupiah;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
window.compressImage = compressImage;
window.extractPhotoFilename = extractPhotoFilename;
window.uploadPhotoToCloud = uploadPhotoToCloud;
window.deletePhotoFromCloud = deletePhotoFromCloud;

/* ==========================================
   PATCH LUCIDE — Debounce via requestAnimationFrame
   Supaya puluhan panggilan createIcons() dalam 1 frame = cuma jalan 1×
   ========================================== */
(function patchLucideDebounce() {
  function patch() {
    if (!window.lucide || !window.lucide.createIcons || window.lucide.__debounced) return false;
    const orig = window.lucide.createIcons;

    window.lucide.createIcons = function (...args) {
      // Kalau user kasih argumen (jarang), langsung eksekusi
      if (args.length > 0) return orig.apply(window.lucide, args);

      // Kalau nggak ada argumen → debounce via RAF
      if (window.lucide.__pending) return;
      window.lucide.__pending = requestAnimationFrame(() => {
        window.lucide.__pending = null;
        try {
          orig.call(window.lucide);
        } catch (e) {
          console.warn('[Lucide] refresh failed', e);
        }
      });
    };

    window.lucide.__debounced = true;
    console.log('%c[Perf] Lucide.createIcons debounced ✓', 'color:#10b981;font-weight:700;');
    return true;
  }

  if (patch()) return;

  // Kalau lucide belum ready (CDN masih loading), retry
  const t = setInterval(() => {
    if (patch()) clearInterval(t);
  }, 50);

  // Safety: stop retry setelah 5 detik
  setTimeout(() => clearInterval(t), 5000);
})();

