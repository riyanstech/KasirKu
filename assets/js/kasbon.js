/* ==========================================
   KasirKu — Kasbon / Hutang Piutang (v4 — Final)
   Group by customer, Detail sheet, Items, Export PDF, Manual Form, Delete
   ========================================== */
window.KR = window.KR || {};

KR.kasbon = (function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const fmtRaw = (n) => Math.round(Number(n) || 0).toLocaleString('id-ID');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Sanitize untuk PDF — hapus emoji & karakter yang tidak didukung font Helvetica
  function sanitizePDF(text) {
    return String(text || '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')   // emoji
      .replace(/[\u{2600}-\u{27BF}]/gu, '')     // misc symbols
      .replace(/[\u{1F000}-\u{1F2FF}]/gu, '')   // mahjong/domino
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')     // variation selectors
      .replace(/[^\x00-\x7F\u00A0-\u024F\u2018\u2019\u201C\u201D\u2013\u2014]/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  let list = [];
  let paymentsByKasbon = {};
  let filter = 'active';
  let searchQuery = '';

  /* ==========================================
     DATE HELPERS
     ========================================== */
  function formatDateID(d) {
    const pad = n => String(n).padStart(2, '0');
    const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${pad(d.getDate())} ${bln[d.getMonth()]} ${d.getFullYear()}`;
  }
  function formatDateTimeID(d) {
    const pad = n => String(n).padStart(2, '0');
    const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${pad(d.getDate())} ${bln[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* ==========================================
     LOAD DATA
     ========================================== */
  async function loadKasbon() {
    if (!KR.auth.isLoggedIn()) return;
    const listEl = $('kasbon-list');
    const countEl = $('kasbon-count-label');
    if (countEl) countEl.textContent = 'Memuat...';
    if (listEl) listEl.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Memuat kasbon...</p></div>';
    if (window.lucide) lucide.createIcons();

    try {
      const user = await KR.sb.getUser();

      const { data: kasbonData, error: kErr } = await KR.sb.client
        .from('kasbon')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (kErr) throw kErr;
      list = kasbonData || [];

      paymentsByKasbon = {};
      if (list.length > 0) {
        const kasbonIds = list.map(k => k.id);
        const { data: payData, error: pErr } = await KR.sb.client
          .from('kasbon_payments')
          .select('*')
          .in('kasbon_id', kasbonIds)
          .order('paid_at', { ascending: true });
        if (!pErr && payData) {
          payData.forEach(p => {
            if (!paymentsByKasbon[p.kasbon_id]) paymentsByKasbon[p.kasbon_id] = [];
            paymentsByKasbon[p.kasbon_id].push(p);
          });
        }
      }

      renderKasbon();
    } catch (e) {
      console.error('[Kasbon]', e);
      if (countEl) countEl.textContent = 'Gagal memuat';
      if (listEl) listEl.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Gagal memuat</h3><p>${esc(e.message)}</p></div>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  /* ==========================================
     GROUPING
     ========================================== */
  function groupByCustomer() {
    const groups = {};
    list.forEach(k => {
      const key = (k.customer_name || 'tanpa-nama').toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = {
          key,
          name: k.customer_name || 'Tanpa Nama',
          phones: new Set(),
          kasbons: [],
          totalAmount: 0,
          totalPaid: 0,
          unpaidCount: 0,
          partialCount: 0,
          paidCount: 0,
          lastActivity: 0,
        };
      }
      const g = groups[key];
      g.kasbons.push(k);
      if (k.customer_phone) g.phones.add(k.customer_phone);
      g.totalAmount += Number(k.amount) || 0;
      g.totalPaid += Number(k.paid_amount) || 0;
      if (k.status === 'unpaid') g.unpaidCount++;
      if (k.status === 'partial') g.partialCount++;
      if (k.status === 'paid') g.paidCount++;
      const ts = new Date(k.updated_at || k.created_at).getTime();
      if (ts > g.lastActivity) g.lastActivity = ts;
    });
    return Object.values(groups).map(g => {
      g.phone = [...g.phones][0] || null;
      g.remaining = g.totalAmount - g.totalPaid;
      g.activeCount = g.unpaidCount + g.partialCount;
      return g;
    });
  }

  function getFilteredGroups() {
    let groups = groupByCustomer();

    if (filter === 'active') groups = groups.filter(g => g.activeCount > 0);
    else if (filter === 'unpaid') groups = groups.filter(g => g.unpaidCount > 0);
    else if (filter === 'partial') groups = groups.filter(g => g.partialCount > 0);
    else if (filter === 'paid') groups = groups.filter(g => g.activeCount === 0 && g.paidCount > 0);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      groups = groups.filter(g =>
        (g.name || '').toLowerCase().includes(q) ||
        (g.phone || '').includes(q)
      );
    }

    return groups.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /* ==========================================
     RENDER MAIN LIST
     ========================================== */
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
    const groups = groupByCustomer();

    if (countEl) countEl.textContent = groups.length + ' customer • ' + list.length + ' kasbon';

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
        <div class="order-stat clickable ${filter === 'paid' ? 'active' : ''}" onclick="setKasbonFilter('paid')">
          <div class="order-stat-label">Lunas</div>
          <div class="order-stat-value done">${list.filter(k => k.status === 'paid').length}</div>
        </div>
        <div class="order-stat">
          <div class="order-stat-label">Total Outstanding</div>
          <div class="order-stat-value done" style="font-size:.95rem;">${fmt(outstanding)}</div>
        </div>
        <div class="order-stat clickable ${filter === 'all' ? 'active' : ''}" onclick="setKasbonFilter('all')">
          <div class="order-stat-label">Semua</div>
          <div class="order-stat-value">${groups.length}</div>
        </div>
      `;
    }

    const filtered = getFilteredGroups();
    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-state">
        <i data-lucide="hand-coins"></i>
        <h3>${searchQuery ? 'Tidak ada hasil' : 'Belum ada kasbon'}</h3>
        <p>${searchQuery ? 'Coba kata kunci lain' : 'Kasbon dari transaksi akan muncul di sini'}</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listEl.innerHTML = filtered.map(g => {
      const initial = (g.name || '?')[0].toUpperCase();
      const percent = g.totalAmount > 0 ? Math.round((g.totalPaid / g.totalAmount) * 100) : 0;
      const allPaid = g.activeCount === 0;
      const safeName = esc(g.name).replace(/'/g, "\\'");

      return `
        <div class="kasbon-customer-card">
          <div class="kcc-head" onclick="openCustomerDetail('${safeName}')">
            <div class="kcc-avatar ${allPaid ? 'paid' : ''}">${esc(initial)}</div>
            <div class="kcc-info">
              <div class="kcc-name">
                ${esc(g.name)}
                ${allPaid
                  ? '<span class="customer-badge" style="background:#d1fae5;color:#065f46;">LUNAS</span>'
                  : `<span class="customer-badge" style="background:#fef3c7;color:#92400e;">${g.activeCount} AKTIF</span>`}
              </div>
              ${g.phone ? `<div class="kcc-phone"><i data-lucide="phone" style="width:11px;height:11px;"></i>${esc(g.phone)}</div>` : ''}
              <div class="kcc-stats">
                <span><strong>${fmt(g.remaining)}</strong> sisa</span>
                <span>dari ${fmt(g.totalAmount)}</span>
              </div>
            </div>
          </div>

          ${g.totalPaid > 0 ? `
            <div class="kcc-progress">
              <div class="kcc-progress-label">
                <span>Terbayar ${percent}%</span>
                <span>${fmt(g.totalPaid)}</span>
              </div>
              <div class="kcc-progress-bar"><div class="kcc-progress-fill" style="width:${percent}%;"></div></div>
            </div>
          ` : ''}

          <div class="kcc-actions">
            <button class="kcc-btn" onclick="event.stopPropagation(); openCustomerDetail('${safeName}')">
              <i data-lucide="list"></i> Detail
            </button>
            <button class="kcc-btn primary" onclick="event.stopPropagation(); exportCustomerPDF('${safeName}')">
              <i data-lucide="file-down"></i> PDF
            </button>
            ${g.phone ? `<button class="kcc-btn wa" onclick="event.stopPropagation(); waKasbon('${esc(g.phone)}')" title="Chat WA">
              <i data-lucide="message-circle"></i>
            </button>` : ''}
            <button class="kcc-btn danger" onclick="event.stopPropagation(); deleteCustomerKasbons('${safeName}', ${g.kasbons.length})" title="Hapus semua kasbon customer ini">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================
     CUSTOMER DETAIL SHEET
     ========================================== */
  async function openCustomerDetail(customerName) {
    const groups = groupByCustomer();
    const g = groups.find(x => x.name === customerName);
    if (!g) return;

    const existing = $('kasbon-detail-sheet');
    if (existing) existing.remove();

    // Build events
    const events = [];
    g.kasbons.forEach(k => {
      events.push({
        date: new Date(k.created_at),
        type: 'kasbon',
        amount: Number(k.amount),
        description: k.note || 'Kasbon baru',
        due_date: k.due_date,
        kasbon_id: k.id,
        status: k.status,
        paid_amount: Number(k.paid_amount),
        items: Array.isArray(k.items) ? k.items : [],
      });
      const payments = paymentsByKasbon[k.id] || [];
      payments.forEach(p => {
        events.push({
          date: new Date(p.paid_at),
          type: 'payment',
          amount: Number(p.amount),
          description: p.note || 'Pembayaran',
          method: p.method,
          kasbon_id: k.id,
        });
      });
    });
    events.sort((a, b) => a.date - b.date);

    let runningBalance = 0;
    const safeName = esc(g.name).replace(/'/g, "\\'");

    const sheet = document.createElement('div');
    sheet.id = 'kasbon-detail-sheet';
    sheet.className = 'kds-overlay';
    sheet.innerHTML = `
      <div class="kds-backdrop" onclick="closeKasbonDetail()"></div>
      <div class="kds-card">
        <!-- Header -->
        <div class="kds-head">
          <div class="kds-head-left">
            <div class="kds-avatar">${esc((g.name || '?')[0].toUpperCase())}</div>
            <div class="kds-head-info">
              <div class="kds-head-name">${esc(g.name)}</div>
              ${g.phone ? `<div class="kds-head-phone">${esc(g.phone)}</div>` : ''}
            </div>
          </div>
          <button class="kds-close" onclick="closeKasbonDetail()"><i data-lucide="x"></i></button>
        </div>

        <!-- Body -->
        <div class="kds-body">
          <!-- Summary -->
          <div class="kds-summary">
            <div class="kds-sum-item">
              <div class="kds-sum-label">Total Kasbon</div>
              <div class="kds-sum-value">${fmt(g.totalAmount)}</div>
            </div>
            <div class="kds-sum-item green">
              <div class="kds-sum-label">Terbayar</div>
              <div class="kds-sum-value">${fmt(g.totalPaid)}</div>
            </div>
            <div class="kds-sum-item ${g.remaining > 0 ? 'red' : 'green'}">
              <div class="kds-sum-label">Sisa Hutang</div>
              <div class="kds-sum-value">${fmt(g.remaining)}</div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="kds-section-title">
            <i data-lucide="history"></i> Riwayat Transaksi
          </div>

          <div class="kds-timeline">
            ${events.map(e => {
              if (e.type === 'kasbon') runningBalance += e.amount;
              else runningBalance -= e.amount;
              const isKasbon = e.type === 'kasbon';
              const isPaid = isKasbon && e.status === 'paid';
              const isPartial = isKasbon && e.status === 'partial';
              const hasItems = isKasbon && e.items && e.items.length > 0;

              return `
                <div class="kds-event ${isKasbon ? 'kasbon' : 'payment'}">
                  <div class="kds-event-icon">
                    <i data-lucide="${isKasbon ? 'shopping-bag' : 'banknote'}"></i>
                  </div>
                  <div class="kds-event-body">
                    <div class="kds-event-row1">
                      <span class="kds-event-type">
                        ${isKasbon ? 'Kasbon' : 'Bayar'}
                        ${isPaid ? '<span class="kds-event-tag paid">LUNAS</span>' : ''}
                        ${isPartial ? '<span class="kds-event-tag partial">DICICIL</span>' : ''}
                      </span>
                      <span class="kds-event-date">${formatDateTimeID(e.date)}</span>
                    </div>

                    ${hasItems ? `
                      <div class="kds-event-items">
                        ${e.items.map(it => `
                          <div class="kds-item-line">
                            <span class="kds-item-name">${esc(it.name)}</span>
                            <span class="kds-item-qty">${it.qty}×</span>
                            <span class="kds-item-price">${fmt((it.price || 0) * (it.qty || 1))}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      <div class="kds-event-desc">${esc(e.description)}</div>
                    `}

                    ${!isKasbon && e.method ? `<div class="kds-event-method">via ${esc(e.method)}</div>` : ''}
                    ${isKasbon && e.due_date ? `<div class="kds-event-method">Jatuh tempo: ${formatDateID(new Date(e.due_date))}</div>` : ''}
                  </div>
                  <div class="kds-event-amount ${isKasbon ? 'debit' : 'credit'}">
                    <div class="kds-amt-main">${isKasbon ? '+' : '-'}${fmt(e.amount)}</div>
                    <div class="kds-amt-saldo">Saldo ${fmt(runningBalance)}</div>
                    ${isKasbon && !isPaid ? `
                      <button class="kds-pay-btn" onclick="event.stopPropagation(); openKasbonPay('${e.kasbon_id}')" title="Bayar / Cicil">
                        <i data-lucide="banknote"></i> Bayar
                      </button>
                    ` : ''}
                    ${isKasbon ? `
                      <button class="kds-del-btn" onclick="event.stopPropagation(); deleteSingleKasbon('${e.kasbon_id}', '${esc(g.name).replace(/'/g, "\\'")}')" title="Hapus kasbon ini">
                        <i data-lucide="trash-2"></i>
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="kds-total-card">
            <div class="kds-total-row">
              <span>Total Kasbon</span>
              <strong>${fmt(g.totalAmount)}</strong>
            </div>
            <div class="kds-total-row">
              <span>Total Terbayar</span>
              <strong style="color:#059669;">-${fmt(g.totalPaid)}</strong>
            </div>
            <div class="kds-total-row final">
              <span>SISA HUTANG</span>
              <strong style="color:${g.remaining > 0 ? '#dc2626' : '#059669'};font-size:1.1rem;">${fmt(g.remaining)}</strong>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="kds-foot">
          <button class="kds-btn ghost" onclick="closeKasbonDetail()">
            <i data-lucide="x"></i> Tutup
          </button>
          <button class="kds-btn primary" onclick="exportCustomerPDF('${safeName}')">
            <i data-lucide="file-down"></i> Download PDF
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(sheet);
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
  }

  window.closeKasbonDetail = function () {
    const sheet = $('kasbon-detail-sheet');
    if (sheet) sheet.remove();
    document.body.style.overflow = '';
  };

  /* ==========================================
     EXPORT PDF
     ========================================== */
  async function exportCustomerPDF(customerName) {
    const jspdfNS = window.jspdf || window.jsPDF;
    if (!jspdfNS || !jspdfNS.jsPDF) {
      return KR.toast.error('Library PDF belum dimuat, coba refresh halaman');
    }
    const { jsPDF } = jspdfNS;

    const groups = groupByCustomer();
    const g = groups.find(x => x.name === customerName);
    if (!g) return KR.toast.error('Customer tidak ditemukan');

    KR.toast.info('Menyiapkan PDF...');

    try {
      const events = [];
      g.kasbons.forEach(k => {
        events.push({
          date: new Date(k.created_at),
          type: 'kasbon',
          amount: Number(k.amount),
          description: k.note || '',
          due_date: k.due_date,
          items: Array.isArray(k.items) ? k.items : [],
        });
        const payments = paymentsByKasbon[k.id] || [];
        payments.forEach(p => {
          events.push({
            date: new Date(p.paid_at),
            type: 'payment',
            amount: Number(p.amount),
            description: p.note || 'Pembayaran',
            method: p.method,
          });
        });
      });
      events.sort((a, b) => a.date - b.date);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      const storeSettings = KR.store.getSettings();

      /* HEADER */
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageW, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(sanitizePDF(storeSettings.storeName) || 'KasirKu', margin, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(220, 255, 240);
      let yHead = 20;
      if (storeSettings.storeAddress) { doc.text(sanitizePDF(storeSettings.storeAddress), margin, yHead); yHead += 4; }
      if (storeSettings.storePhone) { doc.text('Telp: ' + sanitizePDF(storeSettings.storePhone), margin, yHead); }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('LAPORAN KASBON CUSTOMER', margin, 46);

      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.6);
      doc.line(margin, 49, pageW - margin, 49);

      /* CUSTOMER INFO */
      let y = 58;

      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, y, pageW - margin * 2, 26, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(6, 95, 70);
      doc.text('NAMA CUSTOMER', margin + 5, y + 7);
      doc.text('NO. HP', margin + 5, y + 17);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.text(sanitizePDF(g.name) || '-', margin + 50, y + 7);
      doc.setFontSize(10);
      doc.text(sanitizePDF(g.phone) || '-', margin + 50, y + 17);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('Dicetak: ' + formatDateTimeID(new Date()), pageW - margin, y + 7, { align: 'right' });

      y += 34;

      /* SUMMARY */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Ringkasan', margin, y);
      y += 4;

      doc.autoTable({
        startY: y,
        head: [['Keterangan', 'Nilai']],
        body: [
          ['Total Kasbon (' + g.kasbons.length + 'x)', fmt(g.totalAmount)],
          ['Total Terbayar', fmt(g.totalPaid)],
          ['Sisa Hutang', fmt(g.remaining)],
          ['Status', g.activeCount === 0 ? 'LUNAS' : (g.partialCount > 0 ? 'DICICIL' : 'BELUM BAYAR')],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'left' },
        columnStyles: {
          0: { cellWidth: 90, fontStyle: 'bold' },
          1: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 8;

      /* DETAIL */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Riwayat Transaksi', margin, y);
      y += 4;

      let saldo = 0;
      const rows = events.map(e => {
        if (e.type === 'kasbon') saldo += e.amount;
        else saldo -= e.amount;

        const dateStr = formatDateID(e.date);
        const type = e.type === 'kasbon' ? 'Kasbon' : 'Bayar';

        let ket = '';
        if (e.type === 'kasbon') {
          // Items dulu
          if (e.items && e.items.length > 0) {
            ket = e.items.map(it =>
              '- ' + sanitizePDF(it.name) + ' (' + it.qty + 'x ' + fmtRaw(it.price) + ')'
            ).join('\n');
          }
          // Tambah note manual HANYA kalau ada & beda dari "Kasbon baru"
          const manualNote = sanitizePDF(e.description || '');
          if (manualNote && manualNote !== 'Kasbon baru' && manualNote !== 'Kasbon') {
            ket = ket ? ket + '\nCatatan: ' + manualNote : 'Catatan: ' + manualNote;
          }
          if (!ket) ket = 'Kasbon';
        } else {
          ket = sanitizePDF(e.description || 'Pembayaran');
          if (e.method) ket += ' (' + sanitizePDF(e.method) + ')';
        }

        const debit = e.type === 'kasbon' ? fmtRaw(e.amount) : '-';
        const kredit = e.type === 'payment' ? fmtRaw(e.amount) : '-';
        return [dateStr, type, ket, debit, kredit, fmtRaw(saldo)];
      });

      doc.autoTable({
        startY: y,
        head: [['Tanggal', 'Jenis', 'Keterangan', 'Kasbon (Rp)', 'Bayar (Rp)', 'Saldo (Rp)']],
        body: rows,
        theme: 'striped',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          lineColor: [220, 230, 225],
          lineWidth: 0.1,
          valign: 'top',
          overflow: 'linebreak',
          font: 'helvetica',
        },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center', fontSize: 7 },
          1: { cellWidth: 14, halign: 'center', fontSize: 7 },
          2: { cellWidth: 'auto', fontSize: 7.5 },
          3: { cellWidth: 22, halign: 'right', fontSize: 7 },
          4: { cellWidth: 22, halign: 'right', fontSize: 7 },
          5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', fontSize: 7 },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });

      y = doc.lastAutoTable.finalY + 8;

      /* FINAL TOTAL */
      if (y > 250) { doc.addPage(); y = 20; }

      const totalBoxW = pageW - margin * 2;
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(251, 191, 36);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, totalBoxW, 24, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(120, 53, 15);

      doc.text('Total Kasbon:', margin + 5, y + 8);
      doc.text(fmt(g.totalAmount), margin + 55, y + 8);

      doc.text('Total Terbayar:', margin + 5, y + 15);
      doc.text(fmt(g.totalPaid), margin + 55, y + 15);

      doc.setFontSize(12);
      doc.setTextColor(g.remaining > 0 ? 220 : 5, g.remaining > 0 ? 38 : 150, g.remaining > 0 ? 38 : 105);
      doc.text('SISA HUTANG:', pageW - margin - 5, y + 15, { align: 'right' });
      doc.text(fmt(g.remaining), pageW - margin - 5, y + 22, { align: 'right' });

      /* FOOTER */
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(140);
        doc.setFont('helvetica', 'italic');
        doc.text(
          'Dokumen ini dicetak otomatis oleh KasirKu POS (c) ' + new Date().getFullYear(),
          pageW / 2, doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
        doc.setFont('helvetica', 'normal');
        doc.text(
          'Halaman ' + i + ' / ' + pageCount,
          pageW - margin,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'right' }
        );
      }

      /* SAVE */
      const safeName = (g.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`Kasbon_${safeName}_${dateStr}.pdf`);

      KR.toast.success('PDF berhasil diunduh');
    } catch (e) {
      console.error('[ExportKasbonPDF]', e);
      KR.toast.error('Gagal export PDF: ' + (e.message || 'Unknown'));
    }
  }

  /* ==========================================
     PAYMENT MODAL
     ========================================== */
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
    setTimeout(() => $('kp-amount')?.focus(), 200);
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

    const customerName = k.customer_name;
    const wasDetailOpen = !!$('kasbon-detail-sheet');

    showLoading('Menyimpan...');
    try {
      const user = await KR.sb.getUser();
      const { error } = await KR.sb.client.from('kasbon_payments').insert({
        kasbon_id: id, user_id: user.id, amount, method, note,
      });
      if (error) throw error;

      KR.toast.success('Pembayaran dicatat');
      $('kasbon-pay-modal')?.remove();

      if (wasDetailOpen) {
        const sheet = $('kasbon-detail-sheet');
        if (sheet) sheet.remove();
        document.body.style.overflow = '';
      }

      await loadKasbon();

      if (wasDetailOpen) {
        setTimeout(() => openCustomerDetail(customerName), 250);
      }
    } catch (e) {
      console.error(e);
      KR.toast.error('Gagal: ' + e.message);
    } finally {
      hideLoading();
    }
  }

  /* ==========================================
     CREATE KASBON
     ========================================== */
  async function createKasbon({ customerName, customerPhone, amount, note, dueDate, items }) {
    const user = await KR.sb.getUser();

    // TIDAK auto-generate note (biar tidak duplikat dengan items di PDF)
    const { data, error } = await KR.sb.client.from('kasbon').insert({
      user_id: user.id,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      amount,
      note: note || null,
      due_date: dueDate || null,
      items: items || [],
      status: 'unpaid',
    }).select().single();
    if (error) throw error;
    return data;
  }

  /* ==========================================
     DELETE — SINGLE KASBON
     ========================================== */
  window.deleteSingleKasbon = function (id, customerName) {
    const k = list.find(x => x.id === id);
    if (!k) return;
    confirmDialog(
      'Hapus Kasbon Ini?',
      `Kasbon tanggal ${formatDateID(new Date(k.created_at))} senilai ${fmt(k.amount)} akan dihapus permanen.`,
      async () => {
        showLoading('Menghapus...');
        try {
          const { error } = await KR.sb.client.from('kasbon').delete().eq('id', id);
          if (error) throw error;
          KR.toast.success('Kasbon dihapus');

          // Refresh detail sheet
          const sheet = $('kasbon-detail-sheet');
          if (sheet) sheet.remove();
          document.body.style.overflow = '';
          await loadKasbon();
          setTimeout(() => openCustomerDetail(customerName), 250);
        } catch (e) {
          KR.toast.error('Gagal: ' + e.message);
        } finally {
          hideLoading();
        }
      }
    );
  };

  /* ==========================================
     DELETE — ALL KASBON FOR CUSTOMER
     ========================================== */
  window.deleteCustomerKasbons = function (customerName, count) {
    confirmDialog(
      'Hapus Semua Kasbon ' + customerName + '?',
      'Semua ' + count + ' kasbon customer ini akan dihapus permanen beserta riwayat pembayarannya. Tindakan ini tidak bisa dibatalkan.',
      async () => {
        showLoading('Menghapus...');
        try {
          const user = await KR.sb.getUser();
          const { error } = await KR.sb.client
            .from('kasbon')
            .delete()
            .eq('user_id', user.id)
            .eq('customer_name', customerName);
          if (error) throw error;
          KR.toast.success('Semua kasbon ' + customerName + ' dihapus');
          await loadKasbon();
        } catch (e) {
          KR.toast.error('Gagal: ' + e.message);
        } finally {
          hideLoading();
        }
      }
    );
  };

  /* ==========================================
     MANUAL FORM
     ========================================== */
  function openManualKasbonForm() {
    const existing = $('kasbon-manual-modal');
    if (existing) existing.remove();

    const existingCustomers = [...new Set(list.map(k => k.customer_name).filter(Boolean))];

    const modal = document.createElement('div');
    modal.id = 'kasbon-manual-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentNode.remove()"></div>
      <div class="modal-card modal-card-sm">
        <div class="modal-head">
          <h3><i data-lucide="plus-circle"></i> Kasbon Baru</h3>
          <button class="icon-btn" onclick="this.closest('.modal').remove()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nama Customer <span class="req">*</span></label>
            <input id="km-name" class="input" placeholder="Contoh: Bu Sari" list="km-customer-list">
            <datalist id="km-customer-list">
              ${existingCustomers.map(n => `<option value="${esc(n)}">`).join('')}
            </datalist>
          </div>
          <div class="field">
            <label>No. HP / WhatsApp</label>
            <input id="km-phone" class="input" placeholder="08123456789">
          </div>
          <div class="field">
            <label>Jumlah (Rp) <span class="req">*</span></label>
            <input id="km-amount" type="number" class="input input-lg" placeholder="0" min="1">
          </div>
          <div class="field">
            <label>Jatuh Tempo (opsional)</label>
            <input id="km-due" type="date" class="input">
          </div>
          <div class="field">
            <label>Keterangan <span class="req">*</span></label>
            <textarea id="km-note" class="textarea" rows="3" placeholder="Detail barang:&#10;2x Indomie Goreng @3.000&#10;1x Sabun Nuvo @4.000"></textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">Batal</button>
          <button class="btn btn-primary" onclick="submitManualKasbon()">
            <i data-lucide="check"></i> Simpan
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => $('km-name')?.focus(), 200);
  }

  async function submitManualKasbon() {
    const name = $('km-name')?.value.trim();
    const phone = $('km-phone')?.value.trim();
    const amount = Number($('km-amount')?.value);
    const dueDate = $('km-due')?.value || null;
    const note = $('km-note')?.value.trim();

    if (!name) return KR.toast.error('Nama customer wajib');
    if (!amount || amount <= 0) return KR.toast.error('Jumlah harus > 0');
    if (!note) return KR.toast.error('Keterangan wajib diisi');

    showLoading('Menyimpan...');
    try {
      await createKasbon({
        customerName: name,
        customerPhone: phone || null,
        amount,
        note,
        dueDate,
        items: [],
      });
      KR.toast.success('Kasbon dicatat');
      $('kasbon-manual-modal')?.remove();
      await loadKasbon();
    } catch (e) {
      console.error(e);
      KR.toast.error('Gagal: ' + e.message);
    } finally {
      hideLoading();
    }
  }

  /* ==========================================
     WHATSAPP
     ========================================== */
  function waKasbon(phone) {
    let p = String(phone).replace(/[^\d]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    window.open(`https://wa.me/${p}`, '_blank');
  }

  /* ==========================================
     EXPOSE
     ========================================== */
  window.loadKasbon = loadKasbon;
  window.setKasbonFilter = (f) => { filter = f; renderKasbon(); };
  window.setKasbonSearch = (q) => { searchQuery = (q || '').trim(); renderKasbon(); };
  window.openKasbonPay = openKasbonPay;
  window.submitKasbonPay = submitKasbonPay;
  window.waKasbon = waKasbon;
  window.openCustomerDetail = openCustomerDetail;
  window.exportCustomerPDF = exportCustomerPDF;
  window.openManualKasbonForm = openManualKasbonForm;
  window.submitManualKasbon = submitManualKasbon;

  window.addEventListener('kasirku:ready', () => {
    if (KR.auth.isLoggedIn()) setTimeout(loadKasbon, 900);
  });

  return { loadKasbon, createKasbon };
})();
