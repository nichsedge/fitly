const CACHE_NAME = 'fitly-pwa-v5';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.png',
];

// Install event: Pre-cache core app shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[SW] Pre-cache failed for ${asset}:`, err);
          })
        )
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event: Clean up legacy caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event: Offline-first PWA caching.
// - Navigation -> Network-first: users always get the freshest app shell when
//   online, and fall back to the cached shell when offline. This prevents
//   deployed updates from being hidden by a stale service-worker cache.
// - Static assets (JS/CSS/images) -> Stale-while-revalidate: served instantly
//   from cache for speed, refreshed in the background when online.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', responseToCache));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match('/').then(
            (cachedAppShell) =>
              cachedAppShell ||
              new Response('Offline - Fitly App Shell Unavailable', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' },
              })
          )
        )
    );
    return;
  }

  // Static assets and resources (JS, CSS, images, icons) - stale-while-revalidate
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() =>
          new Response('Asset unavailable offline', {
            status: 503,
            statusText: 'Service Unavailable',
          })
        );

      return cachedResponse || networkFetch;
    })
  );
});

