import type { NextRequest } from 'next/server'
import { generateNonce } from 'siwe'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { ValidationError } from '@/lib/errors'
import { errorResponse, okResponse } from '@/lib/api-response'
import { prisma } from '@/lib/db'
import { addressSchema } from '@ember/shared'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    assertRole(session, 'BACKER')

    const body = (await req.json()) as { address?: unknown } | null
    const parsed = addressSchema.safeParse(body?.address)
    if (!parsed.success) {
      throw new ValidationError('Invalid wallet address', parsed.error.issues)
    }
    const address = parsed.data.toLowerCase()

    const nonce = generateNonce()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store nonce in Verification table (identifier = wallet address)
    await prisma.verification.create({
      data: {
        identifier: `wallet-nonce:${address}`,
        value: nonce,
        expiresAt,
      },
    })

    return okResponse({ nonce })
  } catch (err) {
    return errorResponse(err, req)
  }
}
