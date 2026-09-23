/* ==========================================
   KasirKu — Main App Module
   Navigation, Theme, Product, Transaction, Settings
   ========================================== */
window.KR = window.KR || {};

/* ==================== MODAL HELPERS ==================== */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}
window.openModal = openModal;
window.closeModal = closeModal;

function showLoading(text = 'Memproses...') {
  const loadingText = document.getElementById('loading-text');
  const loading = document.getElementById('loading');
  if (loadingText) loadingText.textContent = text;
  if (loading) loading.classList.add('active');
}
function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.classList.remove('active');
}
window.showLoading = showLoading;
window.hideLoading = hideLoading;

function confirmDialog(title, message, onOk) {
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok');
  if (!titleEl || !msgEl || !okBtn) return;
  titleEl.textContent = title;
  msgEl.textContent = message;
  const fresh = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(fresh, okBtn);
  fresh.addEventListener('click', () => {
    closeModal('modal-confirm');
    if (typeof onOk === 'function') onOk();
  });
  openModal('modal-confirm');
}
window.confirmDialog = confirmDialog;

/* ==================== NAVIGATION ==================== */
function showTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });

  if (tabId === 'kasir') {
    renderPosGrid();
    renderCategoryChips();
    renderCart();
  }
  if (tabId === 'produk') renderProductList();
  if (tabId === 'transaksi') renderTransactionList();
  if (tabId === 'pengaturan') loadSettings();

  // Render lucide 3x dengan delay — pastikan ikon selalu muncul
  if (window.lucide) {
    lucide.createIcons();
    setTimeout(() => window.lucide && lucide.createIcons(), 30);
    setTimeout(() => window.lucide && lucide.createIcons(), 150);
  }
}
window.showTab = showTab;

/* ==================== THEME ==================== */
function initTheme() {
  const s = KR.store.getSettings();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = s.theme || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.setAttribute('data-lucide', 'sun');
  } else {
    document.documentElement.classList.remove('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.setAttribute('data-lucide', 'moon');
  }
  if (window.lucide) lucide.createIcons();
}
function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  KR.store.setSettings({ theme: next });
}
window.toggleTheme = toggleTheme;

/* ==================== PRODUCT MANAGEMENT ==================== */
let pfImageData = '';

function renderProductList() {
  const container = document.getElementById('product-list');
  if (!container) return;

  const products = KR.store.getProducts();
  const searchEl = document.getElementById('prod-search');
  const catEl = document.getElementById('prod-cat-filter');
  const search = (searchEl?.value || '').toLowerCase().trim();
  const catFilter = catEl?.value || '';

  if (catEl) {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    const currentVal = catEl.value;
    catEl.innerHTML = `<option value="">Semua Kategori</option>` +
      cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    catEl.value = currentVal;
  }

  const countEl = document.getElementById('prod-count-label');
  if (countEl) countEl.textContent = products.length + ' produk';

  const filtered = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (!search) return true;
    return (p.name || '').toLowerCase().includes(search) ||
           (p.sku || '').toLowerCase().includes(search) ||
           (p.category || '').toLowerCase().includes(search);
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <i data-lucide="package-open"></i>
      <h3>${products.length ? 'Tidak ada hasil' : 'Belum ada produk'}</h3>
      <p style="font-size:.85rem">${products.length ? 'Coba kata kunci lain' : 'Klik "Tambah Produk" untuk memulai'}</p>
    </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(p => {
    const img = p.image ? `<img src="${p.image}" alt="">` : `<i data-lucide="package"></i>`;
    const out = p.stock !== undefined && p.stock !== null && p.stock <= 0;
    const low = !out && p.stock !== undefined && p.stock !== null && p.stock <= 5;

    let stockChip = `<span class="pa-chip neutral">∞</span>`;
    if (p.stock !== undefined && p.stock !== null) {
      if (out) stockChip = `<span class="pa-chip danger">Habis</span>`;
      else if (low) stockChip = `<span class="pa-chip warn">Stok ${p.stock}</span>`;
      else stockChip = `<span class="pa-chip neutral">Stok ${p.stock}</span>`;
    }

    const profit = (Number(p.price) || 0) - (Number(p.cost) || 0);
    const profitChip = profit > 0 ? `<span class="pa-chip neutral">Margin ${formatRupiah(profit)}</span>` : '';

    return `
      <div class="pa-card">
        <div class="pa-img">${img}</div>
        <div class="pa-body">
          <div class="pa-name">${escapeHtml(p.name)}</div>
          <div class="pa-sku">SKU: ${escapeHtml(p.sku || '-')}</div>
          <div class="pa-meta">
            ${p.category ? `<span class="pa-chip primary">${escapeHtml(p.category)}</span>` : ''}
            ${stockChip}
            ${profitChip}
          </div>
          <div class="pa-price">${formatRupiah(p.price)}</div>
        </div>
        <div class="pa-actions">
          <button class="icon-btn" onclick="openProductForm(null, '${p.id}')" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          <button class="icon-btn-danger" onclick="confirmDeleteProduct('${p.id}')" title="Hapus">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>`;
  }).join('');
  if (window.lucide) lucide.createIcons();
}
window.renderProductList = renderProductList;

function openProductForm(preset = null, editId = null) {
  pfImageData = '';
  const isEdit = !!editId;

  const titleEl = document.getElementById('product-form-title');
  const idEl = document.getElementById('pf-id');
  const nameEl = document.getElementById('pf-name');
  const skuEl = document.getElementById('pf-sku');
  const costEl = document.getElementById('pf-cost');
  const priceEl = document.getElementById('pf-price');
  const stockEl = document.getElementById('pf-stock');
  const catEl = document.getElementById('pf-category');
  const statusEl = document.getElementById('pf-image-status');

  if (titleEl) titleEl.textContent = isEdit ? 'Edit Produk' : 'Tambah Produk';
  if (idEl) idEl.value = editId || '';
  if (nameEl) nameEl.value = '';
  if (skuEl) skuEl.value = '';
  if (costEl) costEl.value = '';
  if (priceEl) priceEl.value = '';
  if (stockEl) stockEl.value = '0';
  if (catEl) catEl.value = '';
  if (statusEl) statusEl.innerHTML = '';

  if (isEdit) {
    const p = KR.store.findProductById(editId);
    if (p) {
      if (nameEl) nameEl.value = p.name || '';
      if (skuEl) skuEl.value = p.sku || '';
      if (costEl) costEl.value = p.cost || '';
      if (priceEl) priceEl.value = p.price || '';
      if (stockEl) stockEl.value = (p.stock != null ? p.stock : 0);
      if (catEl) catEl.value = p.category || '';
      pfImageData = p.image || '';
    }
  } else if (preset) {
    if (preset.sku && skuEl) skuEl.value = preset.sku;
    if (preset.name && nameEl) nameEl.value = preset.name;
    if (preset.category && catEl) catEl.value = preset.category;
    if (preset.image) pfImageData = preset.image;
  }

  renderPfImage();
  openModal('modal-product');
  setTimeout(() => nameEl?.focus(), 200);
}
window.openProductForm = openProductForm;

function renderPfImage() {
  const area = document.getElementById('pf-image-area');
  if (!area) return;
  if (pfImageData) {
    area.innerHTML = `
      <div class="img-preview">
        <img src="${pfImageData}" alt="">
        <button type="button" class="img-preview-remove" onclick="removePfImage()">
          <i data-lucide="x"></i>
        </button>
      </div>`;
  } else {
    area.innerHTML = `
      <button type="button" class="img-upload-btn" onclick="document.getElementById('pf-image-input').click()">
        <i data-lucide="image-plus"></i> Upload Foto Produk
      </button>`;
  }
  if (window.lucide) lucide.createIcons();
}

function removePfImage() {
  pfImageData = '';
  const statusEl = document.getElementById('pf-image-status');
  if (statusEl) statusEl.innerHTML = '';
  renderPfImage();
}
window.removePfImage = removePfImage;

document.addEventListener('change', async (e) => {
  if (e.target.id === 'pf-image-input') {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const statusEl = document.getElementById('pf-image-status');
    if (statusEl) statusEl.innerHTML = `<div style="margin-top:8px;font-size:.78rem;color:var(--text-3);">Memproses foto...</div>`;

    try {
      const data = await compressImage(file, 700, 0.78);
      if (!data || data.length < 50) throw new Error('Hasil kompres kosong');
      pfImageData = data;
      renderPfImage();
      if (statusEl) {
        statusEl.innerHTML = `<div style="margin-top:8px;font-size:.78rem;color:var(--success);font-weight:700;">✓ Foto siap (${Math.round(data.length / 1024)} KB)</div>`;
      }
    } catch (err) {
      console.error('[Product image]', err);
      const msg = err?.message || 'Unknown error';
      if (statusEl) {
        statusEl.innerHTML = `<div style="margin-top:8px;font-size:.78rem;color:var(--danger);font-weight:700;">✗ ${escapeHtml(msg)}</div>`;
      }
      KR.toast.error('Gagal: ' + msg);
    }
  }
});

async function saveProduct() {
  const idEl = document.getElementById('pf-id');
  const nameEl = document.getElementById('pf-name');
  const skuEl = document.getElementById('pf-sku');
  const costEl = document.getElementById('pf-cost');
  const priceEl = document.getElementById('pf-price');
  const stockEl = document.getElementById('pf-stock');
  const catEl = document.getElementById('pf-category');
  if (!idEl || !nameEl || !skuEl || !priceEl) return;

  const id = idEl.value;
  const name = nameEl.value.trim();
  const sku = skuEl.value.trim();
  const cost = Number(costEl?.value) || 0;
  const price = Number(priceEl.value) || 0;
  const stock = Number(stockEl?.value) || 0;
  const category = (catEl?.value || '').trim();

  if (!name) {
    KR.toast.error('Nama produk wajib diisi');
    return;
  }
  if (!sku) {
    KR.toast.error('SKU wajib diisi');
    return;
  }
  if (price <= 0) {
    KR.toast.error('Harga jual harus lebih dari 0');
    return;
  }

  const dup = KR.store.findProductBySku(sku);
  if (dup && dup.id !== id) {
    KR.toast.error('SKU sudah dipakai produk lain');
    return;
  }

  // Upload foto ke GitHub kalau ada foto baru (base64) & login GitHub
  let imageUrl = pfImageData || '';
  if (imageUrl && imageUrl.startsWith('data:') && KR.auth && KR.auth.isGitHubUser()) {
    showLoading('Mengunggah foto...');
    try {
      const prodId = id || ('p-' + Date.now());
      const filename = prodId + '.jpg';
      const url = await uploadPhotoToGithub(imageUrl, filename);
      imageUrl = url;
      KR.toast.success('Foto tersimpan di GitHub');
    } catch (e) {
      console.error('[Upload photo]', e);
      KR.toast.warn('Foto gagal di-upload, disimpan lokal saja');
    } finally {
      hideLoading();
    }
  }

  const data = {
    name: name,
    sku: sku,
    cost: cost,
    price: price,
    stock: stock,
    category: category,
    image: imageUrl,
  };

  if (id) {
    KR.store.updateProduct(id, data);
    KR.toast.success('Produk diperbarui');
  } else {
    KR.store.addProduct(data);
    KR.toast.success('Produk ditambahkan');
  }

  closeModal('modal-product');
  renderProductList();
  renderPosGrid();
  renderCategoryChips();
  autoSync();
}
window.saveProduct = saveProduct;

function confirmDeleteProduct(id) {
  const p = KR.store.findProductById(id);
  if (!p) return;
  confirmDialog('Hapus Produk?', `Produk "${p.name}" akan dihapus permanen.`, () => {
    KR.store.deleteProduct(id);
    KR.toast.success('Produk dihapus');
    renderProductList();
    renderPosGrid();
    renderCategoryChips();
    autoSync();
  });
}
window.confirmDeleteProduct = confirmDeleteProduct;

/* ==================== TRANSACTION LIST ==================== */
function renderTransactionList() {
  const container = document.getElementById('trx-list');
  if (!container) return;

  const trxList = KR.store.getTransactions();
  const dateEl = document.getElementById('trx-date-filter');
  const dateFilter = dateEl?.value || '';

  const countEl = document.getElementById('trx-count-label');
  if (countEl) countEl.textContent = trxList.length + ' transaksi';

  const filtered = trxList.filter(t => {
    if (!dateFilter) return true;
    const d = new Date(t.at);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}` === dateFilter;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">
      <i data-lucide="receipt-text"></i>
      <h3>${trxList.length ? 'Tidak ada transaksi di tanggal ini' : 'Belum ada transaksi'}</h3>
    </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(t => `
    <div class="trx-card">
      <div class="trx-icon"><i data-lucide="receipt"></i></div>
      <div class="trx-body">
        <div class="trx-id">${escapeHtml(t.id)}</div>
        <div class="trx-date">${formatDate(t.at)}</div>
        <div class="trx-meta">
          <span class="pa-chip primary">${t.itemCount} item</span>
          <span class="pa-chip neutral">${escapeHtml(t.method)}</span>
        </div>
      </div>
      <div>
        <div class="trx-total">${formatRupiah(t.total)}</div>
      </div>
      <div class="trx-actions">
        <button class="icon-btn" onclick="viewTransaction('${t.id}')" title="Lihat Struk">
          <i data-lucide="eye"></i>
        </button>
        <button class="icon-btn-danger" onclick="confirmDeleteTrx('${t.id}')" title="Hapus">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}
window.renderTransactionList = renderTransactionList;

function viewTransaction(id) {
  const trx = KR.store.getTransactions().find(t => t.id === id);
  if (!trx) return;
  showReceipt(trx);
}
window.viewTransaction = viewTransaction;

function confirmDeleteTrx(id) {
  confirmDialog('Hapus Transaksi?', 'Transaksi ini akan dihapus dari riwayat.', () => {
    KR.store.deleteTransaction(id);
    KR.toast.success('Transaksi dihapus');
    renderTransactionList();
    autoSync();
  });
}
window.confirmDeleteTrx = confirmDeleteTrx;

/* ==================== SETTINGS ==================== */
function loadSettings() {
  const s = KR.store.getSettings();
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  setVal('set-store-name', s.storeName);
  setVal('set-store-address', s.storeAddress);
  setVal('set-store-phone', s.storePhone);
  setVal('set-receipt-footer', s.receiptFooter);
  loadGithubConfig();
  initAiSettings();
  if (KR.auth) KR.auth.renderAccountCard();
}
window.loadSettings = loadSettings;

function saveStoreInfo() {
  const getVal = id => document.getElementById(id)?.value.trim() || '';
  KR.store.setSettings({
    storeName: getVal('set-store-name') || 'KasirKu',
    storeAddress: getVal('set-store-address'),
    storePhone: getVal('set-store-phone'),
    receiptFooter: getVal('set-receipt-footer') || 'Terima kasih',
  });
  KR.toast.success('Informasi toko disimpan');
  autoSync();
}
window.saveStoreInfo = saveStoreInfo;

/* ==================== AI VISION SETTINGS ==================== */
function initAiSettings() {
  const cfg = KR.vision.getConfig();

  const sel = document.getElementById('ai-provider');
  if (sel) {
    sel.innerHTML = Object.entries(KR.vision.PROVIDERS).map(([id, p]) =>
      `<option value="${id}">${p.icon} ${p.name}</option>`
    ).join('');
    sel.value = cfg.provider || 'gemini';
  }

  const enabledEl = document.getElementById('ai-enabled');
  if (enabledEl) enabledEl.checked = !!cfg.enabled;
  const keyEl = document.getElementById('ai-key');
  if (keyEl) keyEl.value = cfg.apiKey || '';
  const configArea = document.getElementById('ai-config-area');
  if (configArea) configArea.classList.toggle('hidden', !cfg.enabled);

  updateAiProviderUI(cfg.provider || 'gemini');
  updateAiStatus();
}
window.initAiSettings = initAiSettings;

function toggleAiEnabled() {
  const el = document.getElementById('ai-enabled');
  if (!el) return;
  const enabled = el.checked;
  KR.vision.saveConfig({ enabled: enabled });
  const configArea = document.getElementById('ai-config-area');
  if (configArea) configArea.classList.toggle('hidden', !enabled);
  updateAiStatus();
  if (enabled) KR.toast.info('AI Vision diaktifkan');
}
window.toggleAiEnabled = toggleAiEnabled;

function onAiProviderChange() {
  const el = document.getElementById('ai-provider');
  if (!el) return;
  const provider = el.value;
  KR.vision.saveConfig({ provider: provider });
  updateAiProviderUI(provider);
  updateAiStatus();
}
window.onAiProviderChange = onAiProviderChange;

function updateAiProviderUI(providerId) {
  const p = KR.vision.PROVIDERS[providerId];
  if (!p) return;
  const desc = document.getElementById('ai-provider-desc');
  if (desc) desc.textContent = p.desc || '';
  const help = document.getElementById('ai-key-help');
  if (help) help.href = p.keyUrl || '#';
}
window.updateAiProviderUI = updateAiProviderUI;

function saveAiKey() {
  const providerEl = document.getElementById('ai-provider');
  const keyEl = document.getElementById('ai-key');
  if (!providerEl || !keyEl) return;
  const provider = providerEl.value;
  const apiKey = keyEl.value.trim();
  if (!apiKey) {
    KR.toast.error('API Key kosong');
    return;
  }
  KR.vision.saveConfig({ provider: provider, apiKey: apiKey, enabled: true });
  const enabledEl = document.getElementById('ai-enabled');
  if (enabledEl) enabledEl.checked = true;
  const configArea = document.getElementById('ai-config-area');
  if (configArea) configArea.classList.remove('hidden');
  updateAiStatus();
  KR.toast.success('API Key tersimpan');
}
window.saveAiKey = saveAiKey;

function updateAiStatus() {
  const cfg = KR.vision.getConfig();
  const el = document.getElementById('ai-status');
  if (!el) return;
  if (!cfg.enabled) {
    el.className = 'gh-status warn';
    el.innerHTML = `<i data-lucide="power-off"></i><span>AI Vision nonaktif</span>`;
  } else if (!cfg.apiKey) {
    el.className = 'gh-status warn';
    el.innerHTML = `<i data-lucide="alert-triangle"></i><span>API Key belum diisi</span>`;
  } else {
    el.className = 'gh-status ok';
    const p = KR.vision.PROVIDERS[cfg.provider];
    const name = p ? p.name : cfg.provider;
    el.innerHTML = `<i data-lucide="check-circle"></i><span>Aktif — ${escapeHtml(name)}</span>`;
  }
  if (window.lucide) lucide.createIcons();
}
window.updateAiStatus = updateAiStatus;

async function testAiConnection() {
  const keyEl = document.getElementById('ai-key');
  if (!keyEl) return;
  const apiKey = keyEl.value.trim();
  if (!apiKey) {
    KR.toast.error('Isi API Key dulu');
    return;
  }
  KR.vision.saveConfig({ apiKey: apiKey });
  showLoading('Testing AI...');
  try {
    await KR.vision.testConnection();
    KR.toast.success('AI terhubung!');
  } catch (err) {
    console.error(err);
    KR.toast.error('Gagal: ' + (err.message || 'Unknown'));
  } finally {
    hideLoading();
  }
}
window.testAiConnection = testAiConnection;

function clearAiCache() {
  confirmDialog('Hapus Cache Foto?', 'Semua mapping foto → produk akan dihapus. Foto baru akan dikenali ulang oleh AI.', () => {
    KR.vision.clearCache();
    KR.toast.success('Cache dihapus');
  });
}
window.clearAiCache = clearAiCache;

/* ==================== GITHUB SETTINGS ==================== */
function loadGithubConfig() {
  const c = KR.store.getGitHubConfig();
  updateGhStatus();
  if (!c) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  setVal('gh-owner', c.owner);
  setVal('gh-repo', c.repo);
  setVal('gh-branch', c.branch || 'main');
  setVal('gh-token', c.token);
}

function updateGhStatus() {
  const ok = KR.github.isConfigured();
  const el = document.getElementById('gh-status');
  if (!el) return;
  const c = KR.store.getGitHubConfig();
  el.className = 'gh-status ' + (ok ? 'ok' : 'warn');
  if (ok && c) {
    el.innerHTML = `<i data-lucide="check-circle"></i><span>Terhubung: <strong>${escapeHtml(c.owner)}/${escapeHtml(c.repo)}</strong></span>`;
  } else {
    el.innerHTML = `<i data-lucide="alert-triangle"></i><span>Belum dikonfigurasi</span>`;
  }
  if (window.lucide) lucide.createIcons();
}

async function saveGithub() {
  const getVal = id => document.getElementById(id)?.value.trim() || '';
  const owner = getVal('gh-owner');
  const repo = getVal('gh-repo');
  const branch = getVal('gh-branch') || 'main';
  const token = getVal('gh-token');
  if (!owner || !repo || !token) {
    KR.toast.error('Semua field wajib diisi');
    return;
  }
  KR.store.setGitHubConfig({ owner, repo, branch, token });
  KR.toast.info('Testing...');
  const r = await KR.github.testConnection();
  KR.toast[r.ok ? 'success' : 'error'](r.msg);
  updateGhStatus();
}
window.saveGithub = saveGithub;

async function testGithub() {
  const r = await KR.github.testConnection();
  KR.toast[r.ok ? 'success' : 'error'](r.msg);
}
window.testGithub = testGithub;

function clearGithub() {
  confirmDialog('Hapus Konfigurasi?', 'Konfigurasi GitHub akan dihapus dari browser.', () => {
    KR.store.clearGitHubConfig();
    ['gh-owner', 'gh-repo', 'gh-token'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const branchEl = document.getElementById('gh-branch');
    if (branchEl) branchEl.value = 'main';
    updateGhStatus();
    KR.toast.success('Konfigurasi dihapus');
  });
}
window.clearGithub = clearGithub;

/* ==================== GITHUB SYNC ==================== */
async function pushToGithub() {
  if (!KR.github.isConfigured()) {
    KR.toast.warn('Konfigurasi GitHub dulu');
    return;
  }
  showLoading('Mengirim ke GitHub...');
  try {
    const data = {
      products: KR.store.getProducts(),
      transactions: KR.store.getTransactions(),
      settings: KR.store.getSettings(),
    };
    await KR.github.uploadFile('kasir-data.json', JSON.stringify(data, null, 2), 'chore: update kasir data');
    KR.toast.success('Data terkirim ke GitHub');
  } catch (e) {
    console.error(e);
    KR.toast.error('Gagal: ' + e.message);
  } finally {
    hideLoading();
  }
}
window.pushToGithub = pushToGithub;

async function pullFromGithub() {
  if (!KR.github.isConfigured()) {
    KR.toast.warn('Konfigurasi GitHub dulu');
    return;
  }
  confirmDialog('Ambil dari GitHub?', 'Data lokal akan ditimpa dengan data dari GitHub.', async () => {
    showLoading('Mengambil dari GitHub...');
    try {
      const content = await KR.github.getFileContent('kasir-data.json');
      if (!content) {
        KR.toast.error('File kasir-data.json belum ada di repo');
        return;
      }
      const data = JSON.parse(content);
      if (data.products) KR.store.setProducts(data.products);
      if (data.transactions) KR.store.setTransactions(data.transactions);
      if (data.settings) KR.store.setSettings(data.settings);
      KR.toast.success('Data berhasil diambil');
      renderPosGrid();
      renderCart();
      renderCategoryChips();
      renderProductList();
      renderTransactionList();
    } catch (e) {
      console.error(e);
      KR.toast.error('Gagal: ' + e.message);
    } finally {
      hideLoading();
    }
  });
}
window.pullFromGithub = pullFromGithub;

let autoSyncTimer;
function autoSync() {
  if (!KR.github.isConfigured()) return;
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => {
    const data = {
      products: KR.store.getProducts(),
      transactions: KR.store.getTransactions(),
      settings: KR.store.getSettings(),
    };
    KR.github.uploadFile('kasir-data.json', JSON.stringify(data, null, 2), 'chore: auto-sync')
      .catch(e => console.warn('[AutoSync]', e));
  }, 3000);
}
window.autoSync = autoSync;

/* ==================== BACKUP ==================== */
function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    products: KR.store.getProducts(),
    transactions: KR.store.getTransactions(),
    settings: KR.store.getSettings(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kasir-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  KR.toast.success('Data diexport');
}
window.exportData = exportData;

function importData(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      confirmDialog('Import Data?', 'Data lokal akan ditimpa dengan data dari file.', () => {
        if (data.products) KR.store.setProducts(data.products);
        if (data.transactions) KR.store.setTransactions(data.transactions);
        if (data.settings) KR.store.setSettings(data.settings);
        KR.toast.success('Data berhasil diimport');
        renderPosGrid();
        renderCart();
        renderCategoryChips();
        renderProductList();
        renderTransactionList();
        loadSettings();
      });
    } catch (err) {
      KR.toast.error('File tidak valid');
    }
  };
  reader.readAsText(file);
}
window.importData = importData;

function confirmReset() {
  confirmDialog(
    'Hapus Semua Data?',
    'Semua produk, transaksi, dan pengaturan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
    () => {
      localStorage.removeItem('kasir:products');
      localStorage.removeItem('kasir:transactions');
      localStorage.removeItem('kasir:settings');
      localStorage.removeItem('kasir:visionCache');
      localStorage.removeItem('kasir:aiConfig');
      KR.toast.success('Semua data dihapus');
      setTimeout(() => location.reload(), 500);
    }
  );
}
window.confirmReset = confirmReset;

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
  // Init theme
  initTheme();

  // Init auth (shows login screen if not logged in)
  if (KR.auth) KR.auth.init();

  // Init renders (background — will show once login closes)
  renderPosGrid();
  renderCategoryChips();
  renderCart();

  // Listen events
  window.addEventListener('products:changed', () => {
    const tab = document.getElementById('tab-kasir');
    if (tab && tab.classList.contains('active')) renderPosGrid();
  });
  window.addEventListener('transactions:changed', () => {
    const tab = document.getElementById('tab-transaksi');
    if (tab && tab.classList.contains('active')) renderTransactionList();
  });

  if (window.lucide) lucide.createIcons();
  console.log('%c[KasirKu] Ready', 'color:#10b981;font-weight:800;');
});
