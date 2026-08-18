const CACHE_NAME = "pime-empresa-shell-v2";
const OFFLINE_URL = "/offline-empresa.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icons/empresa-icon-192.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigations only, falling back to a cached offline page.
// Everything else (API calls, static assets) passes straight through to the
// network untouched — this is a live business app, we never want to serve
// stale client/invoice/quote data from cache.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
