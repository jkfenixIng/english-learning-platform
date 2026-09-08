/**
 * Offline-first SRS queue + background sync stub.
 * Persists failed POSTs to IndexedDB/localStorage and replays on online.
 * Zero-paid: no external queue service; stub ready for Workbox Background Sync plugin.
 */

const KEY = "elp-sync-queue";

type Queued = { url: string; body: unknown; ts: number };

function load(): Queued[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as Queued[]) : [];
  } catch { return []; }
}
function save(q: Queued[]) {
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch {}
}

export function enqueue(url: string, body: unknown) {
  const q = load();
  q.push({ url, body, ts: Date.now() });
  save(q);
}

export async function flushQueue(): Promise<number> {
  const q = load();
  if (q.length === 0 || typeof fetch === "undefined" || !navigator.onLine) return 0;
  let flushed = 0;
  const remaining: Queued[] = [];
  for (const item of q) {
    try {
      const res = await fetch(item.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.body) });
      if (res.ok) flushed++; else remaining.push(item);
    } catch { remaining.push(item); }
  }
  save(remaining);
  return flushed;
}

export function getQueueLength(): number { return load().length; }

// Auto-flush on online event when running in browser
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushQueue(); });
}
