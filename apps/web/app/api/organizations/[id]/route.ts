import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Transaction client type inferred from prisma instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any

type OrgMember = { user: { email: string } }

const actionSchema = z.object({
  action: z.enum(['VERIFY', 'REJECT']),
  reason: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    return errorResponse(err as Error, req)
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ValidationError('Validation failed', parsed.error.issues), req)
  }

  const { action, reason } = parsed.data

  const org = await prisma.organization.findUnique({
    where: { id },
    include: { members: { include: { user: true } } },
  })
  if (!org) return errorResponse(new NotFoundError('Organization'), req)

  const newStatus = action === 'VERIFY' ? ('VERIFIED' as const) : ('REJECTED' as const)
  const emailTemplate = action === 'VERIFY' ? ('ORG_VERIFIED' as const) : ('ORG_REJECTED' as const)
  const activityType = action === 'VERIFY' ? ('ORG_VERIFIED' as const) : ('ORG_REJECTED' as const)

  await prisma.$transaction(async (tx: TxClient) => {
    await tx.organization.update({
      where: { id },
      data: {
        verifiedStatus: newStatus,
        verifiedAt: new Date(),
        verifiedById: session!.user.id,
      },
    })

    await tx.activityLog.create({
      data: {
        actorUserId: session!.user.id,
        type: activityType,
        targetType: 'Organization',
        targetId: id,
        metadata: { orgTitle: org.title, action, reason: reason ?? null },
      },
    })

    const ownerEmails = (org.members as OrgMember[]).map((m) => m.user.email)
    if (ownerEmails.length > 0) {
      await tx.emailNotification.createMany({
        data: ownerEmails.map((email: string) => ({
          to: email,
          template: emailTemplate,
          payload: { orgId: id, orgTitle: org.title, reason: reason ?? null },
          status: 'QUEUED' as const,
        })),
      })
    }
  })

  return okResponse({ id, verifiedStatus: newStatus })
}
