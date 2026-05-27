import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity-log'
import { NotFoundError, ValidationError } from '@/lib/errors'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    return errorResponse(err, req)
  }

  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, status: true, title: true },
  })
  if (!project) {
    return errorResponse(new NotFoundError('Project'), req)
  }

  if (project.status === 'PAUSED') {
    return errorResponse(new ValidationError('Project is already PAUSED'), req)
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status: 'PAUSED' },
  })

  await logActivity(
    { prisma, actorUserId: session.user.id, req },
    {
      type: 'PROJECT_PAUSED',
      targetType: 'Project',
      targetId: id,
      metadata: { projectTitle: project.title, previousStatus: project.status },
    },
  )

  return okResponse({
    id: updated.id,
    status: updated.status,
    updatedAt: updated.updatedAt.toISOString(),
  })
}
