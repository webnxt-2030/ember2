import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  // DB check — try a simple query; gracefully degrade if Prisma not set up
  try {
    // @ts-expect-error — @prisma/client may not be installed yet
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    await db.$queryRaw`SELECT 1`
    await db.$disconnect()
    checks.db = 'ok'
  } catch {
    checks.db = 'error'
  }

  // Redis check — try connecting; gracefully degrade if ioredis not installed
  try {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) throw new Error('REDIS_URL not set')
    // @ts-expect-error — ioredis may not be installed yet
    const { default: Redis } = await import('ioredis')
    const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 2000 })
    await redis.connect()
    await redis.ping()
    redis.disconnect()
    checks.redis = 'ok'
  } catch {
    checks.redis = 'error'
  }

  const allOk = Object.values(checks).every(v => v === 'ok')
  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  )
}
