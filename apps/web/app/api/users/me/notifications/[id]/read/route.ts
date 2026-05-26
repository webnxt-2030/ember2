import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { errorResponse, okResponse } from '@/lib/api-response'
import { AuthError, NotFoundError, ForbiddenError } from '@/lib/errors'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.user) {
    return errorResponse(new AuthError(), req)
  }

  const { id } = await params

  const notification = await prisma.inAppNotification.findUnique({
    where: { id },
  })

  if (!notification) {
    return errorResponse(new NotFoundError('Notification'), req)
  }

  if (notification.userId !== session.user.id) {
    return errorResponse(new ForbiddenError(), req)
  }

  const updated = await prisma.inAppNotification.update({
    where: { id },
    data: { readAt: new Date() },
  })

  return okResponse({
    id: updated.id,
    readAt: updated.readAt!.toISOString(),
  })
}
