/**
 * Simple in-memory rate limiter.
 * Tracks timestamps of recent actions per key and rejects if the limit is exceeded.
 * Note: resets on server restart / new deployment — good enough for v1.
 */

const buckets = new Map<string, number[]>();

// Clean old entries every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, timestamps] of buckets) {
    const filtered = timestamps.filter((t) => now - t < windowMs);
    if (filtered.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, filtered);
    }
  }
}

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/**
 * Check if an action is allowed under the rate limit.
 *
 * @param key - Unique identifier (e.g. userId or `${userId}:${action}`)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  const timestamps = buckets.get(key) ?? [];

  // Remove expired timestamps
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    const oldestInWindow = recent[0]!;
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return { allowed: false, retryAfterMs };
  }

  // Record this request
  recent.push(now);
  buckets.set(key, recent);

  return { allowed: true };
}
