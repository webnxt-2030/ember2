import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { AuditLogsTable } from './audit-logs-table'

export const metadata = { title: 'Audit Logs — Admin' }

export const runtime = 'nodejs'

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; from?: string; to?: string; page?: string; limit?: string }>
}) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/')
    throw err
  }

  const { q, type, from, to, page: pageParam, limit: limitParam } = await searchParams
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

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface font-bold mb-8">Audit Logs</h1>
        <AuditLogsTable
          initialLogs={logs.map((l: Record<string, unknown>) => ({
            id: l.id as string,
            type: l.type as string,
            targetType: l.targetType as string | null,
            targetId: l.targetId as string | null,
            metadata: l.metadata as Record<string, unknown>,
            ipAddress: l.ipAddress as string | null,
            userAgent: l.userAgent as string | null,
            createdAt: (l.createdAt as Date).toISOString(),
            actorUserId: l.actorUserId as string | null,
            actorWallet: l.actorWallet as string | null,
            actorEmail: ((l.actor as { email: string | null } | null)?.email) ?? null,
          }))}
          initialPage={page}
          initialLimit={limit}
          initialTotalPages={totalPages}
        />
      </Container>
    </div>
  )
}
