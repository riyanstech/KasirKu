/* ==========================================
   KasirKu — PWA Module (v3 — Reliable)
   ========================================== */
window.KR = window.KR || {};

KR.pwa = (function () {
  'use strict';

  let deferredPrompt = null;
  let installed = false;
  const DISMISS_KEY = 'kasir:pwa_dismissed_at';
  const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 1 hari saja

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.startsWith('android-app://');

  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = () => /Android/i.test(navigator.userAgent);
  const isMobile = () => isIOS() || isAndroid();

  function wasDismissedRecently() {
    try {
      const ts = localStorage.getItem(DISMISS_KEY);
      if (!ts) return false;
      return (Date.now() - Number(ts)) < DISMISS_DURATION;
    } catch (e) { return false; }
  }

  function markDismissed() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  function showBanner() {
    if (isStandalone()) return;
    if (installed) return;
    const el = document.getElementById('pwa-banner');
    if (el) {
      el.classList.remove('hidden');
      console.log('[PWA] Banner shown');
    }
  }

  function hideBanner() {
    const el = document.getElementById('pwa-banner');
    if (el) el.classList.add('hidden');
  }

  function setStatus(text) {
    const status = document.getElementById('pwa-banner-status');
    if (status) status.textContent = text || '';
  }

  async function triggerInstall() {
    console.log('[PWA] Install clicked');
    if (isStandalone()) {
      if (KR.toast) KR.toast.info('Aplikasi sudah terinstall ✅');
      return;
    }
    if (isIOS()) { showIOSInstructions(); return; }

    if (deferredPrompt) {
      try {
        setStatus('Membuka dialog install...');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setStatus('✓ Sedang di-install...');
          installed = true;
          setTimeout(hideBanner, 800);
          if (KR.toast) KR.toast.success('KasirKu ditambahkan ke homescreen! 🎉');
        } else {
          setStatus('');
          markDismissed();
          hideBanner();
        }
        deferredPrompt = null;
      } catch (e) {
        console.warn('[PWA] Install error', e);
        showAndroidInstructions();
      }
      return;
    }

    showAndroidInstructions();
  }

  function showIOSInstructions() {
    const modal = document.getElementById('pwa-ios-modal');
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
  }

  function showAndroidInstructions() {
    const modal = document.getElementById('pwa-android-modal');
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
    else alert('Cara install:\n1. Tap menu ⋮ di Chrome\n2. Pilih "Install app"\n3. Tap Install');
  }

  function closeInstructions() {
    document.getElementById('pwa-ios-modal')?.classList.remove('active');
    document.getElementById('pwa-android-modal')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  function init() {
    console.log('[PWA] Init — mobile:', isMobile(), 'standalone:', isStandalone());
    if (isStandalone()) {
      installed = true;
      document.documentElement.classList.add('pwa-standalone');
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('[PWA] ✅ beforeinstallprompt ready');
    });

    window.addEventListener('appinstalled', () => {
      installed = true;
      markDismissed();
      hideBanner();
      if (KR.toast) KR.toast.success('KasirKu berhasil di-install! 🎉');
    });

    // Auto-show banner di mobile setelah 1.5 detik (kalau belum dismiss)
    if (isMobile() && !wasDismissedRecently()) {
      setTimeout(() => {
        showBanner();
      }, 1500);
    }
  }

  function canInstall() { return !!deferredPrompt; }

  return {
    init, isStandalone, isIOS, isAndroid, isMobile, canInstall,
    triggerInstall, showBanner, hideBanner, markDismissed,
    showIOSInstructions, showAndroidInstructions, closeInstructions,
  };
})();
