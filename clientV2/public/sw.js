import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Précache de l'app shell
precacheAndRoute(self.__WB_MANIFEST);

// Cache des tuiles Mapbox
registerRoute(
    ({ url }) => url.hostname === 'api.mapbox.com',
    new CacheFirst({
        cacheName: 'mapbox-tiles',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30
            }),
            new CacheableResponsePlugin({ statuses: [0, 200] })
        ]
    })
);

// Cache API game
registerRoute(
    ({ url }) => url.hostname === 'localhost' && url.port === '3376',
    new NetworkFirst({
        cacheName: 'api-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 60 * 5
            }),
            new CacheableResponsePlugin({ statuses: [0, 200] })
        ]
    })
);

// Page offline
self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/offline.html'))
        );
    }
});

// Réception des notifications push serveur
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Zanzibar Mobile';
    const options = {
        body: data.body || 'Un événement vient de se produire !',
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png'
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});