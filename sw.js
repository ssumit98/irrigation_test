const CACHE_NAME = 'attendance-form-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/AppIcons/icon-72x72.png',
    '/AppIcons/icon-96x96.png',
    '/AppIcons/icon-128x128.png',
    '/AppIcons/icon-144x144.png',
    '/AppIcons/icon-152x152.png',
    '/AppIcons/icon-192x192.png',
    '/AppIcons/icon-384x384.png',
    '/AppIcons/icon-512x512.png'
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate service worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event handler
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch new
                return response || fetch(event.request);
            })
    );
}); 