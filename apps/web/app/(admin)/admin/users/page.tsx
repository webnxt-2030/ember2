import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { UsersTable } from './users-table'

export const runtime = 'nodejs'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; limit?: string }>
}) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/')
    throw err
  }

  const { q, page: pageParam, limit: limitParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))
  const limit = Math.max(1, Math.min(100, Number(limitParam ?? 20)))
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

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface font-bold mb-8">Users</h1>
        <UsersTable
          initialUsers={users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            createdAt: u.createdAt.toISOString(),
            wallets: u.wallets,
            orgCount: u.orgMemberships.length,
          }))}
          initialTotal={total}
          initialPage={page}
          initialLimit={limit}
          initialTotalPages={totalPages}
        />
      </Container>
    </div>
  )
}
