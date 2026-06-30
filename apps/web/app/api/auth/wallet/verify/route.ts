import type { NextRequest } from 'next/server'
import { Keypair } from '@stellar/stellar-sdk'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { ValidationError, ConflictError, AuthError } from '@/lib/errors'
import { errorResponse, okResponse } from '@/lib/api-response'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity-log'

const MESSAGE_REGEX =
  /^(.+) wants you to sign in with your Stellar account:\n([GC][A-Z2-7]{55})\n\n(.+)\n\nURI: (.+)\nNetwork: (.+)\nNonce: ([A-Za-z0-9]+)$/

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    assertRole(session, 'BACKER')

    const body = (await req.json()) as { message?: string; signature?: string }
    const { message, signature } = body

    if (!message || !signature) {
      throw new ValidationError('message and signature are required')
    }

    const match = MESSAGE_REGEX.exec(message)
    if (!match) {
      throw new ValidationError('Invalid sign-in message format')
    }
    if (match.length < 7) {
      throw new ValidationError('Invalid sign-in message format')
    }
    const address = match[2]
    const nonce = match[6]

    if (!address || !nonce) {
      throw new ValidationError('Invalid sign-in message format')
    }

    const verification = await prisma.verification.findFirst({
      where: {
        identifier: `wallet-nonce:${address}`,
        value: nonce,
        expiresAt: { gt: new Date() },
      },
    })

    if (!verification) {
      throw new AuthError('Nonce not found or expired')
    }

    // Verify Ed25519 signature
    let isValid = false
    try {
      const keypair = Keypair.fromPublicKey(address)
      isValid = keypair.verify(
        Buffer.from(message, 'utf-8'),
        Buffer.from(signature, 'base64'),
      )
    } catch {
      throw new AuthError('Invalid signature')
    }

    if (!isValid) {
      throw new AuthError('Invalid signature')
    }

    await prisma.verification.delete({ where: { id: verification.id } })

    const existing = await prisma.wallet.findUnique({ where: { address } })
    if (existing && existing.userId !== session.user.id) {
      throw new ConflictError('Wallet is already linked to another account')
    }
    if (existing) {
      return okResponse({ wallet: existing, alreadyLinked: true })
    }

    const walletCount = await prisma.wallet.count({ where: { userId: session.user.id } })

    const wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        address,
        isPrimary: walletCount === 0,
        verifiedAt: new Date(),
      },
    })

    await prisma.contribution.updateMany({
      where: { walletAddress: address, backerId: null },
      data: { backerId: session.user.id },
    })

    await logActivity(
      { prisma, actorUserId: session.user.id, actorWallet: address, req },
      { type: 'WALLET_LINKED', metadata: { address } },
    )

    return okResponse({ wallet }, 201)
  } catch (err) {
    return errorResponse(err, req)
  }
}
