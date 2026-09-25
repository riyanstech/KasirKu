/* ==========================================
   KasirKu — Main App Module (Supabase)
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
    if (b.dataset.tab === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });

  if (tabId === 'kasir') {
    renderPosGrid();
    renderCategoryChips();
    renderCart();
  }
  if (tabId === 'produk') renderProductList();
  if (tabId === 'transaksi') renderTransactionList();
  if (tabId === 'pesanan' && typeof loadOrders === 'function') loadOrders();
  if (tabId === 'laporan') renderReport();
  if (tabId === 'customer' && typeof loadCustomers === 'function') loadCustomers();
  if (tabId === 'tugas' && typeof loadTaskTab === 'function') loadTaskTab();
  if (tabId === 'pengaturan') loadSettings();

  if (window.lucide) {
    lucide.createIcons();
    requestAnimationFrame(() => {
      lucide.createIcons();
      setTimeout(() => lucide.createIcons(), 100);
      setTimeout(() => lucide.createIcons(), 250);
    });
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
  if (KR.auth.isLoggedIn()) {
    KR.sb.updateProfile({ theme: next }).catch(() => {});
  }
}
window.toggleTheme = toggleTheme;

/* ==================== CLOUD HELPERS ==================== */
function mapProductFromDb(p) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku || '',
    cost: Number(p.cost) || 0,
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    category: p.category || '',
    image: p.image_url || '',
    is_online: p.is_online === true,
    needs_address: p.needs_address === true,
    online_price: p.online_price != null ? Number(p.online_price) : null,
  };
}

async function refreshProductsFromCloud() {
  const products = await KR.sb.fetchProducts();
  KR.store.setProducts(products.map(mapProductFromDb));
  renderProductList();
  renderPosGrid();
  renderCategoryChips();
}
window.refreshProductsFromCloud = refreshProductsFromCloud;

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
  const onlineEl = document.getElementById('pf-online');
  const needsAddrEl = document.getElementById('pf-needs-address');
  const onlinePriceEl = document.getElementById('pf-online-price');
  const onlineDetail = document.getElementById('pf-online-detail');
  if (onlineEl) onlineEl.checked = false;
  if (needsAddrEl) needsAddrEl.checked = false;
  if (onlinePriceEl) onlinePriceEl.value = '';
  if (onlineDetail) onlineDetail.classList.add('hidden');

  if (isEdit) {
    const p = KR.store.findProductById(editId);
    if (p) {
      if (nameEl) nameEl.value = p.name || '';
      if (skuEl) skuEl.value = p.sku || '';
      if (costEl) costEl.value = p.cost || '';
      if (priceEl) priceEl.value = p.price || '';
      if (stockEl) stockEl.value = (p.stock != null ? p.stock : 0);
      if (catEl) catEl.value = p.category || '';
      if (onlineEl) onlineEl.checked = !!p.is_online;
      if (needsAddrEl) needsAddrEl.checked = !!p.needs_address;
      if (onlinePriceEl) onlinePriceEl.value = p.online_price != null ? p.online_price : '';
      if (onlineDetail) onlineDetail.classList.toggle('hidden', !p.is_online);
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

  const isOnline = document.getElementById('pf-online')?.checked || false;
  const needsAddress = document.getElementById('pf-needs-address')?.checked || false;
  const onlinePriceRaw = document.getElementById('pf-online-price')?.value;
  const onlinePrice = onlinePriceRaw ? Number(onlinePriceRaw) : null;

  if (!name) { KR.toast.error('Nama produk wajib diisi'); return; }
  if (!sku) { KR.toast.error('SKU wajib diisi'); return; }
  if (price <= 0) { KR.toast.error('Harga jual harus lebih dari 0'); return; }

  const dup = KR.store.findProductBySku(sku);
  if (dup && dup.id !== id) { KR.toast.error('SKU sudah dipakai produk lain'); return; }

  if (!KR.auth.isLoggedIn()) {
    KR.toast.error('Harus login dulu');
    return;
  }

  const isEdit = !!id;
  const data = {
    name, sku, cost, price, stock, category,
    is_online: isOnline,
    needs_address: isOnline && needsAddress,
    online_price: isOnline ? onlinePrice : null,
  };

  showLoading(isEdit ? 'Menyimpan...' : 'Membuat produk...');

  try {
    let productId = id;

    // Step 1: Insert baru (kalau create)
    if (!isEdit) {
      const created = await KR.sb.insertProduct({ ...data, image: null });
      productId = created.id;
    }

    // Step 2: Upload foto kalau ada data URL baru
    let imageUrl = pfImageData || '';
    if (imageUrl && imageUrl.startsWith('data:')) {
      showLoading('Mengunggah foto...');
      try {
        imageUrl = await uploadPhotoToCloud(imageUrl, productId);
      } catch (err) {
        console.error('[Upload photo]', err);
        KR.toast.warn('Foto gagal diupload, produk tetap tersimpan');
        imageUrl = '';
      }
    }

    // Step 3: Update DB
    if (isEdit) {
      await KR.sb.updateProductDb(id, { ...data, image: imageUrl });
    } else {
      await KR.sb.updateProductDb(productId, { image: imageUrl });
    }

    KR.toast.success(isEdit ? 'Produk diperbarui' : 'Produk ditambahkan');
    closeModal('modal-product');
    await refreshProductsFromCloud();
  } catch (e) {
    console.error('[saveProduct]', e);
    KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
  } finally {
    hideLoading();
  }
}
window.saveProduct = saveProduct;

function confirmDeleteProduct(id) {
  const p = KR.store.findProductById(id);
  if (!p) return;
  confirmDialog('Hapus Produk?', `Produk "${p.name}" akan dihapus permanen.`, async () => {
    showLoading('Menghapus...');
    try {
      if (p.image) {
        try { await deletePhotoFromCloud(p.image); } catch (e) { console.warn(e); }
      }
      await KR.sb.deleteProductDb(id);
      KR.toast.success('Produk dihapus');
      await refreshProductsFromCloud();
    } catch (e) {
      console.error('[Delete product]', e);
      KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
    } finally {
      hideLoading();
    }
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
  const trx = KR.store.getTransactions().find(t => t.id === id);
  if (!trx) return;
  confirmDialog('Hapus Transaksi?', 'Transaksi ini akan dihapus dari riwayat.', async () => {
    showLoading('Menghapus...');
    try {
      if (trx.dbId) await KR.sb.deleteTransactionDb(trx.dbId);
      KR.store.deleteTransaction(id);
      KR.toast.success('Transaksi dihapus');
      renderTransactionList();
    } catch (e) {
      console.error(e);
      KR.toast.error('Gagal: ' + e.message);
    } finally {
      hideLoading();
    }
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
  initAiSettings();
  if (KR.auth) KR.auth.renderAccountCard();
  if (typeof loadOnlineSettings === 'function') loadOnlineSettings();
}
window.loadSettings = loadSettings;

async function saveStoreInfo() {
  const getVal = id => document.getElementById(id)?.value.trim() || '';
  const data = {
    storeName: getVal('set-store-name') || 'KasirKu',
    storeAddress: getVal('set-store-address'),
    storePhone: getVal('set-store-phone'),
    receiptFooter: getVal('set-receipt-footer') || 'Terima kasih',
  };
  KR.store.setSettings(data);

  if (KR.auth.isLoggedIn()) {
    showLoading('Menyimpan...');
    try {
      await KR.sb.updateProfile({
        store_name: data.storeName,
        store_address: data.storeAddress,
        store_phone: data.storePhone,
        receipt_footer: data.receiptFooter,
      });
    } catch (e) {
      console.warn('[Save store info]', e);
      KR.toast.warn('Tersimpan lokal, gagal sync ke cloud');
    } finally {
      hideLoading();
    }
  }
  KR.toast.success('Informasi toko disimpan');
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
  KR.vision.saveConfig({ enabled });
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
  KR.vision.saveConfig({ provider });
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
  if (!apiKey) { KR.toast.error('API Key kosong'); return; }
  KR.vision.saveConfig({ provider, apiKey, enabled: true });
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
  if (!apiKey) { KR.toast.error('Isi API Key dulu'); return; }
  KR.vision.saveConfig({ apiKey });
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
  confirmDialog('Hapus Cache Foto?', 'Semua mapping foto → produk akan dihapus.', () => {
    KR.vision.clearCache();
    KR.toast.success('Cache dihapus');
  });
}
window.clearAiCache = clearAiCache;

/* ==================== LEGACY STUBS (GitHub removed) ==================== */
function pushToGithub() { KR.toast.info('Data otomatis tersimpan di cloud ☁️'); }
function pullFromGithub() {
  KR.toast.info('Menyinkronkan dari cloud...');
  KR.auth.reloadFromCloud();
}
function loadGithubConfig() {}
function updateGhStatus() {}
function saveGithub() { KR.toast.info('Fitur GitHub sudah tidak dipakai'); }
function testGithub() { KR.toast.info('Fitur GitHub sudah tidak dipakai'); }
function clearGithub() { KR.toast.info('Fitur GitHub sudah tidak dipakai'); }
function autoSync() {}

window.pushToGithub = pushToGithub;
window.pullFromGithub = pullFromGithub;
window.loadGithubConfig = loadGithubConfig;
window.updateGhStatus = updateGhStatus;
window.saveGithub = saveGithub;
window.testGithub = testGithub;
window.clearGithub = clearGithub;
window.autoSync = autoSync;

/* ==================== BACKUP ==================== */
function exportData() {
  const data = {
    version: 2,
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
      confirmDialog('Import Data?', 'Data lokal akan ditimpa. Data cloud tidak terpengaruh.', () => {
        if (data.settings) KR.store.setSettings(data.settings);
        KR.toast.success('Data diimport (lokal)');
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
    'Reset Cache Lokal?',
    'Cache lokal akan dihapus. Data di cloud tetap aman, akan diambil ulang saat reload.',
    () => {
      localStorage.removeItem('kasir:products');
      localStorage.removeItem('kasir:transactions');
      localStorage.removeItem('kasir:settings');
      localStorage.removeItem('kasir:visionCache');
      KR.toast.success('Cache lokal dihapus');
      setTimeout(() => location.reload(), 500);
    }
  );
}
window.confirmReset = confirmReset;

/* ==================== LAPORAN ==================== */
function renderReport() {
  const period = document.getElementById('report-period')?.value || '30d';
  const trxList = KR.store.getTransactions();
  const products = KR.store.getProducts();

  const now = Date.now();
  let since = 0, bucketBy = 'day', bucketCount = 0;

  if (period === 'today') {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    since = d.getTime(); bucketBy = 'hour'; bucketCount = 24;
  } else if (period === '7d') {
    since = now - 7 * 24 * 3600 * 1000; bucketCount = 7;
  } else if (period === '30d') {
    since = now - 30 * 24 * 3600 * 1000; bucketCount = 30;
  } else if (period === 'month') {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    since = d.getTime();
    const eom = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    bucketCount = eom.getDate();
  } else {
    if (trxList.length) {
      since = Math.min(...trxList.map(t => t.at));
      const days = Math.ceil((now - since) / (24 * 3600 * 1000));
      bucketCount = Math.min(Math.max(days, 7), 60);
      if (bucketCount < days) since = now - bucketCount * 24 * 3600 * 1000;
    }
  }

  const filtered = trxList.filter(t => t.at >= since);
  let revenue = 0, cost = 0, itemsSold = 0;
  const productStats = {}, dailyStats = {}, catStats = {};

  filtered.forEach(t => {
    revenue += t.total;
    (t.items || []).forEach(it => {
      itemsSold += it.qty;
      const p = products.find(x => x.id === it.productId);
      const itemCost = (p && p.cost) || 0;
      cost += itemCost * it.qty;
      if (!productStats[it.productId]) productStats[it.productId] = { name: it.name, qty: 0, revenue: 0, profit: 0 };
      productStats[it.productId].qty += it.qty;
      productStats[it.productId].revenue += it.price * it.qty;
      productStats[it.productId].profit += (it.price - itemCost) * it.qty;
      const cat = (p && p.category) || 'Tanpa Kategori';
      if (!catStats[cat]) catStats[cat] = { qty: 0, revenue: 0 };
      catStats[cat].qty += it.qty;
      catStats[cat].revenue += it.price * it.qty;
    });
    const d = new Date(t.at);
    const key = bucketBy === 'hour'
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dailyStats[key] = (dailyStats[key] || 0) + t.total;
  });

  const profit = revenue - cost;

  const kpiEl = document.getElementById('report-kpis');
  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon green"><i data-lucide="wallet"></i></div>
        <div class="kpi-body"><div class="kpi-label">Pendapatan</div><div class="kpi-value">${formatRupiah(revenue)}</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon blue"><i data-lucide="trending-up"></i></div>
        <div class="kpi-body"><div class="kpi-label">Laba Kotor</div><div class="kpi-value">${formatRupiah(profit)}</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon purple"><i data-lucide="receipt"></i></div>
        <div class="kpi-body"><div class="kpi-label">Transaksi</div><div class="kpi-value">${filtered.length}</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon orange"><i data-lucide="package"></i></div>
        <div class="kpi-body"><div class="kpi-label">Produk Terjual</div><div class="kpi-value">${itemsSold} item</div></div>
      </div>`;
  }

  renderReportChart(dailyStats, period, bucketBy, bucketCount);

  const topEl = document.getElementById('report-top-products');
  if (topEl) {
    const top = Object.values(productStats).sort((a, b) => b.qty - a.qty).slice(0, 5);
    topEl.innerHTML = !top.length
      ? `<div class="report-empty">Belum ada penjualan</div>`
      : `<div class="report-list">${top.map((p, i) => `
        <div class="report-item">
          <div class="report-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
          <div class="report-item-body">
            <div class="report-item-name">${escapeHtml(p.name)}</div>
            <div class="report-item-sub">${p.qty} terjual • Laba ${formatRupiah(p.profit)}</div>
          </div>
          <div class="report-item-value">${formatRupiah(p.revenue)}</div>
        </div>`).join('')}</div>`;
  }

  const catEl = document.getElementById('report-categories');
  if (catEl) {
    const cats = Object.entries(catStats).sort((a, b) => b[1].revenue - a[1].revenue);
    if (!cats.length) {
      catEl.innerHTML = `<div class="report-empty">Belum ada penjualan</div>`;
    } else {
      const maxRev = cats[0][1].revenue || 1;
      catEl.innerHTML = `<div class="report-list">${cats.map(([name, data]) => `
        <div class="report-item" style="flex-direction:column;align-items:stretch;background:transparent;padding:10px 0;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;">
            <div class="report-item-name" style="margin:0;">${escapeHtml(name)}</div>
            <div class="report-item-value">${formatRupiah(data.revenue)}</div>
          </div>
          <div class="report-item-sub">${data.qty} item terjual</div>
          <div class="report-cat-bar"><div class="report-cat-bar-fill" style="width:${Math.round((data.revenue / maxRev) * 100)}%"></div></div>
        </div>`).join('')}</div>`;
    }
  }
  if (window.lucide) lucide.createIcons();
}
window.renderReport = renderReport;

function renderReportChart(dailyStats, period, bucketBy, bucketCount) {
  const chartEl = document.getElementById('report-chart');
  if (!chartEl) return;
  const buckets = [];
  if (bucketBy === 'hour') {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let h = 0; h < 24; h++) {
      const t = new Date(d); t.setHours(h);
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(h).padStart(2, '0')}`;
      buckets.push({ key, label: `${String(h).padStart(2, '0')}`, fullLabel: `${String(h).padStart(2, '0')}:00`, value: dailyStats[key] || 0 });
    }
  } else {
    const days = Math.min(bucketCount || 30, 60);
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const t = new Date(d); t.setDate(t.getDate() - i);
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const label = days <= 7 ? dayNames[t.getDay()] : String(t.getDate());
      const fullLabel = `${dayNames[t.getDay()]}, ${t.getDate()}/${t.getMonth() + 1}`;
      buckets.push({ key, label, fullLabel, value: dailyStats[key] || 0 });
    }
  }
  const max = Math.max(...buckets.map(b => b.value), 1);
  const hasData = buckets.some(b => b.value > 0);
  if (!hasData) {
    chartEl.innerHTML = `<div class="chart-empty"><i data-lucide="bar-chart-3"></i><p>Belum ada data penjualan di periode ini</p></div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }
  chartEl.innerHTML = `<div class="chart-bars">${buckets.map(b => {
    const h = b.value > 0 ? Math.max(4, Math.round((b.value / max) * 100)) : 0;
    const cls = b.value > 0 ? '' : 'empty';
    return `<div class="chart-bar-wrap" title="${b.fullLabel}: ${formatRupiah(b.value)}">
      <div class="chart-bar ${cls}" style="height:${h}%"></div>
      <div class="chart-bar-label">${b.label}</div>
    </div>`;
  }).join('')}</div>`;
}
window.renderReportChart = renderReportChart;

/* ==================== EXPORT LAPORAN ==================== */

/**
 * Ambil data laporan dalam bentuk "flat" untuk export
 * @returns {object} { period, ringkasan, produk, kategori, transaksi }
 */
function getReportExportData() {
  const period = document.getElementById('report-period')?.value || '30d';
  const trxList = KR.store.getTransactions();
  const products = KR.store.getProducts();

  // Tentukan rentang waktu (sama seperti renderReport)
  const now = Date.now();
  let since = 0;
  const periodLabel = {
    today: 'Hari Ini',
    '7d': '7 Hari Terakhir',
    '30d': '30 Hari Terakhir',
    month: 'Bulan Ini',
    all: 'Semua Waktu',
  }[period] || 'Periode';

  if (period === 'today') {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    since = d.getTime();
  } else if (period === '7d') {
    since = now - 7 * 24 * 3600 * 1000;
  } else if (period === '30d') {
    since = now - 30 * 24 * 3600 * 1000;
  } else if (period === 'month') {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    since = d.getTime();
  } else {
    if (trxList.length) since = Math.min(...trxList.map(t => t.at));
  }

  const filtered = trxList.filter(t => t.at >= since);

  // -------- Ringkasan KPI --------
  let revenue = 0, cost = 0, itemsSold = 0;
  const productStats = {}, catStats = {};

  filtered.forEach(t => {
    revenue += t.total;
    (t.items || []).forEach(it => {
      itemsSold += it.qty;
      const p = products.find(x => x.id === it.productId);
      const itemCost = (p && p.cost) || 0;
      cost += itemCost * it.qty;

      if (!productStats[it.productId]) {
        productStats[it.productId] = { name: it.name, qty: 0, revenue: 0, profit: 0 };
      }
      productStats[it.productId].qty += it.qty;
      productStats[it.productId].revenue += it.price * it.qty;
      productStats[it.productId].profit += (it.price - itemCost) * it.qty;

      const cat = (p && p.category) || 'Tanpa Kategori';
      if (!catStats[cat]) catStats[cat] = { qty: 0, revenue: 0 };
      catStats[cat].qty += it.qty;
      catStats[cat].revenue += it.price * it.qty;
    });
  });

  const profit = revenue - cost;
  const settings = KR.store.getSettings();

  // -------- Produk Terlaris --------
  const topProducts = Object.values(productStats)
    .sort((a, b) => b.qty - a.qty);

  // -------- Kategori --------
  const categories = Object.entries(catStats)
    .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // -------- Transaksi Detail --------
  const transactions = filtered.map(t => ({
    id: t.id,
    date: formatDate(t.at),
    method: t.method,
    itemCount: t.itemCount,
    subtotal: t.subtotal,
    discount: t.discount || 0,
    total: t.total,
    paid: t.paid,
    change: t.change,
  }));

  return {
    period,
    periodLabel,
    storeName: settings.storeName || 'KasirKu',
    storeAddress: settings.storeAddress || '',
    storePhone: settings.storePhone || '',
    exportedAt: formatDate(Date.now()),
    ringkasan: {
      revenue,
      cost,
      profit,
      transactions: filtered.length,
      itemsSold,
    },
    topProducts,
    categories,
    transactions,
  };
}

/* ---------- EXPORT EXCEL (.xlsx) ---------- */
function exportReportExcel() {
  if (typeof XLSX === 'undefined') {
    KR.toast.error('Library Excel belum dimuat, coba refresh halaman');
    return;
  }
  try {
    const d = getReportExportData();
    const wb = XLSX.utils.book_new();

    // -------- Sheet 1: Ringkasan --------
    const ws1Data = [
      [d.storeName],
      [d.storeAddress],
      d.storePhone ? ['Telp: ' + d.storePhone] : [],
      [],
      ['LAPORAN PENJUALAN'],
      ['Periode', d.periodLabel],
      ['Diekspor', d.exportedAt],
      [],
      ['RINGKASAN'],
      ['Pendapatan (Rp)', d.ringkasan.revenue],
      ['Modal/HPP (Rp)', d.ringkasan.cost],
      ['Laba Kotor (Rp)', d.ringkasan.profit],
      ['Jumlah Transaksi', d.ringkasan.transactions],
      ['Produk Terjual', d.ringkasan.itemsSold],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    ws1['!cols'] = [{ wch: 24 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');

    // -------- Sheet 2: Produk Terlaris --------
    const ws2Data = [
      ['No', 'Nama Produk', 'Qty Terjual', 'Pendapatan (Rp)', 'Laba (Rp)'],
      ...d.topProducts.map((p, i) => [i + 1, p.name, p.qty, p.revenue, p.profit]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Produk Terlaris');

    // -------- Sheet 3: Per Kategori --------
    const ws3Data = [
      ['No', 'Kategori', 'Qty', 'Pendapatan (Rp)'],
      ...d.categories.map((c, i) => [i + 1, c.name, c.qty, c.revenue]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    ws3['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Per Kategori');

    // -------- Sheet 4: Detail Transaksi --------
    const ws4Data = [
      ['No', 'No. Transaksi', 'Tanggal', 'Metode', 'Jml Item', 'Subtotal (Rp)', 'Diskon (Rp)', 'Total (Rp)', 'Bayar (Rp)', 'Kembali (Rp)'],
      ...d.transactions.map((t, i) => [
        i + 1, t.id, t.date, t.method, t.itemCount,
        t.subtotal, t.discount, t.total, t.paid, t.change,
      ]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
    ws4['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 18 }, { wch: 10 },
      { wch: 9 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws4, 'Detail Transaksi');

    // -------- Save --------
    const filename = `Laporan_${d.periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    KR.toast.success('Excel berhasil diunduh!');
  } catch (e) {
    console.error('[ExportExcel]', e);
    KR.toast.error('Gagal export Excel: ' + e.message);
  }
}
window.exportReportExcel = exportReportExcel;

/* ---------- EXPORT CSV ---------- */
function exportReportCSV() {
  try {
    const d = getReportExportData();

    // Escape helper
    const esc = (v) => {
      const s = String(v ?? '');
      if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const lines = [];
    // Header info
    lines.push(['Laporan Penjualan', d.storeName].map(esc).join(','));
    lines.push(['Periode', d.periodLabel].map(esc).join(','));
    lines.push(['Diekspor', d.exportedAt].map(esc).join(','));
    lines.push('');

    // Ringkasan
    lines.push('RINGKASAN');
    lines.push(['Pendapatan', d.ringkasan.revenue].map(esc).join(','));
    lines.push(['Modal/HPP', d.ringkasan.cost].map(esc).join(','));
    lines.push(['Laba Kotor', d.ringkasan.profit].map(esc).join(','));
    lines.push(['Jumlah Transaksi', d.ringkasan.transactions].map(esc).join(','));
    lines.push(['Produk Terjual', d.ringkasan.itemsSold].map(esc).join(','));
    lines.push('');

    // Produk terlaris
    lines.push('PRODUK TERLARIS');
    lines.push(['No', 'Nama Produk', 'Qty', 'Pendapatan', 'Laba'].map(esc).join(','));
    d.topProducts.forEach((p, i) => {
      lines.push([i + 1, p.name, p.qty, p.revenue, p.profit].map(esc).join(','));
    });
    lines.push('');

    // Per kategori
    lines.push('PER KATEGORI');
    lines.push(['No', 'Kategori', 'Qty', 'Pendapatan'].map(esc).join(','));
    d.categories.forEach((c, i) => {
      lines.push([i + 1, c.name, c.qty, c.revenue].map(esc).join(','));
    });
    lines.push('');

    // Detail transaksi
    lines.push('DETAIL TRANSAKSI');
    lines.push(['No', 'No. Transaksi', 'Tanggal', 'Metode', 'Jml Item', 'Subtotal', 'Diskon', 'Total', 'Bayar', 'Kembali'].map(esc).join(','));
    d.transactions.forEach((t, i) => {
      lines.push([
        i + 1, t.id, t.date, t.method, t.itemCount,
        t.subtotal, t.discount, t.total, t.paid, t.change,
      ].map(esc).join(','));
    });

    const csv = '\uFEFF' + lines.join('\n'); // BOM untuk Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_${d.periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    KR.toast.success('CSV berhasil diunduh!');
  } catch (e) {
    console.error('[ExportCSV]', e);
    KR.toast.error('Gagal export CSV: ' + e.message);
  }
}
window.exportReportCSV = exportReportCSV;

/* ---------- EXPORT PDF ---------- */
function exportReportPDF() {
  try {
    const jspdfNS = window.jspdf || window.jsPDF;
    if (!jspdfNS || !jspdfNS.jsPDF) {
      KR.toast.error('Library PDF belum dimuat, coba refresh halaman');
      return;
    }
    const { jsPDF } = jspdfNS;
    const d = getReportExportData();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;

    /* ---------- HEADER ---------- */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(d.storeName || 'KasirKu', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let y = 24;
    if (d.storeAddress) { doc.text(d.storeAddress, margin, y); y += 5; }
    if (d.storePhone) { doc.text('Telp: ' + d.storePhone, margin, y); y += 5; }

    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('LAPORAN PENJUALAN', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Periode: ' + d.periodLabel, margin, y);
    doc.text('Diekspor: ' + d.exportedAt, pageW - margin, y, { align: 'right' });
    y += 8;

    /* ---------- RINGKASAN ---------- */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Ringkasan', margin, y);
    y += 2;

    doc.autoTable({
      startY: y,
      head: [['Metrik', 'Nilai']],
      body: [
        ['Pendapatan', formatRupiah(d.ringkasan.revenue)],
        ['Modal/HPP', formatRupiah(d.ringkasan.cost)],
        ['Laba Kotor', formatRupiah(d.ringkasan.profit)],
        ['Jumlah Transaksi', String(d.ringkasan.transactions)],
        ['Produk Terjual', d.ringkasan.itemsSold + ' item'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;

    /* ---------- PRODUK TERLARIS ---------- */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Produk Terlaris', margin, y);
    y += 2;

    doc.autoTable({
      startY: y,
      head: [['#', 'Nama Produk', 'Qty', 'Pendapatan', 'Laba']],
      body: d.topProducts.slice(0, 20).map((p, i) => [
        i + 1, p.name, p.qty, formatRupiah(p.revenue), formatRupiah(p.profit),
      ]),
      theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 16, halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;

    /* ---------- PER KATEGORI ---------- */
    if (d.categories.length) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Per Kategori', margin, y);
      y += 2;

      doc.autoTable({
        startY: y,
        head: [['Kategori', 'Qty', 'Pendapatan']],
        body: d.categories.map(c => [c.name, c.qty, formatRupiah(c.revenue)]),
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 25, halign: 'right' },
          2: { halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    /* ---------- DETAIL TRANSAKSI ---------- */
    if (d.transactions.length) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Detail Transaksi', margin, y);
      y += 2;

      doc.autoTable({
        startY: y,
        head: [['No. Transaksi', 'Tanggal', 'Metode', 'Item', 'Total']],
        body: d.transactions.map(t => [
          t.id, t.date, t.method, t.itemCount, formatRupiah(t.total),
        ]),
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 45 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15, halign: 'right' },
          4: { halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
    }

    /* ---------- FOOTER semua halaman ---------- */
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Halaman ${i} dari ${pageCount} • KasirKu POS`,
        pageW / 2, doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    const filename = `Laporan_${d.periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    KR.toast.success('PDF berhasil diunduh!');
  } catch (e) {
    console.error('[ExportPDF]', e);
    KR.toast.error('Gagal export PDF: ' + e.message);
  }
}
window.exportReportPDF = exportReportPDF;

/* ==================== CLEANUP ==================== */
async function cleanupOrphanPhotos() {
  KR.toast.info('Fitur cleanup belum tersedia untuk cloud storage');
}
window.cleanupOrphanPhotos = cleanupOrphanPhotos;

/* ==================== INIT ==================== */
function initApp() {
  if (window.__kasirku_inited) return;
  window.__kasirku_inited = true;

  initTheme();
  if (KR.auth) KR.auth.init();
  if (KR.pwa) KR.pwa.init();

  renderPosGrid();
  renderCategoryChips();
  renderCart();

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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/* ==================== PRODUCT FORM — ONLINE TOGGLE ==================== */
function onPfOnlineChange() {
  const el = document.getElementById('pf-online');
  const detail = document.getElementById('pf-online-detail');
  if (!el || !detail) return;
  detail.classList.toggle('hidden', !el.checked);
}
window.onPfOnlineChange = onPfOnlineChange;
