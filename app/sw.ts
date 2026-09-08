// Serwist service worker stub - will be replaced by Serwist build in Slice 2-3
// For Slice 1, minimal stub to satisfy PWA install criteria
self.addEventListener("install", () => {
  (self as unknown as { skipWaiting: () => void }).skipWaiting();
});
self.addEventListener("activate", () => {
  (self as unknown as { clients: { claim: () => void } }).clients.claim();
});
export {};
