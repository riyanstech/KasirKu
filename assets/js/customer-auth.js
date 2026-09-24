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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    state.session = data;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
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
    let token = localStorage.getItem(key);
    if (!token) {
      token = 'g_' + genUUID();
      localStorage.setItem(key, token);
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
    saveSession(data);
    return data;
  }

  async function login(username, password) {
    const data = await rpc('customer_login', {
      p_seller_id: state.sellerId,
      p_username: username,
      p_password: password,
    });
    saveSession(data);
    return data;
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
    saveSession(data);
    return data;
  }

  async function updateProfile({ name, phone, address }) {
    if (!state.session) return null;
    const data = await rpc('customer_update_profile', {
      p_customer_id: state.session.id,
      p_name: name || null,
      p_phone: phone || null,
      p_address: address || null,
    });
    saveSession({ ...state.session, ...data });
    return data;
  }

  function logout() {
    clearSession();
    renderHeaderUI();
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
      btn.onclick = () => openAuthModal('login');
    }
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- PROFILE SHEET (khusus order.html) ---------- */
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
          <div class="flex-1 overflow-y-auto p-5 pt-3">
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
                <div class="font-mono font-black text-sm text-emerald-600">Rp ${Math.round(Number(s.total_spent) || 0).toLocaleString('id-ID')}</div>
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
    const name = $('cs-name')?.value.trim();
    const phone = $('cs-phone')?.value.trim();
    const address = $('cs-address')?.value.trim();
    if (!name) return toast('Nama wajib diisi', 'error');

    try {
      await updateProfile({ name, phone, address });
      toast('Profil tersimpan', 'success');
      $('customer-profile-sheet')?.remove();
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
    $('auth-modal')?.classList.add('hidden');
  }

function switchAuthTab(tab) {
  // Highlight tab aktif
  document.querySelectorAll('[data-auth-tab]').forEach(t => {
    t.classList.toggle('active', t.dataset.authTab === tab);
  });
  // Hide/show panel pakai Tailwind 'hidden'
  ['login', 'register', 'guest'].forEach(name => {
    const panel = $('auth-panel-' + name);
    if (panel) panel.classList.toggle('hidden', name !== tab);
  });
}

  async function handleLogin() {
    const u = $('ca-login-username')?.value.trim();
    const p = $('ca-login-password')?.value;
    if (!u || !p) return toast('Isi username & password', 'error');

    const btn = $('ca-login-btn');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

    try {
      await login(u, p);
      closeAuthModal();
      renderHeaderUI();
      toast(`Selamat datang, ${state.session.name}!`, 'success');
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      toast(e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  async function handleRegister() {
    const u = $('ca-reg-username')?.value.trim();
    const p = $('ca-reg-password')?.value;
    const p2 = $('ca-reg-password2')?.value;
    const n = $('ca-reg-name')?.value.trim();
    const ph = $('ca-reg-phone')?.value.trim();

    if (!u || u.length < 3) return toast('Username minimal 3 karakter', 'error');
    if (!/^[a-z0-9_]+$/i.test(u)) return toast('Username hanya huruf, angka, underscore', 'error');
    if (!p || p.length < 6) return toast('Password minimal 6 karakter', 'error');
    if (p !== p2) return toast('Konfirmasi password tidak cocok', 'error');
    if (!n) return toast('Nama wajib diisi', 'error');

    const btn = $('ca-reg-btn');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = 'Mendaftar...'; }

    try {
      await register(u, p, n, ph, null);
      closeAuthModal();
      renderHeaderUI();
      toast(`Akun dibuat! Selamat datang, ${n}!`, 'success');
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      toast(e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  async function handleGuest() {
    const n = $('ca-guest-name')?.value.trim();
    if (!n) return toast('Nama wajib diisi', 'error');

    const btn = $('ca-guest-btn');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

    try {
      await guest(n, null, null);
      closeAuthModal();
      renderHeaderUI();
      toast('Lanjut sebagai tamu', 'success');
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      toast(e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  function handleLogout() {
    if (!confirm('Keluar dari akun?')) return;
    logout();
    toast('Logout berhasil');
    setTimeout(() => location.reload(), 400);
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

  /* ---------- INIT ---------- */
   function init(sellerId, supabaseClient) {
      state.sellerId = sellerId;
      state.sb = supabaseClient;
      state.session = loadSession();
      renderHeaderUI();

  // Hook ke proceedToCheckout untuk autofill
   if (typeof window.proceedToCheckout === 'function' && !window.proceedToCheckout._hooked) {
      const orig = window.proceedToCheckout;
      window.proceedToCheckout = function () {
         orig.apply(this, arguments);
         setTimeout(autofillCheckout, 60);
      };
      window.proceedToCheckout._hooked = true;
  }

   // ✅ AUTO-SHOW modal login kalau belum login
   if (!state.session) {
      setTimeout(() => openAuthModal('login'), 600);
   }
      
   window.CustomerAuth = {
      state,
      openAuthModal,
      closeAuthModal,
      switchAuthTab,
      handleLogin,
      handleRegister,
      handleGuest,
      handleLogout,
      saveProfileSheet,
      autofillCheckout,
      getSession: () => state.session,
      updateProfile,
   };
}

    // Hook ke proceedToCheckout untuk autofill
    if (typeof window.proceedToCheckout === 'function' && !window.proceedToCheckout._hooked) {
      const orig = window.proceedToCheckout;
      window.proceedToCheckout = function () {
        orig.apply(this, arguments);
        setTimeout(autofillCheckout, 60);
      };
      window.proceedToCheckout._hooked = true;
    }

    window.CustomerAuth = {
      state,
      openAuthModal,
      closeAuthModal,
      switchAuthTab,
      handleLogin,
      handleRegister,
      handleGuest,
      handleLogout,
      saveProfileSheet,
      autofillCheckout,
      getSession: () => state.session,
      updateProfile,
    };
  }

  window.KRCustomer = {
    init,
    getSession: () => state.session,
    updateProfile,
  };
})();
