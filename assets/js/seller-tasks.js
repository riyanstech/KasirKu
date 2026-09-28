/* ==========================================
   KasirKu — Seller Tasks Admin Module (v4)
   Multi-type + Poster Upload + Responsive Modal
   + Target opsional untuk tipe Posting
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

  /* ============ RESPONSIVE STYLES ============ */
  function injectTaskModalStyles() {
    if (document.getElementById('kr-task-modal-styles')) return;
    const s = document.createElement('style');
    s.id = 'kr-task-modal-styles';
    s.textContent = `
      .task-type-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
      }
      .task-type-opt {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 12px;
        border: 2px solid #e2e8f0;
        background: #fff;
        cursor: pointer;
        transition: all .2s;
        font-family: inherit;
      }
      .task-type-opt .task-icon {
        width: 40px; height: 40px;
        border-radius: 11px;
        display: grid; place-items: center;
        flex-shrink: 0;
      }
      .task-type-opt .task-icon svg { width: 18px; height: 18px; }
      .task-type-opt .task-body { flex: 1; min-width: 0; }
      .task-type-opt .task-label {
        font-weight: 800;
        font-size: .88rem;
        color: #0f172a;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .task-type-opt .task-desc {
        font-size: .72rem;
        color: #64748b;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .task-type-opt .type-check { width: 20px; height: 20px; color: #cbd5e1; flex-shrink: 0; }

      @media (max-width: 520px) {
        .task-type-grid { gap: 6px; }
        .task-type-opt { padding: 10px 9px; gap: 9px; border-radius: 11px; }
        .task-type-opt .task-icon { width: 34px; height: 34px; border-radius: 10px; }
        .task-type-opt .task-icon svg { width: 16px; height: 16px; }
        .task-type-opt .task-label { font-size: .8rem; }
        .task-type-opt .task-desc { font-size: .65rem; }
        .task-type-opt .type-check { width: 17px; height: 17px; }
      }

      @media (max-width: 380px) {
        .task-type-grid { grid-template-columns: 1fr; }
        .task-type-opt .task-label { white-space: normal; }
        .task-type-opt .task-desc { white-space: normal; }
      }
    `;
    document.head.appendChild(s);
  }

  const PLATFORMS = {
    tiktok:    { name: 'TikTok',      icon: 'music-2',        color: '#000000', placeholder: '@username' },
    instagram: { name: 'Instagram',   icon: 'camera',         color: '#E1306C', placeholder: '@username' },
    youtube:   { name: 'YouTube',     icon: 'play-circle',    color: '#FF0000', placeholder: '@channel' },
    facebook:  { name: 'Facebook',    icon: 'thumbs-up',      color: '#1877F2', placeholder: 'username' },
    twitter:   { name: 'X / Twitter', icon: 'message-circle', color: '#000000', placeholder: '@username' },
  };

  /* ============ TASK TYPES (10 tipe) ============ */
  const TASK_TYPES = {
    follow:      { label: 'Follow',       icon: 'user-plus',      color: '#000000', desc: 'Follow akun',       needsPlatform: true,  needsTarget: true,  customerLink: false },
    like:        { label: 'Like',         icon: 'thumbs-up',      color: '#E1306C', desc: 'Like postingan',    needsPlatform: true,  needsTarget: true,  customerLink: false },
    comment:     { label: 'Komentar',     icon: 'message-square', color: '#3b82f6', desc: 'Komentari post',    needsPlatform: true,  needsTarget: true,  customerLink: false },
    share:       { label: 'Share',        icon: 'share-2',        color: '#10b981', desc: 'Share postingan',   needsPlatform: true,  needsTarget: true,  customerLink: false },
    post:        { label: 'Posting',      icon: 'file-text',      color: '#8b5cf6', desc: 'Posting baru',      needsPlatform: true,  needsTarget: true,  targetOptional: true, customerLink: true,  extra: 'post_fields' },
    subscribe:   { label: 'Subscribe',    icon: 'play-circle',    color: '#FF0000', desc: 'Subscribe channel', needsPlatform: true,  needsTarget: true,  customerLink: false },
    review_maps: { label: 'Review Maps',  icon: 'map-pin',        color: '#ea4335', desc: 'Ulas Google Maps',  needsPlatform: false, needsTarget: true,  customerLink: true,  extra: 'maps_fields' },
    review_app:  { label: 'Review App',   icon: 'smartphone',     color: '#10b981', desc: 'Ulas App Store',    needsPlatform: false, needsTarget: true,  customerLink: true,  extra: 'app_fields' },
    watch:       { label: 'Tonton Video', icon: 'monitor-play',   color: '#FF0000', desc: 'Tonton video',      needsPlatform: false, needsTarget: true,  customerLink: false, extra: 'watch_fields' },
    custom:      { label: 'Custom',       icon: 'sparkles',       color: '#64748b', desc: 'Tugas bebas',       needsPlatform: false, needsTarget: false, customerLink: true },
  };

  /* ============ EXTRA FIELDS per tipe ============ */
  const TYPE_EXTRA_FIELDS = {
    comment: [
      { key: 'comment_text', label: 'Teks Komentar Wajib', type: 'textarea', required: true, placeholder: 'Contoh: Menarik banget!' },
    ],
    post: [
      { key: 'platform_name', label: 'Platform Target', type: 'select', options: ['Facebook Grup', 'Facebook Page', 'Instagram Feed', 'Instagram Story', 'TikTok', 'Twitter/X'], required: true },
      { key: 'poster_image', label: 'Gambar Poster yang Harus Diposting', type: 'image_upload', required: true, helper: 'Customer wajib posting gambar ini. Ukuran ideal: 1080x1080 px.' },
      { key: 'caption_template', label: 'Caption Wajib', type: 'textarea', required: true, placeholder: 'Teks lengkap yang harus dipakai customer saat posting...' },
      { key: 'required_hashtag', label: 'Hashtag Wajib (opsional)', type: 'text', placeholder: '#kasirku #promo' },
    ],
    review_maps: [
      { key: 'place_name', label: 'Nama Tempat', type: 'text', required: true, placeholder: 'Warung Bu Sari' },
      { key: 'min_rating', label: 'Rating Minimum', type: 'select', options: ['4', '5'], required: true, default: '5' },
      { key: 'min_chars', label: 'Min. Karakter Ulasan', type: 'number', default: 50 },
    ],
    review_app: [
      { key: 'app_name', label: 'Nama Aplikasi', type: 'text', required: true, placeholder: 'KasirKu POS' },
      { key: 'min_rating', label: 'Rating Minimum', type: 'select', options: ['4', '5'], required: true, default: '5' },
    ],
    watch: [
      { key: 'min_duration', label: 'Durasi Minimum (detik)', type: 'number', default: 60 },
    ],
  };

  /* ============ HELPERS ============ */
  function _buildFilterTabs(fnName, currentFilter, options) {
    const labels = { pending: 'Pending', verified: 'Verified', approved: 'Approved', rejected: 'Rejected', done: 'Selesai', cancelled: 'Dibatalkan', all: 'Semua' };
    return '<div class="filter-tabs-row">' +
      options.map(s => {
        const isActive = currentFilter === s;
        const label = labels[s] || (s.charAt(0).toUpperCase() + s.slice(1));
        return '<button type="button" onclick="' + fnName + '(\'' + s + '\')" class="filter-tab-pill' + (isActive ? ' active' : '') + '">' + label + '</button>';
      }).join('') +
    '</div>';
  }

  function _buildProofThumb(url) {
    return '<div style="margin-top:8px;padding:10px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;display:flex;justify-content:center;align-items:center;overflow:hidden;">' +
      '<img src="' + esc(url) + '" onclick="viewSocialProof(\'' + esc(url) + '\')" style="max-width:100%;max-height:320px;width:auto;height:auto;object-fit:contain;border-radius:8px;cursor:zoom-in;background:#fff;display:block;" alt="Bukti" />' +
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

  /* ============ PROOF VIEWER ============ */
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
          '<button onclick="closeProofViewer()" class="btn btn-secondary btn-sm" style="background:rgba(255,255,255,.95);color:#0f172a;"><i data-lucide="x"></i> Tutup</button>' +
          '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="btn btn-primary btn-sm"><i data-lucide="external-link"></i> Buka di Tab Baru</a>' +
          '<a href="' + esc(url) + '" download class="btn btn-secondary btn-sm" style="background:rgba(255,255,255,.95);color:#0f172a;"><i data-lucide="download"></i> Download</a>' +
        '</div>' +
        '<img src="' + esc(url) + '" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#fff;" onerror="this.style.display=&quot;none&quot;; this.nextElementSibling.style.display=&quot;block&quot;;">' +
        '<div style="display:none;padding:40px;background:#fff;border-radius:12px;text-align:center;color:#991b1b;max-width:400px;">Gambar gagal dimuat.</div>' +
      '</div>';

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
    const escHandler = (e) => { if (e.key === 'Escape') { closeProofViewer(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  };

  window.closeProofViewer = function () {
    const modal = document.getElementById('proof-viewer-modal');
    if (modal) modal.remove();
  };

  /* ============ TASKS: LOAD ============ */
  async function loadTasks() {
    try {
      const uid = await getUid();
      const { data, error } = await KR.sb.client.from('reward_tasks').select('*').eq('seller_id', uid).order('created_at', { ascending: false });
      if (error) throw error;
      tasks = data || [];
      renderTasks();
    } catch (e) { console.error(e); KR.toast.error('Gagal memuat tugas'); }
  }

  /* ============ TASKS: RENDER ============ */
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
        '<div class="order-stat clickable ' + (taskFilter === 'all' ? 'active' : '') + '" onclick="setTaskFilter(\'all\')"><div class="order-stat-label">Total</div><div class="order-stat-value">' + tasks.length + '</div></div>' +
        '<div class="order-stat clickable ' + (taskFilter === 'active' ? 'active' : '') + '" onclick="setTaskFilter(\'active\')"><div class="order-stat-label">Aktif</div><div class="order-stat-value done">' + active + '</div></div>' +
        '<div class="order-stat clickable ' + (taskFilter === 'inactive' ? 'active' : '') + '" onclick="setTaskFilter(\'inactive\')"><div class="order-stat-label">Nonaktif</div><div class="order-stat-value pending">' + inactive + '</div></div>' +
        '<div class="order-stat"><div class="order-stat-label">Dikerjakan</div><div class="order-stat-value verified">' + totalSubs + '</div></div>';
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
      const type = t.task_type || 'follow';
      const cfg = TASK_TYPES[type] || TASK_TYPES.follow;
      const meta = t.task_meta || {};
      const plat = PLATFORMS[t.platform] || { name: t.platform || 'Custom', icon: cfg.icon, color: cfg.color };
      const progress = t.max_completions > 0 ? t.current_completions + '/' + t.max_completions + ' slot' : t.current_completions + ' selesai';

      const posterThumb = (type === 'post' && meta.poster_image_url)
        ? '<div style="margin-top:8px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;background:#f8fafc;max-width:120px;"><img src="' + esc(meta.poster_image_url) + '" style="width:100%;height:auto;display:block;" /></div>'
        : '';

      return '<div class="customer-card">' +
        '<div style="width:52px;height:52px;border-radius:14px;background:' + cfg.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;">' +
          '<i data-lucide="' + cfg.icon + '" class="w-6 h-6"></i>' +
        '</div>' +
        '<div class="customer-body">' +
          '<div class="customer-name">' + esc(t.title) +
            '<span class="customer-badge ' + (t.is_active ? 'member' : 'guest') + '">' + (t.is_active ? 'Aktif' : 'Nonaktif') + '</span>' +
            '<span class="customer-badge" style="background:' + cfg.color + '15;color:' + cfg.color + ';border:1px solid ' + cfg.color + '40;">' + cfg.label + '</span>' +
          '</div>' +
          '<div class="customer-username">' + plat.name + ' - ' + esc(t.target_username || '-') + '</div>' +
          '<div class="customer-stats">' +
            '<div><strong>' + fmt(t.reward_amount) + '</strong> / tugas</div>' +
            '<div>' + progress + '</div>' +
          '</div>' +
          posterThumb +
        '</div>' +
        '<div class="customer-actions">' +
          '<button class="icon-btn" onclick="toggleTask(\'' + t.id + '\', ' + !t.is_active + ')" title="' + (t.is_active ? 'Nonaktifkan' : 'Aktifkan') + '"><i data-lucide="' + (t.is_active ? 'eye-off' : 'eye') + '"></i></button>' +
          '<button class="icon-btn-danger" onclick="deleteTask(\'' + t.id + '\')" title="Hapus"><i data-lucide="trash-2"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');
    if (window.lucide) lucide.createIcons();
  }

  window.setTaskFilter = (f) => { taskFilter = f; renderTasks(); };

  /* ============ TASKS: CREATE MODAL ============ */
  window.openCreateTaskModal = function () {
    injectTaskModalStyles();
    const existing = $('create-task-modal');
    if (existing) existing.remove();

    window.__posterData = null;
    window.__newTaskType = null;
    window.__newTaskPlatform = null;

    const typeOptions = Object.entries(TASK_TYPES).map(([id, t]) =>
      '<label class="task-type-opt" data-type="' + id + '">' +
        '<input type="radio" name="task-type" value="' + id + '" style="display:none;">' +
        '<div class="task-icon" style="background:' + t.color + ';color:#fff;"><i data-lucide="' + t.icon + '"></i></div>' +
        '<div class="task-body">' +
          '<div class="task-label">' + t.label + '</div>' +
          '<div class="task-desc">' + t.desc + '</div>' +
        '</div>' +
        '<i data-lucide="circle" class="type-check"></i>' +
      '</label>'
    ).join('');

    const platformOptions = Object.entries(PLATFORMS).map(([id, p]) =>
      '<label class="task-type-opt" data-platform="' + id + '">' +
        '<input type="radio" name="task-platform" value="' + id + '" style="display:none;">' +
        '<div class="task-icon" style="background:' + p.color + ';color:#fff;"><i data-lucide="' + p.icon + '"></i></div>' +
        '<div class="task-body"><div class="task-label">' + p.name + '</div></div>' +
        '<i data-lucide="circle" class="plat-check type-check"></i>' +
      '</label>'
    ).join('');

    const modal = document.createElement('div');
    modal.id = 'create-task-modal';
    modal.className = 'modal active';
    modal.innerHTML =
      '<div class="modal-backdrop" onclick="this.parentNode.remove()"></div>' +
      '<div class="modal-card modal-card-md">' +
        '<div class="modal-head"><h3><i data-lucide="plus-circle"></i> Buat Tugas Baru</h3><button class="icon-btn" onclick="this.closest(\'.modal\').remove()"><i data-lucide="x"></i></button></div>' +
        '<div class="modal-body">' +
          '<div class="field" style="margin-bottom:16px;"><label style="font-weight:900;color:#0f172a;font-size:.8rem;">1. Pilih Tipe Tugas <span class="req">*</span></label><div id="ct-type-list" class="task-type-grid">' + typeOptions + '</div></div>' +
          '<div class="field"><label>Judul Tugas <span class="req">*</span></label><input id="ct-title" class="input" placeholder="Contoh: Follow TikTok @tokosaya"></div>' +
          '<div class="field"><label>Deskripsi (opsional)</label><textarea id="ct-desc" class="textarea" rows="2" placeholder="Instruksi tambahan untuk customer"></textarea></div>' +
          '<div class="field" id="ct-platform-wrap" style="display:none;margin-bottom:16px;"><label>Platform <span class="req">*</span></label><div id="ct-platform-list" class="task-type-grid">' + platformOptions + '</div></div>' +
          '<div class="field" id="ct-target-wrap"><label id="ct-target-label">Target / Username <span class="req">*</span></label><input id="ct-target" class="input" placeholder="@username"></div>' +
          '<div id="ct-extra-fields"></div>' +
          '<div class="field-grid" style="margin-top:12px;">' +
            '<div class="field"><label>Reward (Rp) <span class="req">*</span></label><input id="ct-reward" type="number" class="input" value="5000" min="1"></div>' +
            '<div class="field"><label>Kuota (0 = unlimited)</label><input id="ct-max" type="number" class="input" value="0" min="0"></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn btn-ghost" onclick="this.closest(\'.modal\').remove()">Batal</button>' +
          '<button class="btn btn-primary" onclick="submitCreateTask()"><i data-lucide="check"></i> Buat Tugas</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    modal.querySelectorAll('.task-type-opt[data-type]').forEach(opt => {
      opt.addEventListener('click', () => {
        const typeId = opt.dataset.type;
        window.__newTaskType = typeId;
        modal.querySelectorAll('.task-type-opt[data-type]').forEach(o => {
          const sel = o.dataset.type === typeId;
          o.style.borderColor = sel ? '#10b981' : '#e2e8f0';
          o.style.background = sel ? '#ecfdf5' : '#fff';
          const icon = o.querySelector('.type-check');
          if (icon) icon.setAttribute('data-lucide', sel ? 'check-circle' : 'circle');
        });
        if (window.lucide) lucide.createIcons();
        updateDynamicFields(typeId);
      });
    });

    modal.querySelectorAll('.task-type-opt[data-platform]').forEach(opt => {
      opt.addEventListener('click', () => {
        const platId = opt.dataset.platform;
        window.__newTaskPlatform = platId;
        modal.querySelectorAll('.task-type-opt[data-platform]').forEach(o => {
          const sel = o.dataset.platform === platId;
          o.style.borderColor = sel ? '#10b981' : '#e2e8f0';
          o.style.background = sel ? '#ecfdf5' : '#fff';
          const icon = o.querySelector('.plat-check');
          if (icon) icon.setAttribute('data-lucide', sel ? 'check-circle' : 'circle');
        });
        if (window.lucide) lucide.createIcons();
      });
    });

    function renderPosterArea() {
      const area = $('ct-poster-area');
      if (!area) return;
      if (window.__posterData) {
        area.innerHTML = '<div style="position:relative;border-radius:12px;overflow:hidden;border:2px solid #10b981;">' +
          '<img src="' + window.__posterData + '" style="width:100%;max-height:280px;object-fit:contain;background:#f8fafc;display:block;">' +
          '<button type="button" onclick="window.__posterData=null; window.__renderPosterArea && window.__renderPosterArea();" style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:8px;background:rgba(15,23,42,.8);color:#fff;border:none;cursor:pointer;font-size:18px;line-height:1;">×</button>' +
          '<div style="position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:linear-gradient(90deg,#10b981,#059669);color:#fff;font-size:.7rem;font-weight:800;display:flex;align-items:center;gap:6px;"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Gambar siap</div>' +
        '</div>';
        if (window.lucide) lucide.createIcons();
      } else {
        area.innerHTML = '<button type="button" onclick="document.getElementById(\'ct-poster-input\').click()" style="width:100%;padding:26px 16px;border-radius:12px;border:2px dashed #cbd5e1;background:#f8fafc;color:#64748b;font-family:inherit;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;">' +
          '<i data-lucide="image-plus" style="width:28px;height:28px;"></i>' +
          '<span style="font-size:.84rem;">Upload Gambar Poster</span>' +
          '<span style="font-size:.68rem;opacity:.7;font-weight:600;">JPG / PNG, max 5MB</span>' +
        '</button>';
        if (window.lucide) lucide.createIcons();
      }
    }
    window.__renderPosterArea = renderPosterArea;

    function updateDynamicFields(typeId) {
      const cfg = TASK_TYPES[typeId];
      if (!cfg) return;

      const platWrap = $('ct-platform-wrap');
      if (platWrap) platWrap.style.display = cfg.needsPlatform ? '' : 'none';

      const targetWrap = $('ct-target-wrap');
      const targetLabel = $('ct-target-label');
      const targetInput = $('ct-target');

      if (!cfg.needsTarget) {
        targetWrap.style.display = 'none';
      } else {
        targetWrap.style.display = '';
        const labels = {
          follow:      { label: 'Username Target', placeholder: '@username' },
          like:        { label: 'Link Postingan', placeholder: 'https://instagram.com/p/xxx' },
          comment:     { label: 'Link Postingan', placeholder: 'https://instagram.com/p/xxx' },
          share:       { label: 'Link Postingan', placeholder: 'https://instagram.com/p/xxx' },
          post:        { label: 'Link Grup/Page Target', placeholder: 'https://facebook.com/groups/xxx' },
          subscribe:   { label: 'Channel / Username', placeholder: '@channel' },
          review_maps: { label: 'Link Google Maps Tempat', placeholder: 'https://maps.google.com/...' },
          review_app:  { label: 'Link Aplikasi', placeholder: 'https://play.google.com/store/apps/...' },
          watch:       { label: 'Link Video', placeholder: 'https://youtube.com/watch?v=xxx' },
        };
        const lbl = labels[typeId] || { label: 'Target', placeholder: '' };
        const reqMark = cfg.targetOptional
          ? ' <span style="color:#64748b;font-weight:600;font-size:.68rem;text-transform:none;letter-spacing:0;">(opsional)</span>'
          : ' <span class="req">*</span>';
        targetLabel.innerHTML = lbl.label + reqMark;
        targetInput.placeholder = cfg.targetOptional
          ? lbl.placeholder + ' (boleh dikosongkan)'
          : lbl.placeholder;
      }

      const extraEl = $('ct-extra-fields');
      const extraDef = TYPE_EXTRA_FIELDS[typeId] || [];
      if (extraDef.length === 0) {
        extraEl.innerHTML = '';
        return;
      }

      extraEl.innerHTML = '<div style="margin-top:12px;padding:14px;border-radius:12px;background:#f8fafc;border:1.5px dashed #cbd5e1;">' +
        '<div style="font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:10px;">Pengaturan Khusus ' + cfg.label + '</div>' +
        extraDef.map(f => {
          if (f.type === 'image_upload') {
            return '<div class="field"><label>' + f.label + (f.required ? ' <span class="req">*</span>' : '') + '</label>' +
              '<input type="file" accept="image/*" id="ct-poster-input" style="display:none;">' +
              '<div id="ct-poster-area"></div>' +
              (f.helper ? '<p style="font-size:.7rem;color:#64748b;margin-top:6px;line-height:1.4;">' + f.helper + '</p>' : '') +
            '</div>';
          }
          if (f.type === 'textarea') {
            return '<div class="field"><label>' + f.label + (f.required ? ' <span class="req">*</span>' : '') + '</label>' +
              '<textarea class="textarea" rows="3" data-extra-key="' + f.key + '" placeholder="' + (f.placeholder || '') + '">' + (f.default || '') + '</textarea></div>';
          }
          if (f.type === 'select') {
            return '<div class="field"><label>' + f.label + (f.required ? ' <span class="req">*</span>' : '') + '</label>' +
              '<select class="select" data-extra-key="' + f.key + '">' + f.options.map(o => '<option value="' + o + '"' + (f.default === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>';
          }
          if (f.type === 'number') {
            return '<div class="field"><label>' + f.label + (f.required ? ' <span class="req">*</span>' : '') + '</label>' +
              '<input type="number" class="input" data-extra-key="' + f.key + '" value="' + (f.default || '') + '"></div>';
          }
          return '<div class="field"><label>' + f.label + (f.required ? ' <span class="req">*</span>' : '') + '</label>' +
            '<input type="text" class="input" data-extra-key="' + f.key + '" placeholder="' + (f.placeholder || '') + '" value="' + (f.default || '') + '"></div>';
        }).join('') +
      '</div>';

      const posterInput = $('ct-poster-input');
      if (posterInput) {
        posterInput.addEventListener('change', async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) return KR.toast.error('File max 5MB');
          try {
            const data = await compressImage(file, 800, 0.82);
            window.__posterData = data;
            renderPosterArea();
          } catch (err) {
            KR.toast.error('Gagal proses gambar: ' + err.message);
          }
        });
        renderPosterArea();
      }
      if (window.lucide) lucide.createIcons();
    }

    const firstType = modal.querySelector('.task-type-opt[data-type]');
    if (firstType) firstType.click();
  };

  /* ============ TASKS: SUBMIT CREATE ============ */
  window.submitCreateTask = async function () {
    const title = $('ct-title')?.value.trim();
    const desc = $('ct-desc')?.value.trim();
    const target = $('ct-target')?.value.trim();
    const reward = Number($('ct-reward')?.value) || 5000;
    const max = Number($('ct-max')?.value) || 0;

    const taskType = window.__newTaskType;
    const platform = window.__newTaskPlatform;

    if (!taskType) return KR.toast.error('Pilih tipe tugas dulu');
    if (!title) return KR.toast.error('Judul wajib diisi');

    const cfg = TASK_TYPES[taskType];
    if (cfg.needsPlatform && !platform) return KR.toast.error('Pilih platform dulu');
    if (cfg.needsTarget && !cfg.targetOptional && !target) return KR.toast.error('Target wajib diisi');
    if (reward < 1) return KR.toast.error('Reward minimal Rp 1');

    const taskMeta = {};
    const extraInputs = document.querySelectorAll('#ct-extra-fields [data-extra-key]');
    const extraDef = TYPE_EXTRA_FIELDS[taskType] || [];
    for (const inp of extraInputs) {
      const key = inp.dataset.extraKey;
      const val = inp.value.trim();
      const def = extraDef.find(f => f.key === key);
      if (def && def.required && !val) return KR.toast.error(def.label + ' wajib diisi');
      if (val) taskMeta[key] = val;
    }

    if (taskType === 'post') {
      if (!window.__posterData) return KR.toast.error('Upload gambar poster dulu');
      showLoading('Uploading poster...');
      try {
        const uid = await getUid();
        const blob = await (await fetch(window.__posterData)).blob();
        const filename = 'task-posters/' + uid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
        const { error: upErr } = await KR.sb.client.storage.from('payment-proofs').upload(filename, blob, {
          contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
        });
        if (upErr) throw upErr;
        const { data: urlData } = KR.sb.client.storage.from('payment-proofs').getPublicUrl(filename);
        taskMeta.poster_image_url = urlData.publicUrl;
      } catch (e) {
        hideLoading();
        console.error('[Upload poster]', e);
        return KR.toast.error('Upload poster gagal: ' + (e.message || 'Unknown'));
      }
    }

    showLoading('Membuat tugas...');
    try {
      const uid = await getUid();
      const insertData = {
        seller_id: uid,
        title: title,
        description: desc || null,
        platform: cfg.needsPlatform ? platform : taskType,
        target_username: target || '-',
        target_url: (cfg.needsTarget && target) ? target : null,
        reward_amount: reward,
        max_completions: max,
        current_completions: 0,
        is_active: true,
        expires_at: null,
        task_type: taskType,
        task_meta: taskMeta,
      };

      const { error } = await KR.sb.client.from('reward_tasks').insert(insertData);
      if (error) throw error;

      KR.toast.success('Tugas berhasil dibuat');
      $('create-task-modal')?.remove();
      window.__posterData = null;
      await loadTasks();
    } catch (e) {
      console.error('[CreateTask]', e);
      KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
    } finally {
      hideLoading();
    }
  };

  /* ============ TASKS: TOGGLE / DELETE ============ */
  window.toggleTask = async function (id, activate) {
    showLoading('Memperbarui...');
    try {
      const uid = await getUid();
      await rpc('seller_task_toggle', { p_task_id: id, p_seller_id: uid, p_is_active: activate });
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

  /* ============ SOCIALS ============ */
  async function loadSocials() {
    try {
      const uid = await getUid();
      const data = await rpc('seller_social_list', { p_seller_id: uid, p_status: socialFilter });
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

      const proofThumb = s.proof_url ? _buildProofThumb(s.proof_url) : '<div style="margin-top:8px;padding:12px;background:#fee2e2;border-radius:8px;font-size:.75rem;color:#991b1b;">Bukti tidak ada</div>';

      const actions = s.status === 'pending'
        ? '<button class="btn btn-primary btn-sm" onclick="verifySocial(\'' + s.id + '\', true)"><i data-lucide="check"></i> Setujui</button><button class="btn btn-danger btn-sm" onclick="verifySocial(\'' + s.id + '\', false)"><i data-lucide="x"></i> Tolak</button>'
        : '<button class="btn btn-secondary btn-sm" onclick="viewSocialProof(\'' + esc(s.proof_url) + '\')"><i data-lucide="image"></i> Lihat Besar</button>';

      return '<div class="customer-card" style="flex-direction:column;align-items:stretch;">' +
        '<div style="display:flex;align-items:flex-start;gap:12px;">' +
          '<div style="width:48px;height:48px;border-radius:12px;background:' + plat.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;"><i data-lucide="' + plat.icon + '" class="w-5 h-5"></i></div>' +
          '<div class="customer-body" style="flex:1;min-width:0;">' +
            '<div class="customer-name">' + esc(s.username) + ' ' + statusBadge + '</div>' +
            '<div class="customer-username">' + plat.name + ' - Customer: ' + esc(s.customer_name || '-') + '</div>' +
            '<div class="customer-stats"><div>' + esc(s.customer_phone || 'No HP tidak ada') + '</div></div>' +
          '</div>' +
          '<div class="customer-actions">' + actions + '</div>' +
        '</div>' +
        '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">' +
          '<div style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:6px;">Bukti Screenshot Profil</div>' +
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
        await rpc('seller_social_verify', { p_social_id: id, p_seller_id: uid, p_approve: approve, p_reason: reason || null });
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

  /* ============ SUBMISSIONS ============ */
  async function loadSubmissions() {
    try {
      const uid = await getUid();
      const data = await rpc('seller_submissions_list', { p_seller_id: uid, p_status: submissionFilter });
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
      const type = s.task_type || 'follow';
      const cfg = TASK_TYPES[type] || TASK_TYPES.follow;

      const proofThumb = s.proof_url ? _buildProofThumb(s.proof_url) : '<div style="margin-top:8px;padding:12px;background:#fee2e2;border-radius:8px;font-size:.75rem;color:#991b1b;">Bukti tidak ada</div>';

      const proofLinkHtml = s.proof_link
        ? '<div style="margin-top:10px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:.75rem;">' +
            '<div style="font-weight:800;color:#1e40af;margin-bottom:4px;">Link Bukti Customer:</div>' +
            '<a href="' + esc(s.proof_link) + '" target="_blank" rel="noopener" style="color:#1d4ed8;word-break:break-all;text-decoration:underline;">' + esc(s.proof_link) + '</a>' +
          '</div>'
        : (cfg.customerLink ? '<div style="margin-top:10px;padding:10px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:10px;font-size:.72rem;color:#92400e;">Link bukti belum dikirim customer</div>' : '');

      const actions = s.status === 'pending'
        ? '<button class="btn btn-primary btn-sm" onclick="verifySubmission(\'' + s.id + '\', true)"><i data-lucide="check"></i> Approve +' + fmt(s.reward_amount) + '</button><button class="btn btn-danger btn-sm" onclick="verifySubmission(\'' + s.id + '\', false)"><i data-lucide="x"></i> Tolak</button>'
        : '<button class="btn btn-secondary btn-sm" onclick="viewSocialProof(\'' + esc(s.proof_url) + '\')"><i data-lucide="image"></i> Lihat Besar</button>';

      return '<div class="customer-card" style="flex-direction:column;align-items:stretch;">' +
        '<div style="display:flex;align-items:flex-start;gap:12px;">' +
          '<div style="width:48px;height:48px;border-radius:12px;background:' + cfg.color + ';color:#fff;display:grid;place-items:center;flex-shrink:0;"><i data-lucide="' + cfg.icon + '" class="w-5 h-5"></i></div>' +
          '<div class="customer-body" style="flex:1;min-width:0;">' +
            '<div class="customer-name">' + esc(s.task_title) + '<span class="customer-badge" style="background:' + cfg.color + '15;color:' + cfg.color + ';border:1px solid ' + cfg.color + '40;">' + cfg.label + '</span></div>' +
            '<div class="customer-username">Target: ' + esc(s.target_username || '-') + '</div>' +
            '<div class="customer-stats"><div><strong>' + esc(s.customer_name || '-') + '</strong></div><div>' + fmt(s.reward_amount) + '</div></div>' +
            (s.notes ? '<div style="font-size:.75rem;color:#64748b;margin-top:4px;">Catatan: ' + esc(s.notes) + '</div>' : '') +
          '</div>' +
          '<div class="customer-actions">' + actions + '</div>' +
        '</div>' +
        '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">' +
          '<div style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:6px;">Bukti Screenshot</div>' +
          proofThumb +
          proofLinkHtml +
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
        await rpc('seller_submission_verify', { p_submission_id: id, p_seller_id: uid, p_approve: approve, p_reason: reason || null });
        KR.toast.success(approve ? 'Disetujui - saldo customer bertambah' : 'Bukti ditolak');
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

  /* ============ WITHDRAWALS ============ */
  async function loadWithdrawals() {
    try {
      const uid = await getUid();
      const data = await rpc('seller_withdrawals_list', { p_seller_id: uid, p_status: withdrawalFilter });
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
        ? '<button class="btn btn-primary btn-sm" onclick="markWithdrawalDone(\'' + w.id + '\')"><i data-lucide="check"></i> Sudah Transfer</button><button class="btn btn-danger btn-sm" onclick="cancelWithdrawal(\'' + w.id + '\')"><i data-lucide="x"></i> Tolak</button>'
        : '<button class="btn btn-secondary btn-sm" onclick="waWithdrawal(\'' + esc(w.customer_phone || '') + '\')"><i data-lucide="message-circle"></i> WA</button>';

      return '<div class="customer-card">' +
        '<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;display:grid;place-items:center;flex-shrink:0;"><i data-lucide="banknote" class="w-5 h-5"></i></div>' +
        '<div class="customer-body">' +
          '<div class="customer-name">' + fmt(w.amount) + ' ' + statusBadge + '</div>' +
          '<div class="customer-username">' + esc(w.customer_name || '-') + ' - ' + esc(w.customer_phone || '') + '</div>' +
          '<div class="customer-stats"><div><strong>' + esc(w.withdrawal_bank) + '</strong> ' + esc(w.withdrawal_account) + '</div><div>a.n. ' + esc(w.withdrawal_holder) + '</div></div>' +
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
        KR.toast.success('Penarikan ditolak - saldo dikembalikan');
        await loadWithdrawals();
      } catch (e) { KR.toast.error('Gagal: ' + e.message); }
      finally { hideLoading(); }
    });
  };

  /* ============ MAIN TAB ============ */
  window.switchTaskTab = function (tab) {
    mainTab = tab;
    document.querySelectorAll('[data-task-tab]').forEach(b => { b.classList.toggle('active', b.dataset.taskTab === tab); });
    if (window.lucide) lucide.createIcons();
    const btnNew = $('create-task-btn');
    if (btnNew) btnNew.style.display = tab === 'tasks' ? 'inline-flex' : 'none';
    if (tab === 'tasks') loadTasks();
    if (tab === 'socials') loadSocials();
    if (tab === 'submissions') loadSubmissions();
    if (tab === 'withdrawals') loadWithdrawals();
  };

  async function loadTaskTab(evt) {
    const btn = evt?.target?.closest('button') || document.getElementById('task-refresh-btn');
    const orig = btn ? btn.innerHTML : null;
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '.7';
      btn.style.cursor = 'wait';
      btn.innerHTML = '<i data-lucide="loader-circle" style="animation:krSpin 1s linear infinite;"></i> Memuat...';
      if (window.lucide) lucide.createIcons();
    }
    try {
      tasks = []; socials = []; submissions = []; withdrawals = [];
      switchTaskTab(mainTab);
      await new Promise(r => setTimeout(r, 400));
      if (KR.toast) KR.toast.success('Data diperbarui');
    } catch (e) {
      console.error('[Refresh Tasks]', e);
      if (KR.toast) KR.toast.error('Gagal refresh: ' + (e.message || 'Unknown'));
    } finally {
      if (btn && orig) {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
      }
    }
  }
  window.loadTaskTab = loadTaskTab;

  window.addEventListener('kasirku:ready', () => {
    setTimeout(() => {
      if (KR.auth.isLoggedIn() && $('tasks-list')) loadTasks();
    }, 900);
  });

})();
