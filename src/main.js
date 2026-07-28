import './styles.css';

import { initAuthUI, waitForSignIn } from './auth.js';
import { initFirebase } from './cloud-sync-legacy.js';
import { load, refreshFromCloudIfClean } from './state.js';
import { initOutbox } from './outbox.js';
import { initSyncStatus } from './ui/sync-status.js';
import { initHoldToConfirm } from './ui/hold-to-confirm.js';
import { renderAll } from './render/index.js';
import { checkOnboarding } from './cat-management.js';

import './ui/theme.js';
import './actions.js';
import './edit-sheet.js';
import './protocol-sheet.js';
import './milestone-card.js';
import './batch-log.js';
import './pet-sharing.js';
import './export.js';
import './tabs.js';
import './pwa.js';

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

// Sign-in never used to be wrapped — a slow/failed Clerk load (bad key,
// blocked script, network hiccup) threw past an uncaught await and left the
// splash screen up forever with no way to tell what happened.
function showBootError(err) {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.remove('fade-out');
  splash.innerHTML = `
    <div class="splash-content">
      <div style="font-size:40px">⚠️</div>
      <div class="splash-title" style="font-size:16px;text-align:center;padding:0 24px">Couldn't load sign-in</div>
      <div style="font-size:13px;color:var(--l3);text-align:center;padding:0 24px;margin-top:4px">${err?.message || 'Unknown error'}</div>
      <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;border-radius:20px;border:none;background:var(--blue);color:#fff;font-weight:700;cursor:pointer">Retry</button>
    </div>`;
}

/* ── BOOT ── */
async function boot() {
  const minSplash = new Promise(r => setTimeout(r, 1200));

  try {
    // shows sign-in screen or app shell, whichever applies
    await withTimeout(initAuthUI(), 15000, "Sign-in didn't respond in time — check your connection and retry.");
  } catch (err) {
    console.error('[boot] initAuthUI failed:', err);
    await minSplash;
    showBootError(err);
    return;
  }
  await minSplash;
  document.getElementById('splash-screen')?.classList.add('fade-out');

  await waitForSignIn(); // resolves now if already signed in

  initFirebase();
  try {
    await load();
  } catch (err) {
    // load() already degrades gracefully on a Supabase failure — this is a
    // backstop for anything else unexpected, so the rest of boot (sync
    // status, hold-to-log wiring, first render) still runs instead of
    // silently stopping with the splash screen gone but nothing wired up.
    console.error('[boot] load() failed unexpectedly:', err);
  }
  initSyncStatus();
  initOutbox();
  initHoldToConfirm();
  renderAll();
  checkOnboarding();
  // Only register the service worker in production builds — in dev mode it
  // shadows the Vite dev server with cache-first responses, so code changes
  // (and even hard refreshes) can silently keep serving a stale cached copy.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }

  // Background cross-device catch-up: the local mirror only ever gets a
  // cloud pull on a brand-new device/user combo (see load()) — an already-
  // initialized device otherwise never learns about writes made elsewhere.
  // Fire this after the first paint (not blocking boot) and again whenever
  // the tab regains focus, since that's exactly when a second device is
  // most likely checking for what changed on the first.
  const catchUp = () => refreshFromCloudIfClean().then(changed => { if (changed) renderAll(); });
  catchUp();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') catchUp();
  });
}
boot();
