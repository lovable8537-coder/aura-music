const CACHE_STATIC = 'aura-static-v1';
const CACHE_AUDIO = 'aura-audio-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_AUDIO)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // API calls: network first
  if (url.hostname.includes('workers.dev') || url.hostname.includes('lrclib.net')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_STATIC).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Audio: cache first
  if (e.request.destination === 'audio' || url.pathname.match(/\.(mp3|m4a|aac|ogg)$/i)) {
    e.respondWith(
      caches.match(e.request).then(hit => {
        if (hit) return hit;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_AUDIO).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Static: cache first
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});