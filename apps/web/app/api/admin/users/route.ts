import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const runtime = 'nodejs'

const querySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    return errorResponse(err, req)
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) {
    return errorResponse(parsed.error, req)
  }

  const { q, page, limit } = parsed.data
  const skip = (page - 1) * limit

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { wallets: { some: { address: { contains: q, mode: 'insensitive' as const } } } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        wallets: { select: { address: true, isPrimary: true }, take: 3 },
        orgMemberships: { select: { organizationId: true }, take: 5 },
      },
    }),
    prisma.user.count({ where }),
  ])

  return okResponse({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      wallets: u.wallets,
      orgCount: u.orgMemberships.length,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}
