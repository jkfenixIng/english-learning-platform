// Serwist service worker — Slice 3: full reviews offline, background sync stub, update flow
const CACHE_VERSION = "elp-v3";
self.addEventListener("install", () => { (self as unknown as { skipWaiting: () => void }).skipWaiting(); });
self.addEventListener("activate", (event: Event) => {
  (self as unknown as { clients: { claim: () => void } }).clients.claim();
  // Clean old caches on activate
  const extend = (event as unknown as { waitUntil: (p: Promise<void>) => void }).waitUntil;
  if (extend) extend(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))));
});
self.addEventListener("message", (event: Event) => {
  const msg = (event as MessageEvent).data as { type?: string } | undefined;
  if (msg?.type === "SKIP_WAITING") (self as unknown as { skipWaiting: () => void }).skipWaiting();
});
self.addEventListener("fetch", (event: Event) => {
  const req = (event as FetchEvent).request;
  const url = new URL(req.url);
  // SRS queue offline-first — handled by IndexedDB + lib/pwa/sync-queue.ts; pass through and queue on fail
  if (url.pathname.startsWith("/api/srs") || url.pathname.startsWith("/reviews") || url.pathname.startsWith("/api/exercises")) return;
  // Visited lessons offline: network-first with cache fallback (Serwist runtime when built; stub here)
});
self.addEventListener("sync", (event: Event) => {
  const tag = (event as unknown as { tag: string }).tag;
  if (tag === "elp-sync") {
    const extend = (event as unknown as { waitUntil: (p: Promise<void>) => void }).waitUntil;
    if (extend) extend(Promise.resolve());
  }
});
interface FetchEvent extends Event { request: Request; respondWith(r: Response | Promise<Response>): void; }
export {};
