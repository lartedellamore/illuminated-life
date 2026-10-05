/* Illuminated Life · offline cache.
   Change the version below whenever you publish new files, so phones pick up the update. */
const VERSION = "illuminated-life-1";
const FILES = ["./", "index.html", "css/styles.css", "js/data.js", "js/liturgy.js", "js/app.js", "manifest.webmanifest", "icons/icon.svg"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first, so updates arrive; the cache answers when offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {}); return res;
  }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
});
