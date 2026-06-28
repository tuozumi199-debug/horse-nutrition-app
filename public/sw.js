const CACHE_VERSION = "p0-stabilization-2026-06-28";
const STATIC_CACHE = `horsefeed-static-${CACHE_VERSION}`;
const PAGE_CACHE = `horsefeed-page-${CACHE_VERSION}`;
const ALLOWED_CACHES = [STATIC_CACHE, PAGE_CACHE];
const APP_ROOT = new URL(self.registration.scope);
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !ALLOWED_CACHES.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT.pathname)) return;

  if (event.request.mode === "navigate" || isHtmlRequest(event.request)) {
    event.respondWith(networkFirstPage(event.request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
  }
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match("./index.html") || await caches.match("./index.html");
    return fallback ?? new Response("HorseFeed Manager is offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

function isHtmlRequest(request) {
  return request.headers.get("accept")?.includes("text/html");
}

function isStaticAsset(url) {
  return /\.(?:js|css|png|jpg|jpeg|svg|webp|json|webmanifest)$/i.test(url.pathname);
}
