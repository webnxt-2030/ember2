import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity-log'
import { ValidationError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { z } from 'zod'

export const runtime = 'nodejs'

const patchSchema = z.object({
  role: z.enum(['BACKER', 'ORG_OWNER', 'SUPER_ADMIN']),
})

export async function PATCH(
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error, req)
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return errorResponse(new NotFoundError('User'), req)
  }

  const newRole = parsed.data.role
  const oldRole = user.role

  // Prevent demoting self if last super admin
  if (
    session.user.id === id &&
    oldRole === 'SUPER_ADMIN' &&
    newRole !== 'SUPER_ADMIN'
  ) {
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' },
    })
    if (superAdminCount <= 1) {
      return errorResponse(
        new ForbiddenError('Cannot demote yourself: you are the last Super Admin'),
        req,
      )
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: newRole },
  })

  await logActivity(
    { prisma, actorUserId: session.user.id, req },
    {
      type: 'ADMIN_ACTION',
      targetType: 'User',
      targetId: id,
      metadata: {
        action: 'promote_role',
        from: oldRole,
        to: newRole,
      },
    },
  )

  return okResponse({
    id: updated.id,
    email: updated.email,
    role: updated.role,
    updatedAt: updated.updatedAt.toISOString(),
  })
}
