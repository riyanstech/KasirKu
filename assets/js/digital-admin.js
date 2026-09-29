/* ==========================================
   KasirKu — Digital Products Admin (v2)
   CRUD lengkap + form dinamis per kategori
   ========================================== */
window.KR = window.KR || {};

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  /* ============================================================
     KATEGORI & PROVIDER
     ============================================================ */
  const CATEGORY_META = {
    pulsa: {
      label: 'Pulsa', icon: 'smartphone', color: '#3b82f6', bg: '#dbeafe',
      denomLabel: 'Nominal Pulsa (Rp)',
      denomPlaceholder: '10000',
      denomHelper: 'Nominal pulsa dalam Rupiah. Contoh: 10000 untuk pulsa 10rb',
      denomDisplay: (v) => 'Rp ' + Number(v).toLocaleString('id-ID'),
      nameSuffix: 'Pulsa',
    },
    token_pln: {
      label: 'Token PLN', icon: 'zap', color: '#f59e0b', bg: '#fef3c7',
      denomLabel: 'Nominal Token (Rp)',
      denomPlaceholder: '20000',
      denomHelper: 'Nominal token listrik dalam Rupiah. Contoh: 20000 untuk token 20rb',
      denomDisplay: (v) => 'Rp ' + Number(v).toLocaleString('id-ID'),
      nameSuffix: 'Token PLN',
    },
    paket_data: {
      label: 'Paket Data', icon: 'wifi', color: '#8b5cf6', bg: '#ede9fe',
      denomLabel: 'Kuota Internet (MB)',
      denomPlaceholder: '1000',
      denomHelper: 'Kuota dalam MB. Contoh: 1000 = 1GB, 5000 = 5GB',
      denomDisplay: (v) => {
        const n = Number(v);
        return n >= 1000 ? (n / 1000) + ' GB' : n + ' MB';
      },
      nameSuffix: 'Paket Data',
    },
    voucher_game: {
      label: 'Voucher Game', icon: 'gamepad-2', color: '#ec4899', bg: '#fce7f3',
      denomLabel: 'Jumlah Diamond/Coin',
      denomPlaceholder: '100',
      denomHelper: 'Jumlah diamond/coin/kredit voucher game',
      denomDisplay: (v) => Number(v).toLocaleString('id-ID') + ' unit',
      nameSuffix: 'Voucher',
    },
    e_money: {
      label: 'E-Money', icon: 'wallet', color: '#10b981', bg: '#d1fae5',
      denomLabel: 'Nominal Saldo (Rp)',
      denomPlaceholder: '50000',
      denomHelper: 'Nominal top-up saldo. Contoh: 50000 untuk isi saldo 50rb',
      denomDisplay: (v) => 'Rp ' + Number(v).toLocaleString('id-ID'),
      nameSuffix: 'Saldo',
    },
    streaming: {
      label: 'Streaming', icon: 'tv', color: '#ef4444', bg: '#fee2e2',
      denomLabel: 'Durasi Langganan (hari)',
      denomPlaceholder: '30',
      denomHelper: 'Durasi dalam hari. Contoh: 30 = 1 bulan, 90 = 3 bulan',
      denomDisplay: (v) => v + ' Hari',
      nameSuffix: 'Langganan',
    },
    masa_aktif: {
      label: 'Masa Aktif', icon: 'calendar-plus', color: '#14b8a6', bg: '#ccfbf1',
      denomLabel: 'Durasi Masa Aktif (hari)',
      denomPlaceholder: '30',
      denomHelper: 'Durasi dalam hari. Contoh: 30 untuk masa aktif 30 hari',
      denomDisplay: (v) => v + ' Hari',
      nameSuffix: 'Masa Aktif',
    },
  };

  const PROVIDERS = {
    pulsa:        ['Telkomsel', 'Indosat', 'XL', 'Axis', 'Tri', 'Smartfren', 'by.U'],
    token_pln:    ['PLN'],
    paket_data:   ['Telkomsel', 'Indosat', 'XL', 'Tri', 'Smartfren', 'by.U'],
    voucher_game: ['Mobile Legends', 'Free Fire', 'PUBG Mobile', 'Genshin Impact', 'Valorant', 'Call of Duty Mobile', 'Roblox', 'Steam Wallet', 'Google Play', 'Lainnya'],
    e_money:      ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja', 'i.saku'],
    streaming:    ['Netflix', 'Spotify', 'Viu', 'Disney+ Hotstar', 'WeTV', 'iQiyi', 'Vidio'],
    masa_aktif:   ['Telkomsel', 'Indosat', 'XL', 'Axis', 'Tri', 'Smartfren', 'by.U'],
  };

  /* ============================================================
     STATE
     ============================================================ */
  let products = [];
  let filterCat = '';
  let searchQuery = '';

  /* ============================================================
     LOAD
     ============================================================ */
  async function loadDigitalProducts() {
    if (!KR.auth.isLoggedIn()) return;
    const listEl = $('digital-list');
    const countEl = $('digital-count-label');
    if (countEl) countEl.textContent = 'Memuat...';
    if (listEl) listEl.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Memuat produk digital...</p></div>';
    if (window.lucide) lucide.createIcons();

    try {
      const user = await KR.sb.getUser();
      const { data, error } = await KR.sb.client
        .from('digital_products')
        .select('*')
        .eq('seller_id', user.id)
        .order('category')
        .order('denomination', { ascending: true });
      if (error) throw error;
      products = data || [];
      renderDigitalProducts();
    } catch (e) {
      console.error('[DigitalAdmin] Load failed', e);
      if (countEl) countEl.textContent = 'Gagal memuat';
      if (listEl) listEl.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Gagal memuat</h3><p>${esc(e.message)}</p></div>`;
      if (window.lucide) lucide.createIcons();
    }
  }
  window.loadDigitalProducts = loadDigitalProducts;

  /* ============================================================
     FILTER & SEARCH
     ============================================================ */
  window.setDigitalSearch = function (q) {
    searchQuery = (q || '').trim().toLowerCase();
    renderDigitalProducts();
  };

  window.setDigitalFilter = function (cat) {
    filterCat = cat || '';
    renderDigitalProducts();
  };

  function getFiltered() {
    let list = products;
    if (filterCat === '__active') list = list.filter(p => p.is_active);
    else if (filterCat === '__inactive') list = list.filter(p => !p.is_active);
    else if (filterCat) list = list.filter(p => p.category === filterCat);

    if (searchQuery) {
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(searchQuery) ||
        (p.provider || '').toLowerCase().includes(searchQuery) ||
        (p.category || '').toLowerCase().includes(searchQuery) ||
        String(p.denomination || '').includes(searchQuery)
      );
    }
    return list;
  }

  /* ============================================================
     RENDER LIST
     ============================================================ */
  function renderDigitalProducts() {
    const listEl = $('digital-list');
    const countEl = $('digital-count-label');
    const statsEl = $('digital-stats');
    if (!listEl) return;

    const total = products.length;
    const active = products.filter(p => p.is_active).length;
    const inactive = total - active;

    const perCat = {};
    products.forEach(p => { perCat[p.category] = (perCat[p.category] || 0) + 1; });

    if (countEl) countEl.textContent = total + ' produk';

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="order-stat clickable ${filterCat === '' ? 'active' : ''}" onclick="setDigitalFilter('')">
          <div class="order-stat-label">Total</div>
          <div class="order-stat-value">${total}</div>
        </div>
        <div class="order-stat clickable ${filterCat === '__active' ? 'active' : ''}" onclick="setDigitalFilter('__active')">
          <div class="order-stat-label">Aktif</div>
          <div class="order-stat-value done">${active}</div>
        </div>
        <div class="order-stat clickable ${filterCat === '__inactive' ? 'active' : ''}" onclick="setDigitalFilter('__inactive')">
          <div class="order-stat-label">Nonaktif</div>
          <div class="order-stat-value pending">${inactive}</div>
        </div>
        ${Object.entries(CATEGORY_META).map(([key, meta]) => `
          <div class="order-stat clickable ${filterCat === key ? 'active' : ''}" onclick="setDigitalFilter('${key}')">
            <div class="order-stat-label">${meta.label}</div>
            <div class="order-stat-value" style="color:${meta.color};font-size:1.1rem;">${perCat[key] || 0}</div>
          </div>
        `).join('')}
      `;
    }

    const list = getFiltered();

    if (!list.length) {
      listEl.innerHTML = `<div class="empty-state">
        <i data-lucide="zap"></i>
        <h3>${searchQuery || filterCat ? 'Tidak ada hasil' : 'Belum ada produk digital'}</h3>
        <p>${searchQuery || filterCat ? 'Coba kata kunci / filter lain' : 'Klik "Tambah Produk Digital" untuk memulai'}</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Group by category
    const grouped = {};
    list.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });

    listEl.innerHTML = Object.entries(grouped).map(([cat, items]) => {
      const meta = CATEGORY_META[cat] || { label: cat, icon: 'package', color: '#64748b', bg: '#f1f5f9' };
      return `
        <div style="grid-column:1/-1;margin-top:8px;margin-bottom:4px;display:flex;align-items:center;gap:8px;">
          <div style="width:32px;height:32px;border-radius:10px;background:${meta.bg};color:${meta.color};display:grid;place-items:center;flex-shrink:0;">
            <i data-lucide="${meta.icon}" style="width:16px;height:16px;"></i>
          </div>
          <div style="font-weight:800;font-size:.9rem;color:var(--text);">${meta.label}</div>
          <span style="font-size:.7rem;font-weight:700;color:var(--text-3);font-family:'JetBrains Mono',monospace;">${items.length} produk</span>
        </div>
        ${items.map(p => renderDigitalCard(p, meta)).join('')}
      `;
    }).join('');
    if (window.lucide) lucide.createIcons();
  }

  function renderDigitalCard(p, meta) {
    const activeChip = p.is_active
      ? '<span class="pa-chip primary">Aktif</span>'
      : '<span class="pa-chip danger">Nonaktif</span>';

    const margin = (Number(p.price_sell) || 0) - (Number(p.price_buy) || 0);
    const marginChip = margin > 0 && p.price_buy
      ? `<span class="pa-chip neutral">Margin ${fmt(margin)}</span>`
      : '';

    // Tampilan denom sesuai kategori
    const denomText = (meta.denomDisplay || fmt)(p.denomination);

    return `
      <div class="pa-card" style="border-left:3px solid ${meta.color};">
        <div class="pa-img" style="background:${meta.bg};">
          <i data-lucide="${meta.icon}" style="width:28px;height:28px;color:${meta.color};opacity:1;"></i>
        </div>
        <div class="pa-body">
          <div class="pa-name">${esc(p.name)}</div>
          <div class="pa-sku">${esc(p.provider || '-')} • ${denomText}</div>
          <div class="pa-meta">
            ${activeChip}
            ${marginChip}
          </div>
          <div class="pa-price">${fmt(p.price_sell)}</div>
        </div>
        <div class="pa-actions">
          <button class="icon-btn" onclick="toggleDigitalActive('${p.id}', ${!p.is_active})" title="${p.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
            <i data-lucide="${p.is_active ? 'eye-off' : 'eye'}"></i>
          </button>
          <button class="icon-btn" onclick="openDigitalForm(null, '${p.id}')" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          <button class="icon-btn-danger" onclick="confirmDeleteDigital('${p.id}')" title="Hapus">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;
  }
  window.renderDigitalProducts = renderDigitalProducts;

  /* ============================================================
     TOGGLE ACTIVE
     ============================================================ */
  window.toggleDigitalActive = async function (id, activate) {
    showLoading('Memperbarui...');
    try {
      const { error } = await KR.sb.client
        .from('digital_products')
        .update({ is_active: !!activate })
        .eq('id', id);
      if (error) throw error;
      KR.toast.success(activate ? 'Produk diaktifkan' : 'Produk dinonaktifkan');
      await loadDigitalProducts();
    } catch (e) {
      KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
    } finally {
      hideLoading();
    }
  };

  /* ============================================================
     DELETE
     ============================================================ */
  window.confirmDeleteDigital = function (id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    confirmDialog(
      'Hapus Produk Digital?',
      `Produk "${p.name}" (${fmt(p.price_sell)}) akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
      async () => {
        showLoading('Menghapus...');
        try {
          const { error } = await KR.sb.client.from('digital_products').delete().eq('id', id);
          if (error) throw error;
          KR.toast.success('Produk digital dihapus');
          await loadDigitalProducts();
        } catch (e) {
          KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
        } finally {
          hideLoading();
        }
      }
    );
  };

  /* ============================================================
     PROVIDER OPTIONS
     ============================================================ */
  function updateProviderOptions() {
    const catEl = $('df-category');
    const provEl = $('df-provider');
    if (!catEl || !provEl) return;

    const list = PROVIDERS[catEl.value] || ['Lainnya'];
    const current = provEl.value;

    provEl.innerHTML = '<option value="">— Pilih Provider —</option>' +
      list.map(pr => `<option value="${esc(pr)}">${esc(pr)}</option>`).join('') +
      '<option value="__custom__">✏️ Ketik sendiri...</option>';

    if (current && list.includes(current)) provEl.value = current;
  }

  /* ============================================================
     DENOM FIELDS (dinamis per kategori)
     ============================================================ */
  function updateDenomFields() {
    const catEl = $('df-category');
    const denomInput = $('df-denom');
    if (!catEl || !denomInput) return;

    const meta = CATEGORY_META[catEl.value] || {};
    const field = denomInput.closest('.field');
    const labelEl = field?.querySelector('label');
    const helperEl = field?.querySelector('p');

    if (labelEl) {
      labelEl.innerHTML = (meta.denomLabel || 'Nominal / Denomination') + ' <span class="req">*</span>';
    }
    denomInput.placeholder = meta.denomPlaceholder || '0';
    if (helperEl) {
      helperEl.innerHTML = '💡 ' + (meta.denomHelper || 'Nominal produk');
    }
  }
  window.updateDenomFields = updateDenomFields;

  /* ============================================================
     AUTO-FILL NAMA PRODUK
     ============================================================ */
  function autoFillName() {
    const nameEl = $('df-name');
    if (!nameEl) return;
    if (nameEl.dataset.userEdited === 'true') return;

    const catEl = $('df-category');
    const provEl = $('df-provider');
    const customProvEl = $('df-provider-custom');
    const denomEl = $('df-denom');

    const cat = catEl ? catEl.value : '';
    let provider = provEl ? provEl.value : '';
    if (provider === '__custom__') provider = customProvEl ? customProvEl.value.trim() : '';

    const denom = Number(denomEl?.value) || 0;
    const meta = CATEGORY_META[cat] || {};

    if (!provider || !denom) return;

    const suffix = meta.nameSuffix || '';
    const denomText = meta.denomDisplay ? meta.denomDisplay(denom) : denom;
    nameEl.value = `${provider} ${suffix} ${denomText}`.trim();
  }

  /* ============================================================
     HANDLERS
     ============================================================ */
  window.onDigitalCategoryChange = function () {
    updateProviderOptions();
    updateDenomFields();
    autoFillName();
  };

  window.onDigitalProviderChange = function () {
    const provEl = $('df-provider');
    const customInput = $('df-provider-custom');
    if (!provEl || !customInput) return;
    if (provEl.value === '__custom__') {
      customInput.classList.remove('hidden');
      customInput.focus();
    } else {
      customInput.classList.add('hidden');
      customInput.value = '';
    }
    autoFillName();
  };

  window.onDigitalDenomChange = function () {
    autoFillName();
  };

  // Track manual edit nama produk
  document.addEventListener('input', (e) => {
    if (e.target.id === 'df-name') {
      e.target.dataset.userEdited = e.target.value.trim() ? 'true' : 'false';
    }
    if (e.target.id === 'df-provider-custom') {
      autoFillName();
    }
  });

  // Handle select changes
  document.addEventListener('change', (e) => {
    if (e.target.id === 'df-category') onDigitalCategoryChange();
    if (e.target.id === 'df-provider') onDigitalProviderChange();
    if (e.target.id === 'df-denom') onDigitalDenomChange();
  });

  /* ============================================================
     FORM MODAL
     ============================================================ */
  window.openDigitalForm = function (preset = null, editId = null) {
    const isEdit = !!editId;
    const modal = $('modal-digital');
    if (!modal) return;

    const titleEl = $('df-title');
    const idEl = $('df-id');
    const catEl = $('df-category');
    const provEl = $('df-provider');
    const customProvEl = $('df-provider-custom');
    const nameEl = $('df-name');
    const denomEl = $('df-denom');
    const buyEl = $('df-price-buy');
    const sellEl = $('df-price-sell');
    const activeEl = $('df-active');
    const statusEl = $('df-status');

    if (statusEl) statusEl.innerHTML = '';
    if (titleEl) titleEl.textContent = isEdit ? 'Edit Produk Digital' : 'Tambah Produk Digital';
    if (idEl) idEl.value = editId || '';

    // Reset semua field
    if (catEl) catEl.value = 'pulsa';
    if (customProvEl) { customProvEl.value = ''; customProvEl.classList.add('hidden'); }
    if (nameEl) { nameEl.value = ''; nameEl.dataset.userEdited = 'false'; }
    if (denomEl) denomEl.value = '';
    if (buyEl) buyEl.value = '';
    if (sellEl) sellEl.value = '';
    if (activeEl) activeEl.checked = true;

    updateProviderOptions();
    updateDenomFields();

    if (isEdit) {
      const p = products.find(x => x.id === editId);
      if (p) {
        if (catEl) catEl.value = p.category || 'pulsa';
        updateProviderOptions();
        updateDenomFields();

        if (provEl) {
          // Kalau provider di list, pilih; kalau tidak, set custom
          const list = PROVIDERS[p.category] || [];
          if (list.includes(p.provider)) {
            provEl.value = p.provider;
          } else if (p.provider) {
            provEl.value = '__custom__';
            if (customProvEl) {
              customProvEl.classList.remove('hidden');
              customProvEl.value = p.provider;
            }
          }
        }
        if (nameEl) {
          nameEl.value = p.name || '';
          nameEl.dataset.userEdited = 'true';  // biar tidak auto-overwrite
        }
        if (denomEl) denomEl.value = p.denomination || '';
        if (buyEl) buyEl.value = p.price_buy || '';
        if (sellEl) sellEl.value = p.price_sell || '';
        if (activeEl) activeEl.checked = p.is_active !== false;
      }
    } else if (preset) {
      if (preset.category && catEl) catEl.value = preset.category;
      updateProviderOptions();
      updateDenomFields();
      if (preset.provider && provEl) provEl.value = preset.provider;
      if (preset.denomination && denomEl) denomEl.value = preset.denomination;
    }

    openModal('modal-digital');
    setTimeout(() => {
      if (isEdit && nameEl) nameEl.focus();
      else if (provEl) provEl.focus();
    }, 200);
  };

  /* ============================================================
     SAVE
     ============================================================ */
  window.saveDigitalProduct = async function () {
    const idEl = $('df-id');
    const catEl = $('df-category');
    const provEl = $('df-provider');
    const customProvEl = $('df-provider-custom');
    const nameEl = $('df-name');
    const denomEl = $('df-denom');
    const buyEl = $('df-price-buy');
    const sellEl = $('df-price-sell');
    const activeEl = $('df-active');

    const isEdit = !!(idEl?.value);
    const category = catEl?.value || '';
    let provider = provEl?.value || '';
    if (provider === '__custom__') provider = (customProvEl?.value || '').trim();
    const name = (nameEl?.value || '').trim();
    const denomination = Number(denomEl?.value) || 0;
    const price_buy = buyEl?.value ? Number(buyEl.value) : null;
    const price_sell = Number(sellEl?.value) || 0;
    const is_active = activeEl?.checked !== false;

    /* Validasi */
    if (!category) return KR.toast.error('Kategori wajib dipilih');
    if (!provider) return KR.toast.error('Provider wajib diisi');
    if (!name) return KR.toast.error('Nama produk wajib diisi');
    if (denomination <= 0) return KR.toast.error('Nominal/Durasi harus lebih dari 0');
    if (price_sell <= 0) return KR.toast.error('Harga jual harus lebih dari 0');
    if (price_buy && price_buy > price_sell) {
      return KR.toast.error('Harga modal tidak boleh lebih besar dari harga jual');
    }

    const payload = {
      name,
      category,
      provider,
      denomination,
      price_sell,
      is_active,
    };
    if (price_buy && price_buy > 0) payload.price_buy = price_buy;

    if (!isEdit) {
      const user = await KR.sb.getUser();
      payload.seller_id = user.id;
    }

    showLoading(isEdit ? 'Menyimpan...' : 'Menambah produk...');
    try {
      if (isEdit) {
        // UPDATE — fallback kalau kolom price_buy tidak ada
        let { error } = await KR.sb.client
          .from('digital_products')
          .update({ ...payload, price_buy: payload.price_buy ?? null })
          .eq('id', idEl.value);

        if (error && error.message?.toLowerCase().includes('price_buy')) {
          const retry = await KR.sb.client
            .from('digital_products')
            .update(payload)
            .eq('id', idEl.value);
          error = retry.error;
        }
        if (error) throw error;
      } else {
        // INSERT — fallback kalau kolom price_buy tidak ada
        let { error } = await KR.sb.client
          .from('digital_products')
          .insert(payload)
          .select()
          .single();

        if (error && error.message?.toLowerCase().includes('price_buy')) {
          delete payload.price_buy;
          const retry = await KR.sb.client
            .from('digital_products')
            .insert(payload)
            .select()
            .single();
          error = retry.error;
        }
        if (error) throw error;
      }

      KR.toast.success(isEdit ? 'Produk digital diperbarui' : 'Produk digital ditambahkan');
      closeModal('modal-digital');
      await loadDigitalProducts();
    } catch (e) {
      console.error('[DigitalAdmin] Save failed', e);
      KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
    } finally {
      hideLoading();
    }
  };

  /* ============================================================
     BOOT
     ============================================================ */
  window.addEventListener('kasirku:ready', () => {
    if (KR.auth.isLoggedIn()) {
      setTimeout(() => {
        if ($('digital-list')) loadDigitalProducts();
      }, 1500);
    }
  });

  console.log('%c[DigitalAdmin] Ready v2', 'color:#f59e0b;font-weight:800;');
})();