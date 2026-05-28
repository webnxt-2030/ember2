import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, AuthError } from '@/lib/errors'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      escrowAddress: true,
      nftAddress: true,
      organizationId: true,
    },
  })
  if (!project) {
    return errorResponse(new NotFoundError('Project not found'), _req)
  }

  try {
    await assertOwnsOrg(session, project.organizationId, prisma)
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(new AuthError(), _req)
    }
    return errorResponse(err, _req)
  }

  return okResponse({
    id: project.id,
    status: project.status,
    escrowAddress: project.escrowAddress,
    nftAddress: project.nftAddress,
  })
}
