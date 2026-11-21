// Service worker van Kastje: zorgt dat de app ook zonder internet opent.
//
// - De pagina zelf: eerst het netwerk (zo krijg je altijd de nieuwste versie), anders de bewaarde kopie.
//   Bij elke nieuwe versie van de pagina leggen we meteen ook de scripts en stijlen vast die erbij horen,
//   zodat de app na één keer openen ook offline volledig werkt.
// - Scripts, stijlen en iconen: eerst de bewaarde kopie (die veranderen niet; nieuwe versies krijgen een nieuwe naam).
// - Het weer (Open-Meteo): altijd via het netwerk; de app bewaart zelf de laatste verwachting.

const CACHE = 'kastje-v2';
const SHELL = ['./manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

/** Bewaart de pagina en alle scripts/stijlen (in de map assets/) die erin genoemd worden. */
async function cachePage(cache, response) {
  const html = await response.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.put('./', response);
  await Promise.all(
    assets.map(async (asset) => {
      if (await cache.match(asset)) return;
      const assetResponse = await fetch(asset);
      if (assetResponse.ok) await cache.put(asset, assetResponse);
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      const page = await fetch('./');
      if (page.ok) await cachePage(cache, page);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Alleen eigen bestanden; het weer en andere sites gaan gewoon naar het netwerk.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Alleen een goede pagina bewaren, nooit een foutpagina.
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cachePage(cache, copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match('./')) ?? Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
