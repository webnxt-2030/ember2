import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any

type MemberWithUser = {
  userId: string
  role: string
  user: { id: string; email: string; name: string | null; role: string }
}

const addMemberSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ValidationError('Validation failed', parsed.error.issues), req)
  }

  const { email } = parsed.data

  const org = await prisma.organization.findUnique({ where: { id } })
  if (!org) return errorResponse(new NotFoundError('Organization'), req)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return errorResponse(new NotFoundError('User'), req)

  const existing = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: user.id } },
  })
  if (existing) return errorResponse(new ConflictError('User is already a member of this organization'), req)

  await prisma.$transaction(async (tx: TxClient) => {
    await tx.organizationMember.create({
      data: { organizationId: id, userId: user.id, role: 'OWNER' },
    })

    if (user.role === 'BACKER') {
      await tx.user.update({ where: { id: user.id }, data: { role: 'ORG_OWNER' } })
    }

    await tx.activityLog.create({
      data: {
        actorUserId: session!.user.id,
        type: 'ORG_MEMBER_ADDED',
        targetType: 'Organization',
        targetId: id,
        metadata: { orgTitle: org.title, addedEmail: email, addedUserId: user.id },
      },
    })
  })

  return okResponse({ member: { userId: user.id, email: user.email, name: user.name } }, 201)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    return errorResponse(err as Error, req)
  }

  const { id } = await params

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: id },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ members: (members as MemberWithUser[]).map((m) => ({ userId: m.userId, email: m.user.email, name: m.user.name, role: m.role })) })
}
