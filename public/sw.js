// Service Worker for Lya PWA
// MVP: minimal SW for installability — no offline caching

const CACHE_NAME = "lya-v1";

self.addEventListener("install", (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-first strategy: always go to network, no offline fallback at MVP
  event.respondWith(fetch(event.request));
});
