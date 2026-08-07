/*
  Happyologie service worker.

  Goal: once someone has opened the app once, the daily prompt, both card
  decks, and the shell keep working with no signal — a hallway between
  classes, a dorm with bad wifi, whatever. Bump CACHE_VERSION when you
  change any precached file so returning users get the update instead of
  a stale cache.
*/

var CACHE_VERSION = "happyologie-v2";

var PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/db.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./data/permission-cards.json",
  "./data/stress-cards.json",
  "./data/daily-prompts.json",
  "./data/joy-lines.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_VERSION; })
             .map(function (name) { return caches.delete(name); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  // App shell navigations: try the network first (so a live update shows up
  // right away), fall back to the cached shell when offline. Also re-cache
  // every successful navigation response — this is what lets the shell
  // recover if Cache Storage is ever cleared independently of this worker
  // (a storage-pressure eviction, say) without waiting for a SW script
  // change to trigger a fresh install/precache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  // Everything else (data JSON, CSS, JS, icons, Google Fonts): cache-first,
  // then fill the cache from the network in the background so content edits
  // (new cards, new prompts) still reach installed users on their next visit.
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
