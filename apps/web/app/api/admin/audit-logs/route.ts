import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
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
  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  const page = Math.max(1, Number(pageParam ?? 1))
  const limit = Math.max(1, Math.min(500, Number(limitParam ?? 50)))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (type) {
    where.type = type
  }

  if (from || to) {
    where.createdAt = {}
    if (from) {
      (where.createdAt as Record<string, unknown>).gte = new Date(from)
    }
    if (to) {
      (where.createdAt as Record<string, unknown>).lte = new Date(to)
    }
  }

  if (q) {
    where.OR = [
      { targetType: { contains: q, mode: 'insensitive' } },
      { targetId: { contains: q, mode: 'insensitive' } },
      { actorWallet: { contains: q, mode: 'insensitive' } },
      { actor: { email: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        targetType: true,
        targetId: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        actorUserId: true,
        actorWallet: true,
        actor: { select: { email: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return okResponse({
    logs: logs.map((l) => ({
      id: l.id,
      type: l.type,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata as Record<string, unknown>,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
      actorUserId: l.actorUserId,
      actorWallet: l.actorWallet,
      actorEmail: l.actor?.email ?? null,
    })),
    page,
    totalPages,
  })
}
