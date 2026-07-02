import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { errorResponse, okResponse } from '@/lib/api-response'
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity-log'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const session = await getSession()
    assertRole(session, 'BACKER')

    const { address } = await params

    const wallet = await prisma.wallet.findUnique({
      where: { address },
    })
    if (!wallet) {
      throw new NotFoundError('Wallet')
    }
    if (wallet.userId !== session.user.id) {
      throw new ForbiddenError('Cannot modify a wallet belonging to another user')
    }
    if (wallet.isPrimary) {
      throw new ConflictError('Wallet is already primary')
    }

    await prisma.$transaction(async (tx) => {
      await tx.wallet.updateMany({
        where: { userId: session.user.id },
        data: { isPrimary: false },
      })
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { isPrimary: true },
      })
    })

    await logActivity(
      { prisma, actorUserId: session.user.id, actorWallet: address, req },
      { type: 'WALLET_SET_PRIMARY', metadata: { address } },
    )

    return okResponse({ wallet: { id: wallet.id, address: wallet.address, isPrimary: true } })
  } catch (err) {
    return errorResponse(err, req)
  }
}
