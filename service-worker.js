const CACHE_NAME = 'team-schedule-B-cache-v12';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for page navigations (HTML) so updates show up immediately when online.
// Cache-first for other static assets (icons, manifest, fonts) since those rarely change.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isNavigation = req.mode === 'navigate' ||
    (req.destination === 'document') ||
    req.url.endsWith('/index.html') ||
    req.url.endsWith('/');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      const isCacheableOrigin = req.url.startsWith(self.location.origin) ||
        req.url.startsWith('https://fonts.googleapis.com') ||
        req.url.startsWith('https://fonts.gstatic.com');
      return fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque') && isCacheableOrigin) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
