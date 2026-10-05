/*
 * DevMemory service worker — offline app shell.
 * Caches only this site's static files (HTML, JS, CSS, fonts, icons).
 * It never touches Firebase / Google API traffic: user data offline support
 * comes from Firestore's own IndexedDB cache.
 */
const VERSION = 'devmemory-v1';
const SHELL = ['./', './index.html', './manifest.json', './favicon.svg', './icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, fonts CDNs, images: let the network/Firebase handle it

  // Navigations: network first so deploys show up, fall back to cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Hashed build assets and static files: cache first, then network (and remember).
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (url.pathname.includes('/assets/') || /\.(png|svg|json|woff2?)$/.test(url.pathname))) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
