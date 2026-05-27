import type { NextRequest } from 'next/server'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { getProjectBySlug, getProjectContributions } from '@/lib/db/projects'
import { paginationSchema } from '@ember/shared'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Public read keyed by slug; the shared [id] segment carries the slug value here.
  const { id: slug } = await params

  const project = await getProjectBySlug(slug)

  if (project?.status !== 'LIVE') {
    return errorResponse(new NotFoundError('Project'), req)
  }

  const { searchParams } = new URL(req.url)
  const parsed = paginationSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  })
  if (!parsed.success) {
    return errorResponse(new NotFoundError('Project'), req)
  }

  const contributions = await getProjectContributions(project.id, {
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  })

  const result = contributions.map((c: { walletAddress: string; amount: { toString: () => string }; m0Share: { toString: () => string }; contributedAt: Date; txHash: string }) => ({
    walletAddress: c.walletAddress,
    amount: c.amount.toString(),
    m0Share: c.m0Share.toString(),
    contributedAt: c.contributedAt.toISOString(),
    txHash: c.txHash,
  }))

  return okResponse({
    contributions: result,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  })
}
