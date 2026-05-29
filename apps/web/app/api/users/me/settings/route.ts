import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { errorResponse, okResponse } from '@/lib/api-response'
import { AuthError, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.url().max(500).optional().or(z.literal('')),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return errorResponse(new AuthError(), req)
  }

  const [user, wallets, preferences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.wallet.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        address: true,
        isPrimary: true,
        verifiedAt: true,
      },
    }),
    prisma.emailPreference.findMany({
      where: { userId: session.user.id },
      select: {
        template: true,
        unsubscribed: true,
      },
    }),
  ])

  if (!user) {
    return errorResponse(new AuthError('User not found'), req)
  }

  return okResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    wallets: wallets.map((w) => ({
      id: w.id,
      address: w.address,
      isPrimary: w.isPrimary,
      verifiedAt: w.verifiedAt.toISOString(),
    })),
    emailPreferences: preferences.reduce<Record<string, boolean>>(
      (acc, p) => {
        acc[p.template] = p.unsubscribed
        return acc
      },
      {},
    ),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return errorResponse(new AuthError(), req)
  }

  const body: unknown = await req.json()
  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ValidationError(parsed.error.message), req)
  }

  const { name, image } = parsed.data

  const updateData: { name?: string; image?: string | null } = {}
  if (name !== undefined) updateData.name = name
  if (image !== undefined) updateData.image = image || null

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
    },
  })

  return okResponse({ user: updated })
}
