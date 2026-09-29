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
  // Hapus modal lama kalau ada
  const existing = document.getElementById('kr-global-confirm');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'kr-global-confirm';
  modal.style.cssText = `
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 999999 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
    margin: 0 !important;
    background: rgba(15, 23, 42, .55) !important;
    backdrop-filter: blur(10px) !important;
    -webkit-backdrop-filter: blur(10px) !important;
    opacity: 0;
    transition: opacity .25s ease;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  `;

  modal.innerHTML = `
    <div id="kr-gc-card" style="
      position: relative;
      width: 100%;
      max-width: 380px;
      background: #ffffff;
      border-radius: 24px;
      padding: 28px 22px 22px;
      text-align: center;
      box-shadow: 0 30px 70px -20px rgba(0,0,0,.5), 0 10px 30px -10px rgba(0,0,0,.3);
      overflow: hidden;
      transform: scale(.9) translateY(20px);
      opacity: 0;
      transition: all .35s cubic-bezier(.34,1.56,.64,1);
    ">
      <div style="position:absolute;top:-50%;right:-30%;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle, rgba(239,68,68,.1), transparent 65%);pointer-events:none;"></div>

      <div style="position:relative;width:76px;height:76px;margin:0 auto 18px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle, rgba(239,68,68,.3), transparent 70%);animation:krCdPulse 2s ease-in-out infinite;"></div>
        <div style="position:relative;width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#fee2e2,#fecaca);border:2px solid #fca5a5;display:grid;place-items:center;box-shadow:0 12px 28px -10px rgba(239,68,68,.5);">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      </div>

      <h3 style="position:relative;font-size:1.15rem;font-weight:800;color:#0f172a;margin:0 0 8px;letter-spacing:-.02em;">${escapeHtml(title)}</h3>
      <p style="position:relative;font-size:.85rem;color:#64748b;line-height:1.6;margin:0 0 22px;">${escapeHtml(message)}</p>

      <div style="display:flex;gap:10px;position:relative;">
        <button data-kr-cd="cancel" type="button" style="flex:1;min-height:46px;border-radius:14px;background:#f1f5f9;border:1.5px solid #e2e8f0;color:#475569;font-size:.88rem;font-weight:800;cursor:pointer;font-family:inherit;transition:all .2s;">Batal</button>
        <button data-kr-cd="ok" type="button" style="flex:1.2;min-height:46px;border-radius:14px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:.88rem;font-weight:800;cursor:pointer;border:none;font-family:inherit;box-shadow:0 10px 24px -6px rgba(239,68,68,.55);transition:all .25s cubic-bezier(.34,1.56,.64,1);">Ya, Lanjutkan</button>
      </div>
    </div>
    <style>@keyframes krCdPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.65}}</style>
  `;

  document.body.appendChild(modal);

  const card = modal.querySelector('#kr-gc-card');
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    if (card) { card.style.transform = 'scale(1) translateY(0)'; card.style.opacity = '1'; }
  });

  const close = (confirmed) => {
    modal.style.opacity = '0';
    if (card) { card.style.transform = 'scale(.9) translateY(20px)'; card.style.opacity = '0'; }
    setTimeout(() => {
      modal.remove();
      if (confirmed && typeof onOk === 'function') {
        try { onOk(); } catch (e) { console.error('[confirmDialog]', e); }
      }
    }, 250);
  };

  modal.querySelector('[data-kr-cd="cancel"]').onclick = () => close(false);
  modal.querySelector('[data-kr-cd="ok"]').onclick = () => close(true);
  modal.onclick = (e) => { if (e.target === modal) close(false); };

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', escHandler);
      close(false);
    }
  };
  document.addEventListener('keydown', escHandler);
}
window.confirmDialog = confirmDialog;

/* ==================== NAVIGATION ==================== */
function showTab(tabId, btn) {
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');

  // Update nav-tabs (desktop)
  document.querySelectorAll('.nav-tab').forEach(b => {
    if (b.dataset.tab === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });

  // Update mobile bottom nav
  document.querySelectorAll('.bn-item-mobile').forEach(b => {
    if (b.dataset.tab === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });

  // Update mobile drawer
  document.querySelectorAll('.mm-item[data-menu-tab]').forEach(b => {
    if (b.dataset.menuTab === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });

  // Render sesuai tab
  if (tabId === 'kasir' && typeof renderPosGrid === 'function') {
    renderPosGrid();
    if (typeof renderCategoryChips === 'function') renderCategoryChips();
    if (typeof renderCart === 'function') renderCart();
  }
  if (tabId === 'produk' && typeof renderProductList === 'function') renderProductList();
  if (tabId === 'transaksi' && typeof renderTransactionList === 'function') renderTransactionList();
  if (tabId === 'pesanan' && typeof loadOrders === 'function') loadOrders();
  if (tabId === 'laporan' && typeof renderReport === 'function') renderReport();
  if (tabId === 'pengaturan' && typeof loadSettings === 'function') loadSettings();
  if (tabId === 'customer' && typeof loadCustomers === 'function') loadCustomers();
  if (tabId === 'tugas' && typeof loadTaskTab === 'function') loadTaskTab();
  if (tabId === 'kasbon' && typeof loadKasbon === 'function') loadKasbon();
  if (tabId === 'notif' && typeof loadNotifications === 'function') loadNotifications();
  if (tabId === 'digital' && typeof loadDigitalProducts === 'function') loadDigitalProducts();

  if (window.lucide) lucide.createIcons();
}

/* ==================== MOBILE NAV HELPERS ==================== */
function switchMobileTab(tabId) {
  showTab(tabId);
  // Scroll ke atas biar user lihat konten baru
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openMobileMenu() {
  const drawer = document.getElementById('mobile-menu-drawer');
  if (drawer) {
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  if (window.lucide) lucide.createIcons();
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobile-menu-drawer');
  if (drawer) {
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Update info user di drawer
function updateMobileUserInfo() {
  const cache = KR.store.get('authCache', null);
  if (!cache || !cache.loggedIn) return;
  
  const initial = (cache.username || cache.email || '?')[0].toUpperCase();
  const avatarEl = document.getElementById('mm-user-avatar');
  const nameEl = document.getElementById('mm-user-name');
  const roleEl = document.getElementById('mm-user-role');
  
  if (avatarEl) avatarEl.textContent = initial;
  if (nameEl) nameEl.textContent = cache.username || cache.email || 'User';
  if (roleEl) {
    const roleLabel = cache.role === 'admin' ? '👑 Admin' : '👤 Kasir';
    roleEl.textContent = roleLabel;
  }
}

// Expose ke global
window.switchMobileTab = switchMobileTab;
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.updateMobileUserInfo = updateMobileUserInfo;

// Escape key untuk close drawer
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const drawer = document.getElementById('mobile-menu-drawer');
    if (drawer && drawer.classList.contains('open')) closeMobileMenu();
  }
});

// Update user info saat ready
window.addEventListener('kasirku:ready', () => {
  setTimeout(updateMobileUserInfo, 500);
});

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
    unit: p.unit || '',
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
    const img = p.image
      ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async">`
      : `<i data-lucide="package"></i>`;
    const out = p.stock !== undefined && p.stock !== null && p.stock <= 0;
    const low = !out && p.stock !== undefined && p.stock !== null && p.stock <= 5;

   let stockChip = `<span class="pa-chip neutral">∞</span>`;
   if (p.stock !== undefined && p.stock !== null) {
     const unitText = p.unit ? ` ${p.unit}` : '';
     if (out) stockChip = `<span class="pa-chip danger">Habis</span>`;
     else if (low) stockChip = `<span class="pa-chip warn">Stok ${p.stock}${unitText}</span>`;
     else stockChip = `<span class="pa-chip neutral">Stok ${p.stock}${unitText}</span>`;
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
  // Reset unit
  if (typeof setSelectedUnit === 'function') setSelectedUnit('');
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
      if (typeof setSelectedUnit === 'function') setSelectedUnit(p.unit || '');
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
      const data = await compressImage(file, 500, 0.72);
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

/* ==================== AUTO-GENERATE SKU ==================== */
function generateAutoSku() {
  // Format: AUTO-XXXXXX (6 karakter base36 random)
  // Contoh: AUTO-K3F9X2
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa I, O, 0, 1 biar tidak bingung
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const sku = 'AUTO-' + code;

  // Cek kalau kebetulan duplikat (kemungkinan sangat kecil), coba lagi
  const existing = KR.store.findProductBySku(sku);
  if (existing) {
    return generateAutoSku(); // rekursif sampai dapat yang unik
  }
  return sku;
}
window.generateAutoSku = generateAutoSku;

/* ==================== UNIT HELPERS ==================== */
function onPfUnitChange() {
  const selectEl = document.getElementById('pf-unit');
  const customEl = document.getElementById('pf-unit-custom');
  if (!selectEl || !customEl) return;

  if (selectEl.value === '__custom__') {
    customEl.classList.remove('hidden');
    customEl.focus();
  } else {
    customEl.classList.add('hidden');
    customEl.value = '';
  }
}

function onPfUnitCustomChange() {
  // Tidak perlu aksi, tapi disiapkan untuk future
}

function getSelectedUnit() {
  const selectEl = document.getElementById('pf-unit');
  const customEl = document.getElementById('pf-unit-custom');
  if (!selectEl) return '';

  if (selectEl.value === '__custom__') {
    return (customEl?.value || '').trim();
  }
  return selectEl.value || '';
}

function setSelectedUnit(unit) {
  const selectEl = document.getElementById('pf-unit');
  const customEl = document.getElementById('pf-unit-custom');
  if (!selectEl || !customEl) return;

  if (!unit) {
    selectEl.value = '';
    customEl.classList.add('hidden');
    customEl.value = '';
    return;
  }

  // Cek apakah unit ada di list preset
  const options = Array.from(selectEl.options).map(o => o.value);
  if (options.includes(unit)) {
    selectEl.value = unit;
    customEl.classList.add('hidden');
    customEl.value = '';
  } else {
    // Custom unit
    selectEl.value = '__custom__';
    customEl.classList.remove('hidden');
    customEl.value = unit;
  }
}

window.onPfUnitChange = onPfUnitChange;
window.onPfUnitCustomChange = onPfUnitCustomChange;
window.getSelectedUnit = getSelectedUnit;
window.setSelectedUnit = setSelectedUnit;

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
  let sku = skuEl.value.trim();  // ← let, karena mungkin di-generate
  const cost = Number(costEl?.value) || 0;
  const price = Number(priceEl.value) || 0;
  const stock = Number(stockEl?.value) || 0;
  const category = (catEl?.value || '').trim();
  const unit = typeof getSelectedUnit === 'function' ? getSelectedUnit() : '';

  const isOnline = document.getElementById('pf-online')?.checked || false;
  const needsAddress = document.getElementById('pf-needs-address')?.checked || false;
  const onlinePriceRaw = document.getElementById('pf-online-price')?.value;
  const onlinePrice = onlinePriceRaw ? Number(onlinePriceRaw) : null;

  // === VALIDASI ===
  if (!name) { KR.toast.error('Nama produk wajib diisi'); return; }
  if (price <= 0) { KR.toast.error('Harga jual harus lebih dari 0'); return; }

  // === AUTO-GENERATE SKU kalau kosong ===
  if (!sku) {
    sku = generateAutoSku();
    console.log('[saveProduct] SKU kosong → auto-generate:', sku);
  }

  // === CEK DUPLIKAT SKU — hanya untuk SKU yang diisi manual ===
  // SKU auto-generate dijamin unik, jadi skip pengecekan
  const isAutoSku = sku.startsWith('AUTO-');
  if (!isAutoSku) {
    const dup = KR.store.findProductBySku(sku);
    if (dup && dup.id !== id) {
      KR.toast.error('SKU "' + sku + '" sudah dipakai produk lain: ' + dup.name);
      return;
    }
  }

  if (!KR.auth.isLoggedIn()) {
    KR.toast.error('Harus login dulu');
    return;
  }

  const isEdit = !!id;
   const data = {
       name, sku, cost, price, stock, category,
       unit: unit || null,
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

/* ==================== SETTINGS TAB SWITCHER ==================== */
function switchSettingsTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.settings-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.settingsTab === tabId);
  });

  // Update panels
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.settingsPanel === tabId);
  });

  // Refresh Lucide icons (dalam panel yang baru dibuka)
  if (window.lucide) lucide.createIcons();
}
window.switchSettingsTab = switchSettingsTab;

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
  if (typeof loadThermalSettings === 'function') loadThermalSettings();
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

/* ---------- EXPORT EXCEL (.xlsx) — Styled Version ---------- */
async function exportReportExcel() {
  showLoading('Menyiapkan Excel...');
  try {
    await KR.ensureExportLibs();
  } catch (e) {
    hideLoading();
    console.error('[Excel] lib load failed', e);
    KR.toast.error('Gagal memuat library Excel — cek koneksi');
    return;
  }
  hideLoading();

  if (typeof XLSX === 'undefined') {
    KR.toast.error('Library Excel tidak tersedia');
    return;
  }

  try {
    const d = getReportExportData();
    const wb = XLSX.utils.book_new();

    /* ==================== STYLE PRESETS ==================== */
    const C = {
      primary:      '10B981',
      primaryDark:  '047857',
      primarySoft:  'D1FAE5',
      primaryBg:    'ECFDF5',
      text:         '0F172A',
      textMuted:    '64748B',
      border:       'A7F3D0',
      borderLight:  'D1FAE5',
      bgAlt:        'F8FAFC',
      white:        'FFFFFF',
      amber:        'F59E0B',
      danger:       'DC2626',
    };

    const border_thin = {
      top:    { style: 'thin', color: { rgb: C.borderLight } },
      bottom: { style: 'thin', color: { rgb: C.borderLight } },
      left:   { style: 'thin', color: { rgb: C.borderLight } },
      right:  { style: 'thin', color: { rgb: C.borderLight } },
    };

    const S = {
      title: {
        fill: { patternType: 'solid', fgColor: { rgb: C.primary } },
        font: { name: 'Calibri', sz: 18, bold: true, color: { rgb: C.white } },
        alignment: { horizontal: 'center', vertical: 'center' },
      },
      subtitle: {
        fill: { patternType: 'solid', fgColor: { rgb: C.primaryDark } },
        font: { name: 'Calibri', sz: 11, color: { rgb: C.white } },
        alignment: { horizontal: 'center', vertical: 'center' },
      },
      sectionHead: {
        fill: { patternType: 'solid', fgColor: { rgb: C.primary } },
        font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: C.white } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      },
      tableHead: {
        fill: { patternType: 'solid', fgColor: { rgb: C.primaryDark } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: C.white } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: border_thin,
      },
      cell: {
        font: { name: 'Calibri', sz: 10, color: { rgb: C.text } },
        alignment: { vertical: 'center', wrapText: true },
        border: border_thin,
      },
      cellAlt: {
        fill: { patternType: 'solid', fgColor: { rgb: C.bgAlt } },
        font: { name: 'Calibri', sz: 10, color: { rgb: C.text } },
        alignment: { vertical: 'center', wrapText: true },
        border: border_thin,
      },
      cellBold: {
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C.text } },
        alignment: { vertical: 'center' },
        border: border_thin,
      },
      cellMoney: {
        font: { name: 'Calibri', sz: 10, color: { rgb: C.text } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: border_thin,
        numFmt: '#,##0',
      },
      cellMoneyAlt: {
        fill: { patternType: 'solid', fgColor: { rgb: C.bgAlt } },
        font: { name: 'Calibri', sz: 10, color: { rgb: C.text } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: border_thin,
        numFmt: '#,##0',
      },
      cellCenter: {
        font: { name: 'Calibri', sz: 10, color: { rgb: C.text } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: border_thin,
      },
      totalRow: {
        fill: { patternType: 'solid', fgColor: { rgb: C.primaryBg } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: C.primaryDark } },
        alignment: { vertical: 'center' },
        border: border_thin,
      },
      totalMoney: {
        fill: { patternType: 'solid', fgColor: { rgb: C.primaryBg } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: C.primaryDark } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: border_thin,
        numFmt: '#,##0',
      },
      textMuted: {
        font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: C.textMuted } },
        alignment: { horizontal: 'right', vertical: 'center' },
      },
    };

    /* Helper: apply style ke satu cell */
    function setStyle(ws, addr, style) {
      if (!ws[addr]) ws[addr] = { v: '', t: 's' };
      ws[addr].s = style;
    }

    /* Helper: apply style ke range */
    function setStyleRange(ws, rangeStr, style) {
      const range = XLSX.utils.decode_range(rangeStr);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let Cc = range.s.c; Cc <= range.e.c; Cc++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: Cc });
          setStyle(ws, addr, style);
        }
      }
    }

    /* Helper: set kolom width */
    function setCols(ws, widths) {
      ws['!cols'] = widths.map(w => ({ wch: w }));
    }

    /* ============================================================
       SHEET 1: RINGKASAN
       ============================================================ */
    const ws1Data = [
      ['LAPORAN PENJUALAN', '', '', ''],                    // Row 1
      ['', '', '', ''],                                      // Row 2
      ['Nama Toko', d.storeName || '-', '', ''],             // Row 3
      ['Alamat', d.storeAddress || '-', '', ''],             // Row 4
      ['Telepon', d.storePhone || '-', '', ''],              // Row 5
      ['Periode', d.periodLabel, '', ''],                    // Row 6
      ['Diekspor', d.exportedAt, '', ''],                    // Row 7
      ['', '', '', ''],                                      // Row 8
      ['RINGKASAN', '', '', ''],                             // Row 9
      ['Metrik', 'Nilai', 'Keterangan', ''],                 // Row 10
      ['Pendapatan', d.ringkasan.revenue, 'Total penjualan', ''],         // Row 11
      ['Modal/HPP', d.ringkasan.cost, 'Total modal barang terjual', ''],  // Row 12
      ['Laba Kotor', d.ringkasan.profit, 'Pendapatan - Modal', ''],       // Row 13
      ['Jumlah Transaksi', d.ringkasan.transactions, 'Berapa kali transaksi', ''],  // Row 14
      ['Produk Terjual', d.ringkasan.itemsSold, 'Total qty item terjual', ''],      // Row 15
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

    // Merge title
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },   // Title
      { s: { r: 8, c: 0 }, e: { r: 8, c: 3 } },   // Section head
    ];

    // Row heights
    ws1['!rows'] = [
      { hpt: 32 },  // Title
      { hpt: 8 },   // spacer
      { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 },
      { hpt: 8 },
      { hpt: 24 },  // Section head
      { hpt: 22 },  // Table head
    ];

    setCols(ws1, [22, 20, 32, 4]);

    // Title & Subtitle
    setStyle(ws1, 'A1', S.title);
    setStyleRange(ws1, 'A1:D1', S.title);

    // Store info
    setStyle(ws1, 'A3', S.cellBold);
    setStyle(ws1, 'A4', S.cellBold);
    setStyle(ws1, 'A5', S.cellBold);
    setStyle(ws1, 'A6', S.cellBold);
    setStyle(ws1, 'A7', S.cellBold);
    setStyle(ws1, 'B3', S.cell);
    setStyle(ws1, 'B4', S.cell);
    setStyle(ws1, 'B5', S.cell);
    setStyle(ws1, 'B6', S.cell);
    setStyle(ws1, 'B7', S.cell);
    setStyle(ws1, 'B7', S.cell);

    // Section head "RINGKASAN"
    setStyleRange(ws1, 'A9:D9', S.sectionHead);

    // Table head
    setStyleRange(ws1, 'A10:C10', S.tableHead);

    // Data rows
    const kpiRows = [11, 12, 13, 14, 15];
    kpiRows.forEach((r, i) => {
      const altStyle = (i % 2 === 0) ? S.cell : S.cellAlt;
      const altMoney = (i % 2 === 0) ? S.cellMoney : S.cellMoneyAlt;

      setStyle(ws1, `A${r}`, altStyle);
      setStyle(ws1, `B${r}`, altMoney);
      setStyle(ws1, `C${r}`, altStyle);
    });

    // Highlight Laba Kotor (row 13) — emerald
    setStyle(ws1, 'A13', S.totalRow);
    setStyle(ws1, 'B13', S.totalMoney);
    setStyle(ws1, 'C13', S.totalRow);

    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');

    /* ============================================================
       SHEET 2: PRODUK TERLARIS
       ============================================================ */
    const prodData = [
      ['PRODUK TERLARIS', '', '', '', ''],
      ['', '', '', '', ''],
      ['No', 'Nama Produk', 'Qty Terjual', 'Pendapatan (Rp)', 'Laba (Rp)'],
    ];
    d.topProducts.forEach((p, i) => {
      prodData.push([i + 1, p.name, p.qty, p.revenue, p.profit]);
    });

    // Grand total
    if (d.topProducts.length > 0) {
      const totQty = d.topProducts.reduce((s, p) => s + p.qty, 0);
      const totRev = d.topProducts.reduce((s, p) => s + p.revenue, 0);
      const totProf = d.topProducts.reduce((s, p) => s + p.profit, 0);
      prodData.push(['', 'TOTAL', totQty, totRev, totProf]);
    }

    const ws2 = XLSX.utils.aoa_to_sheet(prodData);
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    ws2['!rows'] = [{ hpt: 28 }, { hpt: 6 }, { hpt: 22 }];
    setCols(ws2, [6, 40, 14, 18, 18]);

    setStyleRange(ws2, 'A1:E1', S.title);
    setStyleRange(ws2, 'A3:E3', S.tableHead);

    d.topProducts.forEach((_, i) => {
      const r = 4 + i;
      const alt = (i % 2 === 0) ? S.cell : S.cellAlt;
      const altMoney = (i % 2 === 0) ? S.cellMoney : S.cellMoneyAlt;

      setStyle(ws2, `A${r}`, S.cellCenter);
      setStyle(ws2, `B${r}`, alt);
      setStyle(ws2, `C${r}`, S.cellCenter);
      setStyle(ws2, `D${r}`, altMoney);
      setStyle(ws2, `E${r}`, altMoney);
    });

    // Total row
    if (d.topProducts.length > 0) {
      const totalRow = 4 + d.topProducts.length;
      setStyle(ws2, `A${totalRow}`, S.totalRow);
      setStyle(ws2, `B${totalRow}`, S.totalRow);
      setStyle(ws2, `C${totalRow}`, S.totalRow);
      setStyle(ws2, `D${totalRow}`, S.totalMoney);
      setStyle(ws2, `E${totalRow}`, S.totalMoney);
    }

    XLSX.utils.book_append_sheet(wb, ws2, 'Produk Terlaris');

    /* ============================================================
       SHEET 3: PER KATEGORI
       ============================================================ */
    const catData = [
      ['PENJUALAN PER KATEGORI', '', '', ''],
      ['', '', '', ''],
      ['No', 'Kategori', 'Qty', 'Pendapatan (Rp)'],
    ];
    d.categories.forEach((c, i) => {
      catData.push([i + 1, c.name, c.qty, c.revenue]);
    });

    if (d.categories.length > 0) {
      const totQty = d.categories.reduce((s, c) => s + c.qty, 0);
      const totRev = d.categories.reduce((s, c) => s + c.revenue, 0);
      catData.push(['', 'TOTAL', totQty, totRev]);
    }

    const ws3 = XLSX.utils.aoa_to_sheet(catData);
    ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    ws3['!rows'] = [{ hpt: 28 }, { hpt: 6 }, { hpt: 22 }];
    setCols(ws3, [6, 30, 14, 20]);

    setStyleRange(ws3, 'A1:D1', S.title);
    setStyleRange(ws3, 'A3:D3', S.tableHead);

    d.categories.forEach((_, i) => {
      const r = 4 + i;
      const alt = (i % 2 === 0) ? S.cell : S.cellAlt;
      const altMoney = (i % 2 === 0) ? S.cellMoney : S.cellMoneyAlt;

      setStyle(ws3, `A${r}`, S.cellCenter);
      setStyle(ws3, `B${r}`, alt);
      setStyle(ws3, `C${r}`, S.cellCenter);
      setStyle(ws3, `D${r}`, altMoney);
    });

    if (d.categories.length > 0) {
      const totalRow = 4 + d.categories.length;
      setStyle(ws3, `A${totalRow}`, S.totalRow);
      setStyle(ws3, `B${totalRow}`, S.totalRow);
      setStyle(ws3, `C${totalRow}`, S.totalRow);
      setStyle(ws3, `D${totalRow}`, S.totalMoney);
    }

    XLSX.utils.book_append_sheet(wb, ws3, 'Per Kategori');

    /* ============================================================
       SHEET 4: DETAIL TRANSAKSI
       ============================================================ */
    const trxData = [
      ['DETAIL TRANSAKSI', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['No', 'No. Transaksi', 'Tanggal', 'Metode', 'Item', 'Subtotal (Rp)', 'Diskon (Rp)', 'Total (Rp)'],
    ];
    d.transactions.forEach((t, i) => {
      trxData.push([
        i + 1, t.id, t.date, t.method, t.itemCount,
        t.subtotal, t.discount, t.total,
      ]);
    });

    if (d.transactions.length > 0) {
      const totSub = d.transactions.reduce((s, t) => s + (t.subtotal || 0), 0);
      const totDisc = d.transactions.reduce((s, t) => s + (t.discount || 0), 0);
      const totTotal = d.transactions.reduce((s, t) => s + (t.total || 0), 0);
      trxData.push(['', 'TOTAL', '', '', '', totSub, totDisc, totTotal]);
    }

    const ws4 = XLSX.utils.aoa_to_sheet(trxData);
    ws4['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    ws4['!rows'] = [{ hpt: 28 }, { hpt: 6 }, { hpt: 22 }];
    setCols(ws4, [6, 22, 20, 12, 8, 16, 14, 16]);

    setStyleRange(ws4, 'A1:H1', S.title);
    setStyleRange(ws4, 'A3:H3', S.tableHead);

    d.transactions.forEach((_, i) => {
      const r = 4 + i;
      const alt = (i % 2 === 0) ? S.cell : S.cellAlt;
      const altMoney = (i % 2 === 0) ? S.cellMoney : S.cellMoneyAlt;

      setStyle(ws4, `A${r}`, S.cellCenter);
      setStyle(ws4, `B${r}`, alt);
      setStyle(ws4, `C${r}`, alt);
      setStyle(ws4, `D${r}`, S.cellCenter);
      setStyle(ws4, `E${r}`, S.cellCenter);
      setStyle(ws4, `F${r}`, altMoney);
      setStyle(ws4, `G${r}`, altMoney);
      setStyle(ws4, `H${r}`, altMoney);
    });

    if (d.transactions.length > 0) {
      const totalRow = 4 + d.transactions.length;
      setStyle(ws4, `A${totalRow}`, S.totalRow);
      setStyle(ws4, `B${totalRow}`, S.totalRow);
      setStyle(ws4, `C${totalRow}`, S.totalRow);
      setStyle(ws4, `D${totalRow}`, S.totalRow);
      setStyle(ws4, `E${totalRow}`, S.totalRow);
      setStyle(ws4, `F${totalRow}`, S.totalMoney);
      setStyle(ws4, `G${totalRow}`, S.totalMoney);
      setStyle(ws4, `H${totalRow}`, S.totalMoney);
    }

    XLSX.utils.book_append_sheet(wb, ws4, 'Detail Transaksi');

    /* ============ SAVE ============ */
    const filename = `Laporan_${d.periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    KR.toast.success('Excel berhasil diunduh! 🎨');
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
async function exportReportPDF() {
  showLoading('Menyiapkan PDF...');
  try {
    await KR.ensureExportLibs();
  } catch (e) {
    hideLoading();
    console.error('[PDF] lib load failed', e);
    KR.toast.error('Gagal memuat library PDF — cek koneksi');
    return;
  }
  hideLoading();

  try {
    const jspdfNS = window.jspdf || window.jsPDF;
    if (!jspdfNS || !jspdfNS.jsPDF) {
      KR.toast.error('Library PDF tidak tersedia');
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

/* ==================== THERMAL PRINTER UI ==================== */
async function thermalConnect() {
  if (!KR.thermalUI) {
    KR.toast.error('Modul UI belum dimuat — refresh halaman');
    return;
  }
  await KR.thermalUI.connectFlow();
  updateThermalStatus();
}

async function thermalDisconnect() {
  if (!KR.thermal) return;
  await KR.thermal.disconnect();
  KR.toast.info('Printer diputuskan');
  updateThermalStatus();
}

async function thermalTestPrint() {
  if (!KR.thermal) return;
  if (!KR.thermal.isConnected()) return KR.toast.warn('Printer belum terhubung');
  try {
    showLoading('Mencetak test...');
    await KR.thermal.testPrint();
    hideLoading();
    KR.toast.success('Test print terkirim ✅');
  } catch (e) {
    hideLoading();
    KR.toast.error(e.message || 'Gagal test print');
  }
}

function updateThermalStatus() {
  const statusEl = document.getElementById('thermal-status');
  const connBtn = document.getElementById('thermal-connect-btn');
  const testBtn = document.getElementById('thermal-test-btn');
  const discBtn = document.getElementById('thermal-disconnect-btn');
  if (!statusEl || !KR.thermal) return;

  const supported = KR.thermal.isSupported();
  const connected = KR.thermal.isConnected();
  const name = KR.thermal.getDeviceName();

  if (!supported) {
    statusEl.className = 'gh-status error';
    statusEl.innerHTML = '<i data-lucide="alert-triangle"></i><span>Browser tidak support Web Bluetooth. Pakai Chrome Android / Desktop.</span>';
    if (connBtn) connBtn.disabled = true;
  } else if (connected) {
    statusEl.className = 'gh-status ok';
    statusEl.innerHTML = '<i data-lucide="bluetooth-connected"></i><span>Terhubung: ' + (name || 'Printer') + '</span>';
    if (connBtn) connBtn.classList.add('hidden');
    if (testBtn) testBtn.classList.remove('hidden');
    if (discBtn) discBtn.classList.remove('hidden');
  } else {
    statusEl.className = 'gh-status warn';
    statusEl.innerHTML = '<i data-lucide="bluetooth-off"></i><span>Belum terhubung</span>';
    if (connBtn) { connBtn.disabled = false; connBtn.classList.remove('hidden'); }
    if (testBtn) testBtn.classList.add('hidden');
    if (discBtn) discBtn.classList.add('hidden');
  }
  if (window.lucide) lucide.createIcons();
}

function loadThermalSettings() {
  if (!KR.thermal) return;
  const s = KR.thermal.getSettings();
  const paper = document.getElementById('thermal-paper');
  const auto = document.getElementById('thermal-auto');
  const cut = document.getElementById('thermal-cut');
  if (paper) paper.value = String(s.paperWidth);
  if (auto) auto.checked = !!s.autoPrint;
  if (cut) cut.checked = !!s.cutAfterPrint;
  updateThermalStatus();
}

function saveThermalSettings() {
  if (!KR.thermal) return;
  KR.thermal.saveSettings({
    paperWidth: Number(document.getElementById('thermal-paper')?.value) || 58,
    autoPrint: !!document.getElementById('thermal-auto')?.checked,
    cutAfterPrint: !!document.getElementById('thermal-cut')?.checked,
  });
}

async function printThermalReceipt() {
  if (typeof currentReceipt === 'undefined' || !currentReceipt) return KR.toast.error('Tidak ada struk');
  if (!KR.thermal) return KR.toast.error('Modul thermal belum dimuat');
  if (!KR.thermal.isConnected()) {
    KR.toast.warn('Printer belum terhubung, menghubungkan...');
    try { await KR.thermal.connect(); updateThermalStatus(); } catch (e) { return KR.toast.error(e.message); }
  }
  try {
    showLoading('Mencetak...');
    await KR.thermal.printReceipt(currentReceipt);
    hideLoading();
    KR.toast.success('Struk terkirim ke printer 🖨️');
  } catch (e) {
    hideLoading();
    KR.toast.error(e.message || 'Gagal cetak');
  }
}

window.thermalConnect = thermalConnect;
window.thermalDisconnect = thermalDisconnect;
window.thermalTestPrint = thermalTestPrint;
window.updateThermalStatus = updateThermalStatus;
window.loadThermalSettings = loadThermalSettings;
window.saveThermalSettings = saveThermalSettings;
window.printThermalReceipt = printThermalReceipt;

/* ==================== INIT ==================== */
function initApp() {
  if (window.__kasirku_inited) return;
  window.__kasirku_inited = true;

  initTheme();
  if (KR.auth) KR.auth.init();
  if (KR.pwa) KR.pwa.init();

  // Aman: cek dulu fungsi ada atau belum
  if (typeof renderPosGrid === 'function') renderPosGrid();
  if (typeof renderCategoryChips === 'function') renderCategoryChips();
  if (typeof renderCart === 'function') renderCart();

  window.addEventListener('products:changed', () => {
    const tab = document.getElementById('tab-kasir');
    if (tab && tab.classList.contains('active') && typeof renderPosGrid === 'function') renderPosGrid();
  });
  window.addEventListener('transactions:changed', () => {
    const tab = document.getElementById('tab-transaksi');
    if (tab && tab.classList.contains('active') && typeof renderTransactionList === 'function') renderTransactionList();
  });

  if (window.lucide) lucide.createIcons();
  console.log('%c[KasirKu] Ready', 'color:#10b981;font-weight:800;');
}

/* ==================== PRODUCT FORM — ONLINE TOGGLE ==================== */
function onPfOnlineChange() {
  const el = document.getElementById('pf-online');
  const detail = document.getElementById('pf-online-detail');
  if (!el || !detail) return;
  detail.classList.toggle('hidden', !el.checked);
}
window.onPfOnlineChange = onPfOnlineChange;

/* ==================== APP INSTALL ==================== */
function updateInstallStatus() {
  const statusEl = document.getElementById('install-app-status');
  const btn = document.getElementById('install-app-btn');
  if (!statusEl || !btn) return;

  if (KR.pwa && KR.pwa.isStandalone && KR.pwa.isStandalone()) {
    statusEl.className = 'gh-status ok';
    statusEl.innerHTML = '<i data-lucide="check-circle"></i><span>Aplikasi sudah terinstall di perangkat ini ✅</span>';
    btn.style.display = 'none';
    if (window.lucide) lucide.createIcons();
    return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const canAutoInstall = KR.pwa && KR.pwa.canInstall && KR.pwa.canInstall();

  if (canAutoInstall) {
    statusEl.className = 'gh-status ok';
    statusEl.innerHTML = '<i data-lucide="check-circle"></i><span>Siap install — tap tombol di bawah</span>';
  } else if (isAndroid) {
    statusEl.className = 'gh-status warn';
    statusEl.innerHTML = '<i data-lucide="alert-triangle"></i><span>Tap menu <strong>⋮</strong> di Chrome → <strong>"Install app"</strong></span>';
  } else if (isIOS) {
    statusEl.className = 'gh-status warn';
    statusEl.innerHTML = '<i data-lucide="alert-triangle"></i><span>Tap <strong>Share</strong> → <strong>"Add to Home Screen"</strong></span>';
  } else {
    statusEl.className = 'gh-status warn';
    statusEl.innerHTML = '<i data-lucide="alert-triangle"></i><span>Buka di HP (Chrome Android / Safari iOS) untuk install</span>';
  }

  if (window.lucide) lucide.createIcons();
}

function triggerAppInstall() {
  console.log('[Install] Tombol diklik');
  console.log('[Install] KR.pwa:', !!KR.pwa);
  console.log('[Install] canInstall:', KR.pwa?.canInstall?.());
  console.log('[Install] isStandalone:', KR.pwa?.isStandalone?.());

  if (!KR.pwa) {
    return KR.toast.error('PWA module tidak tersedia — reload halaman');
  }

  const isStandalone = KR.pwa.isStandalone && KR.pwa.isStandalone();
  if (isStandalone) {
    return KR.toast.info('Aplikasi sudah terinstall ✅');
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const canAuto = KR.pwa.canInstall && KR.pwa.canInstall();

  console.log('[Install] Platform — iOS:', isIOS, 'Android:', isAndroid, 'CanAuto:', canAuto);

  // PRIORITAS 1: Auto-install via deferredPrompt
  if (canAuto) {
    try {
      KR.pwa.triggerInstall();
      setTimeout(updateInstallStatus, 1500);
      return;
    } catch (e) {
      console.error('[Install] triggerInstall error', e);
    }
  }

  // PRIORITAS 2: Fallback ke instruksi manual
  try {
    if (isIOS) {
      console.log('[Install] Show iOS instructions');
      KR.pwa.showIOSInstructions();
      KR.toast.info('Ikuti langkah install di iPhone', 4000);
    } else if (isAndroid) {
      console.log('[Install] Show Android instructions');
      KR.pwa.showAndroidInstructions();
      KR.toast.info('Ikuti langkah install di Android', 4000);
    } else {
      // Desktop
      KR.toast.info('Install hanya di HP. Buka di Chrome Android atau Safari iPhone.', 5000);
      if (KR.pwa.showAndroidInstructions) {
        KR.pwa.showAndroidInstructions();
      }
    }
  } catch (e) {
    console.error('[Install] Fallback error', e);
    KR.toast.error('Gagal buka instruksi install');
  }
}
window.triggerAppInstall = triggerAppInstall;
window.updateInstallStatus = updateInstallStatus;

window.addEventListener('kasirku:ready', () => {
  setTimeout(updateInstallStatus, 1200);
});
window.addEventListener('beforeinstallprompt', () => {
  setTimeout(updateInstallStatus, 500);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  setTimeout(initApp, 0);
}
window.addEventListener('kasirku:ready', initApp);

window.addEventListener('kasirku:ready', async () => {
  setTimeout(async () => {
    // 1. SYNC — jalan apapun browsernya
    if (KR.sync?.setupListeners) {
      KR.sync.setupListeners();
      console.log('[App] Sync listeners aktif');
    }

    // 2. THERMAL — hanya kalau browser support
    if (KR.thermal?.isSupported?.()) {
      const ok = await KR.thermal.autoReconnect();
      if (ok) updateThermalStatus();
    }
  }, 1500);
});
