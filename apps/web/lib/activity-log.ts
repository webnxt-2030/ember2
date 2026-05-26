import type { ActivityType } from '@prisma/client'
import type { NextRequest } from 'next/server'

/**
 * Minimal context needed to write an ActivityLog row.
 * Pass either a PrismaClient or a transaction client.
 */
export interface LogContext {
  prisma: {
    activityLog: {
      create(args: { data: Record<string, unknown> }): Promise<unknown>
    }
  }
  actorUserId?: string | null
  actorWallet?: string | null
  req?: NextRequest | Request
}

export interface LogActivityInput {
  type: ActivityType
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Writes an append-only ActivityLog row.
 * Captures IP and User-Agent from the request when available.
 */
export async function logActivity(
  ctx: LogContext,
  input: LogActivityInput,
): Promise<void> {
  const ipAddress = ctx.req?.headers.get('x-forwarded-for')
    ?? ctx.req?.headers.get('x-real-ip')
    ?? null
  const userAgent = ctx.req?.headers.get('user-agent') ?? null

  await ctx.prisma.activityLog.create({
    data: {
      actorUserId: ctx.actorUserId ?? null,
      actorWallet: ctx.actorWallet ?? null,
      type: input.type,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? {},
      ipAddress,
      userAgent,
    },
  })
}
