import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { EmailsTable } from './emails-table'

export const metadata = { title: 'Emails — Admin' }

export const runtime = 'nodejs'

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; limit?: string }>
}) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/')
    throw err
  }

  const { q, status, page: pageParam, limit: limitParam } = await searchParams
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

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface font-bold mb-8">Emails</h1>
        <EmailsTable
          initialEmails={emails.map((e: Record<string, unknown>) => ({
            id: e.id as string,
            to: e.to as string,
            template: e.template as string,
            status: e.status as string,
            resendId: e.resendId as string | null,
            error: e.error as string | null,
            sentAt: (e.sentAt as Date | null)?.toISOString() ?? null,
            createdAt: (e.createdAt as Date).toISOString(),
          }))}
          initialPage={page}
          initialLimit={limit}
          initialTotalPages={totalPages}
        />
      </Container>
    </div>
  )
}
