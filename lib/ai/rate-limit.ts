const buckets = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 20;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = buckets.get(userId);
  if (!entry || now > entry.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1 };
  }
  if (entry.count >= LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: LIMIT - entry.count };
}

export function resetRateLimit(userId: string): void {
  buckets.delete(userId);
}
