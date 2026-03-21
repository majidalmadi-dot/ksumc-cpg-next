/**
 * Simple in-memory rate limiter for API routes.
 * In production, replace with Redis-backed solution (e.g., @upstash/ratelimit).
 */
const tokenBuckets = new Map<string, { tokens: number; lastRefill: number }>()

interface RateLimitConfig {
  maxRequests: number   // max requests per window
  windowMs: number      // window in milliseconds
}

const DEFAULTS: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 }

export function rateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { success: boolean; remaining: number; reset: number } {
  const { maxRequests, windowMs } = { ...DEFAULTS, ...config }
  const now = Date.now()

  let bucket = tokenBuckets.get(key)
  if (!bucket || now - bucket.lastRefill > windowMs) {
    bucket = { tokens: maxRequests - 1, lastRefill: now }
    tokenBuckets.set(key, bucket)
    return { success: true, remaining: bucket.tokens, reset: now + windowMs }
  }

  if (bucket.tokens <= 0) {
    return { success: false, remaining: 0, reset: bucket.lastRefill + windowMs }
  }

  bucket.tokens--
  return { success: true, remaining: bucket.tokens, reset: bucket.lastRefill + windowMs }
}

// Periodic cleanup to prevent memory leaks (run every 5 min)
if (typeof globalThis !== 'undefined') {
  const CLEANUP_INTERVAL = 5 * 60_000
  setInterval(() => {
    const now = Date.now()
    const staleKeys: string[] = []
    tokenBuckets.forEach((bucket, key) => {
      if (now - bucket.lastRefill > 10 * 60_000) staleKeys.push(key)
    })
    staleKeys.forEach((key) => tokenBuckets.delete(key))
  }, CLEANUP_INTERVAL).unref?.()
}
