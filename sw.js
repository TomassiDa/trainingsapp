// Bewaart de app offline. Verhoog VERSION bij elke update.
const VERSION = 'v1';
const CORE = ['./', 'index.html', 'styles.css', 'data.js', 'app.js', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',   "img/arnold.jpg",  "img/bench.jpg",  "img/chinups.jpg",  "img/closegrip.jpg",  "img/conc.jpg",  "img/csrow.jpg",  "img/curl.jpg",  "img/dips.jpg",  "img/fly.jpg",  "img/goblet.jpg",  "img/hammer.jpg",  "img/incline.jpg",  "img/inclinecurl.jpg",  "img/kickback.jpg",  "img/kneeraise.jpg",  "img/lateral.jpg",  "img/legraise.jpg",  "img/ohext.jpg",  "img/pullups.jpg",  "img/pushups.jpg",  "img/rdl.jpg",  "img/revfly.jpg",  "img/row.jpg",  "img/russian.jpg",  "img/skull.jpg",];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(function (hit) {
    const net = fetch(e.request).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
