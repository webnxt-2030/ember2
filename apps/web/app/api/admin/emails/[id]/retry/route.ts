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

  const email = await prisma.emailNotification.findUnique({
    where: { id },
    select: { id: true, status: true, to: true, template: true },
  })

  if (!email) {
    return errorResponse(new NotFoundError('Email notification'), req)
  }

  if (email.status !== 'FAILED') {
    return errorResponse(
      new ValidationError('Only FAILED emails can be retried'),
      req,
    )
  }

  const updated = await prisma.emailNotification.update({
    where: { id },
    data: { status: 'QUEUED', error: null },
  })

  await logActivity(
    { prisma, actorUserId: session.user.id, req },
    {
      type: 'ADMIN_ACTION',
      targetType: 'EmailNotification',
      targetId: id,
      metadata: {
        action: 'RETRY_EMAIL',
        to: email.to,
        template: email.template,
      },
    },
  )

  return okResponse({
    id: updated.id,
    status: updated.status,
  })
}
