import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { errorResponse } from '@/lib/api-response'
import { AppError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

type CsvPrimitive = string | number | boolean | bigint | null | undefined
function csvEscape(value: CsvPrimitive | object): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(cols: (CsvPrimitive | object)[]): string {
  return cols.map(csvEscape).join(',') + '\r\n'
}

const HEADERS = [
  'id',
  'createdAt',
  'type',
  'actorUserId',
  'actorEmail',
  'actorWallet',
  'targetType',
  'targetId',
  'ipAddress',
  'userAgent',
  'metadata',
]

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = await rateLimit(`ratelimit:audit-csv:${ip}`, 5, 60_000)
  if (!rl.success) {
    return errorResponse(new AppError('RATE_LIMITED', 'Too Many Requests', 429), req)
  }

  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    return errorResponse(err, req)
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? undefined
  const type = searchParams.get('type') ?? undefined
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  const where: Record<string, unknown> = {}

  if (type) where.type = type

  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
  }

  if (q) {
    where.OR = [
      { targetType: { contains: q, mode: 'insensitive' } },
      { targetId: { contains: q, mode: 'insensitive' } },
      { actorWallet: { contains: q, mode: 'insensitive' } },
      { actor: { email: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `audit-logs-${dateStr}.csv`

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const encoder = new TextEncoder()

        controller.enqueue(encoder.encode(csvRow(HEADERS)))

        const BATCH = 500
        let skip = 0
        let hasMore = true

        while (hasMore) {
          const rows = await prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            skip,
            take: BATCH,
            select: {
              id: true,
              createdAt: true,
              type: true,
              actorUserId: true,
              actorWallet: true,
              targetType: true,
              targetId: true,
              ipAddress: true,
              userAgent: true,
              metadata: true,
              actor: { select: { email: true } },
            },
          })

          for (const row of rows) {
            controller.enqueue(
              encoder.encode(
                csvRow([
                  row.id,
                  row.createdAt.toISOString(),
                  row.type,
                  row.actorUserId ?? '',
                  row.actor?.email ?? '',
                  row.actorWallet ?? '',
                  row.targetType ?? '',
                  row.targetId ?? '',
                  row.ipAddress ?? '',
                  row.userAgent ?? '',
                  JSON.stringify(row.metadata),
                ]),
              ),
            )
          }

          hasMore = rows.length === BATCH
          skip += BATCH
        }

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
