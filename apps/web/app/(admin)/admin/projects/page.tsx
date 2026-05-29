import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { ProjectsTable } from './projects-table'

export const metadata = { title: 'Projects — Admin' }

export const runtime = 'nodejs'

export default async function AdminProjectsPage({
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

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface font-bold mb-8">Projects</h1>
        <ProjectsTable
          initialProjects={projects.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            status: p.status,
            targetAmount: p.targetAmount.toString(),
            totalRaised: p.totalRaised.toString(),
            createdAt: p.createdAt.toISOString(),
            organizationTitle: p.organization.title,
          }))}
          initialPage={page}
          initialLimit={limit}
          initialTotalPages={totalPages}
        />
      </Container>
    </div>
  )
}
