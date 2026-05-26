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
  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  const page = Math.max(1, Number(pageParam ?? 1))
  const limit = Math.max(1, Math.min(100, Number(limitParam ?? 20)))
  const skip = (page - 1) * limit

  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { slug: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        targetAmount: true,
        totalRaised: true,
        createdAt: true,
        organization: { select: { title: true } },
      },
    }),
    prisma.project.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return okResponse({
    projects: projects.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      targetAmount: p.targetAmount.toString(),
      totalRaised: p.totalRaised.toString(),
      createdAt: p.createdAt.toISOString(),
      organizationTitle: p.organization.title,
    })),
    page,
    totalPages,
  })
}
