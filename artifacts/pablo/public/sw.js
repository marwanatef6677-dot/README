const CACHE = "pablo-static-v1";
const base = new URL("./", self.location).href;
const files = ["offline.html", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(files.map(p => new URL(p, base).href))));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("pablo-static-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/__")) return;
  // Never cache account, session, API or trip data. No offline mutations.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL("offline.html", base).href)));
  }
});
