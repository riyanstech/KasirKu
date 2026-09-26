/* ==========================================
   KasirKu — POS Module
   Cart, Checkout, Receipt, Scanner, Vision UI, SKU Scanner
   ========================================== */
window.KR = window.KR || {};

/* ==================== CART STATE ==================== */
let cart = [];
let currentCategory = '';

function getCart() { return cart; }

function addToCart(product, qty = 1) {
  if (!product) return;
  if (product.stock !== undefined && product.stock !== null && product.stock <= 0) {
    KR.toast.warn('Stok ' + product.name + ' habis');
    return;
  }
  const existing = cart.find(x => x.productId === product.id);
  if (existing) {
    if (product.stock !== undefined && product.stock !== null && existing.qty >= product.stock) {
      KR.toast.warn('Stok ' + product.name + ' hanya ' + product.stock);
      return;
    }
    existing.qty += qty;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image || '',
      qty: qty,
      sku: product.sku || '',
    });
  }
  renderCart();
  KR.toast.success(product.name + ' ditambahkan');
}

function changeQty(productId, delta) {
  const item = cart.find(x => x.productId === productId);
  if (!item) return;
  const product = KR.store.findProductById(productId);
  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  if (product && product.stock !== undefined && product.stock !== null && newQty > product.stock) {
    KR.toast.warn('Stok hanya ' + product.stock);
    return;
  }
  item.qty = newQty;
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(x => x.productId !== productId);
  renderCart();
}

function clearCart() {
  if (!cart.length) return;
  confirmDialog('Kosongkan keranjang?', 'Semua item di keranjang akan dihapus.', () => {
    cart = [];
    renderCart();
  });
}

function getCartTotals() {
  const subtotal = cart.reduce((s, x) => s + x.price * x.qty, 0);
  const discount = 0;
  const total = subtotal - discount;
  const count = cart.reduce((s, x) => s + x.qty, 0);
  return { subtotal, discount, total, count };
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const badge = document.getElementById('cart-badge-hdr');
  const checkoutBtn = document.getElementById('checkout-btn');
  if (!container) return;

  const t = getCartTotals();

  if (badge) {
    badge.textContent = t.count;
    badge.classList.toggle('hidden', t.count === 0);
  }

  if (!cart.length) {
    container.innerHTML = `<div class="cart-empty">
      <i data-lucide="shopping-cart" style="width:40px;height:40px;margin:0 auto 8px;display:block;opacity:.4;"></i>
      Keranjang kosong<br><small>Pilih produk untuk menambahkan</small>
    </div>`;
  } else {
    container.innerHTML = cart.map(item => {
      const img = item.image
        ? `<img src="${item.image}" alt="">`
        : `<i data-lucide="package"></i>`;
      const sub = item.price * item.qty;
      return `
        <div class="cart-item">
          <div class="ci-img">${img}</div>
          <div class="ci-body">
            <div class="ci-name">${escapeHtml(item.name)}</div>
            <div class="ci-price">${formatRupiah(item.price)}</div>
            <div class="ci-controls">
              <button class="ci-qty-btn" onclick="changeQty('${item.productId}', -1)">−</button>
              <span class="ci-qty">${item.qty}</span>
              <button class="ci-qty-btn" onclick="changeQty('${item.productId}', 1)">+</button>
              <button class="ci-remove" onclick="removeFromCart('${item.productId}')" title="Hapus">
                <i data-lucide="x"></i>
              </button>
            </div>
          </div>
          <div class="ci-sub">${formatRupiah(sub)}</div>
        </div>`;
    }).join('');
  }

  const subEl = document.getElementById('sum-subtotal');
  const discEl = document.getElementById('sum-discount');
  const totalEl = document.getElementById('sum-total');
  if (subEl) subEl.textContent = formatRupiah(t.subtotal);
  if (discEl) discEl.textContent = formatRupiah(t.discount);
  if (totalEl) totalEl.textContent = formatRupiah(t.total);
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
   // Update Floating Cart Button (FAB)
  updateCartFab(t);

  if (window.lucide) lucide.createIcons();
}

/* ==================== FLOATING CART FAB ==================== */
function updateCartFab(totals) {
  const fab = document.getElementById('cart-fab');
  const badge = document.getElementById('cart-fab-badge');
  const totalEl = document.getElementById('cart-fab-total');
  if (!fab) return;

  const hasItems = totals.count > 0;
  fab.classList.toggle('hidden', !hasItems);

  if (badge) badge.textContent = totals.count;
  if (totalEl) totalEl.textContent = formatRupiah(totals.total);
}

function scrollToCart() {
  const cart = document.querySelector('.pos-cart');
  if (!cart) return;

  cart.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Highlight animasi biar user tahu
  cart.classList.remove('highlight');
  // Force reflow biar animasi restart
  void cart.offsetWidth;
  cart.classList.add('highlight');

  setTimeout(() => cart.classList.remove('highlight'), 1000);
}
window.scrollToCart = scrollToCart;
window.updateCartFab = updateCartFab;

/* ==================== POS PRODUCT GRID ==================== */
function renderPosGrid() {
  const container = document.getElementById('pos-grid');
  if (!container) return;
  const products = KR.store.getProducts();
  const searchEl = document.getElementById('pos-search');
  const search = (searchEl?.value || '').toLowerCase().trim();

  const filtered = products.filter(p => {
    if (currentCategory && p.category !== currentCategory) return false;
    if (!search) return true;
    return (p.name || '').toLowerCase().includes(search) ||
           (p.sku || '').toLowerCase().includes(search) ||
           (p.category || '').toLowerCase().includes(search);
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <i data-lucide="package-open"></i>
      <h3>${products.length ? 'Produk tidak ditemukan' : 'Belum ada produk'}</h3>
      <p style="font-size:.85rem">${products.length ? 'Coba kata kunci lain' : 'Tambah produk dulu di tab Produk'}</p>
    </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(p => {
    const out = p.stock !== undefined && p.stock !== null && p.stock <= 0;
    const low = !out && p.stock !== undefined && p.stock !== null && p.stock <= 5;
    const img = p.image ? `<img src="${p.image}" alt="">` : `<i data-lucide="package"></i>`;
    const stockClass = out ? 'empty' : (low ? 'low' : '');
    const stockLabel = out ? 'Habis' : `Stok: ${p.stock != null ? p.stock : '∞'}`;
    return `
      <div class="product-tile ${out ? 'out' : ''}" onclick="handleTileClick('${p.id}')">
        ${p.category ? `<span class="pt-cat">${escapeHtml(p.category)}</span>` : ''}
        <div class="pt-img">${img}</div>
        <div class="pt-name">${escapeHtml(p.name)}</div>
        <div class="pt-price">${formatRupiah(p.price)}</div>
        <div class="pt-stock ${stockClass}">${stockLabel}</div>
      </div>`;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

function handleTileClick(productId) {
  const product = KR.store.findProductById(productId);
  if (product) addToCart(product, 1);
}

function renderCategoryChips() {
  const container = document.getElementById('pos-category-filter');
  if (!container) return;
  const products = KR.store.getProducts();
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  let html = `<button class="cat-chip ${!currentCategory ? 'active' : ''}" onclick="setCategory('')">Semua</button>`;
  html += cats.map(c => `<button class="cat-chip ${currentCategory === c ? 'active' : ''}" onclick="setCategory('${escapeHtml(c)}')">${escapeHtml(c)}</button>`).join('');
  container.innerHTML = html;
}

function setCategory(cat) {
  currentCategory = cat;
  renderCategoryChips();
  renderPosGrid();
}

/* ==================== CHECKOUT ==================== */
function openCheckout() {
  if (!cart.length) return;
  const t = getCartTotals();
  const totalEl = document.getElementById('co-total');
  const paidEl = document.getElementById('co-paid');
  const changeEl = document.getElementById('co-change');
  if (totalEl) totalEl.textContent = formatRupiah(t.total);
  if (paidEl) paidEl.value = '';
  if (changeEl) {
    changeEl.textContent = formatRupiah(0);
    changeEl.classList.remove('negative');
  }

  const quickCash = document.getElementById('co-quick-cash');
  if (quickCash) {
    const suggestions = [...new Set([
      t.total,
      Math.ceil(t.total / 5000) * 5000,
      Math.ceil(t.total / 10000) * 10000,
      Math.ceil(t.total / 50000) * 50000,
      100000,
    ])].filter(v => v >= t.total).slice(0, 6);
    quickCash.innerHTML = suggestions.map(v =>
      `<button onclick="setCash(${v})">${formatRupiah(v)}</button>`
    ).join('');
  }

  openModal('modal-checkout');
  setTimeout(() => document.getElementById('co-paid')?.focus(), 200);
}

function setCash(n) {
  const el = document.getElementById('co-paid');
  if (el) {
    el.value = n;
    updateChange();
  }
}

function updateChange() {
  const t = getCartTotals();
  const paidEl = document.getElementById('co-paid');
  const changeEl = document.getElementById('co-change');
  if (!paidEl || !changeEl) return;
  const paid = Number(paidEl.value) || 0;
  const change = paid - t.total;
  changeEl.textContent = formatRupiah(Math.max(0, change));
  changeEl.classList.toggle('negative', change < 0);
}

async function submitCheckout() {
  const t = getCartTotals();
  const paidEl = document.getElementById('co-paid');
  const methodEl = document.getElementById('co-method');
  if (!paidEl || !methodEl) return;
  const paid = Number(paidEl.value) || 0;
  if (paid < t.total) {
    KR.toast.error('Uang diterima kurang dari total');
    return;
  }
  const method = methodEl.value;
  const change = paid - t.total;

  const trx = {
    id: 'TRX-' + Date.now().toString(36).toUpperCase(),
    at: Date.now(),
    items: cart.map(x => ({ ...x })),
    subtotal: t.subtotal,
    discount: t.discount,
    total: t.total,
    paid: paid,
    change: change,
    method: method,
    itemCount: t.count,
  };

  showLoading('Menyimpan transaksi...');

  try {
    // 1. Insert transaksi ke cloud
    if (KR.auth.isLoggedIn()) {
      try {
        const dbTrx = await KR.sb.insertTransaction(trx);
        trx.dbId = dbTrx.id;
      } catch (e) {
        console.error('[Checkout] Insert trx failed', e);
        KR.toast.warn('Transaksi tersimpan lokal, gagal sync cloud');
      }
    }

    // 2. Update stok produk (lokal + cloud)
    const products = KR.store.getProducts();
    const stockUpdates = [];
    cart.forEach(item => {
      const p = products.find(x => x.id === item.productId);
      if (p && p.stock !== undefined && p.stock !== null) {
        p.stock = Math.max(0, p.stock - item.qty);
        if (KR.auth.isLoggedIn()) {
          stockUpdates.push(
            KR.sb.updateProductDb(p.id, { stock: p.stock }).catch(e => {
              console.warn('[Checkout] Stock update failed', p.id, e);
            })
          );
        }
      }
    });
    if (stockUpdates.length) await Promise.allSettled(stockUpdates);
    KR.store.setProducts(products);

    // 3. Cache transaksi lokal (untuk tampilan)
    KR.store.addTransaction(trx);

    // 4. Bersihkan cart
    cart = [];
    renderCart();
    renderPosGrid();
    renderCategoryChips();

    closeModal('modal-checkout');
    showReceipt(trx);
    KR.toast.success('Transaksi berhasil!');
  } catch (e) {
    console.error('[Checkout]', e);
    KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
  } finally {
    hideLoading();
  }
}

/* ==================== RECEIPT ==================== */
let currentReceipt = null;

function buildReceiptHtml(trx) {
  const s = KR.store.getSettings();
  const date = formatDate(trx.at);
  const itemsHtml = trx.items.map(it => `
    <div class="r-row">
      <span class="r-item-name">${escapeHtml(it.name)}</span>
      <span>${it.qty}x${formatRupiah(it.price).replace('Rp ','')}</span>
      <span style="text-align:right;min-width:70px">${formatRupiah(it.price * it.qty).replace('Rp ','')}</span>
    </div>
  `).join('');

  return `
    <div class="r-center">
      <div class="r-store-name">${escapeHtml(s.storeName)}</div>
      ${s.storeAddress ? `<div class="r-store-info">${escapeHtml(s.storeAddress)}</div>` : ''}
      ${s.storePhone ? `<div class="r-store-info">Telp: ${escapeHtml(s.storePhone)}</div>` : ''}
    </div>
    <div class="r-divider"></div>
    <div class="r-meta">
      <div class="r-row"><span>No. Transaksi</span><span>${escapeHtml(trx.id)}</span></div>
      <div class="r-row"><span>Tanggal</span><span>${date}</span></div>
      <div class="r-row"><span>Metode</span><span>${escapeHtml(trx.method)}</span></div>
    </div>
    <div class="r-divider"></div>
    <div>${itemsHtml}</div>
    <div class="r-divider"></div>
    <div class="r-row"><span>Subtotal</span><span>${formatRupiah(trx.subtotal).replace('Rp ','')}</span></div>
    ${trx.discount ? `<div class="r-row"><span>Diskon</span><span>-${formatRupiah(trx.discount).replace('Rp ','')}</span></div>` : ''}
    <div class="r-row total"><span>TOTAL</span><span>${formatRupiah(trx.total).replace('Rp ','')}</span></div>
    <div class="r-row"><span>Bayar</span><span>${formatRupiah(trx.paid).replace('Rp ','')}</span></div>
    <div class="r-row bold"><span>Kembali</span><span>${formatRupiah(trx.change).replace('Rp ','')}</span></div>
    <div class="r-divider"></div>
    <div class="r-footer">${escapeHtml(s.receiptFooter || 'Terima kasih')}</div>
  `;
}

function showReceipt(trx) {
  currentReceipt = trx;
  const paper = document.getElementById('receipt-paper');
  if (paper) paper.innerHTML = buildReceiptHtml(trx);
  openModal('modal-receipt');
  if (window.lucide) lucide.createIcons();
}

function printReceipt() {
  window.print();
}

function shareReceipt() {
  if (!currentReceipt) return;
  const s = KR.store.getSettings();
  const trx = currentReceipt;
  const lines = [
    '*' + s.storeName + '*',
    s.storeAddress || '',
    s.storePhone ? 'Telp: ' + s.storePhone : '',
    '',
    'No: ' + trx.id,
    'Tgl: ' + formatDate(trx.at),
    'Metode: ' + trx.method,
    '----------------',
    ...trx.items.map(it => it.name + ' ' + it.qty + 'x = ' + formatRupiah(it.price * it.qty)),
    '----------------',
    'Subtotal: ' + formatRupiah(trx.subtotal),
    'TOTAL: ' + formatRupiah(trx.total),
    'Bayar: ' + formatRupiah(trx.paid),
    'Kembali: ' + formatRupiah(trx.change),
    '',
    s.receiptFooter || 'Terima kasih',
  ].filter(Boolean);
  const text = lines.join('\n');

  if (navigator.share) {
    navigator.share({ title: 'Struk ' + trx.id, text: text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => KR.toast.success('Struk disalin ke clipboard'))
      .catch(() => KR.toast.error('Gagal berbagi'));
  } else {
    KR.toast.error('Browser tidak mendukung share');
  }
}

/* ==================== BEEP SOUND ==================== */
function playBeep(type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.15);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 200;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }

    setTimeout(() => { try { ctx.close(); } catch {} }, 600);
  } catch (e) {
    console.warn('[Beep]', e);
  }
}

/* ==================== SCANNER MODAL ==================== */
let scanner = null;
let currentScanMode = 'barcode';
let visionImageData = null;
let visionResultData = null;
let _lastScannedSku = '';
let _lastScanTime = 0;
const SCAN_COOLDOWN = 1500;

function openScanner() {
  openModal('modal-scanner');
  const resultEl = document.getElementById('scan-result');
  if (resultEl) {
    resultEl.classList.add('hidden');
    resultEl.innerHTML = '';
  }
  _lastScannedSku = '';
  _lastScanTime = 0;

  const aiOk = KR.vision.isEnabled();
  const warningEl = document.getElementById('vision-setup-warning');
  const okEl = document.getElementById('vision-setup-ok');
  if (warningEl) warningEl.classList.toggle('hidden', aiOk);
  if (okEl) okEl.classList.toggle('hidden', !aiOk);

  const previewEl = document.getElementById('vision-preview');
  const vResultEl = document.getElementById('vision-result');
  const vLoadEl = document.getElementById('vision-loading');
  if (previewEl) previewEl.classList.add('hidden');
  if (vResultEl) vResultEl.classList.add('hidden');
  if (vLoadEl) vLoadEl.classList.add('hidden');
  visionImageData = null;
  visionResultData = null;

  if (currentScanMode === 'barcode') {
    startBarcodeScanner();
  }
  if (window.lucide) lucide.createIcons();
}

function switchScanMode(mode) {
  currentScanMode = mode;
  document.querySelectorAll('.scanner-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.scanMode === mode);
  });
  document.querySelectorAll('.scan-mode-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('scan-mode-' + mode);
  if (panel) panel.classList.add('active');

  if (mode !== 'barcode' && scanner) {
    scanner.stop().then(() => {
      try { scanner.clear(); } catch {}
      scanner = null;
    }).catch(() => { scanner = null; });
  }
  if (mode === 'barcode') startBarcodeScanner();
  if (window.lucide) lucide.createIcons();
}

function startBarcodeScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    KR.toast.error('Library scanner tidak dimuat');
    return;
  }
  setTimeout(() => {
    if (scanner) {
      try { scanner.clear(); } catch {}
      scanner = null;
    }

    const readerEl = document.getElementById('scanner-reader');
    if (!readerEl) return;

    scanner = new Html5Qrcode('scanner-reader', { verbose: false });

    const config = {
      fps: 15,
      qrbox: function (w, h) {
        const minEdge = Math.min(w, h);
        const size = Math.floor(minEdge * 0.75);
        return { width: size, height: Math.floor(size * 0.65) };
      },
      aspectRatio: 1.777,
      disableFlip: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    // ✅ FIX: html5-qrcode hanya terima 1 key saja
    const cameraConfig = { facingMode: 'environment' };

    scanner.start(cameraConfig, config, onScanSuccess, () => {})
      .then(() => {
        // Setelah kamera nyala, apply resolusi tinggi + continuous focus
        setTimeout(applyCameraImprovements, 1200);
      })
      .catch(err => {
        console.error('[Scanner]', err);
        const msg = err && err.message ? err.message : String(err);
        KR.toast.error('Gagal buka kamera: ' + msg);
      });
  }, 400);
}

/* ✅ Apply resolusi tinggi + continuous focus SETELAH kamera jalan */
async function applyCameraImprovements() {
  try {
    const videoEl = document.querySelector('#scanner-reader video');
    if (!videoEl || !videoEl.srcObject) return;

    const track = videoEl.srcObject.getVideoTracks()[0];
    if (!track) return;

    const caps = track.getCapabilities ? track.getCapabilities() : {};
    const advanced = [];

    // Continuous / auto focus
    if (caps.focusMode && caps.focusMode.includes('continuous')) {
      advanced.push({ focusMode: 'continuous' });
    } else if (caps.focusMode && caps.focusMode.includes('auto')) {
      advanced.push({ focusMode: 'auto' });
    }

    // Torch off
    if (caps.torch) {
      advanced.push({ torch: false });
    }

    // Zoom sedang (kalau support)
    if (caps.zoom && caps.zoom.max > caps.zoom.min) {
      const midZoom = caps.zoom.min + (caps.zoom.max - caps.zoom.min) * 0.25;
      advanced.push({ zoom: midZoom });
    }

    if (advanced.length > 0) {
      try {
        await track.applyConstraints({ advanced: advanced });
        console.log('[Camera] Improvements applied:', advanced);
      } catch (e) {
        console.warn('[Camera] Apply failed', e);
      }
    }

    // Try set resolusi tinggi secara terpisah
    try {
      const currentSettings = track.getSettings ? track.getSettings() : {};
      const wants = {};
      if (caps.width && (caps.width.max || 0) >= 1920) wants.width = 1920;
      if (caps.height && (caps.height.max || 0) >= 1080) wants.height = 1080;
      if (Object.keys(wants).length > 0) {
        // Best effort — kalau gagal, diabaikan
        await track.applyConstraints(wants).catch(() => {});
      }
    } catch (e) {
      // Silently ignore
    }
  } catch (e) {
    console.warn('[Camera] applyCameraImprovements error', e);
  }
}
window.applyCameraImprovements = applyCameraImprovements;

function enableContinuousFocus() {
  try {
    const videoEl = document.querySelector('#scanner-reader video');
    if (!videoEl || !videoEl.srcObject) return;
    const track = videoEl.srcObject.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    const constraints = {};
    if (caps.focusMode && caps.focusMode.includes('continuous')) {
      constraints.focusMode = 'continuous';
    } else if (caps.focusMode && caps.focusMode.includes('auto')) {
      constraints.focusMode = 'auto';
    }
    if (caps.torch) {
      constraints.torch = false;
    }
    if (Object.keys(constraints).length > 0) {
      track.applyConstraints({ advanced: [constraints] }).catch(e => {
        console.warn('[Camera] Constraint apply failed', e);
      });
    }
  } catch (e) {
    console.warn('[Camera] Focus helper error', e);
  }
}

function onScanSuccess(decodedText) {
  const now = Date.now();
  if (decodedText === _lastScannedSku && (now - _lastScanTime) < SCAN_COOLDOWN) return;
  _lastScannedSku = decodedText;
  _lastScanTime = now;

  const product = KR.store.findProductBySku(decodedText);
  const resultEl = document.getElementById('scan-result');
  if (!resultEl) return;
  resultEl.classList.remove('hidden');

  if (product) {
    playBeep('success');
    addToCart(product, 1);

    resultEl.className = 'scan-result';
    resultEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--primary);display:grid;place-items:center;flex-shrink:0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;line-height:1.2;">${escapeHtml(product.name)}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--primary);margin-top:2px;font-size:.9rem;">${formatRupiah(product.price)}</div>
        </div>
        <div style="font-size:.65rem;color:var(--text-3);text-align:right;flex-shrink:0;line-height:1.3;">
          <div>Otomatis</div>
          <div>masuk keranjang</div>
        </div>
      </div>
    `;
  } else {
    playBeep('error');
    resultEl.className = 'scan-result error';
    resultEl.innerHTML = `
      <div style="font-weight:800;margin-bottom:4px;">❌ Produk tidak ditemukan</div>
      <div style="font-size:.85rem;">SKU: <code>${escapeHtml(decodedText)}</code></div>
      <button class="btn btn-primary" style="margin-top:10px;" id="btn-add-sku-new">
        + Tambah Produk Baru dengan SKU ini
      </button>
    `;
    document.getElementById('btn-add-sku-new').onclick = () => {
      closeScanner();
      openProductForm({ sku: decodedText });
    };
  }
}

function closeScanner() {
  if (scanner) {
    scanner.stop()
      .then(() => { try { scanner.clear(); } catch {} scanner = null; })
      .catch(() => { scanner = null; });
  }
  _lastScannedSku = '';
  _lastScanTime = 0;
  closeModal('modal-scanner');
}

/* ==================== SKU SCANNER (untuk form produk) ==================== */
let skuScanner = null;

function openSkuScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    KR.toast.error('Library scanner tidak dimuat');
    return;
  }
  const resultEl = document.getElementById('sku-scanner-result');
  if (resultEl) resultEl.textContent = '—';

  openModal('modal-sku-scanner');

  setTimeout(() => {
    if (skuScanner) {
      try { skuScanner.clear(); } catch {}
      skuScanner = null;
    }

    const readerEl = document.getElementById('sku-scanner-reader');
    if (!readerEl) return;

    skuScanner = new Html5Qrcode('sku-scanner-reader', { verbose: false });

    const config = {
      fps: 15,
      qrbox: function (w, h) {
        const minEdge = Math.min(w, h);
        const size = Math.floor(minEdge * 0.75);
        return { width: size, height: Math.floor(size * 0.65) };
      },
      aspectRatio: 1.777,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    const cameraConfig = { facingMode: 'environment' };

    skuScanner.start(cameraConfig, config, (decoded) => {
      playBeep('success');
      const resultEl = document.getElementById('sku-scanner-result');
      if (resultEl) resultEl.textContent = decoded;

      const skuInput = document.getElementById('pf-sku');
      if (skuInput) {
        skuInput.value = decoded;
        onSkuChange();
      }

      setTimeout(() => {
        closeSkuScanner();
        KR.toast.success('SKU terisi: ' + decoded);
      }, 800);
    }, () => {})
      .then(() => {
        setTimeout(() => {
          try {
            const videoEl = document.querySelector('#sku-scanner-reader video');
            if (videoEl && videoEl.srcObject) {
              const track = videoEl.srcObject.getVideoTracks()[0];
              const caps = track.getCapabilities ? track.getCapabilities() : {};
              const cst = {};
              if (caps.focusMode && caps.focusMode.includes('continuous')) cst.focusMode = 'continuous';
              if (Object.keys(cst).length) track.applyConstraints({ advanced: [cst] }).catch(() => {});
            }
          } catch {}
        }, 1200);
      })
      .catch(err => {
        console.error('[SKU Scanner]', err);
        KR.toast.error('Gagal buka kamera: ' + (err.message || err));
      });
  }, 400);
}

function closeSkuScanner() {
  if (skuScanner) {
    skuScanner.stop()
      .then(() => { try { skuScanner.clear(); } catch {} skuScanner = null; })
      .catch(() => { skuScanner = null; });
  }
  closeModal('modal-sku-scanner');
}

function onSkuChange() {
  const skuInput = document.getElementById('pf-sku');
  const status = document.getElementById('pf-image-status');
  if (!skuInput || !status) return;
  const sku = skuInput.value.trim();
  if (!sku) {
    status.innerHTML = '';
    return;
  }
  const existing = KR.store.findProductBySku(sku);
  const currentId = document.getElementById('pf-id')?.value;
  if (existing && existing.id !== currentId) {
    status.innerHTML = `<div style="margin-top:6px;font-size:.75rem;color:var(--warning);font-weight:700;">
      ⚠ SKU sudah dipakai produk: <strong>${escapeHtml(existing.name)}</strong>
    </div>`;
  } else {
    status.innerHTML = `<div style="margin-top:6px;font-size:.75rem;color:var(--success);font-weight:700;">
      ✓ SKU tersedia
    </div>`;
  }
}

/* ==================== AI VISION ==================== */
function setupVisionListeners() {
  const camInput = document.getElementById('vision-camera-input');
  const galInput = document.getElementById('vision-gallery-input');

  [camInput, galInput].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      KR.toast.info('Memproses gambar...', 1500);
      try {
        const compressed = await compressImage(file, 700, 0.8);
        if (!compressed || compressed.length < 50) throw new Error('Hasil kompres kosong');
        visionImageData = compressed;
        showVisionPreview(compressed);
        KR.toast.success('Foto siap dianalisa');
      } catch (err) {
        console.error('[Vision] Compress error:', err);
        const msg = err?.message || 'Unknown error';
        KR.toast.error('Gagal: ' + msg);
      }
    });
  });
}

function showVisionPreview(imageData) {
  const preview = document.getElementById('vision-preview');
  if (!preview) return;
  preview.classList.remove('hidden');
  preview.innerHTML = `
    <img src="${imageData}" alt="Preview">
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="resetVision()">
        <i data-lucide="x"></i> Ganti Foto
      </button>
      <button class="btn btn-primary" onclick="processVision()">
        <i data-lucide="sparkles"></i> Kenali Produk
      </button>
    </div>
  `;
  const resultEl = document.getElementById('vision-result');
  if (resultEl) resultEl.classList.add('hidden');
  if (window.lucide) lucide.createIcons();
}

function resetVision() {
  visionImageData = null;
  visionResultData = null;
  const preview = document.getElementById('vision-preview');
  const result = document.getElementById('vision-result');
  const loading = document.getElementById('vision-loading');
  if (preview) preview.classList.add('hidden');
  if (result) result.classList.add('hidden');
  if (loading) loading.classList.add('hidden');
}

async function processVision() {
  if (!visionImageData) return;

  const cachedProduct = KR.vision.cacheLookup(visionImageData);
  if (cachedProduct) {
    KR.toast.success(cachedProduct.name + ' (dari cache)');
    addToCart(cachedProduct, 1);
    setTimeout(() => closeScanner(), 700);
    return;
  }

  const loading = document.getElementById('vision-loading');
  const preview = document.getElementById('vision-preview');
  if (loading) loading.classList.remove('hidden');
  if (preview) preview.classList.add('hidden');

  try {
    const result = await KR.vision.identify(visionImageData);
    visionResultData = result;
    if (loading) loading.classList.add('hidden');

    if (!result.identified || !result.products || !result.products.length) {
      renderVisionNoResult();
      return;
    }
    renderVisionCandidates(result);
  } catch (err) {
    console.error(err);
    if (loading) loading.classList.add('hidden');
    if (preview) preview.classList.remove('hidden');
    KR.toast.error('AI gagal: ' + (err.message || 'Unknown'));
  }
}

function renderVisionNoResult() {
  const el = document.getElementById('vision-result');
  if (!el) return;
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="vision-noresult">
      <strong>😕 Produk tidak terdeteksi</strong>
      <p style="font-size:.85rem;margin:6px 0 12px;">Coba foto lebih dekat & jelas, atau cari manual.</p>
    </div>
    <div class="vision-manual" style="margin-top:12px">
      <button class="btn btn-secondary" onclick="focusSearchBar()">
        <i data-lucide="search"></i> Cari Manual
      </button>
      <button class="btn btn-primary" onclick="addProductFromVision()">
        <i data-lucide="plus"></i> Produk Baru
      </button>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function renderVisionCandidates(result) {
  const el = document.getElementById('vision-result');
  if (!el) return;
  el.classList.remove('hidden');

  const items = result.products.map((p, i) => {
    const matches = KR.vision.findProductMatches(p);
    const bestMatch = matches[0];
    return { ai: p, match: bestMatch, rank: i + 1 };
  });

  const candidateHtml = items.map((it, idx) => {
    const conf = Math.round(it.ai.confidence || 0);
    const confClass = conf >= 70 ? '' : 'low';
    const isBest = idx === 0 && it.match && it.match.score > 0.5;

    const metaChips = [
      it.ai.brand ? `<span class="pa-chip neutral">${escapeHtml(it.ai.brand)}</span>` : '',
      it.ai.variant ? `<span class="pa-chip neutral">${escapeHtml(it.ai.variant)}</span>` : '',
      it.ai.size ? `<span class="pa-chip neutral">${escapeHtml(it.ai.size)}</span>` : '',
      it.ai.category ? `<span class="pa-chip primary">${escapeHtml(it.ai.category)}</span>` : '',
    ].filter(Boolean).join('');

    const matchNote = it.match
      ? `<div style="font-size:.72rem;color:var(--text-3);margin-top:4px;">
           → Cocok dengan: <strong>${escapeHtml(it.match.product.name)}</strong>
           (${formatRupiah(it.match.product.price)})
         </div>`
      : `<div style="font-size:.72rem;color:var(--warning);margin-top:4px;">
           ⚠ Belum ada di produk — akan ditambah baru
         </div>`;

    return `
      <button class="candidate ${isBest ? 'best' : ''}" onclick="pickCandidate(${idx})">
        <div class="candidate-rank">${it.rank}</div>
        <div class="candidate-body">
          <div class="candidate-name">${escapeHtml(it.ai.name)}</div>
          <div class="candidate-meta">${metaChips}</div>
          ${matchNote}
        </div>
        <span class="candidate-conf ${confClass}">${conf}%</span>
      </button>
    `;
  }).join('');

  el.innerHTML = `
    <div class="vision-result-title">
      <i data-lucide="sparkles"></i> Hasil AI — Pilih produk yang benar
    </div>
    <div class="candidate-list">${candidateHtml}</div>
    <div class="vision-manual">
      <button class="btn btn-secondary" onclick="focusSearchBar()">
        <i data-lucide="search"></i> Cari Manual
      </button>
      <button class="btn btn-ghost" onclick="resetVision()">
        <i data-lucide="rotate-ccw"></i> Ulangi Foto
      </button>
    </div>
  `;
  window.__visionCandidates = items;
  if (window.lucide) lucide.createIcons();
}

function pickCandidate(idx) {
  const items = window.__visionCandidates || [];
  const item = items[idx];
  if (!item || !visionImageData) return;

  if (item.match && item.match.product) {
    const product = item.match.product;
    KR.vision.cacheSave(visionImageData, product.id);
    addToCart(product, 1);
    KR.toast.success(product.name);
    setTimeout(() => closeScanner(), 500);
  } else {
    addProductFromVision(item.ai);
  }
}

function addProductFromVision(aiData = null) {
  const ai = aiData || (visionResultData?.products?.[0] || {});
  const preset = {
    name: ai.name || '',
    category: ai.category || '',
    sku: '',
    image: visionImageData || '',
  };
  closeScanner();
  openProductForm(preset);
}

function focusSearchBar() {
  closeScanner();
  const search = document.getElementById('pos-search');
  const name = visionResultData?.products?.[0]?.name || '';
  if (search) {
    search.value = name;
    search.focus();
    renderPosGrid();
  }
}

/* Init listeners — cek dulu DOM sudah siap atau belum */
function initVisionListeners() {
  if (window.__kasirku_vision_inited) return;
  window.__kasirku_vision_inited = true;
  setupVisionListeners();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisionListeners);
} else {
  // DOM sudah siap → jalankan langsung
  initVisionListeners();
}

/* ==================== EXPOSE ==================== */
window.getCart = getCart;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.renderCart = renderCart;
window.renderPosGrid = renderPosGrid;
window.renderCategoryChips = renderCategoryChips;
window.setCategory = setCategory;
window.handleTileClick = handleTileClick;
window.openCheckout = openCheckout;
window.setCash = setCash;
window.updateChange = updateChange;
window.submitCheckout = submitCheckout;
window.showReceipt = showReceipt;
window.printReceipt = printReceipt;
window.shareReceipt = shareReceipt;
window.openScanner = openScanner;
window.closeScanner = closeScanner;
window.switchScanMode = switchScanMode;
window.resetVision = resetVision;
window.processVision = processVision;
window.pickCandidate = pickCandidate;
window.addProductFromVision = addProductFromVision;
window.focusSearchBar = focusSearchBar;
window.openSkuScanner = openSkuScanner;
window.closeSkuScanner = closeSkuScanner;
window.onSkuChange = onSkuChange;
window.playBeep = playBeep;
