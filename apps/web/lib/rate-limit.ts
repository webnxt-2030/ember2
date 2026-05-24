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

/**
 * Atomic sliding-window rate limiter script.
 *
 * Removes stale entries, checks the current count, and only ZADDs the new
 * member when the limit has NOT been reached — so rejected requests never
 * consume a slot and a flooded window drains correctly.
 *
 * Returns: [new_count, allowed]  (allowed = 1 if request was added, 0 if rejected)
 *
 * KEYS[1]  = sorted-set key
 * ARGV[1]  = now (ms epoch)
 * ARGV[2]  = window_start = now - windowMs  (entries older than this are expired)
 * ARGV[3]  = limit
 * ARGV[4]  = windowMs  (used for PEXPIRE)
 * ARGV[5]  = unique member string for this request
 */
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_start = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local window_ms = tonumber(ARGV[4])
local member = ARGV[5]

redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
local count = redis.call('ZCARD', key)
if count >= limit then
  return {count, 0}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window_ms)
local new_count = count + 1
return {new_count, 1}
`

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
    const member = `${now}-${Math.random()}`
    const result = await r.eval(
      RATE_LIMIT_SCRIPT,
      1,
      key,
      String(now),
      String(windowStart),
      String(limit),
      String(windowMs),
      member,
    ) as [number, number]

    const count = result[0]
    const allowed = result[1]
    const success = allowed === 1

    return {
      success,
      limit,
      remaining: Math.max(0, limit - count),
      reset,
    }
  } catch (err) {
    // If Redis is unavailable, fail open — don't block requests
    console.error('[rate-limit] Redis error, failing open:', err)
    return { success: true, limit, remaining: limit, reset }
  }
}
