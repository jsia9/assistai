/**
 * Simple sliding-window rate limiter.
 *
 * Works in both Node.js (API routes, lib/auth.ts) and Edge runtime (middleware).
 * State is module-level — each Vercel serverless/edge worker enforces limits
 * independently. For distributed limiting across workers, swap this for
 * @upstash/ratelimit backed by an Upstash Redis KV store.
 *
 * Usage:
 *   const result = checkRateLimit("login:" + ip, 5, 15 * 60 * 1000);
 *   if (!result.ok) throw new Error("Too many attempts");
 */

interface Entry {
  count: number;
  resetAt: number;
}

// globalThis ensures the map survives hot-reloads in Next.js dev server
const g = globalThis as typeof globalThis & { __rl_store?: Map<string, Entry> };
if (!g.__rl_store) g.__rl_store = new Map<string, Entry>();
const store = g.__rl_store;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * @param key        Unique bucket key (e.g. "login:1.2.3.4")
 * @param max        Max requests allowed in the window
 * @param windowMs   Window length in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/** Remove stale entries (call occasionally to avoid unbounded growth). */
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}
