/* ==========================================
   KasirKu — Notifications Admin (v1)
   Kirim & kelola notifikasi ke customer
   ========================================== */
window.KR = window.KR || {};

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  let notifs = [];
  let customers = [];
  let filterType = 'all';

  /* ============ LOAD ============ */
  async function loadNotifications() {
    if (!KR.auth.isLoggedIn()) return;
    const listEl = $('notif-list');
    const countEl = $('notif-count-label');
    if (countEl) countEl.textContent = 'Memuat...';
    if (listEl) listEl.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Memuat notifikasi...</p></div>';
    if (window.lucide) lucide.createIcons();

    try {
      const user = await KR.sb.getUser();
      const { data, error } = await KR.sb.client.rpc('notif_seller_list', {
        p_seller_id: user.id,
        p_limit: 100
      });
      if (error) throw error;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      notifs = parsed || [];
      renderNotifications();
    } catch (e) {
      console.error('[NotifAdmin]', e);
      if (countEl) countEl.textContent = 'Gagal memuat';
      if (listEl) listEl.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Gagal memuat</h3><p>${esc(e.message)}</p></div>`;
      if (window.lucide) lucide.createIcons();
    }
  }
  window.loadNotifications = loadNotifications;

  /* ============ LOAD CUSTOMERS (untuk pilih penerima personal) ============ */
  async function loadCustomerList() {
    if (customers.length) return;
    try {
      const user = await KR.sb.getUser();
      const { data, error } = await KR.sb.client.rpc('seller_customers', { p_seller_id: user.id });
      if (error) throw error;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      customers = parsed || [];
    } catch (e) {
      console.warn('[NotifAdmin] Customer load fail', e);
    }
  }

  /* ============ RENDER ============ */
  window.setNotifFilter = function (f) {
    filterType = f || 'all';
    renderNotifications();
  };

  function renderNotifications() {
    const listEl = $('notif-list');
    const countEl = $('notif-count-label');
    const statsEl = $('notif-stats');
    if (!listEl) return;

    const total = notifs.length;
    const broadcast = notifs.filter(n => n.is_broadcast).length;
    const personal = total - broadcast;
    const totalRead = notifs.reduce((s, n) => s + (Number(n.read_count) || 0), 0);

    if (countEl) countEl.textContent = total + ' notifikasi';

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="order-stat clickable ${filterType === 'all' ? 'active' : ''}" onclick="setNotifFilter('all')">
          <div class="order-stat-label">Total</div>
          <div class="order-stat-value">${total}</div>
        </div>
        <div class="order-stat clickable ${filterType === 'broadcast' ? 'active' : ''}" onclick="setNotifFilter('broadcast')">
          <div class="order-stat-label">Broadcast</div>
          <div class="order-stat-value" style="color:#3b82f6;">${broadcast}</div>
        </div>
        <div class="order-stat clickable ${filterType === 'personal' ? 'active' : ''}" onclick="setNotifFilter('personal')">
          <div class="order-stat-label">Personal</div>
          <div class="order-stat-value" style="color:#8b5cf6;">${personal}</div>
        </div>
        <div class="order-stat">
          <div class="order-stat-label">Total Dibaca</div>
          <div class="order-stat-value done">${totalRead}</div>
        </div>`;
    }

    let filtered = notifs;
    if (filterType === 'broadcast') filtered = notifs.filter(n => n.is_broadcast);
    if (filterType === 'personal') filtered = notifs.filter(n => !n.is_broadcast);

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-state">
        <i data-lucide="bell-off"></i>
        <h3>${total ? 'Tidak ada hasil' : 'Belum ada notifikasi'}</h3>
        <p>${total ? 'Coba filter lain' : 'Kirim notifikasi pertama kamu'}</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listEl.innerHTML = filtered.map(n => renderNotifCard(n)).join('');
    if (window.lucide) lucide.createIcons();
  }

  function renderNotifCard(n) {
    const meta = {
      info:   { color: '#3b82f6', bg: '#dbeafe', icon: 'info' },
      promo:  { color: '#f59e0b', bg: '#fef3c7', icon: 'gift' },
      order:  { color: '#10b981', bg: '#d1fae5', icon: 'package' },
      system: { color: '#6b7280', bg: '#f1f5f9', icon: 'megaphone' },
    }[n.category] || { color: '#3b82f6', bg: '#dbeafe', icon: 'bell' };

    const isBroadcast = n.is_broadcast;
    const target = isBroadcast ? 'Semua customer' : (n.customer_name || 'Personal');
    const time = formatDateTime(n.created_at);
    const expires = n.expires_at ? ` • Expired: ${formatDate(n.expires_at)}` : ' • Permanen';
    const readCount = Number(n.read_count) || 0;

    return `
      <div class="customer-card" style="align-items:stretch;flex-direction:column;">
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:44px;height:44px;border-radius:12px;background:${meta.bg};color:${meta.color};display:grid;place-items:center;flex-shrink:0;">
            <i data-lucide="${meta.icon}" class="w-5 h-5"></i>
          </div>
          <div class="customer-body" style="flex:1;min-width:0;">
            <div class="customer-name">
              ${esc(n.title)}
              ${isBroadcast
                ? '<span class="customer-badge" style="background:#dbeafe;color:#1d4ed8;">📢 Broadcast</span>'
                : '<span class="customer-badge member">👤 Personal</span>'}
            </div>
            ${n.body ? `<div style="font-size:.78rem;color:var(--text-2);line-height:1.45;margin-top:4px;">${esc(n.body)}</div>` : ''}
            <div class="customer-timeline" style="margin-top:6px;">
              <span>${time}</span>
              <span>${target}</span>
              <span>${readCount} dibaca${expires}</span>
            </div>
          </div>
          <div class="customer-actions">
            <button class="icon-btn-danger" onclick="deleteNotifConfirm('${n.id}')" title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      </div>`;
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${pad(d.getDate())} ${bln[d.getMonth()]} ${d.getFullYear()}`;
  }
  function formatDateTime(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${pad(d.getDate())} ${bln[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* ============ OPEN FORM MODAL ============ */
  window.openNotifForm = function () {
    const existing = $('notif-form-modal');
    if (existing) existing.remove();

    loadCustomerList(); // background

    const modal = document.createElement('div');
    modal.id = 'notif-form-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentNode.remove()"></div>
      <div class="modal-card modal-card-md">
        <div class="modal-head">
          <h3><i data-lucide="send"></i> Kirim Notifikasi</h3>
          <button class="icon-btn" onclick="this.closest('.modal').remove()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Jenis Notifikasi</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
              <label class="method-card active" data-notif-target="broadcast" style="padding:14px;">
                <input type="radio" name="notif-target" value="broadcast" checked>
                <div class="mc-icon" style="width:32px;height:32px;"><i data-lucide="megaphone"></i></div>
                <div>
                  <div class="mc-l">Broadcast</div>
                  <div class="mc-d">Semua customer</div>
                </div>
              </label>
              <label class="method-card" data-notif-target="personal" style="padding:14px;">
                <input type="radio" name="notif-target" value="personal">
                <div class="mc-icon" style="width:32px;height:32px;"><i data-lucide="user"></i></div>
                <div>
                  <div class="mc-l">Personal</div>
                  <div class="mc-d">Pilih 1 customer</div>
                </div>
              </label>
            </div>
          </div>

          <div class="field hidden" id="notif-customer-wrap">
            <label>Pilih Customer <span class="req">*</span></label>
            <select id="notif-customer" class="select">
              <option value="">— Pilih customer —</option>
            </select>
          </div>

          <div class="field">
            <label>Judul <span class="req">*</span></label>
            <input id="notif-title" class="input" placeholder="Contoh: Promo Diskon 10% Hari Ini!" maxlength="80">
          </div>

          <div class="field">
            <label>Isi Pesan</label>
            <textarea id="notif-body-input" class="textarea" rows="3" placeholder="Contoh: Belanja minimal Rp 50.000 dapat diskon 10%. Berlaku sampai jam 9 malam." maxlength="300"></textarea>
          </div>

          <div class="field-grid">
            <div class="field">
              <label>Kategori</label>
              <select id="notif-category" class="select">
                <option value="promo">🎁 Promo</option>
                <option value="info">ℹ️ Info</option>
                <option value="order">📦 Order</option>
                <option value="system">📢 System</option>
              </select>
            </div>
            <div class="field">
              <label>Berlaku (TTL)</label>
              <select id="notif-ttl" class="select">
                <option value="1">1 hari</option>
                <option value="3">3 hari</option>
                <option value="7" selected>7 hari</option>
                <option value="30">30 hari</option>
                <option value="">Permanen</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">Batal</button>
          <button class="btn btn-primary" onclick="submitNotifForm()">
            <i data-lucide="send"></i> Kirim
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    // Handler pilih jenis
    modal.querySelectorAll('[data-notif-target]').forEach(card => {
      card.addEventListener('click', () => {
        const value = card.dataset.notifTarget;
        modal.querySelectorAll('[data-notif-target]').forEach(c => c.classList.toggle('active', c === card));
        const wrap = document.getElementById('notif-customer-wrap');
        if (wrap) wrap.classList.toggle('hidden', value !== 'personal');
        if (value === 'personal') populateCustomerSelect();
      });
    });
  };

  function populateCustomerSelect() {
    const sel = document.getElementById('notif-customer');
    if (!sel) return;
    if (!customers.length) {
      sel.innerHTML = '<option value="">Memuat customer...</option>';
      loadCustomerList().then(() => populateCustomerSelect());
      return;
    }
    sel.innerHTML = '<option value="">— Pilih customer —</option>' +
      customers.map(c => `<option value="${c.id}">${esc(c.name || 'Tamu')}${c.phone ? ' • ' + esc(c.phone) : ''}</option>`).join('');
  }

  /* ============ SUBMIT ============ */
  window.submitNotifForm = async function () {
    const targetType = document.querySelector('input[name="notif-target"]:checked')?.value || 'broadcast';
    const customerId = targetType === 'personal' ? (document.getElementById('notif-customer')?.value || '') : null;
    const title = (document.getElementById('notif-title')?.value || '').trim();
    const body = (document.getElementById('notif-body-input')?.value || '').trim();
    const category = document.getElementById('notif-category')?.value || 'info';
    const ttlRaw = document.getElementById('notif-ttl')?.value;
    const ttl = ttlRaw ? Number(ttlRaw) : null;

    if (!title) return KR.toast.error('Judul wajib diisi');
    if (targetType === 'personal' && !customerId) return KR.toast.error('Pilih customer dulu');

    const iconMap = { promo: 'gift', info: 'info', order: 'package', system: 'megaphone' };

    showLoading('Mengirim notifikasi...');
    try {
      const user = await KR.sb.getUser();
      const { error } = await KR.sb.client.rpc('notif_send', {
        p_seller_id: user.id,
        p_customer_id: customerId,
        p_title: title,
        p_body: body || null,
        p_category: category,
        p_icon: iconMap[category] || 'bell',
        p_image_url: null,
        p_action_url: null,
        p_ttl_days: ttl
      });
      if (error) throw error;

      KR.toast.success('Notifikasi terkirim! 🎉');
      document.getElementById('notif-form-modal')?.remove();
      await loadNotifications();
    } catch (e) {
      console.error('[NotifAdmin]', e);
      KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
    } finally {
      hideLoading();
    }
  };

  /* ============ DELETE ============ */
  window.deleteNotifConfirm = function (id) {
    const n = notifs.find(x => x.id === id);
    if (!n) return;
    confirmDialog(
      'Hapus Notifikasi?',
      `"${n.title}" akan dihapus permanen. Customer tidak akan melihatnya lagi.`,
      async () => {
        showLoading('Menghapus...');
        try {
          const user = await KR.sb.getUser();
          const { error } = await KR.sb.client.rpc('notif_delete', {
            p_notif_id: id,
            p_seller_id: user.id
          });
          if (error) throw error;
          KR.toast.success('Notifikasi dihapus');
          await loadNotifications();
        } catch (e) {
          KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
        } finally {
          hideLoading();
        }
      }
    );
  };

  /* ============ BOOT ============ */
  window.addEventListener('kasirku:ready', () => {
    if (KR.auth.isLoggedIn() && document.getElementById('notif-list')) {
      setTimeout(loadNotifications, 900);
    }
  });

  console.log('%c[NotifAdmin] Ready', 'color:#8b5cf6;font-weight:800;');
})();
