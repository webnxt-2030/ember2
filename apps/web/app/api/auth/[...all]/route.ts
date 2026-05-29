import { auth } from '@/lib/auth/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity-log'
import type { NextRequest } from 'next/server'
import type { ActivityType } from '@prisma/client'

const betterAuthHandlers = toNextJsHandler(auth)

interface AuthResponseBody {
  user?: { id?: string }
  session?: { userId?: string }
}

async function handleAuthEvent(req: NextRequest, res: Response, path: string) {
  if (res.status >= 200 && res.status < 300) {
    try {
      const body = (await res.clone().json()) as AuthResponseBody
      const userId = body.user?.id ?? body.session?.userId ?? null
      let type: ActivityType | null = null
      if (path.includes('sign-out')) type = 'USER_SIGNED_OUT'
      else if (path.includes('sign-up')) type = 'USER_SIGNED_UP'
      else if (path.includes('sign-in')) type = 'USER_SIGNED_IN'
      if (type && userId) {
        await logActivity(
          { prisma, actorUserId: userId, req },
          { type, metadata: { path } },
        )
      }
    } catch {
      // ignore parse errors
    }
  }
}

export async function GET(req: NextRequest) {
  const res = await betterAuthHandlers.GET(req)
  return res
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.pathname
  const res = await betterAuthHandlers.POST(req)

  if (
    path.includes('sign-in') ||
    path.includes('sign-up') ||
    path.includes('sign-out')
  ) {
    await handleAuthEvent(req, res, path)
  }

  return res
}
