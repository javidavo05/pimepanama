const CACHE_NAME = "pime-empresa-shell-v3";
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

// ── Web Push ────────────────────────────────────────────────────────────────
// El servidor manda { title, body, url, tag }. Si el payload viene vacío o
// ilegible igual mostramos algo: un aviso genérico es mejor que perder el
// evento, que es justamente lo que pasaba con los leads del formulario.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text ? event.data.text() : "" };
  }

  const title = data.title || "Pime Suite";
  const url = data.url || "/empresa";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Tienes una novedad en el panel.",
      icon: "/icons/empresa-icon-192.png",
      badge: "/icons/empresa-icon-192.png",
      tag: data.tag || url,
      renotify: true,
      requireInteraction: true,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/empresa";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/empresa") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
