const V = 'fip-v7';
const FILES = ['/', '/app.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // This is an app-shell cache, not a general API cache. The Cache API only
  // supports GET (caching a POST throws), and Clerk/Supabase calls should
  // never be intercepted anyway — caching auth/data responses risks serving
  // stale state, and Clerk's background token-refresh POSTs were tripping
  // this handler on every single request, throwing an uncaught rejection
  // repeatedly during exactly the window a sign-in flow is in progress.
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request)
      .then(hit => hit || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(V).then(c => c.put(e.request, clone));
        return res;
      }))
      .catch(() => caches.match('/app.html'))
  );
});
