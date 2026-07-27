import { Clerk } from '@clerk/clerk-js';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const clerk = new Clerk(PUBLISHABLE_KEY);

let mountedSignIn = false;
let mountedUserButton = false;
let authScreen, signInEl, userButtonEl, shell, tabbar;

// The @clerk/clerk-js npm package ships "headless" — mountSignIn/mountUserButton
// throw ("Clerk was not loaded with Ui components") unless the separate @clerk/ui
// browser bundle is loaded first and handed to clerk.load(). The bundle lives on
// the Clerk Frontend API domain, which is embedded (base64) in the publishable key.
function loadClerkUiBundle() {
  const clerkDomain = atob(PUBLISHABLE_KEY.split('_')[2]).slice(0, -1);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load @clerk/ui bundle'));
    document.head.appendChild(script);
  });
}

function renderAuthState() {
  if (clerk.user) {
    authScreen.style.display = 'none';
    shell.style.display = '';
    tabbar.style.display = '';
    // Unmount any stale SignIn instance rather than leaving it mounted (but
    // hidden) forever — a leftover instance from a previous session was
    // reappearing with stale internal state on the next sign-out, causing a
    // stuck loop when re-entering an email on the "same" old component.
    if (mountedSignIn) { clerk.unmountSignIn(signInEl); mountedSignIn = false; }
    if (!mountedUserButton) {
      clerk.mountUserButton(userButtonEl);
      mountedUserButton = true;
    }
  } else {
    authScreen.style.display = 'flex';
    shell.style.display = 'none';
    tabbar.style.display = 'none';
    if (mountedUserButton) { clerk.unmountUserButton(userButtonEl); mountedUserButton = false; }
    if (!mountedSignIn) {
      // withSignUp: keeps sign-up embedded in this same mounted component
      // instead of the default behavior of linking out to Clerk's hosted
      // Account Portal.
      clerk.mountSignIn(signInEl, { withSignUp: true });
      mountedSignIn = true;
    }
  }
}

/**
 * Loads Clerk and shows the correct screen (sign-in vs. app shell) as soon as
 * that's known. Does NOT wait for sign-in to complete — pair with
 * waitForSignIn() before booting app data, so the splash screen can fade as
 * soon as we know what to show rather than blocking on the user actually
 * signing in.
 */
export async function initAuthUI() {
  await loadClerkUiBundle();
  await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });

  authScreen = document.getElementById('auth-screen');
  signInEl = document.getElementById('clerk-sign-in');
  userButtonEl = document.getElementById('clerk-user-button');
  shell = document.querySelector('.shell');
  tabbar = document.querySelector('.tabbar');

  renderAuthState();
  clerk.addListener(renderAuthState);
}

/** Resolves once a signed-in session exists (immediately, if one already does). */
export function waitForSignIn() {
  if (clerk.user) return Promise.resolve();
  return new Promise(resolve => {
    const unsub = clerk.addListener(({ user }) => {
      if (user) { unsub(); resolve(); }
    });
  });
}

/** Current Clerk session JWT, for the Supabase accessToken() callback. */
export function getSessionToken() {
  return clerk.session ? clerk.session.getToken() : Promise.resolve(null);
}

/** Clerk's own user id (string, not a Postgres UUID) — the RLS ownership key. */
export function getUserId() {
  return clerk.user ? clerk.user.id : null;
}
