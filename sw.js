const CACHE_NAME = 'ehogestion-v28';
const ASSETS_TO_CACHE = [
    './index.html',
    './stock.html',
    './styles.css',
    './scripts.js',
    './db-config.js',
    './storage-adapter.js',
    './dexie-adapter.js',
    './dexie-adapter-new.js',
    './google-sheets-adapter.js',
    './auth.js',
    './image_circulaire_recadree.png',
    './libs/vue.global.js',
    './libs/tailwindcss.js',
    './libs/fontawesome/css/all.min.css'
];


self.addEventListener('install', (event) => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('activate', (event) => {
    // Tell the active service worker to take control of the page immediately.
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // Exclude Google / Firebase network requests from Service Worker
    // This allows the browser to handle CORS, redirects and streaming (Firestore listen) natively
    try {
        const url = new URL(event.request.url);
        
        // Bypasser COMPLÈTEMENT le cache pour le développement local
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            return; // Laisser le navigateur charger les ressources directement depuis le réseau
        }

        const host = url.hostname || '';
        const bypassHosts = [
            'script.google.com',
            'firestore.googleapis.com',
            'firebase.googleapis.com',
            'www.googleapis.com',
            'gstatic.com',
            'googleapis.com',
            'googleusercontent.com',
            'firebaseapp.com',
            'firebaseio.com'
        ];
        for (const h of bypassHosts) {
            if (host.indexOf(h) !== -1) {
                return; // let the browser handle these requests directly
            }
        }
    } catch (e) {
        // If URL parsing fails, do not block fetch
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
