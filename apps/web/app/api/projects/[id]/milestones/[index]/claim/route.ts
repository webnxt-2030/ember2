import type { NextRequest } from 'next/server'
import { cuidSchema } from '@ember/shared'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { env } from '@/env'
import { z } from 'zod'

const paramsSchema = z.object({
  id: cuidSchema,
  index: z.coerce.number().int().nonnegative(),
})

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const session = await getSession()
  const { id, index } = await params

  const parsed = paramsSchema.safeParse({ id, index })
  if (!parsed.success) {
    return errorResponse(new ValidationError('Invalid parameters'), req)
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.id },
    include: { organization: true, milestones: true },
  })
  if (!project) return errorResponse(new NotFoundError('Project'), req)

  try {
    await assertOwnsOrg(session, project.organizationId, prisma)
  } catch (err) {
    return errorResponse(err, req)
  }

  const milestone = project.milestones.find((m: { index: number }) => m.index === parsed.data.index)
  if (!milestone) return errorResponse(new NotFoundError('Milestone'), req)

  if (milestone.status === 'CLAIMED') {
    return errorResponse(new ValidationError('Milestone already claimed'), req)
  }

  if (milestone.status !== 'PASSED') {
    return errorResponse(new ValidationError('Milestone is not PASSED'), req)
  }

  if (!project.escrowAddress) {
    return errorResponse(new ValidationError('Project escrow not deployed'), req)
  }

  return okResponse({
    escrowContractId: project.escrowAddress,
    milestoneIndex: parsed.data.index,
    networkPassphrase: env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE,
  })
}
