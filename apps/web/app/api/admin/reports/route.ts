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

  const [
    totalUsers,
    usersByRole,
    totalOrgs,
    orgsByStatus,
    totalProjects,
    projectsByStatus,
    totalContributions,
    totalRaised,
    emailStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    prisma.organization.count(),
    prisma.organization.groupBy({ by: ['verifiedStatus'], _count: { verifiedStatus: true } }),
    prisma.project.count(),
    prisma.project.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.contribution.count(),
    prisma.contribution.aggregate({ _sum: { amount: true } }),
    prisma.emailNotification.groupBy({ by: ['status'], _count: { status: true } }),
  ])

  return okResponse({
    users: {
      total: totalUsers,
      byRole: usersByRole.map((r) => ({ role: r.role, count: r._count.role })),
    },
    organizations: {
      total: totalOrgs,
      byStatus: orgsByStatus.map((s) => ({ status: s.verifiedStatus, count: s._count.verifiedStatus })),
    },
    projects: {
      total: totalProjects,
      byStatus: projectsByStatus.map((s) => ({ status: s.status, count: s._count.status })),
    },
    contributions: {
      total: totalContributions,
      totalRaised: totalRaised._sum.amount?.toString() ?? '0',
    },
    emails: {
      byStatus: emailStats.map((s) => ({ status: s.status, count: s._count.status })),
    },
  })
}
