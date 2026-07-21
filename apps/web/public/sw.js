// Minimal offline support for field engineers (PRD §9: PWA offline support
// where connectivity is poor on-site). Two caches, two strategies:
//   - same-origin app shell (pages/scripts/styles): cache-first, so the UI
//     itself still loads with no connection at all.
//   - cross-origin GET API calls: network-first, falling back to the last
//     successful response when offline (stale data beats a blank screen for
//     an engineer checking their task list mid-install).
// Mutations (non-GET) are never intercepted — they should fail loudly
// offline rather than silently queue, since this app doesn't yet have a
// conflict-resolution story for deferred writes.

const SHELL_CACHE = "rfidcore-shell-v1";
const API_CACHE = "rfidcore-api-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== API_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request)
      .then((res) => res.ok && cache.put(request, res))
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}
