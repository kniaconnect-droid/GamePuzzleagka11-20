/* ==========================================================
   SERVICE-WORKER.JS — Cache offline untuk Puzzle Angka Ceria
   ========================================================== */

const CACHE_NAME = "puzzle-angka-ceria-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./offline.html",
  "./style.css",
  "./app.js",
  "./data.js",
  "./speech.js",
  "./audio.js",
  "./puzzle.js",
  "./manifest.json",

  "./assets/brand/game-logo.png",
  "./assets/brand/gamedu-watermark.png",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",

  "./assets/numbers/11.png",
  "./assets/numbers/12.png",
  "./assets/numbers/13.png",
  "./assets/numbers/14.png",
  "./assets/numbers/15.png",
  "./assets/numbers/16.png",
  "./assets/numbers/17.png",
  "./assets/numbers/18.png",
  "./assets/numbers/19.png",
  "./assets/numbers/20.png",

  "./assets/sounds/ding.wav",
  "./assets/sounds/pop.wav",
  "./assets/sounds/success.wav",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Google Fonts (network-first dengan fallback cache) — tetap opsional/offline-safe
  if (request.url.includes("fonts.googleapis.com") || request.url.includes("fonts.gstatic.com")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Aset lokal: cache-first, fallback ke offline.html untuk navigasi
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => {
          if (request.mode === "navigate") return caches.match("./offline.html");
          return undefined;
        });
    })
  );
});
