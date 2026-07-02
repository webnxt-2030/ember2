import type { NextRequest } from 'next/server'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { projectSlugParamSchema } from '@ember/shared'
import { z } from 'zod'

const paramsSchema = z.object({
  slug: projectSlugParamSchema.shape.slug,
  index: z.coerce.number().int().nonnegative(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  // Public read keyed by slug; the shared [id] segment carries the slug value here.
  const { id: slug, index } = await params

  const parsed = paramsSchema.safeParse({ slug, index })
  if (!parsed.success) {
    return errorResponse(new ValidationError('Invalid path parameters'), req)
  }

  const project = await prisma.project.findUnique({
    where: { slug: parsed.data.slug },
    select: {
      id: true,
      status: true,
      totalRaised: true,
      milestones: {
        where: { index: parsed.data.index },
        select: {
          id: true,
          index: true,
          status: true,
          voteStartAt: true,
          voteEndAt: true,
          weightYes: true,
          weightNo: true,
          passed: true,
          bps: true,
        },
      },
    },
  })

  if (project?.status !== 'LIVE' || project.milestones.length === 0) {
    return errorResponse(new NotFoundError('Milestone'), req)
  }

  const milestone = project.milestones[0]
  if (!milestone) {
    return errorResponse(new NotFoundError('Milestone'), req)
  }

  // Optional wallet query to return user-specific vote data
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')

  let userVote: { choice: string; weight: string } | null = null
  let userVotingPower = '0'

  if (wallet && /^[G][A-Z2-7]{55}$/.test(wallet)) {
    const vote = await prisma.milestoneVote.findUnique({
      where: {
        milestoneId_walletAddress: {
          milestoneId: milestone.id,
          walletAddress: wallet,
        },
      },
      select: { choice: true, weight: true },
    })

    if (vote) {
      userVote = {
        choice: vote.choice,
        weight: vote.weight.toString(),
      }
    }

    // Sum contributions from this wallet for this project as voting power
    const contributionAgg = await prisma.contribution.aggregate({
      where: {
        projectId: project.id,
        walletAddress: wallet,
      },
      _sum: { amount: true },
    })

    userVotingPower = contributionAgg._sum.amount?.toString() ?? '0'
  }

  const response = {
    milestoneIndex: milestone.index,
    status: milestone.status,
    voteStartAt: milestone.voteStartAt?.toISOString() ?? null,
    voteEndAt: milestone.voteEndAt?.toISOString() ?? null,
    weightYes: milestone.weightYes.toString(),
    weightNo: milestone.weightNo.toString(),
    totalContributed: project.totalRaised.toString(),
    passed: milestone.passed,
    bps: milestone.bps,
    userVote,
    userVotingPower,
  }

  return okResponse(response)
}
