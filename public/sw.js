const CACHE_NAME = 'dark-wallet-v1';

const urlsToCache = [
  '/',
  '/batman_logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🦇 Dark Wallet cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch from cache first, then network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Update cache when new version available
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🦇 Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
