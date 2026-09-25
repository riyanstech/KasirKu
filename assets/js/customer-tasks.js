/* ==========================================
   KasirKu — Customer Tasks (Tugas Berhadiah)
   Dipakai di order.html
   ========================================== */
(function () {
  'use strict';

  const state = {
    sellerId: null,
    sb: null,
    tasks: [],
    social: [],
    filter: 'all', // all | available | pending | approved
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

  const PLATFORMS = {
    tiktok:    { name: 'TikTok',    icon: 'music-2',       color: '#000000', placeholder: '@username' },
    instagram: { name: 'Instagram', icon: 'instagram',     color: '#E1306C', placeholder: '@username' },
    youtube:   { name: 'YouTube',   icon: 'youtube',       color: '#FF0000', placeholder: '@channel' },
    facebook:  { name: 'Facebook',  icon: 'facebook',      color: '#1877F2', placeholder: 'username' },
    twitter:   { name: 'X / Twitter', icon: 'twitter',     color: '#000000', placeholder: '@username' },
  };

  function toast(msg, type) {
    if (window.__customerToast) return window.__customerToast(msg, type || 'info');
    console.log('[Task]', type, msg);
  }

  function parse(d) {
    if (typeof d === 'string') { try { return JSON.parse(d); } catch { return null; } }
    return d;
  }

  async function rpc(fn, params) {
    if (!state.sb) throw new Error('Koneksi belum siap');
    const { data, error } = await state.sb.rpc(fn, params);
    if (error) throw new Error(error.message || 'Server error');
    return data;
  }

  function getSession() {
    return window.KRCustomer?.getSession?.() || null;
  }

  /* ---------- MAIN SHEET ---------- */
  function openTasksSheet() {
    const s = getSession();
    if (!s) {
      if (window.CustomerAuth) window.CustomerAuth.openAuthModal('login');
      return;
    }
    const existing = $('tasks-sheet');
    if (existing) existing.remove();

    const sheet = document.createElement('div');
    sheet.id = 'tasks-sheet';
    sheet.className = 'fixed inset-0 z-50';
    sheet.innerHTML = `
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="document.getElementById('tasks-sheet').remove()"></div>
      <div class="relative h-full flex items-end sm:items-center justify-center sm:p-4">
        <div class="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[94dvh] flex flex-col shadow-2xl anim-up">

          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 grid place-items-center text-white shadow-lg shadow-amber-500/30">
                <i data-lucide="gift" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-base">Tugas Berhadiah</h3>
                <p class="text-[11px] text-slate-500">Follow akun & dapat saldo</p>
              </div>
            </div>
            <button onclick="document.getElementById('tasks-sheet').remove()" class="w-9 h-9 rounded-xl hover:bg-slate-100 grid place-items-center transition">
              <i data-lucide="x" class="w-5 h-5 text-slate-500"></i>
            </button>
          </div>

          <div class="px-5 pt-4 pb-2 flex-shrink-0" id="tasks-summary-wrap">
            <div class="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Saldo Kamu</div>
                  <div id="task-balance" class="font-mono font-black text-2xl text-amber-700 mt-1">Rp 0</div>
                  <div id="task-earned" class="text-[10px] text-amber-600 mt-0.5">Total earned: Rp 0</div>
                </div>
                <div class="text-right">
                  <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 mb-1">Progress</div>
                  <div id="task-progress" class="font-mono font-black text-sm text-amber-700">0/0</div>
                </div>
              </div>
            </div>
          </div>

          <div class="px-5 pb-2 flex-shrink-0">
            <div class="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
              <button data-ttab="tasks" onclick="CustomerTasks.switchTab('tasks')" class="tab-btn flex-1 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition active">Daftar Tugas</button>
              <button data-ttab="social" onclick="CustomerTasks.switchTab('social')" class="tab-btn flex-1 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition">Akun Sosmed</button>
              <button data-ttab="history" onclick="CustomerTasks.switchTab('history')" class="tab-btn flex-1 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition">Riwayat</button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-5 pb-5">
            <div id="tasks-tab-content" class="task-tab-panel">
              <div class="py-12 text-center">
                <div class="inline-block w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
                <p class="mt-4 text-sm font-bold text-slate-600">Memuat tugas...</p>
              </div>
            </div>
            <div id="social-tab-content" class="task-tab-panel hidden"></div>
            <div id="history-tab-content" class="task-tab-panel hidden"></div>
          </div>

        </div>
      </div>
    `;
    document.body.appendChild(sheet);
    if (window.lucide) lucide.createIcons();
    applyTabStyle('tasks');
    loadSummary();
    loadTasks();
  }

  function applyTabStyle(active) {
    document.querySelectorAll('#tasks-sheet .tab-btn').forEach(b => {
      const isActive = b.dataset.ttab === active;
      b.classList.toggle('active', isActive);
      b.style.background = isActive ? '#fff' : 'transparent';
      b.style.color = isActive ? '#d97706' : '#64748b';
      b.style.boxShadow = isActive ? '0 2px 6px -2px rgba(15,23,42,.1)' : 'none';
    });
  }

  function switchTab(tab) {
    ['tasks', 'social', 'history'].forEach(t => {
      const el = $(t + '-tab-content');
      if (el) el.classList.toggle('hidden', t !== tab);
    });
    applyTabStyle(tab);
    if (tab === 'tasks') loadTasks();
    if (tab === 'social') loadSocial();
    if (tab === 'history') loadHistory();
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- SUMMARY ---------- */
  async function loadSummary() {
    const s = getSession();
    if (!s) return;
    try {
      const data = await rpc('customer_rewards_summary', { p_customer_id: s.id });
      const sum = parse(data) || {};
      const balEl = $('task-balance');
      const earnedEl = $('task-earned');
      const progEl = $('task-progress');
      if (balEl) balEl.textContent = fmt(sum.balance || 0);
      if (earnedEl) earnedEl.textContent = 'Total earned: ' + fmt(sum.total_earned || 0);
      if (progEl) {
        const app = sum.approved_count || 0;
        const total = app + (sum.pending_count || 0);
        progEl.textContent = app + '/' + total;
      }
    } catch (e) {
      console.warn('[Summary]', e);
    }
  }

  /* ---------- TASKS TAB ---------- */
  async function loadTasks() {
    const s = getSession();
    if (!s) return;
    const content = $('tasks-tab-content');
    if (!content) return;

    content.innerHTML = '<div class="py-12 text-center"><div class="inline-block w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div><p class="mt-4 text-sm font-bold text-slate-600">Memuat tugas...</p></div>';

    try {
      const data = await rpc('customer_tasks_list', {
        p_seller_id: state.sellerId,
        p_customer_id: s.id,
      });
      state.tasks = (data || []).map(parse).filter(Boolean);
      renderTasks();
    } catch (e) {
      console.error('[LoadTasks]', e);
      content.innerHTML = errorBlock(e.message || 'Gagal memuat');
    }
  }

  function renderTasks() {
    const content = $('tasks-tab-content');
    if (!content) return;

    if (!state.tasks.length) {
      content.innerHTML = emptyBlock('package', 'Belum ada tugas', 'Tugas akan muncul di sini saat admin menambahkannya');
      if (window.lucide) lucide.createIcons();
      return;
    }

    const cards = state.tasks.map(t => renderTaskCard(t)).join('');
    content.innerHTML = '<div class="space-y-2.5">' + cards + '</div>';
    if (window.lucide) lucide.createIcons();
  }

  function renderTaskCard(t) {
    const plat = PLATFORMS[t.platform] || { name: t.platform, icon: 'globe', color: '#64748b' };
    const status = t.submission_status || 'new';

    const statusBadge = {
      'new':      { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Tersedia',    icon: 'sparkles' },
      'pending':  { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Menunggu Verif', icon: 'clock' },
      'approved': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Disetujui',  icon: 'check-circle' },
      'rejected': { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Ditolak',     icon: 'x-circle' },
    }[status];

    const progress = t.max_completions > 0
      ? t.current_completions + '/' + t.max_completions
      : t.current_completions + ' selesai';

    let actionBtn = '';
    if (status === 'new') {
      actionBtn = '<button onclick="CustomerTasks.openSubmitModal(\'' + t.id + '\')" class="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md">' +
        '<i data-lucide="upload" class="w-3.5 h-3.5 inline mr-1"></i> Kerjakan & Upload Bukti</button>';
    } else if (status === 'pending') {
      actionBtn = '<div class="mt-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center text-xs font-bold text-blue-700">' +
        '<i data-lucide="clock" class="w-3.5 h-3.5 inline mr-1"></i> Menunggu Verifikasi Admin</div>';
    } else if (status === 'approved') {
      actionBtn = '<div class="mt-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs font-bold text-emerald-700">' +
        '<i data-lucide="check-circle" class="w-3.5 h-3.5 inline mr-1"></i> Selesai • +' + fmt(t.reward_amount) + '</div>';
    } else if (status === 'rejected') {
      actionBtn = '<div class="mt-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">' +
        '<i data-lucide="alert-circle" class="w-3.5 h-3.5 inline mr-1"></i> Ditolak: ' + esc(t.rejection_reason || 'Bukti tidak valid') + '</div>';
    }

    return '<div class="p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-300 transition">' +
      '<div class="flex items-start justify-between gap-3 mb-3">' +
        '<div class="flex items-center gap-2.5 min-w-0">' +
          '<div style="width:36px;height:36px;border-radius:10px;background:' + plat.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
            '<i data-lucide="' + plat.icon + '" class="w-4 h-4"></i>' +
          '</div>' +
          '<div class="min-w-0">' +
            '<div class="font-extrabold text-sm text-slate-800 truncate">' + esc(t.title) + '</div>' +
            '<div class="text-[10px] text-slate-500 mt-0.5">' + plat.name + ' • ' + esc(t.target_username) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="text-right flex-shrink-0">' +
          '<div class="font-mono font-black text-base text-amber-600">' + fmt(t.reward_amount) + '</div>' +
          '<div class="text-[10px] text-slate-500 mt-0.5">' + progress + '</div>' +
        '</div>' +
      '</div>' +
      (t.description ? '<div class="text-xs text-slate-600 leading-relaxed mb-3 p-2.5 rounded-lg bg-slate-50">' + esc(t.description) + '</div>' : '') +
      '<div class="flex items-center justify-between gap-2">' +
        '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg ' + statusBadge.bg + ' ' + statusBadge.text + ' text-[10px] font-extrabold uppercase tracking-wide">' +
          '<i data-lucide="' + statusBadge.icon + '" class="w-3 h-3"></i>' + statusBadge.label +
        '</span>' +
        '<a href="' + esc(t.target_url) + '" target="_blank" rel="noopener" class="text-[11px] font-bold text-amber-600 hover:underline inline-flex items-center gap-1">' +
          'Buka ' + plat.name + ' <i data-lucide="external-link" class="w-3 h-3"></i>' +
        '</a>' +
      '</div>' +
      actionBtn +
    '</div>';
  }

  /* ---------- SUBMIT MODAL ---------- */
  function openSubmitModal(taskId) {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    const plat = PLATFORMS[t.platform] || { name: t.platform, icon: 'globe', color: '#64748b' };

    const existing = $('task-submit-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'task-submit-modal';
    modal.className = 'fixed inset-0 z-[60]';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onclick="CustomerTasks.closeSubmitModal()"></div>
      <div class="relative h-full flex items-end sm:items-center justify-center sm:p-4">
        <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[94dvh] flex flex-col shadow-2xl anim-up">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div style="width:36px;height:36px;border-radius:10px;background:${plat.color};color:#fff;display:grid;place-items:center;">
                <i data-lucide="${plat.icon}" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-sm">${esc(t.title)}</h3>
                <p class="text-[11px] text-slate-500">${plat.name} • ${esc(t.target_username)}</p>
              </div>
            </div>
            <button onclick="CustomerTasks.closeSubmitModal()" class="w-9 h-9 rounded-xl hover:bg-slate-100 grid place-items-center">
              <i data-lucide="x" class="w-5 h-5 text-slate-500"></i>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            <div class="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-4">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 mb-2">Langkah-langkah</div>
              <ol class="space-y-2 text-xs text-amber-900 leading-relaxed list-decimal list-inside">
                <li>Klik tombol <strong>"Buka ${plat.name}"</strong> di bawah</li>
                <li>Follow akun <strong>${esc(t.target_username)}</strong></li>
                <li>Screenshot profil target (harus kelihatan tombol "Following"/"Diikuti")</li>
                <li>Upload screenshot di form bawah</li>
                <li>Klik <strong>Kirim</strong> dan tunggu verifikasi admin</li>
              </ol>
              <a href="${esc(t.target_url)}" target="_blank" rel="noopener" class="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md">
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Buka ${plat.name}
              </a>
            </div>

            <div>
              <label class="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Bukti Screenshot <span class="text-red-500">*</span></label>
              <input id="task-proof-input" type="file" accept="image/*" class="hidden">
              <div id="task-proof-area"></div>
            </div>

            <div>
              <label class="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Catatan (opsional)</label>
              <textarea id="task-notes" rows="2" placeholder="Contoh: sudah follow dari akun @xxx" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm resize-none"></textarea>
            </div>
          </div>

          <div class="px-5 py-4 border-t border-slate-100 bg-slate-50/70 flex gap-2">
            <button onclick="CustomerTasks.closeSubmitModal()" class="flex-1 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-sm">Batal</button>
            <button id="task-submit-btn" onclick="CustomerTasks.submitTask('${t.id}')" class="flex-1 py-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-amber-500/30">
              <i data-lucide="send" class="w-4 h-4 inline mr-1"></i> Kirim
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    window.__taskProofData = null;
    renderProofArea();
    if (window.lucide) lucide.createIcons();
  }

  function closeSubmitModal() {
    const modal = $('task-submit-modal');
    if (modal) modal.remove();
    window.__taskProofData = null;
  }

  function renderProofArea() {
    const area = $('task-proof-area');
    if (!area) return;
    const data = window.__taskProofData;
    if (data) {
      area.innerHTML = '<div class="relative rounded-2xl overflow-hidden border-2 border-amber-200 bg-amber-50">' +
        '<img src="' + data + '" class="w-full max-h-56 object-contain bg-white">' +
        '<button onclick="CustomerTasks.removeProof()" class="absolute top-2 right-2 w-8 h-8 rounded-lg bg-slate-900/80 text-white grid place-items-center">' +
          '<i data-lucide="x" class="w-4 h-4"></i>' +
        '</button>' +
        '<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-extrabold px-3 py-2 flex items-center gap-2">' +
          '<i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Bukti siap dikirim' +
        '</div>' +
      '</div>';
    } else {
      area.innerHTML = '<button onclick="document.getElementById(\'task-proof-input\').click()" class="w-full py-7 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-amber-500 hover:bg-amber-50/30 hover:text-amber-600 transition-all flex flex-col items-center gap-2">' +
        '<div class="w-12 h-12 rounded-xl bg-white border-2 border-slate-200 grid place-items-center">' +
          '<i data-lucide="image-plus" class="w-6 h-6"></i>' +
        '</div>' +
        '<div class="text-center">' +
          '<div class="text-sm font-extrabold">Upload Screenshot</div>' +
          '<div class="text-[11px] mt-0.5">JPG / PNG, max 5MB</div>' +
        '</div>' +
      '</button>';
    }
    if (window.lucide) lucide.createIcons();
  }

  function removeProof() {
    window.__taskProofData = null;
    renderProofArea();
  }

  async function handleProofChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('File harus gambar', 'error');
    if (file.size > 5 * 1024 * 1024) return toast('File max 5MB', 'error');

    try {
      const dataUrl = await compressImage(file, 900, 0.82);
      window.__taskProofData = dataUrl;
      renderProofArea();
    } catch (err) {
      toast('Gagal proses gambar: ' + err.message, 'error');
    }
  }

  async function submitTask(taskId) {
    const s = getSession();
    if (!s) return toast('Silakan login dulu', 'error');
    if (!window.__taskProofData) return toast('Upload bukti dulu', 'error');

    const btn = $('task-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Mengunggah...'; }

    try {
      const proofUrl = await uploadTaskProof(window.__taskProofData, s.id);
      const notes = $('task-notes') ? $('task-notes').value.trim() : '';

      await rpc('customer_task_submit', {
        p_task_id: taskId,
        p_customer_id: s.id,
        p_proof_url: proofUrl,
        p_notes: notes || null,
      });

      toast('Tugas berhasil dikirim! Tunggu verifikasi admin.', 'success');
      closeSubmitModal();
      await loadSummary();
      await loadTasks();
      switchTab('tasks');
    } catch (e) {
      console.error('[SubmitTask]', e);
      toast('Gagal: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="send" class="w-4 h-4 inline mr-1"></i> Kirim'; if (window.lucide) lucide.createIcons(); }
    }
  }

  async function uploadTaskProof(base64, customerId) {
    const res = await fetch(base64);
    const blob = await res.blob();
    const filename = 'tasks/' + customerId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    const { error } = await state.sb.storage.from('payment-proofs').upload(filename, blob, {
      contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
    });
    if (error) throw error;
    const { data } = state.sb.storage.from('payment-proofs').getPublicUrl(filename);
    return data.publicUrl;
  }

  /* ---------- SOCIAL TAB ---------- */
  async function loadSocial() {
    const s = getSession();
    if (!s) return;
    const content = $('social-tab-content');
    if (!content) return;
    content.innerHTML = '<div class="py-12 text-center"><div class="inline-block w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div></div>';

    try {
      const data = await rpc('customer_social_list', { p_customer_id: s.id });
      state.social = (data || []).map(parse).filter(Boolean);
      renderSocial();
    } catch (e) {
      content.innerHTML = errorBlock(e.message);
    }
  }

  function renderSocial() {
    const content = $('social-tab-content');
    if (!content) return;

    const addBtn = '<button onclick="CustomerTasks.openSocialModal()" class="w-full mb-3 py-3 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 text-amber-700 font-extrabold text-sm hover:bg-amber-50 transition flex items-center justify-center gap-2">' +
      '<i data-lucide="plus" class="w-4 h-4"></i> Daftarkan Akun Sosmed Baru' +
    '</button>';

    if (!state.social.length) {
      content.innerHTML = addBtn + emptyBlock('share-2', 'Belum ada akun terdaftar', 'Daftarkan akun TikTok/IG/YouTube kamu untuk ikut tugas berhadiah');
      if (window.lucide) lucide.createIcons();
      return;
    }

    const cards = state.social.map(s => {
      const plat = PLATFORMS[s.platform] || { name: s.platform, icon: 'globe', color: '#64748b' };
      const statusMap = {
        pending:  { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Menunggu Verif', icon: 'clock' },
        verified: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Terverifikasi', icon: 'check-circle' },
        rejected: { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Ditolak', icon: 'x-circle' },
      }[s.status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: s.status, icon: 'circle' };

      return '<div class="p-3 rounded-2xl border-2 border-slate-200 bg-white mb-2.5 flex items-center gap-3">' +
        '<div style="width:40px;height:40px;border-radius:10px;background:' + plat.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
          '<i data-lucide="' + plat.icon + '" class="w-5 h-5"></i>' +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<div class="font-bold text-sm text-slate-800 truncate">' + esc(s.username) + '</div>' +
          '<div class="text-[10px] text-slate-500 mt-0.5">' + plat.name + '</div>' +
          '<span class="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg ' + statusMap.bg + ' ' + statusMap.text + ' text-[10px] font-extrabold uppercase tracking-wide">' +
            '<i data-lucide="' + statusMap.icon + '" class="w-3 h-3"></i>' + statusMap.label +
          '</span>' +
          (s.status === 'rejected' && s.rejection_reason ? '<div class="text-[10px] text-red-600 mt-1">' + esc(s.rejection_reason) + '</div>' : '') +
        '</div>' +
        (s.status !== 'verified' ? '<button onclick="CustomerTasks.deleteSocial(\'' + s.id + '\')" class="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 grid place-items-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' : '') +
      '</div>';
    }).join('');

    content.innerHTML = addBtn + cards;
    if (window.lucide) lucide.createIcons();
  }

  function openSocialModal() {
    const existing = $('social-modal');
    if (existing) existing.remove();

    const options = Object.entries(PLATFORMS).map(([id, p]) =>
      '<label class="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-amber-400 cursor-pointer transition social-opt">' +
        '<input type="radio" name="social-platform" value="' + id + '" class="hidden peer">' +
        '<div style="width:36px;height:36px;border-radius:10px;background:' + p.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
          '<i data-lucide="' + p.icon + '" class="w-4 h-4"></i>' +
        '</div>' +
        '<div class="flex-1"><div class="font-bold text-sm">' + p.name + '</div></div>' +
        '<i data-lucide="circle" class="w-5 h-5 text-slate-300 check-icon"></i>' +
      '</label>'
    ).join('');

    const modal = document.createElement('div');
    modal.id = 'social-modal';
    modal.className = 'fixed inset-0 z-[60]';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onclick="CustomerTasks.closeSocialModal()"></div>
      <div class="relative h-full flex items-end sm:items-center justify-center sm:p-4">
        <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[94dvh] flex flex-col shadow-2xl anim-up">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 class="font-extrabold text-sm">Daftarkan Akun Sosmed</h3>
            <button onclick="CustomerTasks.closeSocialModal()" class="w-9 h-9 rounded-xl hover:bg-slate-100 grid place-items-center">
              <i data-lucide="x" class="w-5 h-5 text-slate-500"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label class="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-2">Platform <span class="text-red-500">*</span></label>
              <div id="social-platform-list" class="space-y-2">${options}</div>
            </div>
            <div>
              <label class="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Username <span class="text-red-500">*</span></label>
              <input id="social-username" type="text" placeholder="@username" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-mono">
            </div>
            <div>
              <label class="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Link Profil (opsional)</label>
              <input id="social-profile-url" type="url" placeholder="https://tiktok.com/@username" class="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm">
            </div>
            <div>
              <label class="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Screenshot Profil <span class="text-red-500">*</span></label>
              <input id="social-proof-input" type="file" accept="image/*" class="hidden">
              <div id="social-proof-area"></div>
            </div>
          </div>
          <div class="px-5 py-4 border-t border-slate-100 bg-slate-50/70 flex gap-2">
            <button onclick="CustomerTasks.closeSocialModal()" class="flex-1 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-sm">Batal</button>
            <button id="social-submit-btn" onclick="CustomerTasks.submitSocial()" class="flex-1 py-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-amber-500/30">Daftarkan</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    window.__socialProofData = null;
    window.__socialPlatform = null;
    renderSocialProofArea();
    if (window.lucide) lucide.createIcons();

    // Listen untuk pilihan platform
    document.querySelectorAll('input[name="social-platform"]').forEach(input => {
      input.addEventListener('change', (e) => {
        window.__socialPlatform = e.target.value;
        document.querySelectorAll('#social-platform-list .social-opt').forEach(opt => {
          const sel = opt.querySelector('input').checked;
          opt.style.borderColor = sel ? '#f59e0b' : '#e2e8f0';
          opt.style.background = sel ? '#fffbeb' : '#fff';
          const icon = opt.querySelector('.check-icon');
          if (icon) icon.setAttribute('data-lucide', sel ? 'check-circle' : 'circle');
        });
        if (window.lucide) lucide.createIcons();
      });
    });

    $('social-proof-input').addEventListener('change', handleSocialProofChange);
  }

  function closeSocialModal() {
    const modal = $('social-modal');
    if (modal) modal.remove();
    window.__socialProofData = null;
    window.__socialPlatform = null;
  }

  function renderSocialProofArea() {
    const area = $('social-proof-area');
    if (!area) return;
    const data = window.__socialProofData;
    if (data) {
      area.innerHTML = '<div class="relative rounded-2xl overflow-hidden border-2 border-amber-200">' +
        '<img src="' + data + '" class="w-full max-h-56 object-contain bg-white">' +
        '<button onclick="CustomerTasks.removeSocialProof()" class="absolute top-2 right-2 w-8 h-8 rounded-lg bg-slate-900/80 text-white grid place-items-center">' +
          '<i data-lucide="x" class="w-4 h-4"></i>' +
        '</button>' +
      '</div>';
    } else {
      area.innerHTML = '<button onclick="document.getElementById(\'social-proof-input\').click()" class="w-full py-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-amber-500 hover:bg-amber-50/30 hover:text-amber-600 transition flex flex-col items-center gap-2">' +
        '<i data-lucide="image-plus" class="w-6 h-6"></i>' +
        '<div class="text-sm font-extrabold">Upload Screenshot Profil</div>' +
        '<div class="text-[11px]">Screenshot yang menunjukkan username kamu</div>' +
      '</button>';
    }
    if (window.lucide) lucide.createIcons();
  }

  function removeSocialProof() {
    window.__socialProofData = null;
    renderSocialProofArea();
  }

  async function handleSocialProofChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('File harus gambar', 'error');
    if (file.size > 5 * 1024 * 1024) return toast('File max 5MB', 'error');
    try {
      const dataUrl = await compressImage(file, 900, 0.82);
      window.__socialProofData = dataUrl;
      renderSocialProofArea();
    } catch (err) {
      toast('Gagal proses gambar', 'error');
    }
  }

  async function submitSocial() {
    const s = getSession();
    if (!s) return toast('Silakan login dulu', 'error');
    if (!window.__socialPlatform) return toast('Pilih platform dulu', 'error');
    const username = $('social-username')?.value.trim().replace(/^@/, '');
    if (!username || username.length < 2) return toast('Username wajib diisi', 'error');
    if (!window.__socialProofData) return toast('Upload screenshot dulu', 'error');

    const profileUrl = $('social-profile-url')?.value.trim() || null;
    const btn = $('social-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }

    try {
      const proofUrl = await uploadTaskProof(window.__socialProofData, s.id);
      await rpc('customer_social_register', {
        p_customer_id: s.id,
        p_seller_id: state.sellerId,
        p_platform: window.__socialPlatform,
        p_username: username,
        p_profile_url: profileUrl,
        p_proof_url: proofUrl,
        p_follower_count: null,
      });
      toast('Akun berhasil didaftarkan! Tunggu verifikasi admin.', 'success');
      closeSocialModal();
      await loadSummary();
      await loadSocial();
    } catch (e) {
      console.error('[Social]', e);
      toast('Gagal: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Daftarkan'; }
    }
  }

  function deleteSocial(id) {
    if (!confirm('Hapus akun ini dari daftar?')) return;
    const s = getSession();
    if (!s) return;
    rpc('customer_social_delete', { p_id: id, p_customer_id: s.id })
      .then(() => {
        toast('Akun dihapus', 'success');
        loadSummary();
        loadSocial();
      })
      .catch(e => toast('Gagal: ' + e.message, 'error'));
  }

  /* ---------- HISTORY TAB ---------- */
  async function loadHistory() {
    const s = getSession();
    if (!s) return;
    const content = $('history-tab-content');
    if (!content) return;
    content.innerHTML = '<div class="py-12 text-center"><div class="inline-block w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div></div>';

    try {
      const data = await rpc('customer_task_history', { p_customer_id: s.id });
      const rows = (data || []).map(parse).filter(Boolean);

      if (!rows.length) {
        content.innerHTML = emptyBlock('history', 'Belum ada riwayat', 'Riwayat tugas kamu akan muncul di sini');
        if (window.lucide) lucide.createIcons();
        return;
      }

      const cards = rows.map(r => {
        const plat = PLATFORMS[r.platform] || { name: r.platform, icon: 'globe', color: '#64748b' };
        const statusMap = {
          pending:  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Menunggu', icon: 'clock' },
          approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Disetujui', icon: 'check-circle' },
          rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Ditolak', icon: 'x-circle' },
        }[r.status] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: r.status, icon: 'circle' };

        return '<div class="p-3 rounded-xl border ' + statusMap.border + ' ' + statusMap.bg + ' mb-2">' +
          '<div class="flex items-start justify-between gap-2">' +
            '<div class="flex-1 min-w-0">' +
              '<div class="font-bold text-xs text-slate-800 truncate">' + esc(r.title) + '</div>' +
              '<div class="text-[10px] text-slate-500 mt-0.5">' + plat.name + ' • ' + esc(r.target_username) + '</div>' +
              '<div class="text-[10px] text-slate-400 mt-1">' + new Date(r.created_at).toLocaleString('id-ID') + '</div>' +
              (r.rejection_reason ? '<div class="text-[10px] text-red-600 mt-1">Alasan: ' + esc(r.rejection_reason) + '</div>' : '') +
            '</div>' +
            '<div class="text-right flex-shrink-0">' +
              '<div class="font-mono font-black text-sm ' + statusMap.text + '">+' + fmt(r.reward_amount) + '</div>' +
              '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded ' + statusMap.bg + ' ' + statusMap.text + ' text-[9px] font-extrabold uppercase">' +
                '<i data-lucide="' + statusMap.icon + '" class="w-2.5 h-2.5"></i>' + statusMap.label +
              '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      content.innerHTML = '<div class="space-y-1">' + cards + '</div>';
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      content.innerHTML = errorBlock(e.message);
    }
  }

  /* ---------- HELPERS ---------- */
  function emptyBlock(icon, title, sub) {
    return '<div class="py-12 text-center">' +
      '<div class="w-16 h-16 mx-auto rounded-2xl bg-slate-100 grid place-items-center mb-3">' +
        '<i data-lucide="' + icon + '" class="w-8 h-8 text-slate-400"></i>' +
      '</div>' +
      '<div class="font-extrabold text-slate-800 mb-1">' + title + '</div>' +
      '<div class="text-xs text-slate-500 max-w-xs mx-auto">' + sub + '</div>' +
    '</div>';
  }

  function errorBlock(msg) {
    return '<div class="py-12 text-center">' +
      '<div class="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-500 grid place-items-center mb-3">' +
        '<i data-lucide="alert-circle" class="w-8 h-8"></i>' +
      '</div>' +
      '<div class="font-extrabold text-slate-800 mb-1">Gagal</div>' +
      '<p class="text-xs text-slate-500">' + esc(msg || 'Unknown') + '</p>' +
    '</div>';
  }

  /* ---------- INIT ---------- */
  function init(sellerId, sb) {
    state.sellerId = sellerId;
    state.sb = sb;
    window.CustomerTasks = {
      openTasksSheet: openTasksSheet,
      switchTab: switchTab,
      openSubmitModal: openSubmitModal,
      closeSubmitModal: closeSubmitModal,
      removeProof: removeProof,
      submitTask: submitTask,
      openSocialModal: openSocialModal,
      closeSocialModal: closeSocialModal,
      removeSocialProof: removeSocialProof,
      submitSocial: submitSocial,
      deleteSocial: deleteSocial,
      refresh: () => { loadSummary(); loadTasks(); },
    };
  }

  window.KRCustomerTasks = { init: init };
})();
