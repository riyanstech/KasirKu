/* ==========================================
   KasirKu — Auth Module (Supabase)
   ========================================== */
window.KR = window.KR || {};

KR.auth = (function () {
  'use strict';

  function getUserCache() { return KR.store.get('authCache', null); }
  function setUserCache(data) { KR.store.set('authCache', data); }
  function clearUserCache() { KR.store.remove('authCache'); }

  function isLoggedIn() {
    const c = getUserCache();
    return !!(c && c.loggedIn);
  }
  function isGitHubUser() { return isLoggedIn(); }
  function getUser() { return getUserCache(); }

  function showLoginScreen() {
    const el = document.getElementById('login-screen');
    if (el) el.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }
  function hideLoginScreen() {
    const el = document.getElementById('login-screen');
    if (el) el.classList.add('hidden');
  }

  function switchAuthTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.authtab === tab);
    });
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('auth-panel-' + tab);
    if (panel) panel.classList.add('active');
    if (tab === 'login') setStatus('login', 'warn', 'Siap masuk');
    if (tab === 'register') setStatus('register', 'warn', 'Isi data di atas');
  }

  function setStatus(which, type, msg) {
    const id = which === 'login' ? 'login-status' : 'register-status';
    const el = document.getElementById(id);
    if (!el) return;
    const icons = { ok: 'check-circle', warn: 'alert-triangle', error: 'x-circle' };
    el.className = 'gh-status ' + type;
    el.innerHTML = '<i data-lucide="' + (icons[type] || 'info') + '"></i><span>' + escapeHtml(msg) + '</span>';
    if (window.lucide) lucide.createIcons();
  }

  function mapProductFromDb(p) {
    return {
      id: p.id, name: p.name, sku: p.sku || '',
      cost: Number(p.cost) || 0, price: Number(p.price) || 0,
      stock: Number(p.stock) || 0, category: p.category || '',
      image: p.image_url || '',
    };
  }
  function mapTrxFromDb(t) {
    return {
      id: t.trx_code || t.id, dbId: t.id,
      at: new Date(t.created_at).getTime(),
      items: t.items || [], subtotal: Number(t.subtotal) || 0,
      discount: Number(t.discount) || 0, total: Number(t.total) || 0,
      paid: Number(t.paid) || 0, change: Number(t.change_amount) || 0,
      method: t.method || 'Cash', itemCount: t.item_count || 0,
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

  async function submitRegister() {
    const emailEl = document.getElementById('reg-email');
    const passwordEl = document.getElementById('reg-password');
    const password2El = document.getElementById('reg-password2');
    if (!emailEl || !passwordEl || !password2El) return;

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    const password2 = password2El.value;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('register', 'error', 'Email tidak valid'); return;
    }
    if (password.length < 6) {
      setStatus('register', 'error', 'Password minimal 6 karakter'); return;
    }
    if (password !== password2) {
      setStatus('register', 'error', 'Konfirmasi password tidak cocok'); return;
    }

    setStatus('register', 'warn', 'Membuat akun...');
    try {
      const username = email.split('@')[0];
      await KR.sb.signUp(email, password, { username, store_name: 'Warung Saya' });
      setStatus('register', 'ok', 'Akun dibuat! Silakan login.');
      KR.toast.success('Akun berhasil dibuat!');
      emailEl.value = ''; passwordEl.value = ''; password2El.value = '';
      setTimeout(() => {
        switchAuthTab('login');
        const loginEmail = document.getElementById('login-email');
        if (loginEmail) loginEmail.value = email;
        document.getElementById('login-password')?.focus();
      }, 1000);
    } catch (e) {
      const msg = e.message || 'Unknown error';
      setStatus('register', 'error', msg.toLowerCase().includes('already') ? 'Email sudah terdaftar' : msg);
    }
  }

  async function submitLogin() {
    const emailEl = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    if (!email || !password) {
      setStatus('login', 'error', 'Isi email & password'); return;
    }

    setStatus('login', 'warn', 'Memverifikasi...');
    try {
      await KR.sb.signIn(email, password);
      const user = await KR.sb.getUser();
      const profile = await KR.sb.getProfile();

      setUserCache({
        loggedIn: true,
        userId: user.id,
        email: user.email,
        username: (profile && profile.username) || email.split('@')[0],
        role: (profile && profile.role) || 'admin',
        loginAt: Date.now(),
      });

      setStatus('login', 'ok', 'Berhasil masuk!');
      try { await pullDataFromCloud(); } catch (e) { console.warn('[Login] Pull data failed', e); }
      KR.toast.success('Selamat datang!');

      setTimeout(() => {
        hideLoginScreen();
        updateBadge();
        refreshAllViews();
      }, 500);
    } catch (e) {
      const msg = e.message || 'Unknown error';
      setStatus('login', 'error', msg.toLowerCase().includes('invalid') ? 'Email atau password salah' : msg);
    }
  }

  function logout() {
    const a = getUser();
    confirmDialog('Logout?', 'Anda akan keluar dari akun "' + (a && a.email ? a.email : 'ini') + '".', async () => {
      try { await KR.sb.signOut(); } catch (e) { console.warn(e); }
      clearUserCache();
      KR.toast.success('Logout berhasil');
      setTimeout(() => location.reload(), 500);
    });
  }

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

  function renderAccountCard() {
    const el = document.getElementById('account-info');
    if (!el) return;
    const a = getUser();
    if (!a || !a.loggedIn) {
      el.innerHTML = '<p class="settings-desc">Belum login.</p>' +
        '<button class="btn btn-primary" onclick="KR.auth.showLoginScreen()">' +
        '<i data-lucide="log-in"></i> Login</button>';
    } else {
      const initial = (a.username || a.email || '?')[0].toUpperCase();
      const roleLabel = a.role === 'admin' ? '👑 Admin' : '👤 Kasir';
      el.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-subtle);border-radius:12px;margin-bottom:12px;">' +
          '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:grid;place-items:center;color:#fff;flex-shrink:0;font-weight:900;font-size:1.15rem;">' +
            escapeHtml(initial) + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:800;line-height:1.2;">' + escapeHtml(a.username || a.email) + '</div>' +
            '<div style="font-size:.75rem;color:var(--text-3);margin-top:2px;">' +
              roleLabel + ' • ' + escapeHtml(a.email || '') + '</div>' +
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

  async function reloadFromCloud() {
    showLoading('Mengambil data...');
    try {
      await pullDataFromCloud();
      KR.toast.success('Data berhasil disinkronkan');
      refreshAllViews();
    } catch (e) {
      KR.toast.error('Gagal: ' + e.message);
    } finally {
      hideLoading();
    }
  }

  function refreshAllViews() {
    if (typeof renderPosGrid === 'function') renderPosGrid();
    if (typeof renderCart === 'function') renderCart();
    if (typeof renderCategoryChips === 'function') renderCategoryChips();
    if (typeof renderProductList === 'function') renderProductList();
    if (typeof renderTransactionList === 'function') renderTransactionList();
    if (typeof loadSettings === 'function') loadSettings();
  }

  /* ============ INIT — simple & bulletproof ============ */
  function init() {
    // STEP 1: Tampilkan UI dari cache dulu (instant)
    const cached = getUserCache();
    if (cached && cached.loggedIn) {
      hideLoginScreen();
      updateBadge();
      refreshAllViews();
    } else {
      showLoginScreen();
    }

    // STEP 2: Cek session di background (tanpa block UI)
    KR.sb.getSession()
      .then(function (session) {
        if (session && session.user) {
          // Session valid → update cache
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
          pullDataFromCloud().then(refreshAllViews).catch(function (e) {
            console.warn('[Auth] Pull failed', e);
          });
        }
        // ⚠️ Kalau session null → JANGAN clear cache, biarkan user pakai cache
      })
      .catch(function (e) {
        console.warn('[Auth] Session check failed', e);
        // Network error → tetap pakai cache
      });

    // Keyboard shortcuts
    var le = document.getElementById('login-email');
    var lp = document.getElementById('login-password');
    var rp2 = document.getElementById('reg-password2');
    if (le) le.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && lp) lp.focus();
    });
    if (lp) lp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitLogin();
    });
    if (rp2) rp2.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitRegister();
    });
  }

  return {
    init: init,
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
