// Serwist service worker — Slice 2 adds SRS offline-first + catalog network-first caching
self.addEventListener("install", () => { (self as unknown as { skipWaiting: () => void }).skipWaiting(); });
self.addEventListener("activate", () => { (self as unknown as { clients: { claim: () => void } }).clients.claim(); });
// Cache SRS queue + visited lessons in IndexedDB (see lib/srs/indexed-db.ts); network-first for catalog
self.addEventListener("fetch", (event: Event) => {
  const req = (event as FetchEvent).request;
  const url = new URL(req.url);
  // Offline-first for reviews: let IndexedDB handle it; pass through
  if (url.pathname.startsWith("/api/srs") || url.pathname.startsWith("/reviews")) return;
  // Catalog: network-first fallback to cache is handled by Serwist runtime when built; stub keeps default behavior
});
interface FetchEvent extends Event { request: Request; respondWith(r: Response | Promise<Response>): void; }
export {};
