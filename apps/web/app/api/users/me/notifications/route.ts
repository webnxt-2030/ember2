import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { errorResponse, okResponse } from '@/lib/api-response'
import { AuthError } from '@/lib/errors'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return errorResponse(new AuthError(), req)
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)))
  const tab = searchParams.get('tab') ?? 'inApp' // 'inApp' | 'email'
  const skip = (page - 1) * pageSize

  if (tab === 'email') {
    const [emails, total] = await Promise.all([
      prisma.emailNotification.findMany({
        where: { to: session.user.email },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          template: true,
          status: true,
          createdAt: true,
          sentAt: true,
          error: true,
        },
      }),
      prisma.emailNotification.count({ where: { to: session.user.email } }),
    ])

    return okResponse({
      emails: emails.map((e) => ({
        id: e.id,
        template: e.template,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
        sentAt: e.sentAt?.toISOString() ?? null,
        error: e.error,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.inAppNotification.count({ where: { userId: session.user.id } }),
    prisma.inAppNotification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ])

  return okResponse({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      linkUrl: n.linkUrl,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    unreadCount,
  })
}
