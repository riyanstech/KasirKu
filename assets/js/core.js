/* ==========================================
   KasirKu — Core Module
   Store, Toast, GitHub, Helpers, Image Utils
   ========================================== */
window.KR = window.KR || {};

/* ==================== STORE ==================== */
KR.store = (function () {
  'use strict';

  const KEYS = {
    products: 'products',
    transactions: 'transactions',
    settings: 'settings',
    github: 'github',
    auth: 'auth',
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

  /* ---------- GitHub config ---------- */
  function getGitHubConfig() {
    return get(KEYS.github, null);
  }
  function setGitHubConfig(cfg) {
    set(KEYS.github, cfg);
  }
  function clearGitHubConfig() {
    remove(KEYS.github);
  }

  return {
    getProducts, setProducts, addProduct, updateProduct, deleteProduct,
    findProductBySku, findProductById,
    getTransactions, setTransactions, addTransaction, deleteTransaction,
    getSettings, setSettings,
    getGitHubConfig, setGitHubConfig, clearGitHubConfig,
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

/* ==================== GITHUB ==================== */
KR.github = (function () {
  'use strict';

  const API = 'https://api.github.com';

  function getConfig() {
    return KR.store.getGitHubConfig();
  }

  function isConfigured() {
    const c = getConfig();
    return !!(c && c.owner && c.repo && c.token && c.branch);
  }

  function headers() {
    const c = getConfig();
    if (!c) return {};
    return {
      'Authorization': 'Bearer ' + c.token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  function encodePath(path) {
    return String(path || '')
      .split('/')
      .map(s => encodeURIComponent(s))
      .join('/');
  }

  async function testConnection() {
    if (!isConfigured()) return { ok: false, msg: 'Konfigurasi belum lengkap' };
    try {
      const c = getConfig();
      const res = await fetch(`${API}/repos/${c.owner}/${c.repo}`, { headers: headers() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, msg: err.message || `HTTP ${res.status}` };
      }
      const data = await res.json();
      return { ok: true, msg: `Terhubung ke ${data.full_name}`, data };
    } catch (e) {
      return { ok: false, msg: e.message || 'Gagal koneksi' };
    }
  }

  async function getFileSha(path) {
    try {
      const c = getConfig();
      if (!c) return null;
      const url = `${API}/repos/${c.owner}/${c.repo}/contents/${encodePath(path)}?ref=${c.branch}&t=${Date.now()}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.sha || null;
    } catch {
      return null;
    }
  }

  async function getFileContent(path) {
    try {
      const c = getConfig();
      if (!c) return null;
      const url = `${API}/repos/${c.owner}/${c.repo}/contents/${encodePath(path)}?ref=${c.branch}&t=${Date.now()}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.content) return null;
      return decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
    } catch {
      return null;
    }
  }

  /**
   * Upload file ke GitHub
   * @param {string} path - Path file di repo
   * @param {string} content - Konten (text atau base64)
   * @param {string} message - Commit message
   * @param {object} options - { isBase64: true } jika content sudah base64
   */
  async function uploadFile(path, content, message, options = {}) {
    if (!isConfigured()) throw new Error('GitHub belum dikonfigurasi');
    const c = getConfig();
    const sha = await getFileSha(path);

    const encodedContent = options.isBase64
      ? String(content || '')
      : btoa(unescape(encodeURIComponent(String(content || ''))));

    const body = {
      message: message || `Update ${path}`,
      content: encodedContent,
      branch: c.branch,
    };
    if (sha) body.sha = sha;

    const url = `${API}/repos/${c.owner}/${c.repo}/contents/${encodePath(path)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  async function deleteFile(path, message) {
    if (!isConfigured()) throw new Error('GitHub belum dikonfigurasi');
    const c = getConfig();
    const sha = await getFileSha(path);
    if (!sha) return null;
    const url = `${API}/repos/${c.owner}/${c.repo}/contents/${encodePath(path)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({
        message: message || `Delete ${path}`,
        sha,
        branch: c.branch,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  return {
    getConfig, isConfigured,
    testConnection, getFileContent, uploadFile, getFileSha, deleteFile,
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
   COMPRESS IMAGE v2 — Support HEIC, big files, fallback
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
   PHOTO UPLOAD TO GITHUB
   Simpan foto sebagai file di repo → URL permanen
   ========================================== */
async function uploadPhotoToGithub(base64DataUrl, filename) {
  if (!KR.github.isConfigured()) {
    throw new Error('Login GitHub dulu untuk simpan foto');
  }
  const path = `photos/${filename}`;
  // Strip data URL prefix → ambil base64 murni
  const base64 = String(base64DataUrl || '').replace(/^data:image\/\w+;base64,/, '');
  if (!base64) throw new Error('Data foto kosong');

  await KR.github.uploadFile(path, base64, `feat: add photo ${filename}`, { isBase64: true });

  const c = KR.store.getGitHubConfig();
  return `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${c.branch}/${path}`;
}

async function deletePhotoFromGithub(filename) {
  if (!KR.github.isConfigured()) return;
  try {
    await KR.github.deleteFile(`photos/${filename}`, `chore: delete ${filename}`);
  } catch (e) {
    console.warn('[Photo] Delete failed', e);
  }
}

/* ==========================================
   PHOTO CLEANUP — Bersihkan foto yatim
   ========================================== */
function extractPhotoFilename(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/photos\/([^/?#]+)/);
  return match ? match[1] : null;
}

async function listPhotosInGithub() {
  if (!KR.github.isConfigured()) return [];
  const c = KR.store.getGitHubConfig();
  const url = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/photos?ref=${c.branch}&t=${Date.now()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + c.token,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    // Folder photos belum ada → anggap kosong
    if (res.status === 404) return [];
    if (!res.ok) {
      console.warn('[ListPhotos] HTTP', res.status);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter(f => f && f.type === 'file')
      .map(f => String(f.name || ''))
      .filter(Boolean);
  } catch (e) {
    console.warn('[ListPhotos] Error:', e);
    return [];
  }
}

window.extractPhotoFilename = extractPhotoFilename;
window.listPhotosInGithub = listPhotosInGithub;

window.formatRupiah = formatRupiah;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
window.compressImage = compressImage;
window.uploadPhotoToGithub = uploadPhotoToGithub;
window.deletePhotoFromGithub = deletePhotoFromGithub;
