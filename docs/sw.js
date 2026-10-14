/* Service worker for the phone app.
   The page is fetched fresh from the network whenever there is a connection, so an update arrives the next time the
   app opens; without a connection, the last copy is used and the app works offline.
   This file only stores the app's own files. The journey itself lives in the page's storage and is never touched here. */
const BUILD = '71ebc2d0bd';
const CACHE = 'lij-app-' + BUILD;
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lij-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // always asked of the network
  if (req.mode === 'navigate') {
    // Network first, so updates arrive as soon as the app opens online. Offline: the last saved page.
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); }
          return res;
        })
        .catch(() => caches.match('./').then((r) => r || caches.match(req)))
    );
    return;
  }
  event.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
