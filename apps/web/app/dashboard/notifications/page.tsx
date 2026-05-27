import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'
import { NotificationsClient } from './notifications-client'

export const metadata: Metadata = {
  title: 'Notifications — Ember',
}

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  const [inAppNotifications, emailLog, unreadCount] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.emailNotification.findMany({
      where: { to: session.user.email },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        template: true,
        status: true,
        createdAt: true,
        sentAt: true,
        error: true,
      },
    }),
    prisma.inAppNotification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ])

  return (
    <section className="bg-background py-12">
      <Container>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-headline-lg text-on-surface">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-label-md text-primary">
              {unreadCount} unread
            </span>
          )}
        </div>

        <NotificationsClient
          initialInApp={inAppNotifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            linkUrl: n.linkUrl,
            readAt: n.readAt?.toISOString() ?? null,
            createdAt: n.createdAt.toISOString(),
          }))}
          initialEmailLog={emailLog.map((e) => ({
            id: e.id,
            template: e.template,
            status: e.status,
            createdAt: e.createdAt.toISOString(),
            sentAt: e.sentAt?.toISOString() ?? null,
            error: e.error,
          }))}
          initialUnreadCount={unreadCount}
        />
      </Container>
    </section>
  )
}
