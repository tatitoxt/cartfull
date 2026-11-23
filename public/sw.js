/*
 * Cartfull service worker.
 * - Build assets and icons: cache first (file names are content-hashed).
 * - Recipe photos: cache first, capped.
 * - The plan, the grocery list and recipes: network first, falling back to the
 *   last copy seen on this device, so the list opens in a store with no signal.
 *   Account and billing screens are never kept.
 * - Kept pages are removed whenever someone signs in or out, or the sign-in
 *   screen is shown, so they never outlive the person they belong to.
 * - API, auth and non-GET requests are never answered from here.
 */
const VERSION = "v1";
const STATIC = `cartfull-static-${VERSION}`;
const PAGES = `cartfull-pages-${VERSION}`;
const PHOTOS = `cartfull-photos-${VERSION}`;
const PHOTO_LIMIT = 80;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon.svg"];

const keptOffline = (path) => path === "/app/plan" || path === "/app/list" || path.startsWith("/app/recipe/");

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
    if (keptOffline(key) && response.ok && !response.redirected && response.headers.get("content-type")?.includes("text/html")) {
      await cache.put(key, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(key)) ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function savePage(url) {
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (response.ok && !response.redirected && response.headers.get("content-type")?.includes("text/html")) {
      const cache = await caches.open(PAGES);
      await cache.put(url.pathname, response);
    }
  } catch {
    // Offline or interrupted: the last saved copy stays.
  }
}

async function publicPage(request) {
  try {
    const response = await fetch(request);
    // The sign-in form only renders for someone who is signed out, so whatever
    // the last person left on this device goes.
    if (new URL(request.url).pathname === "/login" && response.status === 200) await caches.delete(PAGES);
    return response;
  } catch {
    return (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

// Moving between screens inside the app does not load a new document, so the
// app says which screen it is on and that screen is saved for offline use.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type !== "save-page" || typeof data.path !== "string") return;
  const url = new URL(data.path, self.location.origin);
  if (url.origin !== self.location.origin || !keptOffline(url.pathname)) return;
  event.waitUntil(savePage(url));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith("/auth/")) {
    // Signing in or out: whatever the last person left on this device goes.
    event.waitUntil(caches.delete(PAGES));
    return;
  }
  if (request.method !== "GET") return;

  if (url.hostname === "images.unsplash.com") {
    event.respondWith(cacheFirst(request, PHOTOS, PHOTO_LIMIT).catch(() => Response.error()));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (request.mode === "navigate" && url.pathname.startsWith("/app")) {
    event.respondWith(pageNetworkFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(publicPage(request));
  }
});
