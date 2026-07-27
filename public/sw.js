const CACHE_NAME = 'fitly-pwa-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.png',
];

const MUTATION_QUEUE_STORE = 'mutationQueue';

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

// Background sync for mutation queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'mutation-queue-sync') {
    event.waitUntil(processMutationQueue());
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'auto-backup') {
    event.waitUntil(autoBackup());
  }
});

// Fetch event: Reliable Offline-First PWA caching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation requests (Page loading / App launching)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/', { ignoreSearch: true }).then((cachedAppShell) => {
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put('/', responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => null);

        // If app shell is cached, serve instantly for offline access
        if (cachedAppShell) {
          // Revalidate in background when online
          networkFetch.catch(() => {});
          return cachedAppShell;
        }

        // If not cached yet, wait for network fetch
        return networkFetch.then((res) => {
          if (res) return res;
          return new Response('Offline - Fitly App Shell Unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
    );
    return;
  }

  // 2. Static assets and resources (JS, CSS, images, icons)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
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
        .catch(() => {
          return new Response('Asset unavailable offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Process mutation queue from IndexedDB
async function processMutationQueue() {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(MUTATION_QUEUE_STORE)) return;
    const tx = db.transaction(MUTATION_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(MUTATION_QUEUE_STORE);
    const mutations = await store.getAll();
    await tx.done;

    if (mutations.length === 0) return;

    for (const mutation of mutations) {
      try {
        await sendMutationToBackup(mutation);
        const deleteTx = db.transaction(MUTATION_QUEUE_STORE, 'readwrite');
        await deleteTx.objectStore(MUTATION_QUEUE_STORE).delete(mutation.id);
        await deleteTx.done;
      } catch (err) {
        console.error('Failed to sync mutation:', err);
      }
    }
  } catch (err) {
    console.error('Mutation queue processing failed:', err);
  }
}

// Auto-backup: Export wardrobe data to user-chosen folder
async function autoBackup() {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clients.length === 0) return;

    clients.forEach(client => {
      client.postMessage({ type: 'AUTO_BACKUP_TRIGGER' });
    });
  } catch (err) {
    console.error('Auto-backup failed:', err);
  }
}

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('outfit-manager', 7);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(MUTATION_QUEUE_STORE)) {
        const store = db.createObjectStore(MUTATION_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Send mutation to backup (delegates to client)
async function sendMutationToBackup(mutation) {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_MUTATION', payload: mutation });
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Fitly notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Fitly', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action) {
    event.waitUntil(
      self.clients.openWindow(`/?action=${event.action}`)
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});