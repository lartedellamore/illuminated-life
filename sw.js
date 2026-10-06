/* Illuminated Life · offline cache.
   Change the version below whenever you publish new files, so phones pick up the update. */
const VERSION = "illuminated-life-7";
// Everything the app needs to open with no network.
const FILES = ["app.html", "css/styles.css", "js/data.js", "js/calendar-data.js", "js/liturgy.js", "js/app.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/apple-touch-icon.png", "assets/fonts/cormorant-garamond-latin-400-normal.woff2", "assets/fonts/cormorant-garamond-latin-500-normal.woff2", "assets/fonts/cormorant-garamond-latin-600-normal.woff2", "assets/fonts/cormorant-garamond-latin-400-italic.woff2", "assets/fonts/inter-latin-400-normal.woff2", "assets/fonts/inter-latin-500-normal.woff2", "assets/fonts/inter-latin-600-normal.woff2"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Only whole, same-origin answers are kept. Errors, redirects to other sites and opaque replies are not.
const keepable = (req, res) => {
  const url = new URL(req.url);
  return res && res.ok && res.status === 200 && res.type === "basic" && url.origin === self.location.origin && !url.search;
};

// A worker that has been replaced must not bring its old cache back after the new one removed it.
const retired = () => !!(self.serviceWorker && self.serviceWorker.state === "redundant");
const store = (req, copy) => caches.has(VERSION).then((has) => (has && !retired() ? caches.open(VERSION).then((c) => c.put(req, copy)) : null)).catch(() => {});

// Network first, so updates arrive; the cache answers when offline.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url; try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // fonts and other sites go straight to the network
  e.respondWith(fetch(req).then((res) => {
    if (keepable(req, res)) { const copy = res.clone(); e.waitUntil(store(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((hit) => {
    if (hit) return hit;
    if (req.mode !== "navigate") return Response.error();
    // A page was asked for and is not here: send the browser to the app itself.
    const app = new URL("app.html", self.registration.scope).href;
    return caches.match(app).then((page) => (page ? Response.redirect(app, 302) : Response.error()));
  })));
});
