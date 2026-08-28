const CACHE_NAME = 'rey-music-shell-v2';

// 1. Install & Simpan App Shell (Tahan Error)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const urlsToCache = ['/', '/favicon.ico'];
      await Promise.all(
        urlsToCache.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    })
  );
});

// 2. Activate & Ambil Kontrol Langsung
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
    ).then(() => self.clients.claim())
  );
});

// 3. Fetch: Ambil dari Internet, Simpan ke Cache. Jika Offline, Pakai Cache!
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Tangani Refresh / Navigasi Halaman
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(async () => {
          // Jika Mode Pesawat / Offline
          const cachedHome = await caches.match('/');
          if (cachedHome) return cachedHome;
          const cachedReq = await caches.match(request);
          if (cachedReq) return cachedReq;
          return new Response('Offline', { headers: { 'Content-Type': 'text/html' } });
        })
    );
    return;
  }

  // Tangani File Statis (JS, CSS, Gambar)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((response) => {
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});