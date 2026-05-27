import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { ValidationError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { slugSchema } from '@ember/shared'
import { z } from 'zod'

// Typed user shape returned from prisma.user.findMany
interface UserRow { id: string; email: string; role: string }
// Transaction client type inferred from prisma instance
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema,
  description: z.string().max(1000).optional(),
  website: z.url().optional(),
  receivingWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address'),
  ownerEmails: z.array(z.email()).min(1).max(10),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    return errorResponse(err, req)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  const parsed = createOrgSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ValidationError('Validation failed', parsed.error.issues), req)
  }

  const { name, slug, description, website, receivingWallet, ownerEmails } = parsed.data

  // Check slug uniqueness
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) {
    return errorResponse(new ConflictError(`Slug "${slug}" is already taken`), req)
  }

  // Find users by email — only existing users can be assigned as owners
  const owners: UserRow[] = await prisma.user.findMany({ where: { email: { in: ownerEmails } } })
  const foundEmails = owners.map((u: UserRow) => u.email)
  const notFound = ownerEmails.filter((e) => !foundEmails.includes(e))
  if (notFound.length > 0) {
    return errorResponse(new ValidationError(`Users not found: ${notFound.join(', ')}`), req)
  }

  // Create org + members + promote users to ORG_OWNER + ActivityLog + email queue — all in transaction
  const org = await prisma.$transaction(async (tx: TxClient) => {
    const newOrg = await tx.organization.create({
      data: {
        title: name,
        slug,
        description: description ?? '',
        website: website ?? null,
        receivingWallet,
        members: {
          create: owners.map((u: UserRow) => ({ userId: u.id, role: 'OWNER' as const })),
        },
      },
    })

    // Promote users to ORG_OWNER if they're currently BACKERs
    await Promise.all(
      owners.map((u: UserRow) =>
        u.role === 'BACKER'
          ? tx.user.update({ where: { id: u.id }, data: { role: 'ORG_OWNER' } })
          : Promise.resolve(),
      ),
    )

    // Write ActivityLog
    await tx.activityLog.create({
      data: {
        actorUserId: session.user.id,
        type: 'ORG_CREATED',
        targetType: 'Organization',
        targetId: newOrg.id,
        metadata: { orgTitle: name, slug, ownerEmails },
      },
    })

    // Queue ADMIN_INVITATION emails + in-app notifications for each owner
    await tx.emailNotification.createMany({
      data: owners.map((u: UserRow) => ({
        to: u.email,
        template: 'ADMIN_INVITATION' as const,
        payload: { orgId: newOrg.id, orgTitle: name, inviteeEmail: u.email },
        status: 'QUEUED' as const,
      })),
    })

    await tx.inAppNotification.createMany({
      data: owners.map((u: UserRow) => ({
        userId: u.id,
        type: 'ADMIN_INVITATION' as const,
        title: 'Organization Invitation',
        message: `You have been invited to own "${name}".`,
        linkUrl: `/admin/organizations`,
      })),
    })

    return newOrg
  })

  return okResponse({ org: { id: org.id, slug: org.slug, name: org.title } }, 201)
}
