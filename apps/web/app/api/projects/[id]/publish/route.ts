import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { env } from '@/env'

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

  const factoryContractId = env.NEXT_PUBLIC_FACTORY_CONTRACT_ID
  if (!factoryContractId) {
    return errorResponse(new ValidationError('Factory contract ID not configured'), req)
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL || 'https://ember.app'
  const projectURI = `${appUrl}/api/projects/${id}/metadata`

  return okResponse({
    factoryContractId,
    organization: project.organization.receivingWallet,
    milestoneBps: project.milestoneBps,
    votingPeriodSeconds: project.votingPeriodDays * 24 * 60 * 60,
    projectURI,
    networkPassphrase: env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE,
  })
}
