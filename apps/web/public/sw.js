const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGE_CACHE = `pages-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/',
  '/cadastro',
  '/acompanhar',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))),
      ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.includes(CACHE_VERSION)).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next/webpack-hmr')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());
  return response;
};

const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    const cache = await caches.open(PAGE_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return caches.match(request);
  }
};

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'SBACEM', body: event.data.text() };
  }

  const options = {
    body: data.body ?? '',
    icon: data.icon ?? '/icon.svg',
    badge: '/icon.svg',
    data: { url: data.url ?? '/admin' },
    tag: 'sbacem-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title ?? 'SBACEM', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes('/admin'));
      if (existing) {
        existing.focus();
        existing.navigate(url);
        return;
      }
      return self.clients.openWindow(url);
    }),
  );
});
