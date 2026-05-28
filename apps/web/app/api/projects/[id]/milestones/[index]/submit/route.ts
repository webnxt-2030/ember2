import type { NextRequest } from 'next/server'
import { encodeFunctionData } from 'viem'
import { ProjectEscrowAbi } from '@ember/shared'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity-log'
import { z } from 'zod'

export const runtime = 'nodejs'

const submitSchema = z.object({
  updateNote: z.string().max(50000).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const session = await getSession()
  const { id, index } = await params
  const milestoneIndex = Number(index)

  if (!Number.isFinite(milestoneIndex) || milestoneIndex < 0) {
    return errorResponse(new ValidationError('Invalid milestone index'), req)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      new ValidationError('Validation failed', parsed.error.issues),
      req,
    )
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      escrowAddress: true,
      status: true,
    },
  })
  if (!project) {
    return errorResponse(new NotFoundError('Project not found'), req)
  }

  // Auth: must own the org
  try {
    await assertOwnsOrg(session, project.organizationId, prisma)
  } catch (err) {
    return errorResponse(err, req)
  }

  // Guard: project must be LIVE or COMPLETED (funding done)
  if (project.status !== 'LIVE' && project.status !== 'COMPLETED') {
    return errorResponse(
      new ValidationError(`Project is ${project.status}, cannot submit milestone`),
      req,
    )
  }

  // Guard: escrow must be deployed
  if (!project.escrowAddress) {
    return errorResponse(
      new ValidationError('Project escrow not deployed yet'),
      req,
    )
  }

  // m0 is auto-released, not submittable
  if (milestoneIndex === 0) {
    return errorResponse(
      new ValidationError('Milestone 0 is auto-released and cannot be submitted'),
      req,
    )
  }

  const milestone = await prisma.milestone.findUnique({
    where: { projectId_index: { projectId: id, index: milestoneIndex } },
  })
  if (!milestone) {
    return errorResponse(new NotFoundError('Milestone not found'), req)
  }

  if (milestone.status !== 'PENDING') {
    return errorResponse(
      new ValidationError(`Milestone is ${milestone.status}, not PENDING`),
      req,
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ember.app'
  const updateUri = `${appUrl}/api/projects/${id}/milestones/${String(milestoneIndex)}/update-note`
  const updateNote = parsed.data.updateNote ?? null

  await prisma.milestone.update({
    where: { projectId_index: { projectId: id, index: milestoneIndex } },
    data: { updateUri, updateNote },
  })

  await logActivity(
    { prisma, actorUserId: session?.user.id ?? null, req },
    {
      type: 'MILESTONE_SUBMITTED',
      targetType: 'Milestone',
      targetId: milestone.id,
      metadata: { projectId: id, milestoneIndex, updateUri },
    },
  )

  const calldata = encodeFunctionData({
    abi: ProjectEscrowAbi,
    functionName: 'submitMilestone',
    args: [BigInt(milestoneIndex), updateUri],
  })

  return okResponse({
    to: project.escrowAddress,
    calldata,
    milestoneIndex,
    updateUri,
    chainId: Number(process.env.NEXT_PUBLIC_MORPH_CHAIN_ID ?? 2910),
  })
}
