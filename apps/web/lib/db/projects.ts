import { prisma } from './index'

export async function getProjectBySlug(slug: string) {
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      organization: { select: { title: true } },
      milestones: { orderBy: { index: 'asc' } },
    },
  })
  if (!project) return null

  // Prisma's `_count` can't count distinct columns, so count unique backers separately.
  const distinctBackers = await prisma.contribution.findMany({
    where: { projectId: project.id },
    distinct: ['walletAddress'],
    select: { walletAddress: true },
  })

  // Organization stores the display name in `title`; expose it as `name` for the API shape.
  return {
    ...project,
    organization: { name: project.organization.title },
    _count: { contributions: distinctBackers.length },
  }
}

interface PaginationParams {
  page: number
  pageSize: number
}

export async function listLiveProjects({ page, pageSize }: PaginationParams) {
  const skip = (page - 1) * pageSize
  const [rawProjects, total] = await Promise.all([
    prisma.project.findMany({
      where: { status: 'LIVE' },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        pictures: true,
        targetAmount: true,
        totalRaised: true,
        status: true,
        organization: { select: { title: true } },
      },
    }),
    prisma.project.count({ where: { status: 'LIVE' } }),
  ])
  // Organization stores the display name in `title`; expose it as `name`.
  const projects = rawProjects.map((p) => ({
    ...p,
    organization: { name: p.organization.title },
  }))
  return { projects, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getProjectContributions(
  projectId: string,
  { page, pageSize }: PaginationParams,
) {
  const skip = (page - 1) * pageSize
  return prisma.contribution.findMany({
    where: { projectId },
    orderBy: { contributedAt: 'desc' },
    skip,
    take: pageSize,
    select: { walletAddress: true, amount: true, m0Share: true, contributedAt: true, txHash: true },
  })
}
