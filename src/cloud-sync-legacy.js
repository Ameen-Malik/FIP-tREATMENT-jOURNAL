import { S_data, K_MULTI } from './state.js';
import { toast } from './ui/toast.js';
import { closeSheet, openSheet } from './ui/sheets.js';
import { renderAll } from './render/index.js';

/* ── FIREBASE SYNC INTEGRATION ──
 * Dormant on purpose: this is the pre-Supabase cloud sync path, kept disabled
 * (syncEnabled stays false) while the Clerk + Supabase integration replaces it.
 * Do not remove without checking — see CLAUDE.md.
 */
let db = null;
let auth = null;
let currentUser = null;
let syncEnabled = false;

const firebaseConfig = {
  apiKey: localStorage.getItem('fip_firebase_api_key') || "AIzaSyFakeKeyPlaceholderForDefaultRunOnly",
  authDomain: "fip-treatment-journal.firebaseapp.com",
  projectId: "fip-treatment-journal",
  storageBucket: "fip-treatment-journal.appspot.com",
  messagingSenderId: "367290123512",
  appId: "1:367290123512:web:a62b80f12c8bdfa37ef81c"
};

export function initFirebase() {
  console.log("Firebase sync deactivated for local-first execution. Supabase integration is scheduled for the next run.");
  syncEnabled = false;
}

export function syncToCloud() {
  const localTs = Date.now();
  localStorage.setItem('fip_local_updated_at', localTs);

  if (!syncEnabled || !currentUser) return;

  db.collection("users").doc(currentUser.uid).collection("data").doc("journal").set({
    cats: S_data.cats,
    logs: S_data.logs,
    activeCatId: S_data.activeCatId,
    updatedAt: localTs
  }).catch(err => {
    console.warn("Firestore save failed:", err);
  });
}

export function pullFromCloud(force = false) {
  if (!syncEnabled || !currentUser) return;

  db.collection("users").doc(currentUser.uid).collection("data").doc("journal").get()
    .then((docSnap) => {
      if (docSnap.exists) {
        const cloudData = docSnap.data();
        const localTs = parseInt(localStorage.getItem('fip_local_updated_at')) || 0;
        const cloudTs = cloudData.updatedAt || 0;

        if (cloudTs > localTs || force) {
          S_data.cats = cloudData.cats || {};
          S_data.logs = cloudData.logs || {};
          S_data.activeCatId = cloudData.activeCatId || '';

          localStorage.setItem(K_MULTI.activeId, S_data.activeCatId);
          localStorage.setItem(K_MULTI.cats, JSON.stringify(S_data.cats));
          localStorage.setItem(K_MULTI.logs, JSON.stringify(S_data.logs));
          localStorage.setItem('fip_local_updated_at', cloudTs);

          renderAll();
          toast("Synced with Cloud ☁️");
        } else if (localTs > cloudTs) {
          syncToCloud();
        }
      } else {
        syncToCloud();
      }
    })
    .catch((err) => {
      console.warn("Firestore fetch failed:", err);
    });
}

// Link/Sign-In Event Listener
document.getElementById('cloudSyncBtn').addEventListener('click', () => {
  closeSheet('catSwitcherSheet');
  if (currentUser && !currentUser.isAnonymous) {
    document.getElementById('cloudEmail').value = currentUser.email;
  } else {
    document.getElementById('cloudEmail').value = '';
  }
  document.getElementById('cloudPassword').value = '';
  openSheet('cloudLinkSheet');
});

document.getElementById('cloudSubmitBtn').addEventListener('click', () => {
  const email = document.getElementById('cloudEmail').value.trim();
  const password = document.getElementById('cloudPassword').value.trim();

  if (!email || !password) {
    toast("Please enter both email and password!", true);
    return;
  }

  if (currentUser && currentUser.isAnonymous) {
    const credential = firebase.auth.EmailAuthProvider.credential(email, password);
    currentUser.linkWithCredential(credential)
      .then((linkResult) => {
        currentUser = linkResult.user;
        toast("Account linked successfully ☁️");
        closeSheet('cloudLinkSheet');
        syncToCloud();
      })
      .catch((error) => {
        if (error.code === 'auth/email-already-in-use') {
          auth.signInWithEmailAndPassword(email, password)
            .then((cred) => {
              currentUser = cred.user;
              toast("Logged in successfully ☁️");
              closeSheet('cloudLinkSheet');
              pullFromCloud(true);
            })
            .catch(err => {
              toast("Sign-In failed: " + err.message, true);
            });
        } else {
          toast("Linking failed: " + error.message, true);
        }
      });
  } else {
    auth.signInWithEmailAndPassword(email, password)
      .then((cred) => {
        currentUser = cred.user;
        toast("Logged in successfully ☁️");
        closeSheet('cloudLinkSheet');
        pullFromCloud(true);
      })
      .catch(err => {
        toast("Sign-In failed: " + err.message, true);
      });
  }
});
