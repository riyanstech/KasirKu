/* ==========================================
   KasirKu — Digital Orders Admin (v1)
   Tab khusus pesanan produk digital
   ========================================== */
window.KR = window.KR || {};

(function () {
  'use strict';

  let orders = [];
  let filterStatus = 'paid'; // default tampilkan yang sudah dibayar
  let searchQuery = '';
  let autoRefreshTimer = null;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  const STATUS_MAP = {
    pending:    { label: 'Belum Bayar', color: 'pending',   icon: 'clock',          bg: '#fef3c7', text: '#b45309' },
    paid:       { label: 'Sudah Bayar', color: 'paid',      icon: 'check-circle',   bg: '#d1fae5', text: '#047857' },
    processing: { label: 'Diproses',    color: 'verified',  icon: 'loader',         bg: '#dbeafe', text: '#1d4ed8' },
    done:       { label: 'Selesai',     color: 'done',      icon: 'check-circle-2', bg: '#a7f3d0', text: '#065f46' },
    failed:     { label: 'Gagal',       color: 'cancelled', icon: 'x-circle',       bg: '#fee2e2', text: '#b91c1c' },
    expired:    { label: 'Kadaluarsa',  color: 'cancelled', icon: 'alarm-clock',    bg: '#f1f5f9', text: '#475569' },
    refunded:   { label: 'Refund',      color: 'cancelled', icon: 'rotate-ccw',     bg: '#fce7f3', text: '#9d174d' },
  };

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return s + ' dtk lalu';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' mnt lalu';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' jam lalu';
    const d = Math.floor(h / 24);
    if (d < 7) return d + ' hari lalu';
    return new Date(ts).toLocaleString('id-ID');
  }

  /* ============ LOAD ============ */
  async function loadDigitalOrders() {
    if (!KR.auth.isLoggedIn()) return;
    const listEl = $('digital-orders-list');
    const countEl = $('digital-orders-count-label');
    if (countEl) countEl.textContent = 'Memuat...';
    if (listEl) listEl.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Memuat pesanan digital...</p></div>';
    if (window.lucide) lucide.createIcons();

    try {
      const user = await KR.sb.getUser();
      const { data, error } = await KR.sb.client
        .from('digital_orders')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      orders = data || [];
      render();
    } catch (e) {
      console.error('[DigitalOrders]', e);
      if (countEl) countEl.textContent = 'Gagal memuat';
      if (listEl) listEl.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Gagal memuat</h3><p>${esc(e.message)}</p></div>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  /* ============ FILTER ============ */
  function getFiltered() {
    let list = orders;
    if (filterStatus !== 'all') list = list.filter(o => o.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        (o.product_name || '').toLowerCase().includes(q) ||
        (o.target_number || '').includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.order_code || '').toLowerCase().includes(q) ||
        (o.np_transaction_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  /* ============ RENDER ============ */
  function render() {
    const listEl = $('digital-orders-list');
    const countEl = $('digital-orders-count-label');
    const statsEl = $('digital-orders-stats');
    if (!listEl) return;

    const stats = {
      all:        orders.length,
      pending:    orders.filter(o => o.status === 'pending').length,
      paid:       orders.filter(o => o.status === 'paid').length,
      processing: orders.filter(o => o.status === 'processing').length,
      done:       orders.filter(o => o.status === 'done').length,
      failed:     orders.filter(o => ['failed', 'expired', 'refunded'].includes(o.status)).length,
    };

    if (countEl) countEl.textContent = orders.length + ' pesanan digital';

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="order-stat clickable ${filterStatus === 'paid' ? 'active' : ''}" onclick="setDigitalOrdersFilter('paid')">
          <div class="order-stat-label">Perlu Diproses</div>
          <div class="order-stat-value done">${stats.paid}</div>
        </div>
        <div class="order-stat clickable ${filterStatus === 'processing' ? 'active' : ''}" onclick="setDigitalOrdersFilter('processing')">
          <div class="order-stat-label">Diproses</div>
          <div class="order-stat-value verified">${stats.processing}</div>
        </div>
        <div class="order-stat clickable ${filterStatus === 'done' ? 'active' : ''}" onclick="setDigitalOrdersFilter('done')">
          <div class="order-stat-label">Selesai</div>
          <div class="order-stat-value done">${stats.done}</div>
        </div>
        <div class="order-stat clickable ${filterStatus === 'pending' ? 'active' : ''}" onclick="setDigitalOrdersFilter('pending')">
          <div class="order-stat-label">Belum Bayar</div>
          <div class="order-stat-value pending">${stats.pending}</div>
        </div>
        <div class="order-stat clickable ${filterStatus === 'all' ? 'active' : ''}" onclick="setDigitalOrdersFilter('all')">
          <div class="order-stat-label">Semua</div>
          <div class="order-stat-value">${stats.all}</div>
        </div>
      `;
    }

    const list = getFiltered();

    if (!list.length) {
      listEl.innerHTML = `<div class="empty-state">
        <i data-lucide="zap"></i>
        <h3>${searchQuery || filterStatus !== 'all' ? 'Tidak ada hasil' : 'Belum ada pesanan digital'}</h3>
        <p>${searchQuery ? 'Coba kata kunci lain' : 'Pesanan pulsa/token akan muncul di sini setelah customer bayar'}</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listEl.innerHTML = list.map(o => renderCard(o)).join('');
    if (window.lucide) lucide.createIcons();
  }

  function renderCard(o) {
    const status = STATUS_MAP[o.status] || STATUS_MAP.pending;
    const code = o.order_code || ('#' + String(o.id).replace(/-/g, '').slice(0, 8).toUpperCase());
    const created = timeAgo(o.created_at);

    // Action buttons berdasarkan status
    const actions = [];

    if (o.status === 'paid') {
      actions.push(`<button class="btn btn-primary" onclick="markDigitalProcessing('${o.id}')"><i data-lucide="loader"></i> Proses Sekarang</button>`);
    }
    if (o.status === 'processing') {
      actions.push(`<button class="btn btn-success" onclick="markDigitalDone('${o.id}')"><i data-lucide="check-circle"></i> Tandai Selesai</button>`);
    }
    if (['failed', 'expired'].includes(o.status)) {
      actions.push(`<button class="btn btn-ghost" onclick="retryDigitalOrder('${o.id}')"><i data-lucide="rotate-ccw"></i> Coba Lagi</button>`);
    }

    actions.push(`<button class="btn btn-ghost full-width" onclick="deleteDigitalOrder('${o.id}')" style="color:var(--danger);"><i data-lucide="trash-2"></i> Hapus</button>`);

    return `
      <div class="order-card">
        <div class="order-card-header">
          <div class="order-thumb" style="background:${status.bg};border:none;">
            <i data-lucide="zap" style="color:${status.text};width:22px;height:22px;"></i>
          </div>
          <div class="order-body">
            <div class="order-product">${esc(o.product_name)}</div>
            <div class="order-price">${fmt(o.amount)}</div>
            <div class="order-code">${esc(code)} • ${created}</div>
          </div>
          <span class="status-badge ${status.color}">
            <i data-lucide="${status.icon}"></i>${status.label}
          </span>
        </div>

        <div class="order-meta">
          <span class="order-method-tag digital"><i data-lucide="smartphone"></i>${esc(o.product_category || 'Digital')}</span>
          <span class="order-meta-item"><i data-lucide="hash"></i>${esc(o.target_number)}</span>
          ${o.customer_name ? `<span class="order-meta-item"><i data-lucide="user"></i>${esc(o.customer_name)}</span>` : ''}
          ${o.customer_phone ? `<span class="order-meta-item"><i data-lucide="phone"></i>${esc(o.customer_phone)}</span>` : ''}
        </div>

        ${o.np_transaction_id ? `<div style="font-size:.66rem;color:var(--text-3);font-family:'JetBrains Mono',monospace;margin-top:6px;">NP Trx: ${esc(o.np_transaction_id)}</div>` : ''}

        <div class="order-actions">${actions.join('')}</div>
      </div>`;
  }

  /* ============ ACTIONS ============ */
  async function updateOrderStatus(id, newStatus) {
    try {
      const { error } = await KR.sb.client
        .from('digital_orders')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;

      const o = orders.find(x => x.id === id);
      if (o) o.status = newStatus;
      render();
      KR.toast.success('Status diperbarui');
    } catch (e) {
      console.error('[UpdateStatus]', e);
      KR.toast.error('Gagal: ' + e.message);
    }
  }

  window.markDigitalProcessing = function (id) {
    updateOrderStatus(id, 'processing');
  };

  window.markDigitalDone = function (id) {
    confirmDialog('Tandai Selesai?', 'Pastikan pulsa/token sudah kamu kirim ke nomor customer.', () => {
      updateOrderStatus(id, 'done');
    });
  };

  window.retryDigitalOrder = function (id) {
    updateOrderStatus(id, 'paid');
  };

  window.deleteDigitalOrder = function (id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    confirmDialog(
      'Hapus Pesanan?',
      `Pesanan "${o.product_name}" (${fmt(o.amount)}) akan dihapus permanen.`,
      async () => {
        try {
          const { error } = await KR.sb.client.from('digital_orders').delete().eq('id', id);
          if (error) throw error;
          orders = orders.filter(x => x.id !== id);
          render();
          KR.toast.success('Pesanan dihapus');
        } catch (e) {
          KR.toast.error('Gagal: ' + e.message);
        }
      }
    );
  };

  window.setDigitalOrdersFilter = function (f) {
    filterStatus = f;
    render();
  };

  window.setDigitalOrdersSearch = function (q) {
    searchQuery = (q || '').trim();
    render();
  };

  /* ============ AUTO-REFRESH ============ */
  function startAutoRefresh() {
    if (autoRefreshTimer) return;
    autoRefreshTimer = setInterval(() => {
      const tab = document.getElementById('tab-digital-orders');
      if (tab && tab.classList.contains('active')) loadDigitalOrders();
    }, 30000); // 30 detik
  }

  /* ============ INIT ============ */
  window.loadDigitalOrders = loadDigitalOrders;

  window.addEventListener('kasirku:ready', () => {
    if (KR.auth.isLoggedIn()) {
      setTimeout(loadDigitalOrders, 1200);
      startAutoRefresh();
    }
  });
})();
