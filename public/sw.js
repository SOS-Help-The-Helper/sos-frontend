/**
 * SOS Service Worker — offline-first for citizen PWA.
 * Strategy:
 *   - Static assets: cache-first (CSS, JS, images)
 *   - API calls: network-first, fall back to cache
 *   - Person profile + matches: stale-while-revalidate
 *   - New requests: queue offline, sync on reconnect
 */

const CACHE_NAME = 'sos-v1';
const STATIC_ASSETS = [
  '/c',
  '/help',
  '/offer',
  '/find',
  '/matches',
  '/logomark.svg',
  '/logomark.png',
  '/manifest.json',
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
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // API calls: network-first
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// Background sync: queue offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sos-request-queue') {
    event.waitUntil(flushRequestQueue());
  }
});

async function flushRequestQueue() {
  // Read queued requests from IndexedDB and submit them
  // Implementation in Phase 2 — for now, log
  console.log('[SW] Background sync: flushing request queue');
}
