/* ==========================================
   KasirKu — Customer Auth Module
   Dipakai di order.html (halaman order publik)
   ========================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'kasir:customer_session';
  const GUEST_TOKEN_KEY = 'kasir:guest_token:';

  const state = {
    sellerId: null,
    session: null,
    sb: null,
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

  function toast(msg, type = 'info') {
    if (window.__customerToast) return window.__customerToast(msg, type);
    console.log('[' + type + ']', msg);
  }

  /* ---------- SESSION ---------- */
  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (state.sellerId && data.seller_id !== state.sellerId) return null;
      return data;
    } catch (e) { return null; }
  }

  function saveSession(session) {
    const data = { ...session, seller_id: state.sellerId, saved_at: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[CustomerAuth] Save session failed', e);
    }
    state.session = data;
  }

  function clearSession() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    state.session = null;
  }

  /* ---------- GUEST TOKEN ---------- */
  function genUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getGuestToken() {
    const key = GUEST_TOKEN_KEY + state.sellerId;
    let token = null;
    try { token = localStorage.getItem(key); } catch (e) {}
    if (!token) {
      token = 'g_' + genUUID();
      try { localStorage.setItem(key, token); } catch (e) {}
    }
    return token;
  }

  /* ---------- RPC ---------- */
  async function rpc(fn, params) {
    if (!state.sb) throw new Error('Koneksi belum siap');
    const { data, error } = await state.sb.rpc(fn, params);
    if (error) throw new Error(error.message || 'Server error');
    return data;
  }

  async function register(username, password, name, phone, address) {
    const data = await rpc('customer_register', {
      p_seller_id: state.sellerId,
      p_username: username,
      p_password: password,
      p_name: name,
      p_phone: phone || null,
      p_address: address || null,
    });
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    saveSession(parsed);
    return parsed;
  }

  async function login(username, password) {
    const data = await rpc('customer_login', {
      p_seller_id: state.sellerId,
      p_username: username,
      p_password: password,
    });
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    saveSession(parsed);
    return parsed;
  }

  async function guest(name, phone, address) {
    const token = getGuestToken();
    const data = await rpc('customer_guest', {
      p_seller_id: state.sellerId,
      p_guest_token: token,
      p_name: name || null,
      p_phone: phone || null,
      p_address: address || null,
    });
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    saveSession(parsed);
    return parsed;
  }

  async function updateProfile({ name, phone, address }) {
    if (!state.session) return null;
    const data = await rpc('customer_update_profile', {
      p_customer_id: state.session.id,
      p_name: name || null,
      p_phone: phone || null,
      p_address: address || null,
    });
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    saveSession({ ...state.session, ...parsed });
    return parsed;
  }

  function logout() {
    clearSession();
    renderHeaderUI();
    renderMyOrdersButton();
  }

  /* ---------- HEADER UI ---------- */
  function renderHeaderUI() {
    const btn = $('customer-header-btn');
    if (!btn) return;

    if (state.session) {
      const initial = (state.session.name || '?')[0].toUpperCase();
      btn.innerHTML = `
        <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;display:grid;place-items:center;font-weight:800;font-size:.85rem;">
          ${esc(initial)}
        </div>
      `;
      btn.title = state.session.name || 'Customer';
      btn.onclick = openProfileSheet;
    } else {
      btn.innerHTML = `<i data-lucide="user" class="w-5 h-5 text-slate-500"></i>`;
      btn.title = 'Masuk / Daftar';
      btn.onclick = function () { openAuthModal('login'); };
    }
    if (window.lucide) lucide.createIcons();
  }

  function renderMyOrdersButton() {
    const btn = $('my-orders-header-btn');
    if (!btn) return;
    if (state.session) {
      btn.classList.remove('hidden');
      btn.onclick = openMyOrders;
    } else {
      btn.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- PROFILE SHEET ---------- */
  function openProfileSheet() {
    const s = state.session;
    if (!s) return;
    const existing = $('customer-profile-sheet');
    if (existing) existing.remove();

    const sheet = document.createElement('div');
    sheet.id = 'customer-profile-sheet';
    sheet.className = 'fixed inset-0 z-50';
    sheet.innerHTML = `
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="document.getElementById('customer-profile-sheet').remove()"></div>
      <div class="relative h-full flex items-end sm:items-center justify-center sm:p-4">
        <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[94dvh] flex flex-col shadow-2xl anim-up">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 class="font-extrabold text-base">Akun Saya</h3>
            <button onclick="document.getElementById('customer-profile-sheet').remove()" class="w-9 h-9 rounded-xl hover:bg-slate-100 grid place-items-center">
              <i data-lucide="x" class="w-5 h-5 text-slate-500"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-5">
            <div class="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
              <div style="width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;display:grid;place-items:center;font-weight:900;font-size:1.5rem;flex-shrink:0;">
                ${esc((s.name || '?')[0].toUpperCase())}
              </div>
              <div style="flex:1;min-width:0;">
                <div class="font-extrabold text-base">${esc(s.name || 'Tamu')}</div>
                ${s.username ? `<div class="text-xs text-slate-500 font-mono mt-0.5">@${esc(s.username)}</div>` : ''}
                <span class="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${s.is_guest ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}">
                  ${s.is_guest ? 'Tamu' : 'Member'}
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-5">
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Total Order</div>
                <div class="font-mono font-black text-lg text-emerald-600">${s.total_orders || 0}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Total Belanja</div>
                <div class="font-mono font-black text-sm text-emerald-600">${fmt(s.total_spent)}</div>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Nama</label>
                <input id="cs-name" type="text" value="${esc(s.name || '')}" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">No. WhatsApp</label>
                <input id="cs-phone" type="tel" value="${esc(s.phone || '')}" placeholder="62812..." class="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Alamat</label>
                <textarea id="cs-address" rows="2" placeholder="Alamat pengiriman" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm resize-none">${esc(s.address || '')}</textarea>
              </div>
              <button onclick="CustomerAuth.saveProfileSheet()" class="w-full py-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/30">
                <i data-lucide="save" class="w-4 h-4 inline mr-1"></i> Simpan Perubahan
              </button>
            </div>
          </div>
          <div class="px-5 py-4 border-t border-slate-100 bg-slate-50/70 flex gap-2">
            <button onclick="CustomerAuth.handleLogout()" class="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition">
              <i data-lucide="log-out" class="w-4 h-4 inline mr-1"></i> Keluar
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(sheet);
    if (window.lucide) lucide.createIcons();
  }

  async function saveProfileSheet() {
    const name = $('cs-name') ? $('cs-name').value.trim() : '';
    const phone = $('cs-phone') ? $('cs-phone').value.trim() : '';
    const address = $('cs-address') ? $('cs-address').value.trim() : '';
    if (!name) return toast('Nama wajib diisi', 'error');

    try {
      await updateProfile({ name, phone, address });
      toast('Profil tersimpan', 'success');
      const sheet = $('customer-profile-sheet');
      if (sheet) sheet.remove();
      renderHeaderUI();
    } catch (e) {
      toast('Gagal: ' + e.message, 'error');
    }
  }

  /* ---------- AUTH MODAL ---------- */
  function openAuthModal(tab) {
    const modal = $('auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    switchAuthTab(tab || 'login');
    if (window.lucide) lucide.createIcons();
  }

  function closeAuthModal() {
    const modal = $('auth-modal');
    if (modal) modal.classList.add('hidden');
  }

  function switchAuthTab(tab) {
    document.querySelectorAll('[data-auth-tab]').forEach(t => {
      t.classList.toggle('active', t.dataset.authTab === tab);
    });
    ['login', 'register', 'guest'].forEach(name => {
      const panel = $('auth-panel-' + name);
      if (panel) panel.classList.toggle('hidden', name !== tab);
    });
  }

  async function handleLogin() {
    const u = $('ca-login-username') ? $('ca-login-username').value.trim() : '';
    const p = $('ca-login-password') ? $('ca-login-password').value : '';
    if (!u || !p) return toast('Isi username & password', 'error');

    const btn = $('ca-login-btn');
    const orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

    try {
      const session = await login(u, p);
      closeAuthModal();
      renderHeaderUI();
      renderMyOrdersButton();
      toast('Selamat datang, ' + (session.name || 'Customer') + '!', 'success');
      setTimeout(function () { location.reload(); }, 500);
    } catch (e) {
      toast(e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  async function handleRegister() {
    const u = $('ca-reg-username') ? $('ca-reg-username').value.trim() : '';
    const p = $('ca-reg-password') ? $('ca-reg-password').value : '';
    const p2 = $('ca-reg-password2') ? $('ca-reg-password2').value : '';
    const n = $('ca-reg-name') ? $('ca-reg-name').value.trim() : '';
    const ph = $('ca-reg-phone') ? $('ca-reg-phone').value.trim() : '';

    if (!u || u.length < 3) return toast('Username minimal 3 karakter', 'error');
    if (!/^[a-z0-9_]+$/i.test(u)) return toast('Username hanya huruf, angka, underscore', 'error');
    if (!p || p.length < 6) return toast('Password minimal 6 karakter', 'error');
    if (p !== p2) return toast('Konfirmasi password tidak cocok', 'error');
    if (!n) return toast('Nama wajib diisi', 'error');

    const btn = $('ca-reg-btn');
    const orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Mendaftar...'; }

    try {
      await register(u, p, n, ph, null);
      closeAuthModal();
      renderHeaderUI();
      renderMyOrdersButton();
      toast('Akun dibuat! Selamat datang, ' + n + '!', 'success');
      setTimeout(function () { location.reload(); }, 500);
    } catch (e) {
      toast(e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  async function handleGuest() {
    const n = $('ca-guest-name') ? $('ca-guest-name').value.trim() : '';
    if (!n) return toast('Nama wajib diisi', 'error');

    const btn = $('ca-guest-btn');
    const orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

    try {
      await guest(n, null, null);
      closeAuthModal();
      renderHeaderUI();
      renderMyOrdersButton();
      toast('Lanjut sebagai tamu', 'success');
      setTimeout(function () { location.reload(); }, 500);
    } catch (e) {
      toast(e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  function handleLogout() {
    if (!confirm('Keluar dari akun?')) return;
    logout();
    toast('Logout berhasil');
    setTimeout(function () { location.reload(); }, 400);
  }

  /* ---------- AUTOFILL CHECKOUT ---------- */
  function autofillCheckout() {
    if (!state.session) return;
    const nameEl = $('inp-name');
    const phoneEl = $('inp-phone');
    const addrEl = $('inp-address');

    if (nameEl && !nameEl.value) nameEl.value = state.session.name || '';
    if (phoneEl && !phoneEl.value) phoneEl.value = state.session.phone || '';
    if (addrEl && !addrEl.value) addrEl.value = state.session.address || '';
  }

  /* ---------- MY ORDERS ---------- */
  function formatDateID(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    const pad = function (n) { return String(n).padStart(2, '0'); };
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return pad(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  async function openMyOrders() {
    if (!state.session) return openAuthModal('login');
    const existing = $('my-orders-sheet');
    if (existing) existing.remove();

    const sheet = document.createElement('div');
    sheet.id = 'my-orders-sheet';
    sheet.className = 'fixed inset-0 z-50';
    sheet.innerHTML = `
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="document.getElementById('my-orders-sheet').remove()"></div>
      <div class="relative h-full flex items-end sm:items-center justify-center sm:p-4">
        <div class="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[94dvh] flex flex-col shadow-2xl anim-up">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 grid place-items-center text-white shadow-lg shadow-primary-500/30">
                <i data-lucide="package" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-base">Pesanan Saya</h3>
                <p class="text-[11px] text-slate-500">Riwayat & status pesanan kamu</p>
              </div>
            </div>
            <button onclick="document.getElementById('my-orders-sheet').remove()" class="w-9 h-9 rounded-xl hover:bg-slate-100 grid place-items-center transition">
              <i data-lucide="x" class="w-5 h-5 text-slate-500"></i>
            </button>
          </div>
          <div id="my-orders-content" class="flex-1 overflow-y-auto p-5">
            <div class="py-12 text-center">
              <div class="inline-block w-10 h-10 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
              <p class="mt-4 text-sm font-bold text-slate-600">Memuat pesanan...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(sheet);
    if (window.lucide) lucide.createIcons();

    try {
      const ordersPromise = rpc('customer_my_orders', { p_customer_id: state.session.id });
      const statsPromise = rpc('customer_my_stats', { p_customer_id: state.session.id });
      const results = await Promise.all([ordersPromise, statsPromise]);
      const parse = function (d) { return typeof d === 'string' ? JSON.parse(d) : d; };
      const orders = (results[0] || []).map(parse).filter(Boolean);
      const stats = parse(results[1]) || {};

      const content = $('my-orders-content');
      if (!content) return;

      if (!orders.length) {
        content.innerHTML = '<div class="py-16 text-center">' +
          '<div class="w-20 h-20 mx-auto rounded-3xl bg-slate-100 grid place-items-center mb-4">' +
            '<i data-lucide="package-open" class="w-10 h-10 text-slate-400"></i>' +
          '</div>' +
          '<h3 class="font-extrabold text-slate-800 mb-1.5">Belum ada pesanan</h3>' +
          '<p class="text-slate-500 text-sm max-w-xs mx-auto">Yuk mulai belanja, pesanan kamu akan muncul di sini</p>' +
        '</div>';
        if (window.lucide) lucide.createIcons();
        return;
      }

      const statHtml = '<div class="grid grid-cols-3 gap-2 mb-4">' +
        '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">' +
          '<div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Total</div>' +
          '<div class="font-mono font-black text-lg text-emerald-600">' + (stats.total_orders || 0) + '</div>' +
        '</div>' +
        '<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">' +
          '<div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 mb-1">Proses</div>' +
          '<div class="font-mono font-black text-lg text-amber-600">' + ((stats.pending || 0) + (stats.verified || 0)) + '</div>' +
        '</div>' +
        '<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">' +
          '<div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 mb-1">Selesai</div>' +
          '<div class="font-mono font-black text-lg text-emerald-600">' + (stats.done || 0) + '</div>' +
        '</div>' +
      '</div>';

      const cardsHtml = orders.map(function (o) {
        const statusMap = {
          pending:   { label: 'Menunggu Verifikasi', color: 'amber',   icon: 'clock' },
          verified:  { label: 'Sedang Diproses',     color: 'blue',    icon: 'loader' },
          done:      { label: 'Selesai',             color: 'emerald', icon: 'check-circle' },
          cancelled: { label: 'Dibatalkan',          color: 'red',     icon: 'x-circle' },
        };
        const s = statusMap[o.status] || statusMap.pending;
        const methodMap = { digital: 'Digital', delivery: 'Dikirim', pickup: 'Ambil', cod: 'COD' };
        const method = methodMap[o.delivery_method] || 'Digital';
        const code = o.order_code ? '#' + o.order_code : '#' + String(o.id).slice(0, 6).toUpperCase();
        const created = formatDateID(o.created_at);
        const items = (Array.isArray(o.items) && o.items.length) ? o.items : [];
        const itemCount = items.length || 1;

        const itemPreview = items.slice(0, 3).map(function (it) {
          return '<div class="flex items-center justify-between gap-2 text-xs">' +
            '<span class="text-slate-600 flex-1 min-w-0 truncate">' + it.qty + '× ' + esc(it.name) + '</span>' +
            '<span class="font-mono font-bold text-slate-800 whitespace-nowrap">' + fmt((it.price || 0) * (it.qty || 1)) + '</span>' +
          '</div>';
        }).join('');
        const moreItems = itemCount > 3
          ? '<div class="text-[11px] text-slate-500 italic mt-1">+' + (itemCount - 3) + ' item lainnya</div>'
          : '';

        const colorMap = {
          amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: 'bg-amber-500' },
          blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    icon: 'bg-blue-500' },
          emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-500' },
          red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     icon: 'bg-red-500' },
        }[s.color];

        return '<div class="rounded-2xl border-2 ' + colorMap.border + ' ' + colorMap.bg + ' overflow-hidden">' +
          '<div class="p-4">' +
            '<div class="flex items-start justify-between gap-3 mb-3">' +
              '<div class="flex items-center gap-2.5 min-w-0">' +
                '<div class="w-9 h-9 rounded-xl ' + colorMap.icon + ' text-white grid place-items-center flex-shrink-0 shadow-md">' +
                  '<i data-lucide="' + s.icon + '" class="w-4 h-4"></i>' +
                '</div>' +
                '<div class="min-w-0">' +
                  '<div class="text-[10px] font-extrabold uppercase tracking-widest ' + colorMap.text + '">' + s.label + '</div>' +
                  '<div class="font-mono text-xs text-slate-600 mt-0.5">' + code + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="text-right flex-shrink-0">' +
                '<div class="font-mono font-black text-base text-slate-800">' + fmt(o.product_price) + '</div>' +
                '<div class="text-[10px] text-slate-500 mt-0.5">' + itemCount + ' item</div>' +
              '</div>' +
            '</div>' +
            '<div class="space-y-1.5 p-3 rounded-xl bg-white/60 border border-white">' +
              itemPreview + moreItems +
            '</div>' +
            '<div class="flex items-center justify-between mt-3 pt-3 border-t border-dashed ' + colorMap.border + '">' +
              '<div class="flex items-center gap-3 text-[11px] text-slate-600">' +
                '<span class="inline-flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i>' + created + '</span>' +
                '<span class="inline-flex items-center gap-1"><i data-lucide="truck" class="w-3 h-3"></i>' + method + '</span>' +
              '</div>' +
            '</div>' +
            (o.notes ? '<div class="mt-2 p-2 rounded-lg bg-white/60 border border-white text-[11px] text-slate-600"><i data-lucide="message-square" class="w-3 h-3 inline mr-1"></i>' + esc(o.notes) + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');

      content.innerHTML = statHtml + '<div class="space-y-3">' + cardsHtml + '</div>';
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error('[MyOrders]', e);
      const content = $('my-orders-content');
      if (content) {
        content.innerHTML = '<div class="py-12 text-center">' +
          '<div class="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-500 grid place-items-center mb-3">' +
            '<i data-lucide="alert-circle" class="w-8 h-8"></i>' +
          '</div>' +
          '<div class="font-extrabold text-slate-800 mb-1">Gagal memuat</div>' +
          '<p class="text-sm text-slate-500">' + esc(e.message || 'Unknown') + '</p>' +
        '</div>';
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  /* ---------- INIT ---------- */
  function init(sellerId, supabaseClient) {
    state.sellerId = sellerId;
    state.sb = supabaseClient;
    state.session = loadSession();

    renderHeaderUI();
    renderMyOrdersButton();

    // Hook proceedToCheckout untuk autofill
    if (typeof window.proceedToCheckout === 'function' && !window.proceedToCheckout._hooked) {
      const orig = window.proceedToCheckout;
      window.proceedToCheckout = function () {
        orig.apply(this, arguments);
        setTimeout(autofillCheckout, 60);
      };
      window.proceedToCheckout._hooked = true;
    }

    // Auto-show modal login kalau belum login
    if (!state.session) {
      setTimeout(function () { openAuthModal('login'); }, 600);
    }

    // Expose API global
    window.CustomerAuth = {
      state: state,
      openAuthModal: openAuthModal,
      closeAuthModal: closeAuthModal,
      switchAuthTab: switchAuthTab,
      handleLogin: handleLogin,
      handleRegister: handleRegister,
      handleGuest: handleGuest,
      handleLogout: handleLogout,
      saveProfileSheet: saveProfileSheet,
      autofillCheckout: autofillCheckout,
      openMyOrders: openMyOrders,
      getSession: function () { return state.session; },
      updateProfile: updateProfile,
    };
  }

  window.KRCustomer = {
    init: init,
    getSession: function () { return state.session; },
    updateProfile: updateProfile,
  };
})();
