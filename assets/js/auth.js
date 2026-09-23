/* ==========================================
   KasirKu — Auth Module
   Login Username + Password (PBKDF2 hash)
   ========================================== */
window.KR = window.KR || {};

KR.auth = (function () {
  'use strict';

  const AUTH_KEY = 'auth';
  const USERS_FILE = 'kasir-users.json';
  const PBKDF2_ITERATIONS = 100000;
  const SALT_LENGTH = 16;

  function getAuth() { return KR.store.get(AUTH_KEY, null); }
  function setAuth(data) { KR.store.set(AUTH_KEY, data); }
  function clearAuth() { KR.store.remove(AUTH_KEY); }

  function isLoggedIn() {
    const a = getAuth();
    return !!(a && a.loggedIn);
  }
  function isGitHubUser() { return KR.github.isConfigured(); }
  function getUser() { return getAuth(); }

  /* ---------- CRYPTO (PBKDF2) ---------- */
  function randomSalt() {
    const bytes = new Uint8Array(SALT_LENGTH);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return Array.from(new Uint8Array(bits)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function verifyPassword(password, salt, expectedHash) {
    const hash = await hashPassword(password, salt);
    if (hash.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) {
      diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return diff === 0;
  }

  /* ---------- USERS FILE ---------- */
  async function loadUsers() {
    try {
      const content = await KR.github.getFileContent(USERS_FILE);
      if (!content) return { users: [] };
      const data = JSON.parse(content);
      if (!data.users || !Array.isArray(data.users)) return { users: [] };
      return data;
    } catch (e) {
      console.warn('[Auth] loadUsers failed', e);
      return { users: [] };
    }
  }

  async function saveUsers(data) {
    await KR.github.uploadFile(USERS_FILE, JSON.stringify(data, null, 2), 'chore: update users');
  }

  /* ---------- UI ---------- */
  function showLoginScreen() {
    const el = document.getElementById('login-screen');
    if (el) el.classList.remove('hidden');
    updateUIBasedOnSetup();
    if (window.lucide) lucide.createIcons();
  }

  function hideLoginScreen() {
    const el = document.getElementById('login-screen');
    if (el) el.classList.add('hidden');
  }

  function updateUIBasedOnSetup() {
    const configured = KR.github.isConfigured();
    const stepSetup = document.getElementById('login-step-setup');
    const stepAuth = document.getElementById('login-step-auth');
    if (!stepSetup || !stepAuth) return;

    if (configured) {
      stepSetup.classList.add('hidden');
      stepAuth.classList.remove('hidden');

      const c = KR.store.getGitHubConfig();
      const info = document.getElementById('github-info');
      if (info && c) {
        info.innerHTML = '🔗 Terhubung: <strong>' + escapeHtml(c.owner) + '/' + escapeHtml(c.repo) + '</strong>';
      }
    } else {
      stepSetup.classList.remove('hidden');
      stepAuth.classList.add('hidden');

      const c = KR.store.getGitHubConfig();
      if (c) {
        const o = document.getElementById('setup-gh-owner');
        const r = document.getElementById('setup-gh-repo');
        const b = document.getElementById('setup-gh-branch');
        const t = document.getElementById('setup-gh-token');
        if (o) o.value = c.owner || '';
        if (r) r.value = c.repo || '';
        if (b) b.value = c.branch || 'main';
        if (t) t.value = c.token || '';
      }
    }
    if (window.lucide) lucide.createIcons();
  }

  function changeGithubSetup() {
    KR.store.clearGitHubConfig();
    updateUIBasedOnSetup();
  }

  function switchAuthTab(tab) {
    document.querySelectorAll('.login-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.authtab === tab);
    });
    document.querySelectorAll('.auth-panel').forEach(function (p) { p.classList.remove('active'); });
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

  function setSetupStatus(type, msg) {
    const el = document.getElementById('setup-status');
    if (!el) return;
    const icons = { ok: 'check-circle', warn: 'alert-triangle', error: 'x-circle' };
    el.className = 'gh-status ' + type;
    el.innerHTML = '<i data-lucide="' + (icons[type] || 'info') + '"></i><span>' + escapeHtml(msg) + '</span>';
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- SETUP GITHUB ---------- */
  async function submitSetup() {
    const ownerEl = document.getElementById('setup-gh-owner');
    const repoEl = document.getElementById('setup-gh-repo');
    const branchEl = document.getElementById('setup-gh-branch');
    const tokenEl = document.getElementById('setup-gh-token');
    if (!ownerEl || !repoEl || !tokenEl) return;

    const owner = ownerEl.value.trim();
    const repo = repoEl.value.trim();
    const branch = (branchEl && branchEl.value || 'main').trim() || 'main';
    const token = tokenEl.value.trim();

    if (!owner || !repo || !token) {
      setSetupStatus('error', 'Semua field wajib diisi');
      return;
    }

    setSetupStatus('warn', 'Menghubungkan ke GitHub...');
    KR.store.setGitHubConfig({ owner: owner, repo: repo, branch: branch, token: token });

    const r = await KR.github.testConnection();
    if (!r.ok) {
      setSetupStatus('error', r.msg);
      KR.store.clearGitHubConfig();
      return;
    }

    setSetupStatus('ok', 'Terhubung! Beralih ke login...');
    KR.toast.success('GitHub terhubung!');

    setTimeout(function () {
      updateUIBasedOnSetup();
      setTimeout(function () {
        const el = document.getElementById('login-username');
        if (el) el.focus();
      }, 200);
    }, 800);
  }

  function skipSetup() {
    KR.toast.info('Mode offline — data hanya di perangkat ini');
    setAuth({ loggedIn: true, username: 'lokal', role: 'admin', mode: 'local', loginAt: Date.now() });
    hideLoginScreen();
    updateBadge();
    refreshAllViews();
  }

  /* ---------- REGISTER ---------- */
  async function submitRegister() {
    if (!KR.github.isConfigured()) {
      KR.toast.error('Setup GitHub dulu');
      return;
    }
    const usernameEl = document.getElementById('reg-username');
    const passwordEl = document.getElementById('reg-password');
    const password2El = document.getElementById('reg-password2');
    if (!usernameEl || !passwordEl || !password2El) return;

    const username = usernameEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    const password2 = password2El.value;

    if (username.length < 3) return setStatus('register', 'error', 'Username minimal 3 karakter');
    if (!/^[a-z0-9_-]+$/.test(username)) return setStatus('register', 'error', 'Username hanya huruf kecil, angka, _ dan -');
    if (password.length < 6) return setStatus('register', 'error', 'Password minimal 6 karakter');
    if (password !== password2) return setStatus('register', 'error', 'Konfirmasi password tidak cocok');

    setStatus('register', 'warn', 'Membuat akun...');

    try {
      const usersData = await loadUsers();
      if (usersData.users.find(function (u) { return u.username === username; })) {
        return setStatus('register', 'error', 'Username sudah dipakai');
      }

      const salt = randomSalt();
      const passwordHash = await hashPassword(password, salt);

      usersData.users.push({
        username: username,
        salt: salt,
        passwordHash: passwordHash,
        role: usersData.users.length === 0 ? 'admin' : 'kasir',
        createdAt: Date.now(),
      });

      await saveUsers(usersData);

      setStatus('register', 'ok', 'Akun berhasil dibuat! Silakan masuk.');
      KR.toast.success('Akun ' + username + ' berhasil dibuat');

      usernameEl.value = '';
      passwordEl.value = '';
      password2El.value = '';
      setTimeout(function () {
        switchAuthTab('login');
        const loginUser = document.getElementById('login-username');
        if (loginUser) loginUser.value = username;
        const pwd = document.getElementById('login-password');
        if (pwd) pwd.focus();
      }, 1000);
    } catch (e) {
      console.error(e);
      setStatus('register', 'error', 'Gagal: ' + (e.message || 'Unknown'));
    }
  }

  /* ---------- LOGIN ---------- */
  async function submitLogin() {
    if (!KR.github.isConfigured()) {
      KR.toast.error('Setup GitHub dulu');
      return;
    }
    const usernameEl = document.getElementById('login-username');
    const passwordEl = document.getElementById('login-password');
    if (!usernameEl || !passwordEl) return;

    const username = usernameEl.value.trim().toLowerCase();
    const password = passwordEl.value;

    if (!username || !password) return setStatus('login', 'error', 'Isi username & password');

    setStatus('login', 'warn', 'Memverifikasi...');

    try {
      const usersData = await loadUsers();
      const user = usersData.users.find(function (u) { return u.username === username; });
      if (!user) return setStatus('login', 'error', 'Username tidak ditemukan');

      const ok = await verifyPassword(password, user.salt, user.passwordHash);
      if (!ok) return setStatus('login', 'error', 'Password salah');

      setAuth({
        loggedIn: true,
        username: user.username,
        role: user.role || 'kasir',
        mode: 'github',
        loginAt: Date.now(),
      });

      setStatus('login', 'ok', 'Berhasil masuk!');
      KR.toast.success('Selamat datang, ' + user.username + '!');

      try {
        const content = await KR.github.getFileContent('kasir-data.json');
        if (content) {
          const data = JSON.parse(content);
          if (data.products) KR.store.setProducts(data.products);
          if (data.transactions) KR.store.setTransactions(data.transactions);
          if (data.settings) KR.store.setSettings(data.settings);
        }
      } catch (e) {
        console.warn('[Auth] Pull data failed', e);
      }

      setTimeout(function () {
        hideLoginScreen();
        updateBadge();
        refreshAllViews();
      }, 500);
    } catch (e) {
      console.error(e);
      setStatus('login', 'error', 'Gagal: ' + (e.message || 'Unknown'));
    }
  }

  /* ---------- LOGOUT ---------- */
  function logout() {
    const a = getAuth();
    confirmDialog(
      'Logout?',
      'Anda akan keluar dari akun "' + (a && a.username || 'ini') + '". Data tetap tersimpan di GitHub.',
      function () {
        clearAuth();
        updateBadge();
        renderAccountCard();
        KR.toast.success('Logout berhasil');
        setTimeout(function () { location.reload(); }, 500);
      }
    );
  }

  /* ---------- BADGE ---------- */
  function updateBadge() {
    const a = getAuth();
    const btn = document.getElementById('user-badge-btn');
    const nameEl = document.getElementById('user-badge-name');
    if (!btn || !nameEl) return;
    if (a && a.loggedIn) {
      btn.style.display = 'inline-flex';
      nameEl.textContent = a.username || 'User';
    } else {
      btn.style.display = 'none';
    }
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- ACCOUNT CARD ---------- */
  function renderAccountCard() {
    const el = document.getElementById('account-info');
    if (!el) return;
    const a = getAuth();
    if (!a || !a.loggedIn) {
      el.innerHTML = '<p class="settings-desc">Belum login.</p>' +
        '<button class="btn btn-primary" onclick="KR.auth.showLoginScreen()">' +
        '<i data-lucide="log-in"></i> Login</button>';
    } else {
      const ghConfig = KR.store.getGitHubConfig();
      const initial = (a.username || '?')[0].toUpperCase();
      const roleLabel = a.mode === 'local' ? '👤 Lokal' : (a.role === 'admin' ? '👑 Admin' : '👤 Kasir');
      el.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-subtle);border-radius:12px;margin-bottom:12px;">' +
          '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:grid;place-items:center;color:#fff;flex-shrink:0;font-weight:900;font-size:1.15rem;">' +
            escapeHtml(initial) +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:800;line-height:1.2;">' + escapeHtml(a.username) + '</div>' +
            '<div style="font-size:.75rem;color:var(--text-3);margin-top:2px;">' +
              roleLabel +
              (ghConfig ? ' • ' + escapeHtml(ghConfig.owner) + '/' + escapeHtml(ghConfig.repo) : '') +
            '</div>' +
          '</div>' +
          '<span class="pa-chip primary">Online</span>' +
        '</div>' +
        '<div class="btn-row">' +
          '<button class="btn btn-secondary" onclick="pullFromGithub()">' +
            '<i data-lucide="cloud-download"></i> Sinkron' +
          '</button>' +
          '<button class="btn btn-danger" onclick="KR.auth.logout()">' +
            '<i data-lucide="log-out"></i> Logout' +
          '</button>' +
        '</div>';
    }
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- REFRESH ---------- */
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
    const a = getAuth();
    if (a && a.loggedIn) {
      hideLoginScreen();
      updateBadge();
    } else {
      showLoginScreen();
    }

    const setupToken = document.getElementById('setup-gh-token');
    if (setupToken) setupToken.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitSetup();
    });

    const loginPwd = document.getElementById('login-password');
    if (loginPwd) loginPwd.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitLogin();
    });

    const loginUser = document.getElementById('login-username');
    if (loginUser) loginUser.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const pwd = document.getElementById('login-password');
        if (pwd) pwd.focus();
      }
    });

    const regPwd2 = document.getElementById('reg-password2');
    if (regPwd2) regPwd2.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitRegister();
    });
  }

  return {
    init: init,
    getAuth: getAuth,
    isLoggedIn: isLoggedIn,
    isGitHubUser: isGitHubUser,
    getUser: getUser,
    showLoginScreen: showLoginScreen,
    hideLoginScreen: hideLoginScreen,
    updateUIBasedOnSetup: updateUIBasedOnSetup,
    changeGithubSetup: changeGithubSetup,
    switchAuthTab: switchAuthTab,
    submitSetup: submitSetup,
    submitRegister: submitRegister,
    submitLogin: submitLogin,
    skipSetup: skipSetup,
    logout: logout,
    updateBadge: updateBadge,
    renderAccountCard: renderAccountCard,
    refreshAllViews: refreshAllViews,
  };
})();
