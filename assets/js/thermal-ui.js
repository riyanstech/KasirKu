/* ==========================================
   KasirKu — Thermal Printer UI (Premium)
   Modal panduan, scanning, sukses, error
   ========================================== */
window.KR = window.KR || {};

KR.thermalUI = (function () {
  'use strict';

  let _resolveConnect = null;

  /* ==========================================
     INJECT CSS
     ========================================== */
  function injectStyles() {
    if (document.getElementById('thermal-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'thermal-ui-styles';
    style.textContent = `
      /* ===== OVERLAY ===== */
      .tu-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(6, 44, 34, .55);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        animation: tuFadeIn .3s ease;
      }
      @keyframes tuFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes tuFadeOut { to { opacity: 0; } }

      .tu-overlay.closing { animation: tuFadeOut .25s ease forwards; }

      /* ===== CARD ===== */
      .tu-card {
        position: relative;
        width: 100%;
        max-width: 420px;
        background: #fff;
        border-radius: 28px;
        overflow: hidden;
        box-shadow:
          0 32px 80px -20px rgba(6, 44, 34, .45),
          0 12px 32px -8px rgba(6, 44, 34, .25),
          inset 0 1px 0 rgba(255,255,255,.6);
        animation: tuPopIn .4s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes tuPopIn {
        from { opacity: 0; transform: scale(.9) translateY(30px); }
        to { opacity: 1; transform: none; }
      }

      /* ===== HEADER ===== */
      .tu-head {
        position: relative;
        padding: 32px 24px 24px;
        text-align: center;
        background:
          radial-gradient(ellipse 80% 100% at 50% 0%, rgba(16,185,129,.28), transparent 70%),
          linear-gradient(135deg, #10b981 0%, #059669 55%, #065f46 100%);
        color: #fff;
        overflow: hidden;
      }
      .tu-head::before {
        content: '';
        position: absolute;
        top: -40%; right: -20%;
        width: 240px; height: 240px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,.35), transparent 65%);
        filter: blur(30px);
        pointer-events: none;
      }
      .tu-head::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(105deg,
          transparent 30%, rgba(255,255,255,.1) 45%,
          rgba(255,255,255,.2) 50%, rgba(255,255,255,.1) 55%,
          transparent 70%);
        background-size: 200% 100%;
        animation: tuShimmer 3s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes tuShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .tu-head.warn {
        background:
          radial-gradient(ellipse 80% 100% at 50% 0%, rgba(245,158,11,.3), transparent 70%),
          linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #92400e 100%);
      }
      .tu-head.error {
        background:
          radial-gradient(ellipse 80% 100% at 50% 0%, rgba(239,68,68,.3), transparent 70%),
          linear-gradient(135deg, #ef4444 0%, #dc2626 55%, #991b1b 100%);
      }

      .tu-head-icon {
        position: relative;
        z-index: 1;
        width: 72px; height: 72px;
        margin: 0 auto 14px;
        border-radius: 22px;
        background: rgba(255,255,255,.22);
        border: 1.5px solid rgba(255,255,255,.32);
        backdrop-filter: blur(10px);
        display: grid;
        place-items: center;
        box-shadow: 0 12px 28px -6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.4);
        animation: tuFloat 4s ease-in-out infinite;
      }
      @keyframes tuFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .tu-head-icon svg { width: 34px; height: 34px; color: #fff; stroke-width: 2.2; }

      .tu-head-title {
        position: relative;
        z-index: 1;
        font-size: 1.25rem;
        font-weight: 800;
        letter-spacing: -.02em;
        margin: 0 0 6px;
        text-shadow: 0 2px 8px rgba(0,0,0,.15);
      }
      .tu-head-sub {
        position: relative;
        z-index: 1;
        font-size: .82rem;
        color: rgba(255,255,255,.9);
        line-height: 1.45;
        max-width: 300px;
        margin: 0 auto;
      }

      /* ===== BODY ===== */
      .tu-body {
        padding: 22px 22px 8px;
      }

      /* ===== CHECKLIST ===== */
      .tu-checklist {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 18px;
      }
      .tu-check-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border: 1.5px solid #86efac;
        border-radius: 14px;
        animation: tuSlideIn .4s ease backwards;
      }
      .tu-check-item:nth-child(1) { animation-delay: .05s; }
      .tu-check-item:nth-child(2) { animation-delay: .12s; }
      .tu-check-item:nth-child(3) { animation-delay: .19s; }
      .tu-check-item:nth-child(4) { animation-delay: .26s; }
      @keyframes tuSlideIn {
        from { opacity: 0; transform: translateX(-12px); }
        to { opacity: 1; transform: none; }
      }
      .tu-check-icon {
        width: 22px; height: 22px;
        border-radius: 50%;
        background: linear-gradient(135deg, #10b981, #059669);
        display: grid; place-items: center;
        flex-shrink: 0;
        box-shadow: 0 3px 8px -2px rgba(16,185,129,.5);
        margin-top: 1px;
      }
      .tu-check-icon svg { width: 12px; height: 12px; color: #fff; stroke-width: 3; }
      .tu-check-text {
        flex: 1;
        min-width: 0;
        font-size: .82rem;
        font-weight: 600;
        color: #065f46;
        line-height: 1.4;
      }
      .tu-check-text strong { font-weight: 800; }

      /* ===== PRINTER CHIPS ===== */
      .tu-models {
        margin-bottom: 18px;
      }
      .tu-models-label {
        font-size: .68rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: #64748b;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tu-models-label svg { width: 12px; height: 12px; }
      .tu-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .tu-chip {
        padding: 6px 11px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: .72rem;
        font-weight: 700;
        color: #334155;
        border: 1px solid #e2e8f0;
      }

      /* ===== SCANNING STATE ===== */
      .tu-scan-stage {
        padding: 30px 22px 26px;
        text-align: center;
      }
      .tu-radar {
        position: relative;
        width: 130px; height: 130px;
        margin: 0 auto 22px;
      }
      .tu-radar-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid #10b981;
        opacity: 0;
        animation: tuRadar 2.2s ease-out infinite;
      }
      .tu-radar-ring:nth-child(2) { animation-delay: .7s; }
      .tu-radar-ring:nth-child(3) { animation-delay: 1.4s; }
      @keyframes tuRadar {
        0% { transform: scale(.3); opacity: 1; }
        100% { transform: scale(1); opacity: 0; }
      }
      .tu-radar-core {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 74px; height: 74px;
        border-radius: 50%;
        background: linear-gradient(135deg, #10b981, #059669);
        display: grid; place-items: center;
        box-shadow: 0 12px 32px -6px rgba(16,185,129,.6),
                    inset 0 2px 0 rgba(255,255,255,.3);
        z-index: 2;
        animation: tuPulse 1.8s ease-in-out infinite;
      }
      @keyframes tuPulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.06); }
      }
      .tu-radar-core svg {
        width: 32px; height: 32px;
        color: #fff;
        animation: tuSpin 2.5s linear infinite;
      }
      @keyframes tuSpin {
        to { transform: rotate(360deg); }
      }

      .tu-scan-title {
        font-size: 1.1rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 8px;
        letter-spacing: -.02em;
      }
      .tu-scan-sub {
        font-size: .85rem;
        color: #475569;
        line-height: 1.5;
        margin: 0 0 16px;
        max-width: 320px;
        margin-inline: auto;
      }
      .tu-scan-hint {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 14px;
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border-radius: 14px;
        text-align: left;
        margin-bottom: 8px;
      }
      .tu-scan-hint svg {
        width: 18px; height: 18px;
        color: #92400e;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .tu-scan-hint-text {
        font-size: .78rem;
        color: #78350f;
        line-height: 1.45;
      }
      .tu-scan-hint-text strong {
        font-weight: 800;
        font-family: 'JetBrains Mono', monospace;
      }

      /* ===== SUCCESS STATE ===== */
      .tu-success-stage {
        padding: 32px 24px 26px;
        text-align: center;
      }
      .tu-success-check {
        position: relative;
        width: 96px; height: 96px;
        margin: 0 auto 20px;
      }
      .tu-success-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(16,185,129,.35), transparent 70%);
        animation: tuPulse 2s infinite;
      }
      .tu-success-circle {
        position: relative;
        width: 100%; height: 100%;
        border-radius: 50%;
        background: linear-gradient(135deg, #10b981, #059669);
        display: grid; place-items: center;
        box-shadow: 0 20px 40px -12px rgba(16,185,129,.55),
                    inset 0 2px 0 rgba(255,255,255,.25);
      }
      .tu-success-circle svg {
        width: 46px; height: 46px;
        stroke: #fff;
        stroke-width: 3.5;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-dasharray: 50;
        stroke-dashoffset: 50;
        animation: tuDrawCheck .7s .25s cubic-bezier(.65,0,.35,1) forwards;
      }
      @keyframes tuDrawCheck {
        to { stroke-dashoffset: 0; }
      }

      .tu-success-title {
        font-size: 1.3rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 6px;
        letter-spacing: -.02em;
      }
      .tu-success-sub {
        font-size: .85rem;
        color: #64748b;
        margin: 0 0 18px;
      }
      .tu-device-badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        border: 1.5px solid #86efac;
        border-radius: 16px;
        margin-bottom: 20px;
      }
      .tu-device-badge-icon {
        width: 38px; height: 38px;
        border-radius: 11px;
        background: linear-gradient(135deg, #10b981, #059669);
        display: grid; place-items: center;
        color: #fff;
        box-shadow: 0 4px 10px -2px rgba(16,185,129,.5);
        flex-shrink: 0;
      }
      .tu-device-badge-icon svg { width: 18px; height: 18px; }
      .tu-device-badge-text {
        text-align: left;
      }
      .tu-device-badge-label {
        font-size: .6rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: #059669;
        margin-bottom: 2px;
      }
      .tu-device-badge-name {
        font-size: .88rem;
        font-weight: 800;
        color: #065f46;
        font-family: 'JetBrains Mono', monospace;
      }

      /* ===== ERROR STATE ===== */
      .tu-error-stage {
        padding: 30px 24px 24px;
        text-align: center;
      }
      .tu-error-icon {
        width: 82px; height: 82px;
        margin: 0 auto 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        border: 2px solid #fca5a5;
        display: grid; place-items: center;
        box-shadow: 0 12px 28px -10px rgba(239,68,68,.5),
                    inset 0 2px 0 rgba(255,255,255,.6);
        animation: tuFloat 3.5s ease-in-out infinite;
      }
      .tu-error-icon svg {
        width: 38px; height: 38px;
        color: #dc2626;
        stroke-width: 2.4;
      }
      .tu-error-title {
        font-size: 1.15rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 8px;
        letter-spacing: -.02em;
      }
      .tu-error-msg {
        font-size: .85rem;
        color: #475569;
        line-height: 1.55;
        margin: 0 0 18px;
        max-width: 320px;
        margin-inline: auto;
      }
      .tu-error-tips {
        padding: 14px 16px;
        background: #fef9e7;
        border: 1.5px dashed #fcd34d;
        border-radius: 14px;
        text-align: left;
        margin-bottom: 6px;
      }
      .tu-error-tips-label {
        font-size: .68rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: #92400e;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tu-error-tips-label svg { width: 12px; height: 12px; }
      .tu-error-tips-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .tu-error-tips-list li {
        font-size: .78rem;
        color: #78350f;
        line-height: 1.45;
        padding-left: 18px;
        position: relative;
      }
      .tu-error-tips-list li::before {
        content: '→';
        position: absolute;
        left: 0;
        top: 0;
        font-weight: 900;
        color: #d97706;
      }

      /* ===== FOOTER / BUTTONS ===== */
      .tu-foot {
        padding: 4px 22px 22px;
        display: flex;
        gap: 10px;
      }
      .tu-foot.col { flex-direction: column; }

      .tu-btn {
        flex: 1;
        min-height: 52px;
        padding: 14px 20px;
        border-radius: 16px;
        font-size: .92rem;
        font-weight: 800;
        letter-spacing: -.01em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all .25s cubic-bezier(.34,1.56,.64,1);
        cursor: pointer;
        border: none;
        font-family: inherit;
      }
      .tu-btn svg { width: 18px; height: 18px; flex-shrink: 0; }

      .tu-btn-primary {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        background-size: 200% 200%;
        animation: tuGradientShift 6s ease infinite;
        color: #fff;
        box-shadow: 0 10px 24px -6px rgba(16,185,129,.5),
                    inset 0 1px 0 rgba(255,255,255,.2);
      }
      .tu-btn-primary:hover {
        filter: brightness(1.08);
        transform: translateY(-2px);
        box-shadow: 0 14px 28px -8px rgba(16,185,129,.6);
      }
      .tu-btn-primary:active { transform: scale(.97); }
      @keyframes tuGradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .tu-btn-ghost {
        background: #f1f5f9;
        color: #475569;
        border: 1.5px solid #e2e8f0;
      }
      .tu-btn-ghost:hover {
        background: #e2e8f0;
        color: #0f172a;
        transform: translateY(-2px);
      }

      .tu-btn-danger {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: #fff;
        box-shadow: 0 8px 20px -6px rgba(239,68,68,.5);
      }
      .tu-btn-danger:hover {
        filter: brightness(1.08);
        transform: translateY(-2px);
      }

      .tu-btn-sm {
        min-height: 44px;
        font-size: .82rem;
        padding: 10px 16px;
      }

      /* ===== MOBILE TWEAKS ===== */
      @media (max-width: 480px) {
        .tu-overlay { padding: 12px; }
        .tu-card { border-radius: 24px; }
        .tu-head { padding: 26px 20px 20px; }
        .tu-head-icon { width: 62px; height: 62px; border-radius: 18px; }
        .tu-head-icon svg { width: 30px; height: 30px; }
        .tu-head-title { font-size: 1.1rem; }
        .tu-head-sub { font-size: .78rem; }
        .tu-body { padding: 18px 18px 6px; }
        .tu-foot { padding: 4px 18px 18px; }
        .tu-btn { min-height: 48px; font-size: .88rem; }
        .tu-scan-stage, .tu-success-stage, .tu-error-stage { padding: 24px 18px 20px; }
        .tu-radar { width: 110px; height: 110px; }
        .tu-radar-core { width: 64px; height: 64px; }
        .tu-radar-core svg { width: 26px; height: 26px; }
        .tu-error-icon { width: 70px; height: 70px; }
        .tu-error-icon svg { width: 32px; height: 32px; }
      }

      /* ===== REDUCED MOTION ===== */
      @media (prefers-reduced-motion: reduce) {
        .tu-overlay, .tu-card, .tu-head::after, .tu-head-icon,
        .tu-check-item, .tu-radar-ring, .tu-radar-core, .tu-radar-core svg,
        .tu-success-ring, .tu-success-circle svg, .tu-error-icon,
        .tu-btn-primary { animation: none !important; }
        .tu-success-circle svg { stroke-dashoffset: 0 !important; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ==========================================
     HELPERS
     ========================================== */
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function icon(name, size = 24) {
    return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;"></i>`;
  }

  function refreshIcons() {
    if (window.lucide) lucide.createIcons();
  }

  function destroy(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('closing');
    setTimeout(() => el.remove(), 260);
  }

  function createOverlay(innerHtml) {
    const el = document.createElement('div');
    el.className = 'tu-overlay';
    el.innerHTML = `<div class="tu-card">${innerHtml}</div>`;
    document.body.appendChild(el);
    refreshIcons();
    return el;
  }

  /* ==========================================
     MODAL 1: PANDUAN (PRE-CONNECT)
     ========================================== */
  function showGuide() {
    return new Promise((resolve) => {
      injectStyles();
      const el = createOverlay(`
        <div class="tu-head">
          <div class="tu-head-icon">${icon('printer', 34)}</div>
          <h2 class="tu-head-title">Hubungkan Printer Thermal</h2>
          <p class="tu-head-sub">Ikuti langkah di bawah sebelum mulai scan</p>
        </div>

        <div class="tu-body">
          <div class="tu-checklist">
            <div class="tu-check-item">
              <div class="tu-check-icon">${icon('check', 12)}</div>
              <div class="tu-check-text"><strong>Nyalakan printer</strong> dan pastikan dalam jarak ≤ 5 meter</div>
            </div>
            <div class="tu-check-item">
              <div class="tu-check-icon">${icon('check', 12)}</div>
              <div class="tu-check-text"><strong>Bluetooth HP aktif</strong> — cek dari panel notifikasi</div>
            </div>
            <div class="tu-check-item">
              <div class="tu-check-icon">${icon('check', 12)}</div>
              <div class="tu-check-text"><strong>Izin Lokasi ON</strong> — wajib untuk scan BLE di Android</div>
            </div>
            <div class="tu-check-item">
              <div class="tu-check-icon">${icon('check', 12)}</div>
              <div class="tu-check-text"><strong>Printer BLE 4.0</strong> — bukan Bluetooth Classic</div>
            </div>
          </div>

          <div class="tu-models">
            <div class="tu-models-label">
              ${icon('sparkles', 12)}
              <span>Contoh printer yang cocok</span>
            </div>
            <div class="tu-chips">
              <span class="tu-chip">XP-P323B</span>
              <span class="tu-chip">Goojprt PT-210</span>
              <span class="tu-chip">RPP02N</span>
              <span class="tu-chip">Xprinter XP-P3</span>
              <span class="tu-chip">+ puluhan lainnya</span>
            </div>
          </div>
        </div>

        <div class="tu-foot">
          <button class="tu-btn tu-btn-ghost" data-action="cancel">
            ${icon('x', 18)} Batal
          </button>
          <button class="tu-btn tu-btn-primary" data-action="start" style="flex:1.4">
            ${icon('search', 18)} Mulai Cari Printer
          </button>
        </div>
      `);

      el.querySelector('[data-action="cancel"]').onclick = () => {
        destroy(el.id);
        el.remove();
        resolve(false);
      };
      el.querySelector('[data-action="start"]').onclick = () => {
        el.remove();
        resolve(true);
      };
    });
  }

  /* ==========================================
     MODAL 2: SCANNING (muncul di belakang popup Chrome)
     ========================================== */
  let scanningEl = null;
  function showScanning() {
    injectStyles();
    scanningEl = createOverlay(`
      <div class="tu-scan-stage">
        <div class="tu-radar">
          <div class="tu-radar-ring"></div>
          <div class="tu-radar-ring"></div>
          <div class="tu-radar-ring"></div>
          <div class="tu-radar-core">${icon('bluetooth', 32)}</div>
        </div>
        <h3 class="tu-scan-title">Mencari Printer di Sekitar...</h3>
        <p class="tu-scan-sub">
          Chrome akan menampilkan dialog. Pilih printer kamu dari daftar.
        </p>
        <div class="tu-scan-hint">
          ${icon('lightbulb', 18)}
          <div class="tu-scan-hint-text">
            <strong>Tips:</strong> Nama printer biasanya diawali
            <strong>XP-</strong>, <strong>PT-</strong>, <strong>RPP-</strong>, atau
            <strong>BlueTooth Printer</strong>.
          </div>
        </div>
      </div>

      <div class="tu-foot">
        <button class="tu-btn tu-btn-ghost" data-action="cancel">
          ${icon('x', 18)} Batal
        </button>
      </div>
    `);
    scanningEl.querySelector('[data-action="cancel"]').onclick = () => {
      hideScanning();
      if (KR.thermal) {
        try { KR.thermal.disconnect(); } catch (e) {}
      }
    };
    return scanningEl;
  }

  function hideScanning() {
    if (scanningEl) {
      scanningEl.remove();
      scanningEl = null;
    }
  }

  /* ==========================================
     MODAL 3: SUKSES
     ========================================== */
  function showSuccess(deviceName) {
    return new Promise((resolve) => {
      injectStyles();
      const el = createOverlay(`
        <div class="tu-success-stage">
          <div class="tu-success-check">
            <div class="tu-success-ring"></div>
            <div class="tu-success-circle">
              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <h3 class="tu-success-title">Berhasil Terhubung!</h3>
          <p class="tu-success-sub">Printer siap menerima perintah cetak</p>

          <div class="tu-device-badge">
            <div class="tu-device-badge-icon">${icon('printer', 18)}</div>
            <div class="tu-device-badge-text">
              <div class="tu-device-badge-label">Printer Aktif</div>
              <div class="tu-device-badge-name">${esc(deviceName || 'Printer')}</div>
            </div>
          </div>
        </div>

        <div class="tu-foot">
          <button class="tu-btn tu-btn-ghost" data-action="done">
            ${icon('check', 18)} Selesai
          </button>
          <button class="tu-btn tu-btn-primary" data-action="test" style="flex:1.2">
            ${icon('printer', 18)} Test Print
          </button>
        </div>
      `);

      el.querySelector('[data-action="done"]').onclick = () => {
        el.remove();
        resolve('done');
      };
      el.querySelector('[data-action="test"]').onclick = () => {
        el.remove();
        resolve('test');
      };
    });
  }

  /* ==========================================
     MODAL 4: ERROR
     ========================================== */
  function showError(title, message, tips = []) {
    return new Promise((resolve) => {
      injectStyles();
      const tipsHtml = tips.length > 0 ? `
        <div class="tu-error-tips">
          <div class="tu-error-tips-label">
            ${icon('lightbulb', 12)}
            <span>Saran Perbaikan</span>
          </div>
          <ul class="tu-error-tips-list">
            ${tips.map(t => `<li>${esc(t)}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      const el = createOverlay(`
        <div class="tu-head error">
          <div class="tu-head-icon">${icon('alert-triangle', 34)}</div>
          <h2 class="tu-head-title">Gagal Terhubung</h2>
          <p class="tu-head-sub">Jangan khawatir, coba lagi ya</p>
        </div>

        <div class="tu-error-stage">
          <div class="tu-error-icon">${icon('bluetooth-off', 38)}</div>
          <h3 class="tu-error-title">${esc(title)}</h3>
          <p class="tu-error-msg">${esc(message)}</p>
          ${tipsHtml}
        </div>

        <div class="tu-foot col">
          <button class="tu-btn tu-btn-primary" data-action="retry">
            ${icon('refresh-cw', 18)} Coba Lagi
          </button>
          <button class="tu-btn tu-btn-ghost" data-action="close">
            ${icon('x', 18)} Tutup
          </button>
        </div>
      `);

      el.querySelector('[data-action="retry"]').onclick = () => {
        el.remove();
        resolve('retry');
      };
      el.querySelector('[data-action="close"]').onclick = () => {
        el.remove();
        resolve('close');
      };
    });
  }

  /* ==========================================
     MAIN FLOW: CONNECT
     ========================================== */
  async function connectFlow() {
    console.log('[ThermalUI] Start connect flow');

    // 1. Cek dulu support
    if (!KR.thermal) {
      return showError(
        'Modul Tidak Ditemukan',
        'Modul thermal belum dimuat. Coba refresh halaman.',
        ['Reload halaman (tarik ke bawah)', 'Clear cache browser']
      );
    }
    if (!KR.thermal.isSupported()) {
      return showError(
        'Browser Tidak Support',
        'Web Bluetooth belum didukung di browser ini.',
        [
          'Pakai Chrome Android terbaru',
          'Atau Chrome Desktop (Windows/Mac/Linux)',
          'Firefox & Safari belum support',
        ]
      );
    }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      return showError(
        'Butuh HTTPS',
        'Web Bluetooth hanya jalan di HTTPS.',
        ['Akses via https://... bukan http://']
      );
    }

    // 2. Modal panduan
    const shouldStart = await showGuide();
    if (!shouldStart) return;

    // 3. Modal scanning + popup Chrome
    showScanning();

    try {
      const result = await KR.thermal.connect();
      hideScanning();
      console.log('[ThermalUI] Connected:', result);

      if (typeof window.updateThermalStatus === 'function') window.updateThermalStatus();

      // 4. Modal sukses
      const action = await showSuccess(result.name || 'Printer');

      if (action === 'test' && typeof window.thermalTestPrint === 'function') {
        setTimeout(() => window.thermalTestPrint(), 200);
      }
      if (KR.toast) KR.toast.success('Printer terhubung ✅');
    } catch (e) {
      hideScanning();
      console.error('[ThermalUI] Connect error:', e);

      const msg = String(e.message || e);
      const lower = msg.toLowerCase();

      let title, message, tips;

      if (lower.includes('cancel') || lower.includes('user')) {
        title = 'Dibatalkan';
        message = 'Kamu menutup dialog pemilihan printer sebelum memilih.';
        tips = [
          'Klik "Coba Lagi" kalau ingin scan ulang',
          'Pastikan printer menyala & dalam jangkauan',
        ];
      } else if (lower.includes('not found') || lower.includes('no compatible')) {
        title = 'Printer Tidak Ditemukan';
        message = 'Tidak ada printer BLE di sekitar yang bisa terhubung.';
        tips = [
          'Pastikan printer BLE 4.0 sudah menyala',
          'Jarak maksimal 5 meter dari HP',
          'Printer Classic (bukan BLE) tidak akan terdeteksi',
          'Coba matikan-nyalakan Bluetooth HP',
        ];
      } else if (lower.includes('permission') || lower.includes('denied')) {
        title = 'Izin Ditolak';
        message = 'Chrome tidak mendapat izin untuk akses Bluetooth atau Lokasi.';
        tips = [
          'Settings → Apps → Chrome → Permissions',
          'Aktifkan "Nearby devices" & "Location"',
          'Nyalakan GPS dari panel notifikasi',
        ];
      } else if (lower.includes('adapter') || lower.includes('bluetooth')) {
        title = 'Bluetooth Tidak Aktif';
        message = 'Bluetooth HP sedang mati atau tidak tersedia.';
        tips = [
          'Nyalakan Bluetooth dari panel notifikasi',
          'Tunggu 5 detik lalu coba lagi',
        ];
      } else if (lower.includes('gattserverdisconnected') || lower.includes('disconnect')) {
        title = 'Koneksi Terputus';
        message = 'Printer terputus di tengah proses.';
        tips = [
          'Pastikan baterai printer masih cukup',
          'Dekatkan HP ke printer',
          'Nyalakan ulang printer',
        ];
      } else if (lower.includes('write') || lower.includes('characteristic')) {
        title = 'Printer Tidak Support BLE Write';
        message = 'Printer terdeteksi, tapi tidak bisa menerima data.';
        tips = [
          'Printer ini kemungkinan Bluetooth Classic',
          'Cek manual printer — cari label "BLE 4.0"',
          'Hubungi penjual untuk konfirmasi',
        ];
      } else {
        title = 'Terjadi Kesalahan';
        message = msg;
        tips = [
          'Coba ulangi beberapa detik lagi',
          'Restart HP kalau masalah berlanjut',
        ];
      }

      const retry = await showError(title, message, tips);
      if (retry === 'retry') {
        // Rekursif — user mau coba lagi
        setTimeout(() => connectFlow(), 300);
      }
    }
  }

  /* ==========================================
     INIT
     ========================================== */
  function init() {
    injectStyles();
    window.ThermalUI = {
      connectFlow,
      showGuide,
      showScanning,
      hideScanning,
      showSuccess,
      showError,
    };
    console.log('[ThermalUI] Ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    connectFlow,
    showGuide,
    showScanning,
    hideScanning,
    showSuccess,
    showError,
  };
})();
