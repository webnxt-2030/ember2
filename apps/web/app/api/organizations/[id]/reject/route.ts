import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

export const runtime = 'nodejs'

type OrgMember = { user: { id: string; email: string } }

const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = await rateLimit(`ratelimit:org-reject:${ip}`, 10, 60_000)
  if (!rl.success) {
    return errorResponse(
      Object.assign(new Error('Too Many Requests'), { statusCode: 429 }),
      req,
    )
  }

  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    return errorResponse(err as Error, req)
  }

  const { id } = await params

  let body: unknown = {}
  try {
    const text = await req.text()
    if (text) body = JSON.parse(text)
  } catch {
    // empty body is acceptable
  }

  const parsed = rejectSchema.safeParse(body)
  const reason = parsed.success ? parsed.data.reason : undefined

  const org = await prisma.organization.findUnique({
    where: { id },
    include: { members: { include: { user: true } } },
  })
  if (!org) return errorResponse(new NotFoundError('Organization'), req)

  if (org.verifiedStatus === 'REJECTED') {
    return errorResponse(new ConflictError('Organization is already rejected'), req)
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id },
      data: {
        verifiedStatus: 'REJECTED',
        verifiedAt: new Date(),
        verifiedById: session!.user.id,
      },
    })

    await tx.activityLog.create({
      data: {
        actorUserId: session!.user.id,
        type: 'ORG_REJECTED',
        targetType: 'Organization',
        targetId: id,
        metadata: { orgTitle: org.title, reason: reason ?? null },
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    const owners = org.members as OrgMember[]
    if (owners.length > 0) {
      await tx.emailNotification.createMany({
        data: owners.map((m) => ({
          to: m.user.email,
          template: 'ORG_REJECTED' as const,
          payload: { orgName: org.title, reason: reason ?? undefined },
          status: 'QUEUED' as const,
        })),
      })

      await tx.inAppNotification.createMany({
        data: owners.map((m) => ({
          userId: m.user.id,
          type: 'ORG_REJECTED',
          title: 'Organization Rejected',
          message: `Your organization "${org.title}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          linkUrl: `/org/dashboard/${id}`,
        })),
      })
    }
  })

  return okResponse({ id, verifiedStatus: 'REJECTED' })
}
