import './styles.css';

import { initAuthUI, waitForSignIn } from './auth.js';
import { initFirebase } from './cloud-sync-legacy.js';
import { load } from './state.js';
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
import './export.js';
import './tabs.js';
import './pwa.js';

/* ── BOOT ── */
async function boot() {
  const minSplash = new Promise(r => setTimeout(r, 1200));

  await initAuthUI(); // shows sign-in screen or app shell, whichever applies
  await minSplash;
  document.getElementById('splash-screen')?.classList.add('fade-out');

  await waitForSignIn(); // resolves now if already signed in

  initFirebase();
  await load();
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
}
boot();
