/**
 * SOS Service Worker — offline-first for citizen PWA.
 *
 * Cache strategy:
 *   Static assets: cache-first (CSS, JS, images, fonts)
 *   Citizen pages: stale-while-revalidate (home, help, offer, readiness)
 *   API/EF calls: network-first, fall back to cached
 *   Person data: cached after first load (risk profile, contacts, route)
 *   New requests: queued offline via IndexedDB, synced on reconnect
 */

const CACHE_NAME = 'sos-v2';
const PERSON_CACHE = 'sos-person-v1';

const STATIC_ASSETS = [
  '/c',
  '/help',
  '/offer',
  '/readiness',
  '/community',
  '/matches',
  '/find',
  '/chat',
  '/invite',
  '/logomark.svg',
  '/logomark.png',
  '/manifest.json',
];

// Person-critical data to cache (risk profile, contacts, evacuation route)
const PERSON_DATA_PATTERNS = [
  '/rest/v1/persons?',
  '/rest/v1/emergency_contacts?',
  '/functions/v1/score-compute',
  '/functions/v1/alerts-feed',
];

// Install: pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== PERSON_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET (POST requests for EFs handled separately)
  if (request.method !== 'GET') return;

  // Person-critical data: network-first, cache response for offline
  if (PERSON_DATA_PATTERNS.some(p => url.pathname.includes(p) || url.href.includes(p))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(PERSON_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // API / Supabase calls: network-first
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static/page: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Background sync: flush offline request queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sos-request-queue') {
    event.waitUntil(flushRequestQueue());
  }
});

async function flushRequestQueue() {
  // Read queued requests from IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction('offline-queue', 'readwrite');
    const store = tx.objectStore('offline-queue');
    const requests = await getAllFromStore(store);

    for (const req of requests) {
      try {
        await fetch(req.url, {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify(req.body),
        });
        store.delete(req.id);
      } catch {
        // Still offline — leave in queue
        break;
      }
    }
  } catch {
    console.log('[SW] No offline queue DB yet');
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sos-offline', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}
