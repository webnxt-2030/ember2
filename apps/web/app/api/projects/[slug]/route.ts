import type { NextRequest } from 'next/server'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { getProjectBySlug } from '@/lib/db/projects'
import type { ProjectBySlug } from '@/lib/db/projects'
import { projectSlugParamSchema } from '@ember/shared'

type LiveProject = NonNullable<ProjectBySlug>
type ProjectMilestone = LiveProject['milestones'][number]

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

  const project: ProjectBySlug = await getProjectBySlug(parsed.data.slug)

  if (project?.status !== 'LIVE') {
    return errorResponse(new NotFoundError('Project'), _req)
  }

  const liveProject: LiveProject = project

  const response = {
    id: liveProject.id,
    slug: liveProject.slug,
    title: liveProject.title,
    summary: liveProject.summary,
    description: liveProject.description,
    pictures: liveProject.pictures,
    targetAmount: liveProject.targetAmount.toString(),
    totalRaised: liveProject.totalRaised.toString(),
    fundingDeadline: liveProject.fundingDeadline?.toISOString() ?? null,
    rewardCurveType: liveProject.rewardCurveType,
    escrowAddress: liveProject.escrowAddress,
    nftAddress: liveProject.nftAddress,
    status: liveProject.status,
    publishedAt: liveProject.publishedAt?.toISOString() ?? null,
    organization: { name: liveProject.organization.title },
    milestoneCount: liveProject.milestones.length,
    backerCount: liveProject._count.contributions,
    milestones: liveProject.milestones.map((m: ProjectMilestone) => ({
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
