/*
 * Cartfull service worker.
 * - Build assets and icons: cache first (file names are content-hashed).
 * - Recipe photos: cache first, capped.
 * - Signed-in pages: network first, falling back to the last copy seen on this
 *   device, so the grocery list opens in a store with no signal.
 * - API, auth and non-GET requests are never touched.
 */
const VERSION = "v1";
const STATIC = `cartfull-static-${VERSION}`;
const PAGES = `cartfull-pages-${VERSION}`;
const PHOTOS = `cartfull-photos-${VERSION}`;
const PHOTO_LIMIT = 80;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => ![STATIC, PAGES, PHOTOS].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    if (limit) {
      const keys = await cache.keys();
      if (keys.length > limit) await cache.delete(keys[0]);
    }
  }
  return response;
}

async function pageNetworkFirst(request) {
  const cache = await caches.open(PAGES);
  // One copy per path: query strings such as ?source=pwa do not change the page.
  const key = new URL(request.url).pathname;
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.headers.get("content-type")?.includes("text/html")) {
      await cache.put(key, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(key)) ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname === "/auth/signout") {
    // Signing out removes this person's saved pages from the device.
    event.waitUntil(caches.delete(PAGES));
    return;
  }
  if (request.method !== "GET") return;

  if (url.hostname === "images.unsplash.com") {
    event.respondWith(cacheFirst(request, PHOTOS, PHOTO_LIMIT).catch(() => Response.error()));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (request.mode === "navigate" && url.pathname.startsWith("/app")) {
    event.respondWith(pageNetworkFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()));
  }
});
