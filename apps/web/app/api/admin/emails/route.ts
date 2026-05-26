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
  const status = searchParams.get('status') ?? undefined
  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  const page = Math.max(1, Number(pageParam ?? 1))
  const limit = Math.max(1, Math.min(100, Number(limitParam ?? 20)))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (q) {
    where.OR = [
      { to: { contains: q, mode: 'insensitive' } },
      { template: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [emails, total] = await Promise.all([
    prisma.emailNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        to: true,
        template: true,
        status: true,
        resendId: true,
        error: true,
        sentAt: true,
        createdAt: true,
      },
    }),
    prisma.emailNotification.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return okResponse({
    emails: emails.map((e) => ({
      id: e.id,
      to: e.to,
      template: e.template,
      status: e.status,
      resendId: e.resendId,
      error: e.error,
      sentAt: e.sentAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    page,
    totalPages,
  })
}
