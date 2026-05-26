import type { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors'
import { errorResponse, okResponse } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const session = await getSession()
    assertRole(session, 'BACKER')

    const { address } = await params
    const normalizedAddress = address.toLowerCase()

    const wallet = await prisma.wallet.findUnique({ where: { address: normalizedAddress } })
    if (!wallet) {
      throw new NotFoundError('Wallet')
    }
    if (wallet.userId !== session.user.id) {
      throw new ForbiddenError('Cannot unlink a wallet belonging to another user')
    }

    // Cannot unlink primary wallet if user has active contributions
    if (wallet.isPrimary) {
      const activeContributions = await prisma.contribution.count({
        where: { backerId: session.user.id },
      })
      if (activeContributions > 0) {
        throw new ConflictError('Cannot unlink primary wallet while you have active contributions')
      }

      // If unlinking primary, promote the next wallet if one exists
      const nextWallet = await prisma.wallet.findFirst({
        where: { userId: session.user.id, id: { not: wallet.id } },
        orderBy: { createdAt: 'asc' },
      })
      if (nextWallet) {
        await prisma.wallet.update({ where: { id: nextWallet.id }, data: { isPrimary: true } })
      }
    }

    await prisma.wallet.delete({ where: { id: wallet.id } })

    await logActivity(
      { prisma, actorUserId: session.user.id, actorWallet: normalizedAddress, req },
      { type: 'WALLET_UNLINKED', metadata: { address: normalizedAddress } },
    )

    return okResponse({ deleted: true })
  } catch (err) {
    return errorResponse(err, req)
  }
}
