// service-worker.js (safe dev-friendly version)

const CACHE_NAME = 'floq-venues-v1';
const VENUE_IMAGE_CACHE = 'floq-venue-images-v1';
const API_CACHE = 'floq-api-v1';

// Only cache GET requests. Never cache RPC POSTs.
const API_GET_ALLOWLIST = [
  // e.g. your GET endpoints; do NOT include /rpc/
  '/rest/v1/get_nearby_venues',
  '/rest/v1/get_trending_venues_enriched',
  '/rest/v1/get_venues_open_status',
];

const STATIC_CACHE_URLS = [
  // Make these optional to avoid install failures in dev
  // '/placeholder/venue.jpg',
  // '/placeholder/avatar.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        STATIC_CACHE_URLS.map((u) =>
          cache.add(u).catch(() => null) // don't fail install if missing
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (![CACHE_NAME, VENUE_IMAGE_CACHE, API_CACHE].includes(k)) {
            return caches.delete(k);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Always pass through non-GET (POST/PUT/etc.) to avoid body stream issues
  if (req.method !== 'GET') {
    event.respondWith(fetch(req));
    return;
  }

  // Don't touch dev/HMR or navigations
  const isViteAsset = url.pathname.startsWith('/@vite') || url.pathname.includes('__vite') || url.pathname.startsWith('/vite');
  if (req.mode === 'navigate' || isViteAsset) {
    event.respondWith(fetch(req));
    return;
  }

  // IMAGE CACHING (same-origin + known origins)
  if (
    req.destination === 'image' &&
    (
      url.origin === self.location.origin ||
      url.hostname.includes('unsplash.com') ||
      url.hostname.includes('googleusercontent.com') ||
      url.pathname.includes('/venue-photos/')
    )
  ) {
    event.respondWith(
      caches.open(VENUE_IMAGE_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const net = await fetch(req);
          if (net.ok) cache.put(req, net.clone());
          return net;
        } catch {
          // Soft fallback if you really have a placeholder; otherwise return a generic Response
          const fallback = await caches.match('/placeholder/venue.jpg');
          return fallback || Response.error();
        }
      })
    );
    return;
  }

  // API GET CACHING (never /rpc/, only GET allowlist)
  const isApiGet =
    url.origin === self.location.origin &&
    req.method === 'GET' &&
    API_GET_ALLOWLIST.some((p) => url.pathname.startsWith(p));

  if (isApiGet) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) {
          const ts = hit.headers.get('sw-cached-time');
          if (ts && Date.now() - Number(ts) < 5 * 60 * 1000) {
            return hit;
          }
        }
        try {
          const net = await fetch(req);
          if (net.ok) {
            // add timestamp header for staleness check
            const headers = new Headers(net.headers);
            headers.set('sw-cached-time', String(Date.now()));
            const cached = new Response(net.clone().body, {
              status: net.status,
              statusText: net.statusText,
              headers,
            });
            // Note: cache.put returns a promise; we intentionally don't await it
            cache.put(req, cached).catch(() => {});
          }
          return net;
        } catch {
          // If network fails, return cache hit if present; else a proper error Response (never undefined)
          return hit || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        }
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(fetch(req));
});

// Background prefetch (use GET endpoint; do NOT prefetch /rpc/)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PREFETCH_VENUES') {
    const { lat, lng, radius } = event.data.payload || {};
    const prefetchUrl = `/rest/v1/get_nearby_venues?p_lat=${lat}&p_lng=${lng}&p_radius_m=${radius}&p_limit=50`;
    fetch(prefetchUrl)
      .then((res) => {
        if (res.ok) {
          caches.open(API_CACHE).then((cache) => {
            const headers = new Headers(res.headers);
            headers.set('sw-cached-time', String(Date.now()));
            const cached = new Response(res.clone().body, { status: res.status, statusText: res.statusText, headers });
            cache.put(prefetchUrl, cached).catch(() => {});
          });
        }
      })
      .catch(() => {});
  }
});