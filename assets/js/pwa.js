/* ==========================================
   KasirKu — PWA Module
   Install prompt, standalone detection, lifecycle
   ========================================== */
window.KR = window.KR || {};

KR.pwa = (function () {
  'use strict';

  let deferredPrompt = null;
  let installed = false;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.startsWith('android-app://');

  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const isAndroid = () => /Android/i.test(navigator.userAgent);

  function wasDismissedRecently() {
    try {
      const ts = localStorage.getItem('kasir:pwa_dismissed_at');
      if (!ts) return false;
      // Kalau dismiss < 7 hari yang lalu, jangan tampilkan lagi
      return (Date.now() - Number(ts)) < 7 * 24 * 3600 * 1000;
    } catch (e) {
      return false;
    }
  }

  function markDismissed() {
    try { localStorage.setItem('kasir:pwa_dismissed_at', String(Date.now())); } catch (e) {}
  }

  function showBanner() {
    if (isStandalone()) return;
    if (installed) return;
    if (wasDismissedRecently()) return;

    const el = document.getElementById('pwa-banner');
    if (el) {
      // Delay dikit biar gak nabrak loading
      setTimeout(() => el.classList.remove('hidden'), 2500);
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
    if (isIOS()) {
      // iOS: arahkan ke instruksi manual
      showIOSInstructions();
      return;
    }

    if (!deferredPrompt) {
      // Android browser yang gak support auto-prompt
      showAndroidInstructions();
      return;
    }

    try {
      setStatus('Menampilkan dialog install...');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);

      if (outcome === 'accepted') {
        setStatus('✓ KasirKu sedang di-install...');
        installed = true;
        setTimeout(hideBanner, 800);
        if (KR.toast) KR.toast.success('KasirKu ditambahkan ke homescreen!');
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
  }

  function showIOSInstructions() {
    const modal = document.getElementById('pwa-ios-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function showAndroidInstructions() {
    const modal = document.getElementById('pwa-android-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeInstructions() {
    document.getElementById('pwa-ios-modal')?.classList.add('hidden');
    document.getElementById('pwa-android-modal')?.classList.add('hidden');
  }

  function init() {
    // Deteksi sudah installed
    if (isStandalone()) {
      installed = true;
      document.documentElement.classList.add('pwa-standalone');
    }

    // Listener sebelum install prompt muncul (Android Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('[PWA] Install prompt siap');
      showBanner();
    });

    // Deteksi berhasil install

    window.addEventListener('appinstalled', () => {
      installed = true;
      console.log('[PWA] App installed');
      markDismissed();
      hideBanner();
      if (KR.toast) KR.toast.success('KasirKu berhasil di-install! 🎉');
      // Update status di Pengaturan
      if (typeof updateInstallStatus === 'function') updateInstallStatus();
    });

    // iOS: prompt manual karena Safari gak support beforeinstallprompt
    if (isIOS() && !isStandalone()) {
      setTimeout(() => showBanner(), 3000);
    }

    // Android tanpa event (Firefox / Samsung Internet)
    if (isAndroid() && !isStandalone()) {
      setTimeout(() => {
        if (!deferredPrompt) showBanner();
      }, 4000);
    }

    console.log('[PWA] Init — standalone:', isStandalone(), 'iOS:', isIOS());
  }

  function canInstall() {
    return !!deferredPrompt;
  }

  return {
    init,
    isStandalone,
    isIOS,
    isAndroid,
    canInstall,
    triggerInstall,
    showBanner,
    hideBanner,
    markDismissed,
    showIOSInstructions,
    showAndroidInstructions,
    closeInstructions,
  };
})();
