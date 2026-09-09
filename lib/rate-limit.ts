/**
 * Token bucket in-memory rate limiter — 0 USD, no Redis.
 * Map key -> { count, resetAt }. Suitable for single-instance Vercel.
 * For multi-instance, counts are per instance (acceptable for free tier).
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Periodic cleanup (avoid memory leak) — runs only on server
if (typeof globalThis !== "undefined") {
  // Store reference globally to avoid duplicate timers on HMR
  const g = globalThis as unknown as { __rateLimitCleanup?: ReturnType<typeof setInterval> };
  if (!g.__rateLimitCleanup) {
    g.__rateLimitCleanup = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of store) {
        if (v.resetAt < now) store.delete(k);
      }
    }, 60_000);
    // Allow Node to exit even if timer is active
    if (
      g.__rateLimitCleanup &&
      typeof (g.__rateLimitCleanup as unknown as { unref?: () => void }).unref === "function"
    ) {
      (g.__rateLimitCleanup as unknown as { unref: () => void }).unref();
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
  retryAfterSec: number;
}

export interface RateLimitOptions {
  limit: number; // max requests per window
  windowMs: number; // window duration ms
}

/**
 * Check and increment. Returns allowed=false if over limit.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, resetAt, retryAfterSec: 0 };
  }
  if (bucket.count < opts.limit) {
    bucket.count += 1;
    const remaining = opts.limit - bucket.count;
    return { allowed: true, remaining, resetAt: bucket.resetAt, retryAfterSec: 0 };
  }
  const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
  return { allowed: false, remaining: 0, resetAt: bucket.resetAt, retryAfterSec };
}

/**
 * Derive client key from NextRequest: prefer auth user, fallback to IP.
 */
export function getClientKey(req: Request, userId?: string | null): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (userId) return `uid:${userId}`;
  return `ip:${ip}`;
}

/**
 * Helper: build 429 response headers.
 */
export function rateLimitHeaders(result: RateLimitResult, opts: RateLimitOptions) {
  return {
    "X-RateLimit-Limit": String(opts.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "Retry-After": String(result.retryAfterSec),
  } as Record<string, string>;
}
