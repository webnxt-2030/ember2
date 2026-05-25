import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { SiweMessage } from 'siwe'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { ValidationError, ConflictError, AuthError } from '@/lib/errors'
import { errorResponse, okResponse } from '@/lib/api-response'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    assertRole(session, 'BACKER')

    const body = await req.json()
    const { message, signature } = body as { message: string; signature: string }

    if (!message || !signature) {
      throw new ValidationError('message and signature are required')
    }

    let siweMessage: SiweMessage
    try {
      siweMessage = new SiweMessage(message)
    } catch {
      throw new ValidationError('Invalid SIWE message format')
    }

    const address = siweMessage.address.toLowerCase()

    // Look up the nonce in Verification table
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: `wallet-nonce:${address}`,
        value: siweMessage.nonce,
        expiresAt: { gt: new Date() },
      },
    })

    if (!verification) {
      throw new AuthError('Nonce not found or expired')
    }

    // Verify the SIWE signature
    const result = await siweMessage.verify({ signature })
    if (!result.success) {
      throw new AuthError('Invalid signature')
    }

    // Delete the nonce (single-use)
    await prisma.verification.delete({ where: { id: verification.id } })

    // Check if wallet already linked to another user
    const existing = await prisma.wallet.findUnique({ where: { address } })
    if (existing && existing.userId !== session.user.id) {
      throw new ConflictError('Wallet is already linked to another account')
    }
    if (existing) {
      return okResponse({ wallet: existing, alreadyLinked: true })
    }

    // Count existing wallets to determine isPrimary
    const walletCount = await prisma.wallet.count({ where: { userId: session.user.id } })

    const wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        address,
        isPrimary: walletCount === 0, // first wallet is primary
        verifiedAt: new Date(),
      },
    })

    return okResponse({ wallet }, 201)
  } catch (err) {
    return errorResponse(err, req)
  }
}
