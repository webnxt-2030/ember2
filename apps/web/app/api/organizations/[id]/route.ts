import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole, assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Transaction client type inferred from prisma instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any

type OrgMember = { user: { id: string; email: string } }

const actionSchema = z.object({
  action: z.enum(['VERIFY', 'REJECT']),
  reason: z.string().max(500).optional(),
})

const updateSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  receivingWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      projects: {
        where: { status: 'LIVE' },
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          pictures: true,
          targetAmount: true,
          totalRaised: true,
          status: true,
          publishedAt: true,
        },
      },
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  })

  if (!org) {
    return errorResponse(new NotFoundError('Organization'), _req)
  }

  const response = {
    id: org.id,
    slug: org.slug,
    title: org.title,
    description: org.description,
    logoUrl: org.logoUrl,
    website: org.website,
    verifiedStatus: org.verifiedStatus,
    verifiedAt: org.verifiedAt?.toISOString() ?? null,
    projects: org.projects.map((p: { id: string; slug: string; title: string; summary: string; pictures: string[]; targetAmount: { toString: () => string }; totalRaised: { toString: () => string }; status: string; publishedAt: Date | null }) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      pictures: p.pictures,
      targetAmount: p.targetAmount.toString(),
      totalRaised: p.totalRaised.toString(),
      status: p.status,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    })),
    members: org.members.map((m: { user: { id: string; name: string | null; image: string | null } }) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
    })),
  }

  return okResponse(response)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  // If body has an 'action' field, treat as admin verify/reject flow
  if (body !== null && typeof body === 'object' && 'action' in body) {
    try {
      assertRole(session, 'SUPER_ADMIN')
    } catch (err) {
      return errorResponse(err as Error, req)
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

      const ownerMembers = org.members as OrgMember[]
      if (ownerMembers.length > 0) {
        await tx.emailNotification.createMany({
          data: ownerMembers.map((m) => ({
            to: m.user.email,
            template: emailTemplate,
            payload: {
              orgName: org.title,
              orgUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://ember.app'}/admin/organizations/${id}`,
              reason: reason ?? undefined,
            },
            status: 'QUEUED' as const,
          })),
        })

        await tx.inAppNotification.createMany({
          data: ownerMembers.map((m) => ({
            userId: m.user.id,
            type: emailTemplate,
            title: action === 'VERIFY' ? 'Organization Verified' : 'Organization Rejected',
            message: action === 'VERIFY'
              ? `Your organization "${org.title}" has been verified.`
              : `Your organization "${org.title}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
            linkUrl: `/admin/organizations`,
          })),
        })
      }
    })

    return okResponse({ id, verifiedStatus: newStatus })
  }

  // Otherwise treat as org owner profile edit
  try {
    await assertOwnsOrg(session, id, prisma)
  } catch (err) {
    return errorResponse(err as Error, req)
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ValidationError('Validation failed', parsed.error.issues), req)
  }

  const { title, description, logoUrl, website, receivingWallet } = parsed.data

  const org = await prisma.organization.findUnique({ where: { id } })
  if (!org) return errorResponse(new NotFoundError('Organization'), req)

  const walletChanged =
    receivingWallet !== undefined &&
    receivingWallet.toLowerCase() !== org.receivingWallet.toLowerCase()

  const updated = await prisma.organization.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl ?? null }),
      ...(website !== undefined && { website: website ?? null }),
      ...(receivingWallet !== undefined && { receivingWallet }),
      ...(walletChanged && { verifiedStatus: 'PENDING', verifiedAt: null, verifiedById: null }),
    },
  })

  await prisma.activityLog.create({
    data: {
      actorUserId: session!.user.id,
      type: 'ORG_UPDATED',
      targetType: 'Organization',
      targetId: id,
      metadata: {
        orgTitle: updated.title,
        updatedFields: Object.keys(parsed.data),
        ...(walletChanged && { verificationReset: true }),
      },
    },
  })

  return okResponse({
    id: updated.id,
    title: updated.title,
    description: updated.description,
    logoUrl: updated.logoUrl,
    website: updated.website,
    receivingWallet: updated.receivingWallet,
    verifiedStatus: updated.verifiedStatus,
  })
}
