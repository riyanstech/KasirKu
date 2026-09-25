/* ==========================================
   KasirKu — Auth Module (Supabase)
   Login pakai Email + Password
   Redirect-based (login.html ↔ index.html)
   ========================================== */
window.KR = window.KR || {};

KR.auth = (function () {
  'use strict';

  /* ---------- USER CACHE ---------- */
  function getUserCache() { return KR.store.get('authCache', null); }
  function setUserCache(data) { KR.store.set('authCache', data); }
  function clearUserCache() { KR.store.remove('authCache'); }

  function isLoggedIn() {
    const c = getUserCache();
    return !!(c && c.loggedIn);
  }
  function isGitHubUser() { return isLoggedIn(); }
  function getUser() { return getUserCache(); }

  /* ---------- UI (no-op, karena login screen sudah dipisah) ---------- */
  function showLoginScreen() {
    // Kalau tidak login → redirect
    if (location.pathname.indexOf('login.html') === -1) {
      location.href = '/login.html';
    }
  }
  function hideLoginScreen() {
    // No-op
  }

  function switchAuthTab(tab) {
    // No-op di halaman index
  }

  function setStatus(which, type, msg) {
    // No-op
  }

  /* ---------- MAPPERS (DB → local) ---------- */
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
    };
  }
  function mapTrxFromDb(t) {
    return {
      id: t.trx_code || t.id,
      dbId: t.id,
      at: new Date(t.created_at).getTime(),
      items: t.items || [],
      subtotal: Number(t.subtotal) || 0,
      discount: Number(t.discount) || 0,
      total: Number(t.total) || 0,
      paid: Number(t.paid) || 0,
      change: Number(t.change_amount) || 0,
      method: t.method || 'Cash',
      itemCount: t.item_count || 0,
    };
  }

  async function pullDataFromCloud() {
    const products = await KR.sb.fetchProducts();
    const transactions = await KR.sb.fetchTransactions();
    KR.store.setProducts(products.map(mapProductFromDb));
    KR.store.setTransactions(transactions.map(mapTrxFromDb));
    const profile = await KR.sb.getProfile();
    if (profile) {
      KR.store.setSettings({
        storeName: profile.store_name || 'KasirKu',
        storeAddress: profile.store_address || '',
        storePhone: profile.store_phone || '',
        receiptFooter: profile.receipt_footer || 'Terima kasih',
        theme: profile.theme || 'light',
      });
    }
  }

  /* ---------- REGISTER (kalau dipanggil dari index) ---------- */
  async function submitRegister() {
    // Karena login.html yang handle register, fungsi ini redirect saja
    location.href = '/login.html';
  }

  /* ---------- LOGIN (kalau dipanggil dari index) ---------- */
  async function submitLogin() {
    location.href = '/login.html';
  }

  /* ---------- LOGOUT ---------- */
  function logout() {
    const a = getUser();

    if (typeof confirmDialog === 'function') {
      confirmDialog(
        'Logout?',
        'Anda akan keluar dari akun "' + (a && a.email ? a.email : 'ini') + '".',
        async () => {
          try { await KR.sb.signOut(); } catch (e) { console.warn(e); }
          clearUserCache();
          try { KR.toast.success('Logout berhasil'); } catch (e) {}
          setTimeout(function () { location.href = '/login.html'; }, 400);
        }
      );
    } else {
      if (!confirm('Logout dari akun ini?')) return;
      (async () => {
        try { await KR.sb.signOut(); } catch (e) { console.warn(e); }
        clearUserCache();
        location.href = '/login.html';
      })();
    }
  }

  /* ---------- BADGE ---------- */
  function updateBadge() {
    const a = getUser();
    const btn = document.getElementById('user-badge-btn');
    const nameEl = document.getElementById('user-badge-name');
    if (!btn || !nameEl) return;
    if (a && a.loggedIn) {
      btn.style.display = 'inline-flex';
      nameEl.textContent = a.username || a.email || 'User';
    } else {
      btn.style.display = 'none';
    }
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- ACCOUNT CARD ---------- */
  function renderAccountCard() {
    const el = document.getElementById('account-info');
    if (!el) return;
    const a = getUser();

    if (!a || !a.loggedIn) {
      el.innerHTML =
        '<p class="settings-desc">Belum login.</p>' +
        '<button class="btn btn-primary" onclick="location.href=\'/login.html\'">' +
        '<i data-lucide="log-in"></i> Login</button>';
    } else {
      const initial = (a.username || a.email || '?')[0].toUpperCase();
      const roleLabel = a.role === 'admin' ? '👑 Admin' : '👤 Kasir';
      el.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-subtle);border-radius:12px;margin-bottom:12px;">' +
          '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:grid;place-items:center;color:#fff;flex-shrink:0;font-weight:900;font-size:1.15rem;">' +
            escapeHtml(initial) +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:800;line-height:1.2;">' + escapeHtml(a.username || a.email) + '</div>' +
            '<div style="font-size:.75rem;color:var(--text-3);margin-top:2px;">' +
              roleLabel + ' • ' + escapeHtml(a.email || '') +
            '</div>' +
          '</div>' +
          '<span class="pa-chip primary">Online</span>' +
        '</div>' +
        '<div class="btn-row">' +
          '<button class="btn btn-secondary" onclick="KR.auth.reloadFromCloud()">' +
            '<i data-lucide="cloud-download"></i> Sync dari Cloud</button>' +
          '<button class="btn btn-danger" onclick="KR.auth.logout()">' +
            '<i data-lucide="log-out"></i> Logout</button>' +
        '</div>';
    }
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- RELOAD FROM CLOUD ---------- */
  async function reloadFromCloud() {
    if (typeof showLoading === 'function') showLoading('Mengambil data...');
    try {
      await pullDataFromCloud();
      try { KR.toast.success('Data berhasil disinkronkan'); } catch (e) {}
      refreshAllViews();
    } catch (e) {
      console.error(e);
      try { KR.toast.error('Gagal: ' + e.message); } catch (err) {}
    } finally {
      if (typeof hideLoading === 'function') hideLoading();
    }
  }

  /* ---------- REFRESH ALL ---------- */
  function refreshAllViews() {
    if (typeof renderPosGrid === 'function') renderPosGrid();
    if (typeof renderCart === 'function') renderCart();
    if (typeof renderCategoryChips === 'function') renderCategoryChips();
    if (typeof renderProductList === 'function') renderProductList();
    if (typeof renderTransactionList === 'function') renderTransactionList();
    if (typeof loadSettings === 'function') loadSettings();
  }

  /* ---------- INIT ---------- */
  function init() {
    const cached = getUserCache();

    console.log('[Auth Init] Cache:', cached);
    console.log('[Auth Init] isLoggedIn:', !!(cached && cached.loggedIn));

    // STEP 1: Cek cache
    if (!cached || !cached.loggedIn) {
      console.log('[Auth Init] → Redirect to /login.html');
      location.href = '/login.html';
      return;
    }

    // STEP 2: User sudah login → tampilkan dashboard
    console.log('[Auth Init] → Show dashboard');
    updateBadge();
    refreshAllViews();

    // STEP 3: Validasi session di background (jangan block UI)
    KR.sb.getSession()
      .then(function (session) {
        if (!session || !session.user) {
          console.warn('[Auth Init] Session expired, redirect to login');
          clearUserCache();
          location.href = '/login.html';
          return;
        }

        console.log('[Auth Init] Session valid, user:', session.user.email);

        // Update cache dengan data terbaru
        const user = session.user;
        setUserCache({
          loggedIn: true,
          userId: user.id,
          email: user.email,
          username: (cached && cached.username) || user.email.split('@')[0],
          role: (cached && cached.role) || 'admin',
          loginAt: (cached && cached.loginAt) || Date.now(),
        });
        updateBadge();

        // Pull data cloud di background
        pullDataFromCloud()
          .then(refreshAllViews)
          .catch(function (e) { console.warn('[Auth] Pull failed', e); });
      })
      .catch(function (e) {
        // Network error → tetap pakai cache (JANGAN redirect)
        console.warn('[Auth Init] Session check failed (network?), using cache', e);
      });
  }

  /* ---------- EXPOSE ---------- */
  return {
    init,
    isLoggedIn: isLoggedIn,
    isGitHubUser: isGitHubUser,
    getUser: getUser,
    showLoginScreen: showLoginScreen,
    hideLoginScreen: hideLoginScreen,
    switchAuthTab: switchAuthTab,
    submitRegister: submitRegister,
    submitLogin: submitLogin,
    logout: logout,
    updateBadge: updateBadge,
    renderAccountCard: renderAccountCard,
    refreshAllViews: refreshAllViews,
    reloadFromCloud: reloadFromCloud,
  };
})();
