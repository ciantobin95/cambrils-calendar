self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evt => {
  // Network-only: always serve freshest files.
  if (evt.request.method === 'GET') {
    evt.respondWith(fetch(evt.request));
  }
});