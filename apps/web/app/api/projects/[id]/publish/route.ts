import type { NextRequest } from 'next/server'
import { encodeFunctionData } from 'viem'
import { ProjectFactoryAbi } from '@ember/shared'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: { organization: true },
  })
  if (!project) return errorResponse(new NotFoundError('Project not found'), req)

  // Auth: must own the org
  try {
    await assertOwnsOrg(session, project.organizationId, prisma)
  } catch (err) {
    return errorResponse(err, req)
  }

  // Guard: only DRAFT projects can be published
  if (project.status !== 'DRAFT') {
    return errorResponse(new ValidationError(`Project is ${project.status}, not DRAFT`), req)
  }

  // Guard: org must be VERIFIED
  if (project.organization.verifiedStatus !== 'VERIFIED') {
    return errorResponse(
      new ForbiddenError('Only organizations with VERIFIED status can publish projects'),
      req
    )
  }

  // Build projectURI
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ember.app'
  const projectURI = `${appUrl}/api/projects/${id}/metadata`

  // Encode calldata for ProjectFactory.createProject
  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS
  if (!factoryAddress) return errorResponse(new ValidationError('Factory address not configured'), req)

  const calldata = encodeFunctionData({
    abi: ProjectFactoryAbi,
    functionName: 'createProject',
    args: [
      project.organization.receivingWallet as `0x${string}`,
      project.milestoneBps as readonly number[],
      project.votingPeriodDays * 86400,
      projectURI,
    ],
  })

  return okResponse({
    to: factoryAddress,
    calldata,
    projectURI,
    chainId: Number(process.env.NEXT_PUBLIC_MORPH_CHAIN_ID ?? 2910),
  })
}
