/* ==========================================
   KasirKu — Kasbon / Hutang Piutang
   ========================================== */
window.KR = window.KR || {};

KR.kasbon = (function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let list = [];
  let filter = 'active';
  let searchQuery = '';

  async function loadKasbon() {
    if (!KR.auth.isLoggedIn()) return;
    const listEl = $('kasbon-list');
    const countEl = $('kasbon-count-label');
    if (countEl) countEl.textContent = 'Memuat...';
    if (listEl) listEl.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Memuat kasbon...</p></div>';
    if (window.lucide) lucide.createIcons();

    try {
      const user = await KR.sb.getUser();
      const { data, error } = await KR.sb.client
        .from('kasbon')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      list = data || [];
      renderKasbon();
    } catch (e) {
      console.error('[Kasbon]', e);
      if (countEl) countEl.textContent = 'Gagal memuat';
      if (listEl) listEl.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Gagal memuat</h3><p>${esc(e.message)}</p></div>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  function getFiltered() {
    let arr = list;
    if (filter === 'active') arr = arr.filter(k => k.status !== 'paid');
    else if (filter !== 'all') arr = arr.filter(k => k.status === filter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(k =>
        (k.customer_name || '').toLowerCase().includes(q) ||
        (k.customer_phone || '').includes(q)
      );
    }
    return arr;
  }

  function renderKasbon() {
    const listEl = $('kasbon-list');
    const countEl = $('kasbon-count-label');
    const statsEl = $('kasbon-stats');
    if (!listEl) return;

    const totalDebt = list.reduce((s, k) => s + Number(k.amount), 0);
    const totalPaid = list.reduce((s, k) => s + Number(k.paid_amount), 0);
    const outstanding = totalDebt - totalPaid;
    const unpaidCount = list.filter(k => k.status === 'unpaid').length;
    const partialCount = list.filter(k => k.status === 'partial').length;

    if (countEl) countEl.textContent = list.length + ' kasbon';

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="order-stat clickable ${filter === 'active' ? 'active' : ''}" onclick="setKasbonFilter('active')">
          <div class="order-stat-label">Aktif</div>
          <div class="order-stat-value pending">${unpaidCount + partialCount}</div>
        </div>
        <div class="order-stat clickable ${filter === 'unpaid' ? 'active' : ''}" onclick="setKasbonFilter('unpaid')">
          <div class="order-stat-label">Belum Bayar</div>
          <div class="order-stat-value pending">${unpaidCount}</div>
        </div>
        <div class="order-stat clickable ${filter === 'partial' ? 'active' : ''}" onclick="setKasbonFilter('partial')">
          <div class="order-stat-label">Dicicil</div>
          <div class="order-stat-value verified">${partialCount}</div>
        </div>
        <div class="order-stat">
          <div class="order-stat-label">Total Outstanding</div>
          <div class="order-stat-value done" style="font-size:.95rem;">${fmt(outstanding)}</div>
        </div>
        <div class="order-stat clickable ${filter === 'all' ? 'active' : ''}" onclick="setKasbonFilter('all')">
          <div class="order-stat-label">Semua</div>
          <div class="order-stat-value">${list.length}</div>
        </div>
      `;
    }

    const arr = getFiltered();
    if (!arr.length) {
      listEl.innerHTML = `<div class="empty-state">
        <i data-lucide="hand-coins"></i>
        <h3>${searchQuery ? 'Tidak ada hasil' : 'Belum ada kasbon'}</h3>
        <p>${searchQuery ? 'Coba kata kunci lain' : 'Kasbon dari transaksi akan muncul di sini'}</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listEl.innerHTML = arr.map(k => {
      const amount = Number(k.amount) || 0;
      const paid = Number(k.paid_amount) || 0;
      const remaining = amount - paid;
      const percent = amount > 0 ? Math.round((paid / amount) * 100) : 0;
      const badge = {
        unpaid: '<span class="customer-badge" style="background:#fef3c7;color:#92400e;">Belum Bayar</span>',
        partial: '<span class="customer-badge" style="background:#dbeafe;color:#1e40af;">Dicicil</span>',
        paid: '<span class="customer-badge" style="background:#d1fae5;color:#065f46;">Lunas</span>',
      }[k.status] || '';

      return `
        <div class="customer-card" style="flex-direction:column;align-items:stretch;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;display:grid;place-items:center;flex-shrink:0;">
              <i data-lucide="hand-coins" class="w-5 h-5"></i>
            </div>
            <div class="customer-body" style="flex:1;min-width:0;">
              <div class="customer-name">${esc(k.customer_name)} ${badge}</div>
              ${k.customer_phone ? `<div class="customer-username">${esc(k.customer_phone)}</div>` : ''}
              <div class="customer-stats">
                <div><strong>${fmt(remaining)}</strong> sisa</div>
                <div>dari ${fmt(amount)}</div>
              </div>
            </div>
            <div class="customer-actions">
              ${k.status !== 'paid' ? `<button class="icon-btn" onclick="openKasbonPay('${k.id}')" title="Bayar"><i data-lucide="banknote"></i></button>` : ''}
              ${k.customer_phone ? `<button class="icon-btn" onclick="waKasbon('${esc(k.customer_phone)}')" title="Chat WA"><i data-lucide="message-circle"></i></button>` : ''}
              <button class="icon-btn-danger" onclick="deleteKasbon('${k.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
          ${paid > 0 ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);">
              <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text-3);margin-bottom:4px;">
                <span>Terbayar ${percent}%</span>
                <span>${fmt(paid)}</span>
              </div>
              <div class="report-cat-bar"><div class="report-cat-bar-fill" style="width:${percent}%;"></div></div>
            </div>
          ` : ''}
          ${k.note ? `<div style="margin-top:8px;font-size:.75rem;color:var(--text-2);">📝 ${esc(k.note)}</div>` : ''}
          <div class="customer-timeline" style="margin-top:8px;">
            <span>Dibuat: ${new Date(k.created_at).toLocaleDateString('id-ID')}</span>
            ${k.due_date ? `<span>Jatuh tempo: ${new Date(k.due_date).toLocaleDateString('id-ID')}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
    if (window.lucide) lucide.createIcons();
  }

  /* ===== PAYMENT MODAL ===== */
  function openKasbonPay(id) {
    const k = list.find(x => x.id === id);
    if (!k) return;
    const remaining = Number(k.amount) - Number(k.paid_amount);

    const existing = $('kasbon-pay-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'kasbon-pay-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentNode.remove()"></div>
      <div class="modal-card modal-card-sm">
        <div class="modal-head">
          <h3><i data-lucide="banknote"></i> Bayar Kasbon</h3>
          <button class="icon-btn" onclick="this.closest('.modal').remove()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div style="padding:14px;background:var(--bg-subtle);border-radius:12px;margin-bottom:14px;">
            <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--text-3);margin-bottom:6px;">Customer</div>
            <div style="font-weight:800;font-size:1rem;">${esc(k.customer_name)}</div>
            <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:baseline;">
              <span style="font-size:.72rem;color:var(--text-3);">Sisa hutang</span>
              <span style="font-family:'JetBrains Mono',monospace;font-weight:800;color:var(--danger);font-size:1.1rem;">${fmt(remaining)}</span>
            </div>
          </div>

          <div class="field">
            <label>Jumlah Bayar</label>
            <input id="kp-amount" type="number" class="input input-lg" value="${remaining}" min="1" max="${remaining}">
          </div>

          <div class="quick-cash" id="kp-quick">
            <button onclick="document.getElementById('kp-amount').value=${remaining}">Lunas</button>
            <button onclick="document.getElementById('kp-amount').value=${Math.round(remaining/2)}">Setengah</button>
            <button onclick="document.getElementById('kp-amount').value=10000">10rb</button>
            <button onclick="document.getElementById('kp-amount').value=50000">50rb</button>
            <button onclick="document.getElementById('kp-amount').value=100000">100rb</button>
          </div>

          <div class="field">
            <label>Metode</label>
            <select id="kp-method" class="select">
              <option value="Cash">Tunai</option>
              <option value="QRIS">QRIS</option>
              <option value="Transfer">Transfer</option>
              <option value="E-Wallet">E-Wallet</option>
            </select>
          </div>

          <div class="field">
            <label>Catatan (opsional)</label>
            <input id="kp-note" class="input" placeholder="Cicilan ke-1...">
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">Batal</button>
          <button class="btn btn-success" onclick="submitKasbonPay('${k.id}')">
            <i data-lucide="check-circle"></i> Simpan
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  }

  async function submitKasbonPay(id) {
    const amount = Number($('kp-amount')?.value) || 0;
    const method = $('kp-method')?.value || 'Cash';
    const note = $('kp-note')?.value.trim() || null;
    const k = list.find(x => x.id === id);
    if (!k) return;
    const remaining = Number(k.amount) - Number(k.paid_amount);

    if (amount <= 0) return KR.toast.error('Jumlah harus > 0');
    if (amount > remaining) return KR.toast.error('Melebihi sisa (' + fmt(remaining) + ')');

    showLoading('Menyimpan...');
    try {
      const user = await KR.sb.getUser();
      const { error } = await KR.sb.client.from('kasbon_payments').insert({
        kasbon_id: id, user_id: user.id, amount, method, note,
      });
      if (error) throw error;
      KR.toast.success('Pembayaran dicatat ✅');
      $('kasbon-pay-modal')?.remove();
      await loadKasbon();
    } catch (e) {
      console.error(e);
      KR.toast.error('Gagal: ' + e.message);
    } finally {
      hideLoading();
    }
  }

  async function createKasbon({ customerName, customerPhone, amount, note, dueDate }) {
    const user = await KR.sb.getUser();
    const { data, error } = await KR.sb.client.from('kasbon').insert({
      user_id: user.id,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      amount,
      note: note || null,
      due_date: dueDate || null,
      status: 'unpaid',
    }).select().single();
    if (error) throw error;
    return data;
  }

  function deleteKasbon(id) {
    const k = list.find(x => x.id === id);
    if (!k) return;
    confirmDialog('Hapus Kasbon?', `Kasbon "${k.customer_name}" (${fmt(k.amount)}) akan dihapus permanen.`, async () => {
      showLoading('Menghapus...');
      try {
        const { error } = await KR.sb.client.from('kasbon').delete().eq('id', id);
        if (error) throw error;
        KR.toast.success('Kasbon dihapus');
        await loadKasbon();
      } catch (e) {
        KR.toast.error('Gagal: ' + e.message);
      } finally {
        hideLoading();
      }
    });
  }

  function waKasbon(phone) {
    let p = String(phone).replace(/[^\d]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    window.open(`https://wa.me/${p}`, '_blank');
  }

  window.loadKasbon = loadKasbon;
  window.setKasbonFilter = (f) => { filter = f; renderKasbon(); };
  window.setKasbonSearch = (q) => { searchQuery = (q || '').trim(); renderKasbon(); };
  window.openKasbonPay = openKasbonPay;
  window.submitKasbonPay = submitKasbonPay;
  window.deleteKasbon = deleteKasbon;
  window.waKasbon = waKasbon;

  window.addEventListener('kasirku:ready', () => {
    if (KR.auth.isLoggedIn()) setTimeout(loadKasbon, 900);
  });

  return { loadKasbon, createKasbon };
})();
