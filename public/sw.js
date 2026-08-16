self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Jika lagu ada di penyimpanan lokal, putar dari lokal. Jika tidak, ambil dari internet.
      return cachedResponse || fetch(event.request);
    })
  );
});