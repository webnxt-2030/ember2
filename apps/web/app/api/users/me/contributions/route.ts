import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { errorResponse, okResponse } from '@/lib/api-response'
import { AuthError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { paginationSchema } from '@ember/shared'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return errorResponse(new AuthError(), req)
  }

  const { searchParams } = new URL(req.url)
  const parsed = paginationSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  })
  if (!parsed.success) {
    return errorResponse(new AuthError('Invalid pagination'), req)
  }

  const { page, pageSize } = parsed.data
  const skip = (page - 1) * pageSize

  const [contributions, total] = await Promise.all([
    prisma.contribution.findMany({
      where: { backerId: session.user.id },
      orderBy: { contributedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        project: {
          select: {
            id: true,
            slug: true,
            title: true,
            pictures: true,
            escrowAddress: true,
            nftAddress: true,
            milestones: { orderBy: { index: 'asc' }, select: { index: true, title: true, bps: true, status: true } },
          },
        },
      },
    }),
    prisma.contribution.count({ where: { backerId: session.user.id } }),
  ])

  const result = contributions.map((c: { id: string; project: { id: string; slug: string; title: string; pictures: string[]; milestones: { index: number; title: string; bps: number; status: string }[] }; walletAddress: string; amount: { toString: () => string }; m0Share: { toString: () => string }; nftTokenId: string; nftContract: string; txHash: string; blockNumber: bigint; contributedAt: Date }) => ({
    id: c.id,
    project: {
      id: c.project.id,
      slug: c.project.slug,
      title: c.project.title,
      pictures: c.project.pictures,
    },
    walletAddress: c.walletAddress,
    amount: c.amount.toString(),
    m0Share: c.m0Share.toString(),
    allocatedRemaining: (parseFloat(c.amount.toString()) - parseFloat(c.m0Share.toString())).toFixed(6),
    nftTokenId: c.nftTokenId,
    nftContract: c.nftContract,
    txHash: c.txHash,
    blockNumber: c.blockNumber.toString(),
    contributedAt: c.contributedAt.toISOString(),
    milestones: c.project.milestones.map((m: { index: number; title: string; bps: number; status: string }) => ({
      index: m.index,
      title: m.title,
      bps: m.bps,
      status: m.status,
    })),
  }))

  return okResponse({
    contributions: result,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  })
}
