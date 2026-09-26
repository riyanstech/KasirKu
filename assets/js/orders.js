/* ==========================================
   KasirKu — Orders Module (Pesanan Online)
   List, verify, process, archive, delete
   ========================================== */
window.KR = window.KR || {};

(function () {
  'use strict';

  // ============== STATE ==============
  let orders = [];
  let filterStatus = 'active';
  let refreshTimer = null;
  let realtimeChannel = null;
  let lastPendingCount = null;
  let audioUnlocked = false;
  let audioCtx = null;
  let notificationPermission = 'default';
  let originalTitle = document.title;
  let titleFlashTimer = null;
  let lastLoginState = false;  


  // ============== HELPERS ==============
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const STATUS_LABEL = {
    pending:   { text: 'Menunggu', icon: 'clock', color: 'pending' },
    verified:  { text: 'Diproses', icon: 'loader', color: 'verified' },
    done:      { text: 'Selesai',  icon: 'check-circle', color: 'done' },
    cancelled: { text: 'Dibatalkan', icon: 'x-circle', color: 'cancelled' },
  };
  const METHOD_LABEL = {
    digital:  { text: 'Digital',  icon: 'zap' },
    delivery: { text: 'Dikirim',  icon: 'truck' },
    pickup:   { text: 'Ambil',    icon: 'store' },
    cod:      { text: 'COD',      icon: 'banknote' },
  };

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return s + ' dtk lalu';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' mnt lalu';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' jam lalu';
    const d = Math.floor(h / 24);
    if (d < 7) return d + ' hari lalu';
    return formatDate(ts);
  }

   // ============== NOTIFIKASI ==============
  
  // Unlock audio context setelah user interaksi (browser policy)
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioCtx = new AudioCtx();
      // Play silent sound untuk unlock
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.01);
      audioUnlocked = true;
      console.log('[Notification] Audio unlocked');
    } catch (e) {
      console.warn('[Notification] Unlock failed', e);
    }
  }
  
  // Bunyi notifikasi order baru (2-tone beep)
  function playNewOrderSound() {
    if (!audioCtx || !audioUnlocked) {
      console.warn('[Notification] Audio belum unlocked — klik halaman dulu');
      return;
    }
    try {
      // Resume kalau suspended
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const now = audioCtx.currentTime;
      const beeps = [
        { freq: 880, start: 0,    duration: 0.15 },
        { freq: 1320, start: 0.18, duration: 0.20 },
        { freq: 880,  start: 0.42, duration: 0.15 },
      ];
      
      beeps.forEach(b => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = b.freq;
        const t = now + b.start;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + b.duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + b.duration + 0.05);
      });
    } catch (e) {
      console.warn('[Notification] Sound failed', e);
    }
  }
  
  // Flash title browser biar user lihat ada order baru
  function startTitleFlash(count) {
    if (titleFlashTimer) return;
    let toggle = false;
    titleFlashTimer = setInterval(() => {
      document.title = toggle
        ? `🔔 (${count}) Order Baru! — KasirKu`
        : originalTitle;
      toggle = !toggle;
    }, 1200);
  }
  
  function stopTitleFlash() {
    if (titleFlashTimer) {
      clearInterval(titleFlashTimer);
      titleFlashTimer = null;
    }
    document.title = originalTitle;
  }
  
  // Browser notification (kalau diizinkan)
  function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      notificationPermission = 'granted';
      return;
    }
    if (Notification.permission === 'denied') {
      notificationPermission = 'denied';
      return;
    }
    // Minta izin (baik saat user klik pertama)
    Notification.requestPermission().then(perm => {
      notificationPermission = perm;
      if (perm === 'granted') {
        KR.toast.success('Notifikasi browser diaktifkan 🔔');
      }
    });
  }
  
  function showBrowserNotification(count, orderPreview) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    try {
      const title = count === 1 
        ? '🔔 Order Baru Masuk!' 
        : `🔔 ${count} Order Baru!`;
      const body = orderPreview 
        ? `${orderPreview.product_name} — ${fmt(orderPreview.product_price)}\n${orderPreview.customer_name || 'Customer'}`
        : 'Cek dashboard untuk detail';
      
      const notif = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'kasirku-new-order',  // auto-replace notif lama
        requireInteraction: false,
      });
      
      // Klik notif → fokus ke tab & buka tab Pesanan
      notif.onclick = () => {
        window.focus();
        if (typeof showTab === 'function') showTab('pesanan');
        notif.close();
      };
      
      setTimeout(() => notif.close(), 10000);
    } catch (e) {
      console.warn('[Notification] Browser notif failed', e);
    }
  }
  
  // Handler utama: dipanggil saat jumlah pending order bertambah
  function onNewOrderDetected(newCount, diff, latestOrder) {
    // 1. Bunyi
    playNewOrderSound();
    
    // 2. Toast
    KR.toast.success(
      diff === 1 
        ? `Order baru masuk! (${latestOrder?.product_name || 'Produk'})` 
        : `${diff} order baru masuk!`,
      5000
    );
    
    // 3. Flash title
    startTitleFlash(newCount);
    
    // 4. Browser notification (kalau diizinkan)
    showBrowserNotification(diff, latestOrder);
    
    // 5. Vibrate (kalau di HP)
    if (navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200, 100, 200]); } catch (e) {}
    }
  }
  
  // Setup listener untuk unlock audio & minta izin notifikasi
  function setupNotificationListeners() {
    const unlockHandler = () => {
      unlockAudio();
      requestNotificationPermission();
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('touchstart', unlockHandler);
      document.removeEventListener('keydown', unlockHandler);
    };
    document.addEventListener('click', unlockHandler, { once: false });
    document.addEventListener('touchstart', unlockHandler, { once: false });
    document.addEventListener('keydown', unlockHandler, { once: false });
  }

  // ============== FETCH ==============

  async function loadOrders(silent = false) {
    if (!KR.auth.isLoggedIn()) return;

    try {
      const data = await KR.sb.fetchOnlineOrders();
      const prevOrders = orders;
      orders = data || [];

      // Deteksi order baru
      const newPendingCount = orders.filter(o => o.status === 'pending' && !o.archived).length;

      if (lastPendingCount !== null && newPendingCount > lastPendingCount && !silent) {
        const diff = newPendingCount - lastPendingCount;
        const latestOrder = orders
          .filter(o => !prevOrders.find(p => p.id === o.id))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        // Panggil handler notifikasi (dari patch notifikasi sebelumnya)
        if (typeof onNewOrderDetected === 'function') {
          onNewOrderDetected(newPendingCount, diff, latestOrder);
        }
      }

      lastPendingCount = newPendingCount;
      renderOrders();
      updateNavBadge();
    } catch (e) {
      console.error('[Orders] Load failed', e);
    }
  }

  async function refreshOrders(evt) {
  const btn = evt?.target;
    if (btn) {
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i>';
    }
    await loadOrders();
    if (window.lucide) lucide.createIcons();
    if (btn) {
      btn.disabled = false;
      if (orig) btn.innerHTML = orig;
    }
    KR.toast.success('Data diperbarui');
  }
  window.refreshOrders = refreshOrders;

  // ============== BADGE ==============
  function updateNavBadge() {
    const badge = $('orders-badge');
    if (!badge) return;
    const pendingCount = orders.filter(o => o.status === 'pending' && !o.archived).length;
    if (pendingCount > 0) {
      badge.textContent = pendingCount > 99 ? '99+' : pendingCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // ============== SUPABASE REALTIME ==============
  async function setupRealtime() {
    if (realtimeChannel) return;
    if (!KR.auth.isLoggedIn()) return;

    try {
      const user = await KR.sb.getUser();
      if (!user) return;

      realtimeChannel = KR.sb.client
        .channel('online-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'online_orders',
            filter: `seller_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[Realtime] Event:', payload.eventType);
            loadOrders();
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Terhubung — order masuk instant');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[Realtime] Gagal connect, fallback polling');
          }
        });
    } catch (e) {
      console.warn('[Realtime] Setup failed', e);
    }
  }

  function teardownRealtime() {
    if (realtimeChannel) {
      try { KR.sb.client.removeChannel(realtimeChannel); } catch (e) {}
      realtimeChannel = null;
    }
  }

  function startAutoRefresh() {
    if (refreshTimer) return;
    // Fallback polling 60 detik — Realtime akan lebih cepat
    refreshTimer = setInterval(() => {
      if (KR.auth.isLoggedIn()) loadOrders();
    }, 60000);
  }
   
  function stopAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  }

  // ============== RENDER ==============
  function getFiltered() {
    return orders.filter(o => {
      if (filterStatus === 'archived') return o.archived === true;
      if (o.archived) return false;
      if (filterStatus === 'active') return o.status === 'pending' || o.status === 'verified';
      if (filterStatus === 'pending') return o.status === 'pending';
      if (filterStatus === 'done') return o.status === 'done';
      if (filterStatus === 'all') return true;
      return true;
    });
  }

  function renderOrders() {
    const listEl = $('orders-list');
    const countEl = $('orders-count-label');
    const statsEl = $('orders-stats');
    if (!listEl) return;

    // Stats (dari seluruh data, bukan filtered)
    const active = orders.filter(o => !o.archived);
    const stats = {
      pending:   active.filter(o => o.status === 'pending').length,
      verified:  active.filter(o => o.status === 'verified').length,
      done:      active.filter(o => o.status === 'done').length,
      cancelled: active.filter(o => o.status === 'cancelled').length,
    };

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="order-stat clickable ${filterStatus === 'pending' ? 'active' : ''}" onclick="setOrderFilter('pending')">
          <div class="order-stat-label">Menunggu</div>
          <div class="order-stat-value pending">${stats.pending}</div>
        </div>
        <div class="order-stat clickable ${filterStatus === 'active' ? 'active' : ''}" onclick="setOrderFilter('active')">
          <div class="order-stat-label">Aktif</div>
          <div class="order-stat-value verified">${stats.pending + stats.verified}</div>
        </div>
        <div class="order-stat clickable ${filterStatus === 'done' ? 'active' : ''}" onclick="setOrderFilter('done')">
          <div class="order-stat-label">Selesai</div>
          <div class="order-stat-value done">${stats.done}</div>
        </div>
        <div class="order-stat clickable ${filterStatus === 'archived' ? 'active' : ''}" onclick="setOrderFilter('archived')">
          <div class="order-stat-label">Arsip</div>
          <div class="order-stat-value cancelled">${orders.filter(o => o.archived).length}</div>
        </div>`;
    }

    const list = getFiltered();
    if (countEl) countEl.textContent = list.length + ' pesanan';

    if (!list.length) {
      listEl.innerHTML = `<div class="empty-state">
        <i data-lucide="inbox"></i>
        <h3>Tidak ada pesanan</h3>
        <p>${filterStatus === 'archived' ? 'Belum ada yang diarsipkan' : 'Pesanan baru akan muncul di sini'}</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listEl.innerHTML = list.map(o => renderOrderCard(o)).join('');
    if (window.lucide) lucide.createIcons();
  }

  function renderOrderCard(o) {
    const status = STATUS_LABEL[o.status] || STATUS_LABEL.pending;
    const method = METHOD_LABEL[o.delivery_method || 'digital'] || METHOD_LABEL.digital;
    const code = '#' + String(o.id).replace(/-/g, '').slice(0, 6).toUpperCase();
    const isCod = o.delivery_method === 'cod';
    const archived = !!o.archived;

    // Thumbnail — produk foto (kalau ada) atau icon default
    const thumb = o.product_image_url
      ? `<img src="${esc(o.product_image_url)}" alt="">`
      : `<i data-lucide="package"></i>`;

    // Meta items
    const metaItems = [];
    if (o.delivery_method === 'digital' || !o.delivery_method) {
      if (o.target_number) metaItems.push(`<span class="order-meta-item"><i data-lucide="hash"></i>${esc(o.target_number)}</span>`);
    } else {
      if (o.delivery_address) metaItems.push(`<span class="order-meta-item address"><i data-lucide="map-pin"></i>${esc(o.delivery_address)}</span>`);
    }
    if (o.customer_name) metaItems.push(`<span class="order-meta-item"><i data-lucide="user"></i>${esc(o.customer_name)}</span>`);
    if (o.customer_phone) metaItems.push(`<span class="order-meta-item"><i data-lucide="phone"></i>${esc(o.customer_phone)}</span>`);

    // Proof (kecuali COD)
    const proofHtml = (!isCod && o.payment_proof_url)
      ? `<img src="${esc(o.payment_proof_url)}" class="order-proof" onclick="window.open(this.src,'_blank')" alt="Bukti transfer">`
      : isCod
        ? `<div class="order-notes" style="background:var(--accent-soft);color:#4338ca;">💵 COD — Bayar di tempat (${fmt(o.product_price)})</div>`
        : `<div class="order-notes" style="background:var(--danger-soft);color:var(--danger);">⚠ Bukti transfer tidak ada</div>`;

    // Notes
    const notesHtml = o.notes ? `<div class="order-notes">📝 ${esc(o.notes)}</div>` : '';

    // Action buttons berdasarkan status
    const actions = [];

    if (!archived) {
      if (o.status === 'pending') {
        actions.push(`<button class="btn btn-primary" onclick="verifyOrder('${o.id}')"><i data-lucide="check"></i> Verifikasi</button>`);
        actions.push(`<button class="btn btn-danger" onclick="cancelOrder('${o.id}')"><i data-lucide="x"></i> Batalkan</button>`);
      }
      if (o.status === 'verified') {
        actions.push(`<button class="btn btn-success" onclick="completeOrder('${o.id}')"><i data-lucide="check-circle"></i> Selesai</button>`);
        actions.push(`<button class="btn btn-ghost" onclick="backToPending('${o.id}')"><i data-lucide="rotate-ccw"></i> Balik</button>`);
      }
      if (o.status === 'done' || o.status === 'cancelled') {
        actions.push(`<button class="btn btn-secondary" onclick="archiveOrder('${o.id}')"><i data-lucide="archive"></i> Arsipkan</button>`);
      }
    } else {
      actions.push(`<button class="btn btn-secondary" onclick="unarchiveOrder('${o.id}')"><i data-lucide="archive-restore"></i> Keluarkan</button>`);
    }

    // WA Contact (selalu ada kalau ada nomor)
    if (o.customer_phone) {
      actions.push(`<button class="btn btn-secondary" onclick="contactCustomer('${o.id}')"><i data-lucide="message-circle"></i> Chat WA</button>`);
    }

    // Hapus permanen (selalu ada)
    actions.push(`<button class="btn btn-ghost full-width" onclick="deleteOrder('${o.id}')" style="color:var(--danger);"><i data-lucide="trash-2"></i> Hapus Permanen</button>`);

    return `
      <div class="order-card ${archived ? 'archived' : ''}">
        <div class="order-card-header">
          <div class="order-thumb">${thumb}</div>
            <div class="order-body">
              <div class="order-product">${esc(o.product_name)}</div>
              <div class="order-price">${fmt(o.product_price)}</div>
              <div class="order-code">
                ${code} • ${timeAgo(o.created_at)}
                ${o.items && Array.isArray(o.items) && o.items.length > 1
                  ? ` • <span style="color:var(--primary);font-weight:800;">${o.items.length} item</span>`
                  : ''}
              </div>
            </div>

          <span class="status-badge ${status.color}">
            <i data-lucide="${status.icon}"></i>${status.text}
          </span>
        </div>

        <div class="order-meta">
          <span class="order-method-tag ${method === METHOD_LABEL.cod ? 'cod' : method === METHOD_LABEL.pickup ? 'pickup' : method === METHOD_LABEL.digital ? 'digital' : ''}">
            <i data-lucide="${method.icon}"></i>${method.text}
          </span>
          ${metaItems.join('')}
        </div>
        ${o.items && Array.isArray(o.items) && o.items.length > 1
          ? `<div class="order-notes" style="background:var(--bg-subtle);color:var(--text-2);font-family:'JetBrains Mono',monospace;font-size:.72rem;line-height:1.6;">
              ${o.items.map(it => `• ${it.qty}× ${esc(it.name)} — ${fmt(it.price * it.qty)}`).join('<br>')}
             </div>`
          : ''}

        ${notesHtml}
        ${proofHtml}

        <div class="order-actions">${actions.join('')}</div>
      </div>`;
  }

  function setOrderFilter(f) {
    filterStatus = f;
    renderOrders();
  }
  window.setOrderFilter = setOrderFilter;

  // ============== ACTIONS ==============
  async function updateStatus(id, newStatus) {
    showLoading('Memperbarui...');
    try {
      await KR.sb.updateOnlineOrderStatus(id, newStatus);
      const o = orders.find(x => x.id === id);
      if (o) o.status = newStatus;
      renderOrders();
      updateNavBadge();
      KR.toast.success('Status diperbarui');
    } catch (e) {
      console.error(e);
      KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
    } finally {
      hideLoading();
    }
  }

  window.verifyOrder = function (id) {
    confirmDialog('Verifikasi Pesanan?', 'Pesanan akan masuk ke status "Diproses". Pastikan bukti transfer sudah dicek.', () => {
      updateStatus(id, 'verified');
    });
  };

  window.completeOrder = function (id) {
    confirmDialog('Tandai Selesai?', 'Pesanan sudah selesai diproses?', () => {
      updateStatus(id, 'done');
    });
  };

  window.cancelOrder = function (id) {
    confirmDialog('Batalkan Pesanan?', 'Pesanan akan dibatalkan. Customer tidak akan melihat update ini kecuali kamu hubungi manual.', () => {
      updateStatus(id, 'cancelled');
    });
  };

  window.backToPending = function (id) {
    confirmDialog('Kembalikan ke Menunggu?', 'Status akan kembali ke "Menunggu Verifikasi".', () => {
      updateStatus(id, 'pending');
    });
  };

  window.archiveOrder = async function (id) {
    showLoading('Mengarsipkan...');
    try {
      await KR.sb.archiveOnlineOrder(id, true);
      const o = orders.find(x => x.id === id);
      if (o) o.archived = true;
      renderOrders();
      updateNavBadge();
      KR.toast.success('Pesanan diarsipkan');
    } catch (e) {
      console.error(e);
      KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
    } finally {
      hideLoading();
    }
  };

  window.unarchiveOrder = async function (id) {
    showLoading('Mengembalikan...');
    try {
      await KR.sb.archiveOnlineOrder(id, false);
      const o = orders.find(x => x.id === id);
      if (o) o.archived = false;
      renderOrders();
      updateNavBadge();
      KR.toast.success('Pesanan dikembalikan');
    } catch (e) {
      console.error(e);
      KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
    } finally {
      hideLoading();
    }
  };

  window.deleteOrder = function (id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    const code = '#' + String(o.id).replace(/-/g, '').slice(0, 6).toUpperCase();
    confirmDialog(
      'Hapus Permanen?',
      `Pesanan ${code} (${o.product_name}) akan dihapus dari database selamanya. Tidak bisa dikembalikan.`,
      async () => {
        showLoading('Menghapus...');
        try {
          // Hapus bukti dari storage kalau ada
          if (o.payment_proof_url) {
            try { await KR.sb.deletePaymentProof(o.payment_proof_url); } catch (e) { console.warn(e); }
          }
          await KR.sb.deleteOnlineOrder(id);
          orders = orders.filter(x => x.id !== id);
          renderOrders();
          updateNavBadge();
          KR.toast.success('Pesanan dihapus');
        } catch (e) {
          console.error(e);
          KR.toast.error('Gagal: ' + (e.message || 'Unknown'));
        } finally {
          hideLoading();
        }
      }
    );
  };

  window.contactCustomer = function (id) {
    const o = orders.find(x => x.id === id);
    if (!o || !o.customer_phone) return KR.toast.error('Nomor customer tidak ada');

    let phone = String(o.customer_phone).replace(/[^\d]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (!phone.startsWith('62')) phone = '62' + phone;

    const code = '#' + String(o.id).replace(/-/g, '').slice(0, 6).toUpperCase();
    const lines = [
      `Halo${o.customer_name ? ' ' + o.customer_name : ''} 👋`,
      '',
      `Kami dari toko, mau konfirmasi pesanan kamu:`,
      `📦 ${o.product_name}`,
      `💰 ${fmt(o.product_price)}`,
      `🔖 ${code}`,
      '',
      o.status === 'pending' ? 'Pesanan sedang kami verifikasi ya 🙏' :
      o.status === 'verified' ? 'Pesanan sedang kami proses 🚀' :
      o.status === 'done' ? 'Pesanan sudah selesai ✅' :
      o.status === 'cancelled' ? 'Mohon maaf, pesanan dibatalkan 🙏' : '',
    ].filter(Boolean);

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
  };

  // ============== SETTINGS — Pesanan Online ==============
  async function loadOnlineSettings() {
    try {
      const profile = await KR.sb.getProfile();
      if (!profile) return;
      const setVal = (id, v) => { const el = $(id); if (el) el.value = v || ''; };
      setVal('set-payment-info', profile.payment_info);
      setVal('set-whatsapp-number', profile.whatsapp_number);
      setVal('set-store-slug', profile.store_slug || profile.username || '');
      const toggle = $('set-online-enabled');
      if (toggle) toggle.checked = profile.online_order_enabled !== false;

      updateSlugPreview(profile.store_slug || '');

      // Bind live preview di input slug
      const slugEl = $('set-store-slug');
      if (slugEl && !slugEl._bound) {
        slugEl._bound = true;
        slugEl.addEventListener('input', () => {
          const s = slugEl.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
          slugEl.value = s;
          updateSlugPreview(s);
        });
      }
    } catch (e) {
      console.warn('[OnlineSettings]', e);
    }
  }

  function updateSlugPreview(slug) {
    const linkEl = $('online-order-link');
    if (!linkEl) return;
    const base = location.origin;
    const validSlug = slug && /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug);
    if (validSlug) {
      const url = `${base}/toko/${slug}`;
      linkEl.textContent = url;
      linkEl.dataset.url = url;
    } else {
      // Fallback ke username
      const profile = KR.auth.getUser();
      const uname = profile?.username || '';
      const url = `${base}/order.html?seller=${encodeURIComponent(uname)}`;
      linkEl.textContent = url;
      linkEl.dataset.url = url;
    }
  }
  window.loadOnlineSettings = loadOnlineSettings;

  async function saveOnlineSettings() {
    if (!KR.auth.isLoggedIn()) return;
    const paymentInfo = $('set-payment-info')?.value.trim() || '';
    const waNumber = $('set-whatsapp-number')?.value.trim() || '';
    const enabled = $('set-online-enabled')?.checked ?? true;
    const storeSlug = ($('set-store-slug')?.value || '').trim().toLowerCase();

    if (waNumber && !/^62\d{8,14}$/.test(waNumber.replace(/[^\d]/g, ''))) {
      KR.toast.warn('Format WA harus diawali 62 (contoh: 6285888082252)');
      return;
    }

    if (storeSlug && !/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(storeSlug)) {
      KR.toast.warn('Slug tidak valid. Huruf kecil, angka, dan dash (-). Min 3, max 30 karakter.');
      return;
    }

    showLoading('Menyimpan...');
    try {
      await KR.sb.updateProfile({
        payment_info: paymentInfo,
        whatsapp_number: waNumber,
        online_order_enabled: enabled,
        store_slug: storeSlug || null,
      });
      KR.toast.success('Pengaturan pesanan online disimpan');
      // Update cache user
      const a = KR.auth.getUser();
      if (a) { a.store_slug = storeSlug; KR.store.set('authCache', a); }
    } catch (e) {
      console.error(e);
      const msg = e.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        KR.toast.error('Slug sudah dipakai toko lain. Coba yang berbeda.');
      } else {
        KR.toast.error('Gagal: ' + (msg || 'Unknown'));
      }
    } finally {
      hideLoading();
    }
  }
  window.saveOnlineSettings = saveOnlineSettings;

  window.copyOrderLink = function () {
    const linkEl = $('online-order-link');
    const url = linkEl?.dataset.url;
    if (!url) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => KR.toast.success('Link disalin!'))
        .catch(() => KR.toast.error('Gagal copy'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      KR.toast.success('Link disalin!');
    }
  };

  // ============== EXPOSE & INIT ==============
  window.loadOrders = loadOrders;
  window.updateOrdersBadge = updateNavBadge;

  window.addEventListener('kasirku:ready', () => {
    setupNotificationListeners();
    if (KR.auth.isLoggedIn()) {
      // Set lastPendingCount ke state saat ini biar tidak bunyi saat first load
      KR.sb.fetchOnlineOrders().then(data => {
        orders = data || [];
        lastPendingCount = orders.filter(o => o.status === 'pending' && !o.archived).length;
        renderOrders();
        updateNavBadge();
      }).catch(() => {});
      startAutoRefresh();
      setupRealtime();  // ← TAMBAHAN: koneksi WebSocket instant
    }
  });

  // Restart auto-refresh setelah login
  const _origSubmitLogin = KR.auth?.submitLogin;
  if (_origSubmitLogin) {
    // Sudah di-wrap oleh auth, kita hook via event
    window.addEventListener('transactions:changed', () => {});
  }

  // Pantau status login — kalau berubah, sync

  setInterval(() => {
    const now = KR.auth?.isLoggedIn?.() || false;
    if (now !== lastLoginState) {
      lastLoginState = now;
      if (now) {
        loadOrders();
        startAutoRefresh();
        setupRealtime();
      } else {
        stopAutoRefresh();
        teardownRealtime();
      }
    }
  }, 5000);

})();
