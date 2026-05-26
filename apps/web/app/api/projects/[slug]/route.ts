import { NextRequest } from 'next/server'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { getProjectBySlug } from '@/lib/db/projects'
import { projectSlugParamSchema } from '@ember/shared'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!slug) {
    return errorResponse(new NotFoundError('Project'), _req)
  }

  const parsed = projectSlugParamSchema.safeParse({ slug })
  if (!parsed.success) {
    return errorResponse(new NotFoundError('Project'), _req)
  }

  const project = await getProjectBySlug(parsed.data.slug)

  if (!project || project.status !== 'LIVE') {
    return errorResponse(new NotFoundError('Project'), _req)
  }

  const response = {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    description: project.description,
    pictures: project.pictures,
    targetAmount: project.targetAmount.toString(),
    totalRaised: project.totalRaised.toString(),
    fundingDeadline: project.fundingDeadline?.toISOString() ?? null,
    rewardCurveType: project.rewardCurveType,
    escrowAddress: project.escrowAddress,
    nftAddress: project.nftAddress,
    status: project.status,
    publishedAt: project.publishedAt?.toISOString() ?? null,
    organization: { name: project.organization.name },
    milestoneCount: project.milestones.length,
    backerCount: project._count.contributions,
    milestones: project.milestones.map((m: { index: number; title: string; description: string; deliverableDate: Date | null; bps: number; status: string; voteEndAt: Date | null; passed: boolean | null; claimedAt: Date | null }) => ({
      index: m.index,
      title: m.title,
      description: m.description,
      deliverableDate: m.deliverableDate?.toISOString() ?? null,
      bps: m.bps,
      status: m.status,
      voteEndAt: m.voteEndAt?.toISOString() ?? null,
      passed: m.passed,
      claimedAt: m.claimedAt?.toISOString() ?? null,
    })),
  }

  return okResponse(response)
}
