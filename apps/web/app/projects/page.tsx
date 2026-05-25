import { Suspense } from 'react'
import { Container } from '@/components/layout/container'
import { FilterBar } from '@/components/projects/filter-bar'
import { ProjectCard } from '@/components/projects/project-card'
import { Pagination } from '@/components/projects/pagination'
import { prisma } from '@/lib/db'

interface PageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    orgId?: string
    category?: string
    minRaise?: string
    maxRaise?: string
    page?: string
    pageSize?: string
  }>
}

const PAGE_SIZE = 20

async function getOrgOptions(): Promise<Array<{ value: string; label: string }>> {
  const orgs = await prisma.organization.findMany({
    where: { verifiedStatus: 'VERIFIED' },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  })
  return orgs.map((o: { id: string; title: string }) => ({ value: o.id, label: o.title }))
}

type ProjectStatus = 'DRAFT' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'

type ProjectForPage = {
  id: string
  slug: string
  title: string
  summary: string
  pictures: string[]
  targetAmount: string
  totalRaised: string
  status: ProjectStatus
  fundingDeadline: string | null
  rewardCurveType: string
  organization: {
    id: string
    slug: string
    title: string
    logoUrl: string | null
    verifiedStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  }
  milestoneCount: number
  backersCount: number
}

async function getProjects(search: {
  q?: string
  status?: string
  orgId?: string
  category?: string
  minRaise?: string
  maxRaise?: string
  page: number
  pageSize: number
}): Promise<{ projects: ProjectForPage[]; totalCount: number; totalPages: number }> {
  const { q, status, orgId, category, minRaise, maxRaise, page, pageSize } = search

  interface ProjectFilter {
    status?: 'DRAFT' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
    organizationId?: string
    OR?: Array<{ title?: { contains: string; mode?: 'insensitive' }; summary?: { contains: string; mode?: 'insensitive' } }>
    organization?: { title?: { contains: string; mode?: 'insensitive' } }
    targetAmount?: { gte?: number; lte?: number }
  }
  const where: ProjectFilter = {}

  if (status) {
    where.status = status as 'DRAFT' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
  } else {
    where.status = 'LIVE'
  }

  if (orgId) {
    where.organizationId = orgId
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (category) {
    where.organization = {
      title: { contains: category, mode: 'insensitive' },
    }
  }

  if (minRaise !== undefined || maxRaise !== undefined) {
    where.targetAmount = {}
    if (minRaise !== undefined) {
      where.targetAmount.gte = parseFloat(minRaise)
    }
    if (maxRaise !== undefined) {
      where.targetAmount.lte = parseFloat(maxRaise)
    }
  }

  const skip = (page - 1) * pageSize

  const [projects, totalCount] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { publishedAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
            title: true,
            logoUrl: true,
            verifiedStatus: true,
          },
        },
        milestones: { select: { id: true } },
        contributions: { select: { id: true } },
      },
    }),
    prisma.project.count({ where }),
  ])

  const rawProject = projects[0]
type ProjectRow = typeof rawProject extends null ? never : {
  id: string
  slug: string
  title: string
  summary: string
  pictures: string[]
  targetAmount: { toString(): string }
  totalRaised: { toString(): string }
  status: string
  fundingDeadline: Date | null
  rewardCurveType: string
  organization: {
    id: string
    slug: string
    title: string
    logoUrl: string | null
    verifiedStatus: string
  }
  milestones: Array<{ id: string }>
  contributions: Array<{ id: string }>
}

return {
  projects: projects.map((p: ProjectRow) => {
    const proj = p as ProjectRow
    return {
      id: proj.id,
      slug: proj.slug,
      title: proj.title,
      summary: proj.summary,
      pictures: proj.pictures,
      targetAmount: proj.targetAmount.toString(),
      totalRaised: proj.totalRaised.toString(),
      status: proj.status as ProjectStatus,
      fundingDeadline: proj.fundingDeadline?.toISOString() ?? null,
      rewardCurveType: proj.rewardCurveType,
      organization: { ...proj.organization, verifiedStatus: proj.organization.verifiedStatus as 'PENDING' | 'VERIFIED' | 'REJECTED' },
      milestoneCount: proj.milestones.length,
      backersCount: proj.contributions.length,
    }
  }),
  totalCount,
  totalPages: Math.ceil(totalCount / pageSize),
}
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize ?? String(PAGE_SIZE), 10)))

  const [orgOptions, { projects, totalCount, totalPages }] = await Promise.all([
    getOrgOptions(),
    getProjects({ ...params, page, pageSize }),
  ])

  return (
    <div className="bg-background py-12">
      <Container>
        {/* Page header */}
        <div className="mb-8">
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            Explore
          </p>
          <h1 className="text-display-lg-mobile md:text-display-lg text-on-surface">
            Projects
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-2">
            Back projects that deliver. Every milestone is voted on by backers.
          </p>
        </div>

        {/* Filters */}
        <Suspense fallback={<div className="h-12 bg-surface-container-low rounded-xl animate-pulse mb-8" />}>
          <FilterBar orgOptions={orgOptions} className="mb-8" />
        </Suspense>

        {/* Results count */}
        <p className="text-label-md text-on-surface-variant mb-6">
          {totalCount === 0
            ? 'No projects found'
            : `${totalCount.toLocaleString()} ${totalCount === 1 ? 'project' : 'projects'}`}
        </p>

        {/* Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-4">
              search
            </span>
            <p className="text-headline-md text-on-surface">No projects yet</p>
            <p className="text-body-md text-on-surface-variant mt-2">
              Check back soon, or try adjusting your filters.
            </p>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={totalCount}
        />
      </Container>
    </div>
  )
}