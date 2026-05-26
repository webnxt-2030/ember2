import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { errorResponse, okResponse } from '@/lib/api-response'
import { AuthError, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const emailTemplateSchema = z.enum([
  'WELCOME',
  'CONTRIBUTION_RECEIVED',
  'MILESTONE_UPDATED',
  'MILESTONE_VOTE_OPEN',
  'MILESTONE_VOTE_COMING_SOON',
  'MILESTONE_VOTE_OUTCOME',
  'MILESTONE_CLAIMED',
  'ORG_VERIFIED',
  'ORG_REJECTED',
  'ADMIN_INVITATION',
])

const updatePreferenceSchema = z.object({
  template: emailTemplateSchema,
  unsubscribed: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return errorResponse(new AuthError(), req)
  }

  const body = await req.json()
  const parsed = updatePreferenceSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ValidationError(parsed.error.message), req)
  }

  const { template, unsubscribed } = parsed.data

  const preference = await prisma.emailPreference.upsert({
    where: {
      userId_template: {
        userId: session.user.id,
        template,
      },
    },
    update: { unsubscribed },
    create: {
      userId: session.user.id,
      template,
      unsubscribed,
    },
  })

  return okResponse({ preference })
}
