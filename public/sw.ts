/**
 * Sowwanjo POS — Service Worker
 * App shell caching for offline PWA support
 * Note: this file is served as-is from /public — Vite copies it verbatim.
 * It uses vanilla JS service worker APIs (no TS compilation needed in this context).
 */

// @ts-nocheck — Service workers run in a special global context

const CACHE_VERSION = "sowwanjo-v2";
const API_ORIGIN = "sowwanjo-pos-api.onrender.com";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon.svg",
];

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {})
    ).then(() => (self as unknown as ServiceWorkerGlobalScope).skipWaiting())
  );
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => (self as unknown as ServiceWorkerGlobalScope).clients.claim())
  );
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // API calls — pass through (app handles failure via IndexedDB)
  if (url.hostname === API_ORIGIN || url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (
            ct.includes("javascript") || ct.includes("css") ||
            ct.includes("font") || ct.includes("image") ||
            url.pathname.endsWith(".html") || url.pathname === "/"
          ) {
            caches.open(CACHE_VERSION).then((c) => c.put(event.request, res.clone()));
          }
        }
        return res;
      }).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("/index.html").then(
            (r) => r ?? new Response("Sowwanjo POS — Offline", { status: 503 })
          );
        }
        return new Response("", { status: 503 });
      });
    })
  );
});

self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === "sowwanjo-sync") {
    event.waitUntil(
      (self as unknown as ServiceWorkerGlobalScope).clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "BACKGROUND_SYNC" }));
      })
    );
  }
});

self.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
  }
});
