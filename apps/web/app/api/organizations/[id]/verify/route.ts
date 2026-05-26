import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

type OrgMember = { user: { id: string; email: string } }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = await rateLimit(`ratelimit:org-verify:${ip}`, 10, 60_000)
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

  const org = await prisma.organization.findUnique({
    where: { id },
    include: { members: { include: { user: true } } },
  })
  if (!org) return errorResponse(new NotFoundError('Organization'), req)

  if (org.verifiedStatus === 'VERIFIED') {
    return errorResponse(new ConflictError('Organization is already verified'), req)
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id },
      data: {
        verifiedStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: session!.user.id,
      },
    })

    await tx.activityLog.create({
      data: {
        actorUserId: session!.user.id,
        type: 'ORG_VERIFIED',
        targetType: 'Organization',
        targetId: id,
        metadata: { orgTitle: org.title },
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    const owners = org.members as OrgMember[]
    if (owners.length > 0) {
      await tx.emailNotification.createMany({
        data: owners.map((m) => ({
          to: m.user.email,
          template: 'ORG_VERIFIED' as const,
          payload: {
            orgName: org.title,
            orgUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/org/dashboard/${id}`,
          },
          status: 'QUEUED' as const,
        })),
      })

      await tx.inAppNotification.createMany({
        data: owners.map((m) => ({
          userId: m.user.id,
          type: 'ORG_VERIFIED',
          title: 'Organization Verified',
          message: `Your organization "${org.title}" has been verified.`,
          linkUrl: `/org/dashboard/${id}`,
        })),
      })
    }
  })

  return okResponse({ id, verifiedStatus: 'VERIFIED' })
}
