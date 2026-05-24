import Redis from 'ioredis'

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL
    if (!url) throw new Error('REDIS_URL not configured')
    redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1 })
  }
  return redis
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // unix ms
}

/**
 * Sliding window rate limiter using Redis sorted sets.
 * @param key       unique identifier (e.g. "ratelimit:auth:1.2.3.4")
 * @param limit     max requests allowed in the window
 * @param windowMs  sliding window duration in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowMs
  const reset = now + windowMs

  try {
    const r = getRedis()
    const pipeline = r.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)        // remove expired entries
    pipeline.zadd(key, now, `${now}-${Math.random()}`)    // record current request
    pipeline.zcard(key)                                    // count requests in window
    pipeline.pexpire(key, windowMs)                        // auto-expire the key
    const results = await pipeline.exec()

    const count = (results?.[2]?.[1] as number) ?? 0
    const success = count <= limit

    return {
      success,
      limit,
      remaining: Math.max(0, limit - count),
      reset,
    }
  } catch {
    // If Redis is unavailable, fail open — don't block requests
    return { success: true, limit, remaining: limit, reset }
  }
}
