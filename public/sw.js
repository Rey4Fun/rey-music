const CACHE_NAME = 'rey-music-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

// 1. Install: Simpan halaman utama (App Shell) ke memori HP
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 2. Activate: Klaim kontrol & bersihkan cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== 'rey-music-audio-v1') {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 3. Fetch: Tangani refresh offline & pemutaran lagu dari cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Jika user melakukan Refresh Halaman saat offline, kembalikan halaman utama dari cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Jika lagu/file ada di cache lokal, putar dari lokal. Jika tidak, ambil dari internet.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request);
    })
  );
});