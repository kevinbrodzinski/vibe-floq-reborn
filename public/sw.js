const CACHE_NAME = 'floq-venues-v1';
const VENUE_IMAGE_CACHE = 'floq-venue-images-v1';
const API_CACHE = 'floq-api-v1';

// URLs to cache on install
const STATIC_CACHE_URLS = [
  '/placeholder/venue.jpg',
  '/placeholder/avatar.png',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== VENUE_IMAGE_CACHE && cacheName !== API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache venue images (Unsplash, Google Places, etc.)
  if (request.destination === 'image' && 
      (url.hostname.includes('unsplash.com') || 
       url.hostname.includes('googleusercontent.com') ||
       url.pathname.includes('/venue-photos/'))) {
    event.respondWith(
      caches.open(VENUE_IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request).then((fetchResponse) => {
            // Only cache successful image responses
            if (fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // Return a fallback image if network fails
            return caches.match('/placeholder/venue.jpg');
          });
        });
      })
    );
  }
  
  // Cache API responses for venues
  else if (url.pathname.includes('/rest/v1/rpc/get_nearby_venues') ||
           url.pathname.includes('/rest/v1/rpc/get_trending_venues_enriched') ||
           url.pathname.includes('/rest/v1/rpc/get_venues_open_status')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          // Return cached response if available and less than 5 minutes old
          if (response) {
            const cachedTime = response.headers.get('sw-cached-time');
            if (cachedTime && (Date.now() - parseInt(cachedTime)) < 5 * 60 * 1000) {
              return response;
            }
          }
          
          return fetch(request).then((fetchResponse) => {
            if (fetchResponse.status === 200) {
              // Clone and add timestamp header
              const responseToCache = fetchResponse.clone();
              const headers = new Headers(responseToCache.headers);
              headers.set('sw-cached-time', Date.now().toString());
              
              const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
              });
              
              cache.put(request, cachedResponse);
            }
            return fetchResponse;
          }).catch(() => {
            // Return cached response even if stale when network fails
            return response;
          });
        });
      })
    );
  }
  
  // Default: network first for other requests
  else {
    event.respondWith(fetch(request));
  }
});

// Background sync for prefetching
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PREFETCH_VENUES') {
    const { lat, lng, radius } = event.data.payload;
    
    // Prefetch venue data in the background
    const prefetchUrl = `/rest/v1/rpc/get_nearby_venues?p_lat=${lat}&p_lng=${lng}&p_radius_m=${radius}&p_limit=50`;
    
    fetch(prefetchUrl).then((response) => {
      if (response.ok) {
        caches.open(API_CACHE).then((cache) => {
          cache.put(prefetchUrl, response.clone());
        });
      }
    }).catch(() => {
      // Silently fail prefetch attempts
    });
  }
});