const CACHE_NAME = 'osho-reader-ui-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Install Event: Cache UI assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Stale-while-revalidate strategy for UI
self.addEventListener('fetch', (e) => {
  // Don't intercept the massive DB file download, let the main thread handle that via fetch
  if (e.request.url.includes('discourses.ndjson.br')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse.clone()));
        return networkResponse;
      }).catch(() => cachedResponse); // Fallback to cache if network fails entirely
      
      return cachedResponse || fetchPromise;
    })
  );
});