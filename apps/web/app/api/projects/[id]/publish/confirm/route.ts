import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError, AuthError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { addressSchema } from '@ember/shared'
import { z } from 'zod'

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export const runtime = 'nodejs'
export const maxDuration = 120

const confirmSchema = z.object({
  txHash: z.string().min(1),
  projectId: z.coerce.bigint(),
  escrowContractId: addressSchema,
  nftContractId: addressSchema,
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ValidationError('Validation failed', parsed.error.issues), req)
  }
  const { txHash, projectId, escrowContractId, nftContractId } = parsed.data

  const project = await prisma.project.findUnique({
    where: { id },
    include: { organization: true },
  })
  if (!project) return errorResponse(new NotFoundError('Project not found'), req)

  try {
    await assertOwnsOrg(session, project.organizationId, prisma)
  } catch (err) {
    return errorResponse(err, req)
  }
  if (!session) {
    return errorResponse(new AuthError(), req)
  }

  if (project.status === 'LIVE' && project.escrowAddress) {
    return okResponse({
      projectId: project.id,
      status: 'LIVE',
      escrowAddress: project.escrowAddress,
      nftAddress: project.nftAddress,
    })
  }

  if (project.status !== 'DRAFT') {
    return errorResponse(new ValidationError(`Project is ${project.status}, cannot confirm publish`), req)
  }

  const onChainId = projectId.toString()

  await prisma.$transaction(async (tx: TxClient) => {
    await tx.project.update({
      where: { id, status: 'DRAFT' },
      data: {
        onChainId,
        escrowAddress: escrowContractId,
        nftAddress: nftContractId,
        status: 'LIVE',
        publishedAt: new Date(),
      },
    })

    await tx.milestone.updateMany({
      where: { projectId: id, index: 0, status: 'PENDING' },
      data: { status: 'AUTO_RELEASED' },
    })

    await tx.activityLog.create({
      data: {
        actorUserId: session.user.id,
        type: 'PROJECT_PUBLISHED',
        targetType: 'Project',
        targetId: id,
        metadata: { txHash, onChainId, escrowAddress: escrowContractId, nftAddress: nftContractId, orgId: project.organizationId },
      },
    })
  }).catch((err: unknown) => {
    const e = err as { code?: string; meta?: { cause?: string } }
    if (e.meta?.cause?.includes('0 rows')) return
    throw err
  })

  return okResponse({
    projectId: id,
    status: 'LIVE',
    escrowAddress: escrowContractId,
    nftAddress: nftContractId,
  })
}
