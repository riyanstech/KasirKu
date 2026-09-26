/* ==========================================
   KasirKu — Seller Tasks Admin Module
   Kelola tugas, verifikasi akun sosmed & bukti, withdrawal
   ========================================== */
window.KR = window.KR || {};

(function () {
  'use strict';

  let tasks = [];
  let socials = [];
  let submissions = [];
  let withdrawals = [];
  let mainTab = 'tasks';
  let taskFilter = 'all';
  let socialFilter = 'pending';
  let submissionFilter = 'pending';
  let withdrawalFilter = 'pending';

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const parse = (d) => { if (typeof d === 'string') { try { return JSON.parse(d); } catch { return null; } } return d; };

  const PLATFORMS = {
    tiktok:    { name: 'TikTok',      icon: 'music-2',        color: '#000000', placeholder: '@username' },
    instagram: { name: 'Instagram',   icon: 'camera',         color: '#E1306C', placeholder: '@username' },
    youtube:   { name: 'YouTube',     icon: 'play-circle',    color: '#FF0000', placeholder: '@channel' },
    facebook:  { name: 'Facebook',    icon: 'thumbs-up',      color: '#1877F2', placeholder: 'username' },
    twitter:   { name: 'X / Twitter', icon: 'message-circle', color: '#000000', placeholder: '@username' },
  };

   /* ---------- FILTER TABS HELPER (fix: warna tidak muncul karena primary-* tidak ada di Tailwind) ---------- */
   function _buildFilterTabs(fnName, currentFilter, options) {
     const labels = {
       pending:   'Pending',
       verified:  'Verified',
       approved:  'Approved',
       rejected:  'Rejected',
       done:      'Selesai',
       cancelled: 'Dibatalkan',
       all:       'Semua',
     };
     return '<div class="flex gap-2 mb-3 overflow-x-auto no-scrollbar">' +
       options.map(s => {
         const isActive = currentFilter === s;
         const bg = isActive
           ? 'linear-gradient(135deg, #10b981, #059669)'
           : '#f1f5f9';
         const color = isActive ? '#ffffff' : '#475569';
         const shadow = isActive ? 'box-shadow:0 4px 12px -4px rgba(16,185,129,.5);' : '';
         const label = labels[s] || (s.charAt(0).toUpperCase() + s.slice(1));
         return '<button onclick="' + fnName + '(\'' + s + '\')" ' +
           'style="padding:8px 14px;border-radius:12px;font-size:.75rem;font-weight:800;' +
           'white-space:nowrap;background:' + bg + ';color:' + color + ';border:none;' +
           'cursor:pointer;font-family:inherit;transition:all .2s;' + shadow + '">' +
           label + '</button>';
       }).join('') +
     '</div>';
   }

   /* ---------- PROOF THUMB HELPER (fix: layout gambar meluber) ---------- */
function _buildProofThumb(url) {
  return '<div style="' +
    'margin-top:8px;' +
    'padding:10px;' +
    'background:#f8fafc;' +
    'border:1.5px solid #e2e8f0;' +
    'border-radius:12px;' +
    'display:flex;' +
    'justify-content:center;' +
    'align-items:center;' +
    'overflow:hidden;' +
  '">' +
    '<img src="' + esc(url) + '" ' +
      'onclick="viewSocialProof(\'' + esc(url) + '\')" ' +
      'style="' +
        'max-width:100%;' +
        'max-height:320px;' +
        'width:auto;' +
        'height:auto;' +
        'object-fit:contain;' +
        'border-radius:8px;' +
        'cursor:zoom-in;' +
        'background:#fff;' +
        'display:block;' +
      '" ' +
      'alt="Bukti" ' +
    '/>' +
  '</div>';
}

  async function rpc(fn, params) {
    const { data, error } = await KR.sb.client.rpc(fn, params);
    if (error) throw new Error(error.message || 'Server error');
    return data;
  }

  async function getUid() {
    const u = await KR.sb.getUser();
    return u.id;
  }

  /* ---------- PROOF VIEWER ---------- */
  window.viewSocialProof = function (url) {
    if (!url) return KR.toast.error('Bukti tidak tersedia');

    const existing = document.getElementById('proof-viewer-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'proof-viewer-modal';
    modal.className = 'modal active';
    modal.style.zIndex = '9999';
    modal.innerHTML =
      '<div class="modal-backdrop" onclick="closeProofViewer()"></div>' +
      '<div style="position:relative;z-index:1;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;gap:12px;">' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;">' +
          '<button onclick="closeProofViewer()" class="btn btn-secondary btn-sm" style="background:rgba(255,255,255,.95);color:#0f172a;">' +
            '<i data-lucide="x"></i> Tutup' +
          '</button>' +
          '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="btn btn-primary btn-sm">' +
            '<i data-lucide="external-link"></i> Buka di Tab Baru' +
          '</a>' +
          '<a href="' + esc(url) + '" download class="btn btn-secondary btn-sm" style="background:rgba(255,255,255,.95);color:#0f172a;">' +
            '<i data-lucide="download"></i> Download' +
          '</a>' +
        '</div>' +
        '<img src="' + esc(url) + '" ' +
          'style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#fff;" ' +
          'onerror="this.style.display=&quot;none&quot;; this.nextElementSibling.style.display=&quot;block&quot;;">' +
        '<div style="display:none;padding:40px;background:#fff;border-radius:12px;text-align:center;color:#991b1b;max-width:400px;">' +
          '⚠ Gambar gagal dimuat. Coba buka di tab baru atau download.' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeProofViewer();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  };

  window.closeProofViewer = function () {
    const modal = document.getElementById('proof-viewer-modal');
    if (modal) modal.remove();
  };

  /* ---------- TASKS ---------- */
  async function loadTasks() {
    try {
      const uid = await getUid();
      const { data, error } = await KR.sb.client
        .from('reward_tasks')
        .select('*')
        .eq('seller_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      tasks = data || [];
      renderTasks();
    } catch (e) { console.error(e); KR.toast.error('Gagal memuat tugas'); }
  }

  function renderTasks() {
    const el = $('tasks-list');
    const countEl = $('tasks-count-label');
    const statsEl = $('tasks-stats');
    if (!el) return;

    if (countEl) countEl.textContent = tasks.length + ' tugas';

    const active = tasks.filter(t => t.is_active).length;
    const inactive = tasks.filter(t => !t.is_active).length;
    const totalSubs = tasks.reduce((s, t) => s + (t.current_completions || 0), 0);

    if (statsEl) {
      statsEl.innerHTML =
        '<div class="order-stat clickable ' + (taskFilter === 'all' ? 'active' : '') + '" onclick="setTaskFilter(\'all\')">' +
          '<div class="order-stat-label">Total</div><div class="order-stat-value">' + tasks.length + '</div></div>' +
        '<div class="order-stat clickable ' + (taskFilter === 'active' ? 'active' : '') + '" onclick="setTaskFilter(\'active\')">' +
          '<div class="order-stat-label">Aktif</div><div class="order-stat-value done">' + active + '</div></div>' +
        '<div class="order-stat clickable ' + (taskFilter === 'inactive' ? 'active' : '') + '" onclick="setTaskFilter(\'inactive\')">' +
          '<div class="order-stat-label">Nonaktif</div><div class="order-stat-value pending">' + inactive + '</div></div>' +
        '<div class="order-stat">' +
          '<div class="order-stat-label">Dikerjakan</div><div class="order-stat-value verified">' + totalSubs + '</div></div>';
    }

    let filtered = tasks;
    if (taskFilter === 'active') filtered = tasks.filter(t => t.is_active);
    if (taskFilter === 'inactive') filtered = tasks.filter(t => !t.is_active);

    if (!filtered.length) {
      el.innerHTML = '<div class="empty-state"><i data-lucide="gift"></i><h3>Belum ada tugas</h3><p>Klik "Buat Tugas" untuk memulai</p></div>';
      if (window.lucide) lucide.createIcons();
      return;
    }

    el.innerHTML = filtered.map(t => {
      const plat = PLATFORMS[t.platform] || { name: t.platform, icon: 'globe', color: '#64748b' };
      const progress = t.max_completions > 0
        ? t.current_completions + '/' + t.max_completions + ' slot'
        : t.current_completions + ' selesai';

      return '<div class="customer-card">' +
        '<div style="width:52px;height:52px;border-radius:14px;background:' + plat.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
          '<i data-lucide="' + plat.icon + '" class="w-6 h-6"></i>' +
        '</div>' +
        '<div class="customer-body">' +
          '<div class="customer-name">' + esc(t.title) +
            '<span class="customer-badge ' + (t.is_active ? 'member' : 'guest') + '">' + (t.is_active ? 'Aktif' : 'Nonaktif') + '</span>' +
          '</div>' +
          '<div class="customer-username">' + plat.name + ' • ' + esc(t.target_username) + '</div>' +
          '<div class="customer-stats">' +
            '<div><strong>' + fmt(t.reward_amount) + '</strong> / tugas</div>' +
            '<div>' + progress + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="customer-actions">' +
          '<button class="icon-btn" onclick="toggleTask(\'' + t.id + '\', ' + !t.is_active + ')" title="' + (t.is_active ? 'Nonaktifkan' : 'Aktifkan') + '">' +
            '<i data-lucide="' + (t.is_active ? 'eye-off' : 'eye') + '"></i></button>' +
          '<button class="icon-btn-danger" onclick="deleteTask(\'' + t.id + '\')" title="Hapus">' +
            '<i data-lucide="trash-2"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');
    if (window.lucide) lucide.createIcons();
  }

  window.setTaskFilter = (f) => { taskFilter = f; renderTasks(); };

  /* ---------- CREATE TASK ---------- */
  window.openCreateTaskModal = function () {
    const existing = $('create-task-modal');
    if (existing) existing.remove();

    const options = Object.entries(PLATFORMS).map(([id, p]) =>
      '<label class="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 cursor-pointer transition task-plat-opt" style="transition:all .2s;" onmouseover="this.style.borderColor=\'#10b981\'" onmouseout="this.style.borderColor=this.querySelector(\'input\').checked?\'#10b981\':\'#e2e8f0\'">' +
        '<input type="radio" name="task-platform" value="' + id + '" class="hidden">' +
        '<div style="width:36px;height:36px;border-radius:10px;background:' + p.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
          '<i data-lucide="' + p.icon + '" class="w-4 h-4"></i>' +
        '</div>' +
        '<div class="flex-1"><div class="font-bold text-sm">' + p.name + '</div></div>' +
        '<i data-lucide="circle" class="w-5 h-5 text-slate-300"></i>' +
      '</label>'
    ).join('');

    const modal = document.createElement('div');
    modal.id = 'create-task-modal';
    modal.className = 'modal active';
    modal.innerHTML =
      '<div class="modal-backdrop" onclick="this.parentNode.remove()"></div>' +
      '<div class="modal-card modal-card-md">' +
        '<div class="modal-head"><h3><i data-lucide="plus-circle"></i> Buat Tugas Baru</h3>' +
          '<button class="icon-btn" onclick="this.closest(\'.modal\').remove()"><i data-lucide="x"></i></button></div>' +
        '<div class="modal-body">' +
          '<div class="field"><label>Judul Tugas <span class="req">*</span></label>' +
            '<input id="ct-title" class="input" placeholder="Contoh: Follow TikTok @tokosaya"></div>' +
          '<div class="field"><label>Deskripsi</label>' +
            '<textarea id="ct-desc" class="textarea" rows="2" placeholder="Instruksi tambahan (opsional)"></textarea></div>' +
          '<div class="field"><label>Platform <span class="req">*</span></label>' +
            '<div id="ct-platform-list" class="space-y-2">' + options + '</div></div>' +
          '<div class="field"><label>Username Target <span class="req">*</span></label>' +
            '<input id="ct-username" class="input" placeholder="@tokosaya"></div>' +
          '<div class="field"><label>Link Target <span class="req">*</span></label>' +
            '<input id="ct-url" class="input" placeholder="https://tiktok.com/@tokosaya"></div>' +
          '<div class="field-grid">' +
            '<div class="field"><label>Reward (Rp) <span class="req">*</span></label>' +
              '<input id="ct-reward" type="number" class="input" value="50" min="1"></div>' +
            '<div class="field"><label>Kuota (0 = unlimited)</label>' +
              '<input id="ct-max" type="number" class="input" value="0" min="0"></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn btn-ghost" onclick="this.closest(\'.modal\').remove()">Batal</button>' +
          '<button class="btn btn-primary" onclick="submitCreateTask()"><i data-lucide="check"></i> Buat</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    window.__newTaskPlatform = null;
    modal.querySelectorAll('input[name="task-platform"]').forEach(inp => {
      inp.addEventListener('change', (e) => {
        window.__newTaskPlatform = e.target.value;
        modal.querySelectorAll('.task-plat-opt').forEach(opt => {
          const sel = opt.querySelector('input').checked;
          opt.style.borderColor = sel ? '#10b981' : '#e2e8f0';
          opt.style.background = sel ? '#ecfdf5' : '#fff';
          const icon = opt.querySelector('.w-5.h-5');
          if (icon) icon.setAttribute('data-lucide', sel ? 'check-circle' : 'circle');
        });
        if (window.lucide) lucide.createIcons();
      });
    });
  };

  window.submitCreateTask = async function () {
    const title = $('ct-title')?.value.trim();
    const desc = $('ct-desc')?.value.trim();
    const username = $('ct-username')?.value.trim();
    const url = $('ct-url')?.value.trim();
    const reward = Number($('ct-reward')?.value) || 50;
    const max = Number($('ct-max')?.value) || 0;

    if (!title) return KR.toast.error('Judul wajib');
    if (!window.__newTaskPlatform) return KR.toast.error('Pilih platform');
    if (!username) return KR.toast.error('Username target wajib');
    if (!url) return KR.toast.error('Link target wajib');

    showLoading('Membuat tugas...');
    try {
      const uid = await getUid();
      await rpc('seller_task_create', {
        p_seller_id: uid,
        p_title: title,
        p_description: desc || null,
        p_platform: window.__newTaskPlatform,
        p_target_username: username,
        p_target_url: url,
        p_reward_amount: reward,
        p_max_completions: max,
        p_expires_at: null,
      });
      KR.toast.success('Tugas dibuat');
      $('create-task-modal')?.remove();
      await loadTasks();
    } catch (e) {
      KR.toast.error('Gagal: ' + e.message);
    } finally { hideLoading(); }
  };

  window.toggleTask = async function (id, activate) {
    showLoading('Memperbarui...');
    try {
      const uid = await getUid();
      await rpc('seller_task_toggle', {
        p_task_id: id,
        p_seller_id: uid,
        p_is_active: activate,
      });
      KR.toast.success(activate ? 'Tugas diaktifkan' : 'Tugas dinonaktifkan');
      await loadTasks();
    } catch (e) { KR.toast.error('Gagal: ' + e.message); }
    finally { hideLoading(); }
  };

  window.deleteTask = function (id) {
    confirmDialog('Hapus Tugas?', 'Semua bukti submission untuk tugas ini juga akan terhapus.', async () => {
      showLoading('Menghapus...');
      try {
        const uid = await getUid();
        await rpc('seller_task_delete', { p_task_id: id, p_seller_id: uid });
        KR.toast.success('Tugas dihapus');
        await loadTasks();
      } catch (e) { KR.toast.error('Gagal: ' + e.message); }
      finally { hideLoading(); }
    });
  };

  /* ---------- SOCIALS ---------- */
  async function loadSocials() {
    try {
      const uid = await getUid();
      const data = await rpc('seller_social_list', {
        p_seller_id: uid,
        p_status: socialFilter,
      });
      socials = (data || []).map(parse).filter(Boolean);
      renderSocials();
    } catch (e) { console.error(e); KR.toast.error('Gagal memuat akun sosmed'); }
  }

  function renderSocials() {
    const el = $('tasks-list');
    const countEl = $('tasks-count-label');
    if (!el) return;

    if (countEl) countEl.textContent = socials.length + ' akun';

     const tabs = _buildFilterTabs('setSocialFilter', socialFilter, ['pending', 'verified', 'rejected', 'all']);

    if (!socials.length) {
      el.innerHTML = tabs + '<div class="empty-state"><i data-lucide="share-2"></i><h3>Tidak ada akun</h3></div>';
      if (window.lucide) lucide.createIcons();
      return;
    }

    el.innerHTML = tabs + '<div class="space-y-3">' + socials.map(s => {
      const plat = PLATFORMS[s.platform] || { name: s.platform, icon: 'globe', color: '#64748b' };
      const statusBadge = {
        pending:  '<span class="customer-badge" style="background:#fef3c7;color:#92400e;">Pending</span>',
        verified: '<span class="customer-badge" style="background:#d1fae5;color:#065f46;">Verified</span>',
        rejected: '<span class="customer-badge" style="background:#fee2e2;color:#991b1b;">Rejected</span>',
      }[s.status] || '';

       const proofThumb = s.proof_url
        ? _buildProofThumb(s.proof_url)
        : '<div style="margin-top:8px;padding:12px;background:#fee2e2;border-radius:8px;font-size:.75rem;color:#991b1b;">⚠ Bukti tidak ada</div>';

      const actions = s.status === 'pending'
        ? '<button class="btn btn-primary btn-sm" onclick="verifySocial(\'' + s.id + '\', true)"><i data-lucide="check"></i> Setujui</button>' +
          '<button class="btn btn-danger btn-sm" onclick="verifySocial(\'' + s.id + '\', false)"><i data-lucide="x"></i> Tolak</button>'
        : '<button class="btn btn-secondary btn-sm" onclick="viewSocialProof(\'' + esc(s.proof_url) + '\')"><i data-lucide="image"></i> Lihat Besar</button>';

      return '<div class="customer-card" style="flex-direction:column;align-items:stretch;">' +
        '<div style="display:flex;align-items:flex-start;gap:12px;">' +
          '<div style="width:48px;height:48px;border-radius:12px;background:' + plat.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
            '<i data-lucide="' + plat.icon + '" class="w-5 h-5"></i>' +
          '</div>' +
          '<div class="customer-body" style="flex:1;min-width:0;">' +
            '<div class="customer-name">' + esc(s.username) + ' ' + statusBadge + '</div>' +
            '<div class="customer-username">' + plat.name + ' • Customer: ' + esc(s.customer_name || '-') + '</div>' +
            '<div class="customer-stats"><div>' + esc(s.customer_phone || 'No HP tidak ada') + '</div></div>' +
          '</div>' +
          '<div class="customer-actions">' + actions + '</div>' +
        '</div>' +
        '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">' +
          '<div style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:6px;">📸 Bukti Screenshot Profil</div>' +
          proofThumb +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
    if (window.lucide) lucide.createIcons();
  }

  window.setSocialFilter = (f) => { socialFilter = f; loadSocials(); };

  window.verifySocial = function (id, approve) {
    const doVerify = async (reason) => {
      showLoading('Memverifikasi...');
      try {
        const uid = await getUid();
        await rpc('seller_social_verify', {
          p_social_id: id,
          p_seller_id: uid,
          p_approve: approve,
          p_reason: reason || null,
        });
        KR.toast.success(approve ? 'Akun diverifikasi' : 'Akun ditolak');
        await loadSocials();
      } catch (e) { KR.toast.error('Gagal: ' + e.message); }
      finally { hideLoading(); }
    };

    if (approve) {
      confirmDialog('Setujui Akun?', 'Akun ini akan ditandai sebagai verified.', () => doVerify());
    } else {
      const reason = prompt('Alasan penolakan (wajib):');
      if (!reason || !reason.trim()) return;
      doVerify(reason.trim());
    }
  };

  /* ---------- SUBMISSIONS ---------- */
  async function loadSubmissions() {
    try {
      const uid = await getUid();
      const data = await rpc('seller_submissions_list', {
        p_seller_id: uid,
        p_status: submissionFilter,
      });
      submissions = (data || []).map(parse).filter(Boolean);
      renderSubmissions();
    } catch (e) { console.error(e); KR.toast.error('Gagal memuat bukti'); }
  }

  function renderSubmissions() {
    const el = $('tasks-list');
    const countEl = $('tasks-count-label');
    if (!el) return;

    if (countEl) countEl.textContent = submissions.length + ' submission';

     const tabs = _buildFilterTabs('setSubmissionFilter', submissionFilter, ['pending', 'approved', 'rejected', 'all']);

    if (!submissions.length) {
      el.innerHTML = tabs + '<div class="empty-state"><i data-lucide="inbox"></i><h3>Tidak ada bukti</h3></div>';
      if (window.lucide) lucide.createIcons();
      return;
    }

    el.innerHTML = tabs + '<div class="space-y-3">' + submissions.map(s => {
      const plat = PLATFORMS[s.platform] || { name: s.platform, icon: 'globe', color: '#64748b' };

       const proofThumb = s.proof_url
        ? _buildProofThumb(s.proof_url)
        : '<div style="margin-top:8px;padding:12px;background:#fee2e2;border-radius:8px;font-size:.75rem;color:#991b1b;">⚠ Bukti tidak ada</div>';

      const actions = s.status === 'pending'
        ? '<button class="btn btn-primary btn-sm" onclick="verifySubmission(\'' + s.id + '\', true)"><i data-lucide="check"></i> Approve +' + fmt(s.reward_amount) + '</button>' +
          '<button class="btn btn-danger btn-sm" onclick="verifySubmission(\'' + s.id + '\', false)"><i data-lucide="x"></i> Tolak</button>'
        : '<button class="btn btn-secondary btn-sm" onclick="viewSocialProof(\'' + esc(s.proof_url) + '\')"><i data-lucide="image"></i> Lihat Besar</button>';

      return '<div class="customer-card" style="flex-direction:column;align-items:stretch;">' +
        '<div style="display:flex;align-items:flex-start;gap:12px;">' +
          '<div style="width:48px;height:48px;border-radius:12px;background:' + plat.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
            '<i data-lucide="' + plat.icon + '" class="w-5 h-5"></i>' +
          '</div>' +
          '<div class="customer-body" style="flex:1;min-width:0;">' +
            '<div class="customer-name">' + esc(s.task_title) + '</div>' +
            '<div class="customer-username">Target: ' + esc(s.target_username) + '</div>' +
            '<div class="customer-stats">' +
              '<div><strong>' + esc(s.customer_name || '-') + '</strong></div>' +
              '<div>' + fmt(s.reward_amount) + '</div>' +
            '</div>' +
            (s.notes ? '<div style="font-size:.75rem;color:#64748b;margin-top:4px;">📝 ' + esc(s.notes) + '</div>' : '') +
          '</div>' +
          '<div class="customer-actions">' + actions + '</div>' +
        '</div>' +
        '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">' +
          '<div style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:6px;">📸 Bukti Screenshot Follow</div>' +
          proofThumb +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
    if (window.lucide) lucide.createIcons();
  }

  window.setSubmissionFilter = (f) => { submissionFilter = f; loadSubmissions(); };

  window.verifySubmission = function (id, approve) {
    const doVerify = async (reason) => {
      showLoading('Memverifikasi...');
      try {
        const uid = await getUid();
        await rpc('seller_submission_verify', {
          p_submission_id: id,
          p_seller_id: uid,
          p_approve: approve,
          p_reason: reason || null,
        });
        KR.toast.success(approve ? 'Disetujui — saldo customer bertambah' : 'Bukti ditolak');
        await loadSubmissions();
      } catch (e) { KR.toast.error('Gagal: ' + e.message); }
      finally { hideLoading(); }
    };

    if (approve) {
      confirmDialog('Setujui Bukti?', 'Saldo customer akan bertambah otomatis.', () => doVerify());
    } else {
      const reason = prompt('Alasan penolakan (wajib):');
      if (!reason || !reason.trim()) return;
      doVerify(reason.trim());
    }
  };

  /* ---------- WITHDRAWALS ---------- */
  async function loadWithdrawals() {
    try {
      const uid = await getUid();
      const data = await rpc('seller_withdrawals_list', {
        p_seller_id: uid,
        p_status: withdrawalFilter,
      });
      withdrawals = (data || []).map(parse).filter(Boolean);
      renderWithdrawals();
    } catch (e) { console.error(e); KR.toast.error('Gagal memuat penarikan'); }
  }

  function renderWithdrawals() {
    const el = $('tasks-list');
    const countEl = $('tasks-count-label');
    if (!el) return;

    if (countEl) countEl.textContent = withdrawals.length + ' penarikan';

     const tabs = _buildFilterTabs('setWithdrawalFilter', withdrawalFilter, ['pending', 'done', 'cancelled', 'all']);

    if (!withdrawals.length) {
      el.innerHTML = tabs + '<div class="empty-state"><i data-lucide="banknote"></i><h3>Tidak ada penarikan</h3></div>';
      if (window.lucide) lucide.createIcons();
      return;
    }

    el.innerHTML = tabs + '<div class="space-y-2">' + withdrawals.map(w => {
      const statusBadge = {
        pending:   '<span class="customer-badge" style="background:#fef3c7;color:#92400e;">Menunggu</span>',
        done:      '<span class="customer-badge" style="background:#d1fae5;color:#065f46;">Selesai</span>',
        cancelled: '<span class="customer-badge" style="background:#fee2e2;color:#991b1b;">Dibatalkan</span>',
      }[w.status] || '';

      const actions = w.status === 'pending'
        ? '<button class="btn btn-primary btn-sm" onclick="markWithdrawalDone(\'' + w.id + '\')"><i data-lucide="check"></i> Sudah Transfer</button>' +
          '<button class="btn btn-danger btn-sm" onclick="cancelWithdrawal(\'' + w.id + '\')"><i data-lucide="x"></i> Tolak</button>'
        : '<button class="btn btn-secondary btn-sm" onclick="waWithdrawal(\'' + esc(w.customer_phone || '') + '\')"><i data-lucide="message-circle"></i> WA</button>';

      return '<div class="customer-card">' +
        '<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
          '<i data-lucide="banknote" class="w-5 h-5"></i>' +
        '</div>' +
        '<div class="customer-body">' +
          '<div class="customer-name">' + fmt(w.amount) + ' ' + statusBadge + '</div>' +
          '<div class="customer-username">' + esc(w.customer_name || '-') + ' • ' + esc(w.customer_phone || '') + '</div>' +
          '<div class="customer-stats">' +
            '<div><strong>' + esc(w.withdrawal_bank) + '</strong> ' + esc(w.withdrawal_account) + '</div>' +
            '<div>a.n. ' + esc(w.withdrawal_holder) + '</div>' +
          '</div>' +
          '<div class="customer-timeline"><span>Diajukan: ' + new Date(w.created_at).toLocaleString('id-ID') + '</span></div>' +
        '</div>' +
        '<div class="customer-actions">' + actions + '</div>' +
      '</div>';
    }).join('') + '</div>';
    if (window.lucide) lucide.createIcons();
  }

  window.setWithdrawalFilter = (f) => { withdrawalFilter = f; loadWithdrawals(); };

  window.waWithdrawal = function (phone) {
    if (!phone) return;
    let p = String(phone).replace(/[^\d]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    window.open('https://wa.me/' + p, '_blank');
  };

  window.markWithdrawalDone = function (id) {
    confirmDialog('Konfirmasi Transfer?', 'Pastikan Anda sudah transfer ke rekening customer.', async () => {
      showLoading('Memproses...');
      try {
        await KR.sb.updateOnlineOrderStatus(id, 'done');
        KR.toast.success('Penarikan selesai');
        await loadWithdrawals();
      } catch (e) { KR.toast.error('Gagal: ' + e.message); }
      finally { hideLoading(); }
    });
  };

  window.cancelWithdrawal = function (id) {
    confirmDialog('Tolak Penarikan?', 'Saldo customer akan dikembalikan otomatis.', async () => {
      showLoading('Memproses...');
      try {
        await KR.sb.updateOnlineOrderStatus(id, 'cancelled');
        KR.toast.success('Penarikan ditolak — saldo dikembalikan');
        await loadWithdrawals();
      } catch (e) { KR.toast.error('Gagal: ' + e.message); }
      finally { hideLoading(); }
    });
  };

  /* ---------- MAIN TAB ---------- */
  window.switchTaskTab = function (tab) {
    mainTab = tab;
    document.querySelectorAll('[data-task-tab]').forEach(b => {
      b.classList.toggle('active', b.dataset.taskTab === tab);
    });
    const btnNew = $('create-task-btn');
    if (btnNew) btnNew.style.display = tab === 'tasks' ? 'inline-flex' : 'none';

    if (tab === 'tasks') loadTasks();
    if (tab === 'socials') loadSocials();
    if (tab === 'submissions') loadSubmissions();
    if (tab === 'withdrawals') loadWithdrawals();
  };

  async function loadTaskTab() {
    switchTaskTab(mainTab);
  }
  window.loadTaskTab = loadTaskTab;

  window.addEventListener('kasirku:ready', () => {
    setTimeout(() => {
      if (KR.auth.isLoggedIn() && $('tasks-list')) loadTasks();
    }, 900);
  });

})();
