const CACHE_NAME = "compras-japao-v2";
const ASSETS = [
  "./index.html",
  "./css/style.css",
  "./javascript/script.js",
  "./manifest.json"
];

// Instala e faz cache dos arquivos estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Remove caches antigos ao ativar nova versão
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: Cache First para assets, Network First para API de taxas
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Requisições para a API de taxas: tenta rede, cai no cache se offline
  const apiHosts = ["open.er-api.com", "api.exchangerate-api.com"];
  if (apiHosts.includes(url.hostname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Demais assets: Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
