import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db'

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

interface OrgMember { userId: string }

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    return errorResponse(err, req)
  }

  const { id, userId } = await params

  const org = await prisma.organization.findUnique({
    where: { id },
    include: { members: true },
  })
  if (!org) return errorResponse(new NotFoundError('Organization'), req)

  const member = (org.members as OrgMember[]).find((m) => m.userId === userId)
  if (!member) return errorResponse(new NotFoundError('Member'), req)

  if (org.members.length <= 1) {
    return errorResponse(new ValidationError('Cannot remove the last owner of an organization'), req)
  }

  await prisma.$transaction(async (tx: TxClient) => {
    await tx.organizationMember.delete({
      where: { organizationId_userId: { organizationId: id, userId } },
    })

    await tx.activityLog.create({
      data: {
        actorUserId: session.user.id,
        type: 'ORG_MEMBER_REMOVED',
        targetType: 'Organization',
        targetId: id,
        metadata: { orgTitle: org.title, removedUserId: userId },
      },
    })
  })

  return new NextResponse(null, { status: 204 })
}
