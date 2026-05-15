const CACHE_NAME = 'barrigon-planeamientos-v5';

const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Nunito+Sans:wght@400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/fonts/tabler-icons.woff2',
  'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
];

/* INSTALL: precarga los assets */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('No se pudo cachear:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ACTIVATE: limpia caches viejos */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* FETCH: cache-first para assets, network-first para el resto */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Solo interceptamos GET */
  if(event.request.method !== 'GET') return;

  /* Estrategia cache-first para assets locales y CDN conocidos */
  const isCacheable =
    url.origin === self.location.origin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdn.jsdelivr.net';

  if(isCacheable){
    event.respondWith(
      caches.match(event.request).then(cached => {
        if(cached) return cached;
        return fetch(event.request).then(response => {
          /* Solo cacheamos respuestas válidas */
          if(!response || response.status !== 200 || response.type === 'error'){
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => {
          /* Si falla y es el HTML principal, devolvemos lo que tengamos */
          if(url.pathname.endsWith('.html')){
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});
