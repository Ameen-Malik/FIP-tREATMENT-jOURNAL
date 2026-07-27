/* ── PWA INSTALLATION PROMPT ── */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const dismissed = localStorage.getItem('fip_pwa_dismissed') === 'true';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (!dismissed && !isStandalone) {
    showPwaBanner();
  }
});

function showPwaBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (!banner) return;
  banner.style.display = 'flex';
  setTimeout(() => {
    banner.style.transform = 'translateX(-50%) translateY(0)';
    banner.style.opacity = '1';
    banner.style.pointerEvents = 'all';
  }, 100);
}

function hidePwaBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (!banner) return;
  banner.style.transform = 'translateX(-50%) translateY(-120px)';
  banner.style.opacity = '0';
  banner.style.pointerEvents = 'none';
}

document.getElementById('closePwaBanner')?.addEventListener('click', () => {
  hidePwaBanner();
  localStorage.setItem('fip_pwa_dismissed', 'true');
});

document.getElementById('btnPwaInstall')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    localStorage.setItem('fip_pwa_dismissed', 'true');
  }
  deferredPrompt = null;
  hidePwaBanner();
});

// Detect iOS/Safari to show helper banner
window.addEventListener('DOMContentLoaded', () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const dismissed = localStorage.getItem('fip_pwa_dismissed') === 'true';

  if (isIOS && !isStandalone && !dismissed) {
    const desc = document.getElementById('pwaInstallDesc');
    const btn = document.getElementById('btnPwaInstall');
    if (desc) {
      desc.innerHTML = 'Tap the Share icon <svg style="display:inline-block; vertical-align:middle; width:16px; height:16px; stroke:currentColor; stroke-width:2; fill:none;" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg> in Safari and select <strong>\'Add to Home Screen\'</strong>.';
    }
    if (btn) {
      btn.style.display = 'none';
    }
    showPwaBanner();
  }
});
