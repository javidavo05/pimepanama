/**
 * Service worker de Pime Suite (/empresa).
 *
 * Qué guarda y qué no:
 * - Los archivos de /_next/static: llevan el hash en el nombre y nunca cambian,
 *   así que se sirven desde caché primero. No hay riesgo de servir algo viejo.
 * - El grabador de reuniones, que tiene que abrir sin internet. Se pide a la red
 *   primero y la copia solo se usa si no hay conexión.
 * - Nada más. El resto de la suite muestra clientes, facturas y cotizaciones:
 *   datos de negocio vivos que nunca se sirven desde caché.
 */
const SHELL_CACHE = "pime-empresa-shell-v4";
const STATIC_CACHE = "pime-empresa-static-v1";
const PAGES_CACHE = "pime-empresa-pages-v1";
const KNOWN_CACHES = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE];

const OFFLINE_URL = "/offline-empresa.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icons/empresa-icon-192.png"];

/** Páginas que abren sin conexión. Solo el grabador: grabar no espera a la red. */
const OFFLINE_PAGES = ["/empresa/reuniones/nueva"];

/** Tope de archivos estáticos guardados; cada despliegue deja los suyos. */
const STATIC_MAX_ENTRIES = 400;
const WARM_META = "/__pime-warm-meta";
const WARM_EVERY_MS = 6 * 60 * 60 * 1000;

/**
 * En `next dev` los archivos de /_next/static no llevan hash: guardarlos haría que
 * cada edición se viera con el código anterior. La app registra el worker con
 * `?dev=1` en desarrollo y ahí no se guarda nada (las notificaciones sí funcionan).
 */
const DEV = new URL(self.location.href).searchParams.has("dev");

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KNOWN_CACHES.includes(key)).map((key) => caches.delete(key))))
      .then(() => caches.open(STATIC_CACHE).then(trim))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (DEV) {
    if (request.mode === "navigate") event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode !== "navigate") return;

  if (OFFLINE_PAGES.includes(url.pathname)) {
    event.respondWith(pageNetworkFirst(request, url.pathname));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});

let putsSinceTrim = 0;

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    await cache.put(request, res.clone());
    if (++putsSinceTrim >= 50) {
      putsSinceTrim = 0;
      await trim(cache);
    }
  }
  return res;
}

async function pageNetworkFirst(request, path) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(request);
    // Una redirección al login quiere decir que no hay sesión: la copia vieja,
    // que lleva los proyectos del usuario, se borra en vez de renovarse.
    if (res.ok && !res.redirected) await cache.put(path, res.clone());
    else if (res.redirected) await cache.delete(path);
    return res;
  } catch {
    const cached = await cache.match(path, { ignoreVary: true, ignoreSearch: true });
    return cached || caches.match(OFFLINE_URL);
  }
}

async function trim(cache) {
  const keys = await cache.keys();
  const excess = keys.length - STATIC_MAX_ENTRIES;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

/**
 * Deja listo el grabador para abrir sin internet aunque nunca se haya abierto
 * en este equipo: baja la página y los scripts y estilos que usa. Lo pide la app
 * al cargar con conexión; aquí se decide si hace falta (cada pocas horas).
 */
async function warmOffline() {
  const pages = await caches.open(PAGES_CACHE);
  const meta = await pages.match(WARM_META);
  if (meta) {
    try {
      const { at } = await meta.json();
      if (Date.now() - at < WARM_EVERY_MS) return;
    } catch {
      // Marca ilegible: se vuelve a preparar.
    }
  }

  const statics = await caches.open(STATIC_CACHE);
  for (const path of OFFLINE_PAGES) {
    let res;
    try {
      res = await fetch(path, { credentials: "same-origin", cache: "no-store" });
    } catch {
      return;
    }
    if (!res.ok || res.redirected) {
      await pages.delete(path);
      continue;
    }
    const html = await res.clone().text();
    await pages.put(path, res);

    // Las rutas aparecen en <script src>, en <link> y dentro de los datos de
    // React Server Components (sin el prefijo /_next/ y entre comillas escapadas).
    const assets = new Set();
    for (const match of html.matchAll(/(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\s\\<>]+/g)) {
      assets.add(match[0].startsWith("/_next/") ? match[0] : `/_next/${match[0]}`);
    }
    for (const asset of assets) {
      if (await statics.match(asset)) continue;
      try {
        const a = await fetch(asset);
        if (a.ok) await statics.put(asset, a);
      } catch {
        // Un archivo que no baja ahora se guarda la próxima vez que se use.
      }
    }
  }

  await pages.put(
    WARM_META,
    new Response(JSON.stringify({ at: Date.now() }), { headers: { "Content-Type": "application/json" } })
  );
  await trim(statics);
}

self.addEventListener("message", (event) => {
  if (!DEV && event.data && event.data.type === "WARM_OFFLINE") event.waitUntil(warmOffline());
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
