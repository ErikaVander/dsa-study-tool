/* DSA Study service worker — offline support + installability (PWA).
   Strategy: stale-while-revalidate for same-origin GETs (instant load from cache,
   refreshed in the background), network-first for cross-origin (e.g. the Pyodide CDN).
   Bump VERSION to force clients onto a new cache. */
const VERSION = "v25";
const CACHE = `dsa-study-${VERSION}`;

// App shell precached on install. Content (lessons/quizzes/decks) is cached on first fetch.
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "manifest.json",
  "curriculum.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Stale-while-revalidate: serve cache immediately, update it from the network.
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached || (req.mode === "navigation" ? caches.match("index.html") : undefined));
        return cached || network;
      })
    );
    return;
  }

  // Cross-origin (Pyodide CDN, etc.): try network, fall back to any cached copy.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
