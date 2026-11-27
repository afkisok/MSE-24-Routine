const CACHE_NAME = 'mse24-routine-v7';
const STATIC_PRECACHE_URLS = [
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/icon-monochrome-192.png',
  '/icon-monochrome-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE_URLS))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Strict NetworkOnly for Google Sheets, remote CSV/data feeds, cache-busted requests, and /api/
  // App-level atomic localStorage snapshot provides instant offline fallback without SW cache races.
  const tqxParam = (url.searchParams.get('tqx') || '').toLowerCase();
  const isRemoteDataRequest =
    url.hostname.endsWith('docs.google.com') ||
    url.hostname.endsWith('sheets.googleapis.com') ||
    url.hostname.endsWith('googleusercontent.com') ||
    url.hostname.endsWith('script.google.com') ||
    url.searchParams.has('_cb') ||
    url.pathname.endsWith('.csv') ||
    url.searchParams.get('output') === 'csv' ||
    url.searchParams.get('format') === 'csv' ||
    tqxParam.includes('csv') ||
    url.pathname.startsWith('/api/');

  if (isRemoteDataRequest) {
    return;
  }

  // Network-first for other cross-origin requests (e.g. Google Fonts)
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Never intercept or cache Vite dev server internal/module requests
  if (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // Network-first for HTML navigations and manifest files so app updates deploy immediately
  const isNetworkFirst =
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json');

  if (isNetworkFirst) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Cache-first for static assets (hashed JS/CSS bundles, PNG/SVG icons, fonts)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      });
    })
  );
});
