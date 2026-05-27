'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface InAppNotification {
  id: string
  type: string
  title: string
  message: string
  linkUrl: string | null
  readAt: string | null
  createdAt: string
}

interface EmailLogEntry {
  id: string
  template: string
  status: string
  createdAt: string
  sentAt: string | null
  error: string | null
}

interface NotificationsClientProps {
  initialInApp: InAppNotification[]
  initialEmailLog: EmailLogEntry[]
  initialUnreadCount: number
}

export function NotificationsClient({
  initialInApp,
  initialEmailLog,
  initialUnreadCount,
}: NotificationsClientProps) {
  const [tab, setTab] = useState<'inApp' | 'email'>('inApp')
  const [inApp, setInApp] = useState(initialInApp)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)

  async function markAsRead(id: string) {
    const res = await fetch(`/api/users/me/notifications/${id}/read`, {
      method: 'PATCH',
    })
    if (res.ok) {
      setInApp((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'completed'
      case 'FAILED':
        return 'failed'
      case 'QUEUED':
        return 'pending'
      default:
        return 'active'
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === 'inApp' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => { setTab('inApp'); }}
        >
          In-App {unreadCount > 0 && `(${String(unreadCount)})`}
        </Button>
        <Button
          variant={tab === 'email' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => { setTab('email'); }}
        >
          Email Log
        </Button>
      </div>

      {tab === 'inApp' && (
        <div className="space-y-4">
          {inApp.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-label-md text-on-surface-variant">No notifications yet.</p>
            </Card>
          ) : (
            inApp.map((n) => (
              <Card
                key={n.id}
                className={n.readAt ? 'opacity-70' : ''}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-label-md text-on-surface font-medium">{n.title}</p>
                      {!n.readAt && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface-variant mb-2">{n.message}</p>
                    <p className="text-label-sm text-on-surface-variant/60">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {!n.readAt && (
                      <Button variant="ghost" size="sm" onClick={() => { void markAsRead(n.id) }}>
                        Mark read
                      </Button>
                    )}
                    {n.linkUrl && (
                      <a href={n.linkUrl} className="text-label-sm text-primary hover:underline">
                        View
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'email' && (
        <div className="space-y-4">
          {initialEmailLog.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-label-md text-on-surface-variant">No emails sent yet.</p>
            </Card>
          ) : (
            initialEmailLog.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-label-md text-on-surface font-medium">{e.template}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {new Date(e.createdAt).toLocaleString()}
                    </p>
                    {e.error && (
                      <p className="text-label-sm text-error mt-1">{e.error}</p>
                    )}
                  </div>
                  <Badge status={statusColor(e.status)} label={e.status} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
