import { prisma } from './index.js'

export async function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({
    where: { slug },
    include: {
      organization: { select: { name: true } },
      milestones: { orderBy: { index: 'asc' } },
      _count: { select: { contributions: { distinct: ['walletAddress'] } } },
    },
  })
}

interface PaginationParams {
  page: number
  pageSize: number
}

export async function listLiveProjects({ page, pageSize }: PaginationParams) {
  const skip = (page - 1) * pageSize
  const [projects, total] = await Promise.all([
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
        organization: { select: { name: true } },
      },
    }),
    prisma.project.count({ where: { status: 'LIVE' } }),
  ])
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
