/* ==========================================
   KasirKu — Customers Admin Module (v2)
   ========================================== */
window.KR = window.KR || {};

(function () {
  'use strict';

  let customers = [];
  let filterType = 'all';
  let searchQuery = '';

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  function parseRow(d) {
    if (typeof d === 'string') { try { return JSON.parse(d); } catch { return null; } }
    return d;
  }

  async function loadCustomers() {
    if (!KR.auth.isLoggedIn()) return;
    const listEl = $('customers-list');
    const countEl = $('customers-count-label');
    if (countEl) countEl.textContent = 'Memuat...';
    if (listEl) listEl.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Memuat customer...</p></div>';
    if (window.lucide) lucide.createIcons();

    try {
      const user = await KR.sb.getUser();
      const { data, error } = await KR.sb.client.rpc('seller_customers', { p_seller_id: user.id });
      if (error) throw error;
      customers = (data || []).map(parseRow).filter(Boolean);
      renderCustomers();
    } catch (e) {
      console.error('[Customers]', e);
      if (countEl) countEl.textContent = 'Gagal memuat';
      if (listEl) listEl.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Gagal memuat</h3><p>${esc(e.message)}</p></div>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  function getFiltered() {
    let list = customers;
    if (filterType === 'registered') list = list.filter(c => !c.is_guest);
    if (filterType === 'guest') list = list.filter(c => c.is_guest);
    if (filterType === 'active') list = list.filter(c => (c.total_orders || 0) > 0);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    }
    return list;
  }

  function renderCustomers() {
    const listEl = $('customers-list');
    const countEl = $('customers-count-label');
    const statsEl = $('customers-stats');
    if (!listEl) return;

    const total = customers.length;
    const registered = customers.filter(c => !c.is_guest).length;
    const guestCount = customers.filter(c => c.is_guest).length;
    const totalOrders = customers.reduce((s, c) => s + (Number(c.total_orders) || 0), 0);
    const totalSpent = customers.reduce((s, c) => s + (Number(c.total_spent) || 0), 0);

    if (countEl) countEl.textContent = total + ' customer';

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="order-stat clickable ${filterType === 'all' ? 'active' : ''}" onclick="setCustomerFilter('all')">
          <div class="order-stat-label">Total</div>
          <div class="order-stat-value">${total}</div>
        </div>
        <div class="order-stat clickable ${filterType === 'registered' ? 'active' : ''}" onclick="setCustomerFilter('registered')">
          <div class="order-stat-label">Member</div>
          <div class="order-stat-value done">${registered}</div>
        </div>
        <div class="order-stat clickable ${filterType === 'guest' ? 'active' : ''}" onclick="setCustomerFilter('guest')">
          <div class="order-stat-label">Tamu</div>
          <div class="order-stat-value pending">${guestCount}</div>
        </div>
        <div class="order-stat clickable ${filterType === 'active' ? 'active' : ''}" onclick="setCustomerFilter('active')">
          <div class="order-stat-label">Pernah Order</div>
          <div class="order-stat-value verified">${customers.filter(c => (c.total_orders || 0) > 0).length}</div>
        </div>
        <div class="order-stat">
          <div class="order-stat-label">Total Belanja</div>
          <div class="order-stat-value done" style="font-size:1rem;">${fmt(totalSpent)}</div>
        </div>`;
    }

    let filtered = getFiltered();

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-state">
        <i data-lucide="users"></i>
        <h3>${searchQuery ? 'Tidak ada hasil' : 'Belum ada customer'}</h3>
        <p>${searchQuery ? 'Coba kata kunci lain' : 'Customer yang login / order di toko kamu akan muncul di sini'}</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const initial = (c.name || c.username || '?')[0].toUpperCase();
      const joined = c.created_at ? formatDate(c.created_at) : '—';
      const lastLogin = c.last_login_at ? formatDate(c.last_login_at) : 'Belum pernah';

      return `
        <div class="customer-card">
          <div class="customer-avatar ${c.is_guest ? 'guest' : ''}">${esc(initial)}</div>
          <div class="customer-body">
            <div class="customer-name">
              ${esc(c.name || 'Tamu')}
              <span class="customer-badge ${c.is_guest ? 'guest' : 'member'}">
                ${c.is_guest ? 'Tamu' : 'Member'}
              </span>
            </div>
            ${c.username ? `<div class="customer-username">@${esc(c.username)}</div>` : ''}
            <div class="customer-meta">
              ${c.phone ? `<span><i data-lucide="phone" style="width:11px;height:11px;"></i>${esc(c.phone)}</span>` : ''}
              ${c.address ? `<span><i data-lucide="map-pin" style="width:11px;height:11px;"></i>${esc(c.address)}</span>` : ''}
            </div>
            <div class="customer-stats">
              <div><strong>${c.total_orders || 0}</strong> order</div>
              <div><strong>${fmt(c.total_spent)}</strong></div>
            </div>
            <div class="customer-timeline">
              <span>Daftar: ${joined}</span>
              <span>Login: ${lastLogin}</span>
            </div>
          </div>
          <div class="customer-actions">
            ${c.phone ? `<button class="icon-btn" onclick="waCustomer('${esc(c.phone)}')" title="Chat WA"><i data-lucide="message-circle"></i></button>` : ''}
            <button class="icon-btn-danger" onclick="deleteCustomer('${c.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  window.setCustomerFilter = function (f) {
    filterType = f;
    renderCustomers();
  };

  window.setCustomerSearch = function (q) {
    searchQuery = (q || '').trim();
    renderCustomers();
  };

  window.waCustomer = function (phone) {
    let p = String(phone).replace(/[^\d]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    window.open(`https://wa.me/${p}`, '_blank');
  };

  window.deleteCustomer = function (id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    confirmDialog(
      'Hapus Customer?',
      `Customer "${c.name || c.username}" akan dihapus permanen. Riwayat pesanan tetap tersimpan.`,
      async () => {
        showLoading('Menghapus...');
        try {
          const { error } = await KR.sb.client.rpc('seller_delete_customer', { p_customer_id: id });
          if (error) throw error;
          customers = customers.filter(x => x.id !== id);
          renderCustomers();
          KR.toast.success('Customer dihapus');
        } catch (e) {
          console.error(e);
          KR.toast.error('Gagal: ' + e.message);
        } finally {
          hideLoading();
        }
      }
    );
  };

  /* ---------- BULK ACTIONS ---------- */
  window.clearGuests = function () {
    const count = customers.filter(c => c.is_guest).length;
    if (!count) return KR.toast.info('Tidak ada tamu');
    confirmDialog(
      'Hapus Semua Tamu?',
      `${count} customer tamu akan dihapus. Member tidak terpengaruh.`,
      async () => {
        showLoading('Menghapus...');
        try {
          const user = await KR.sb.getUser();
          const { data, error } = await KR.sb.client.rpc('seller_clear_guests', { p_seller_id: user.id });
          if (error) throw error;
          customers = customers.filter(c => !c.is_guest);
          renderCustomers();
          KR.toast.success(`${data || count} tamu dihapus`);
        } catch (e) {
          console.error(e);
          KR.toast.error('Gagal: ' + e.message);
        } finally {
          hideLoading();
        }
      }
    );
  };

  window.clearInactive = function (days) {
    const d = days || 90;
    confirmDialog(
      `Hapus Customer Tidak Aktif?`,
      `Customer yang tidak login/order dalam ${d} hari terakhir akan dihapus.`,
      async () => {
        showLoading('Menghapus...');
        try {
          const user = await KR.sb.getUser();
          const { data, error } = await KR.sb.client.rpc('seller_clear_inactive', {
            p_seller_id: user.id,
            p_days: d,
          });
          if (error) throw error;
          await loadCustomers();
          KR.toast.success(`${data || 0} customer tidak aktif dihapus`);
        } catch (e) {
          console.error(e);
          KR.toast.error('Gagal: ' + e.message);
        } finally {
          hideLoading();
        }
      }
    );
  };

  window.loadCustomers = loadCustomers;
  window.renderCustomers = renderCustomers;

  window.addEventListener('kasirku:ready', () => {
    if (KR.auth.isLoggedIn()) {
      setTimeout(loadCustomers, 800);
    }
  });
})();
