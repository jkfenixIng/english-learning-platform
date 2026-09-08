const cache = new Map<string, { value: string; expires: number }>();
const TTL = 5 * 60 * 1000;
export function getCache(key: string): string | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) { cache.delete(key); return undefined; }
  return entry.value;
}
export function setCache(key: string, value: string, ttl = TTL): void {
  cache.set(key, { value, expires: Date.now() + ttl });
}
export function hashKey(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}
