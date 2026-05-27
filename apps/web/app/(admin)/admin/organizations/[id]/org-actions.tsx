'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Member {
  userId: string
  email: string
  name: string | null
}

interface OrgActionsProps {
  orgId: string
  orgTitle: string
  currentStatus: string
  members: Member[]
}

export function OrgActions({ orgId, orgTitle, currentStatus, members }: OrgActionsProps) {
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<'VERIFY' | 'REJECT' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const [addEmail, setAddEmail] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [removeLoading, setRemoveLoading] = useState<string | null>(null)

  async function handleVerify() {
    setActionError(null)
    setActionLoading('VERIFY')
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VERIFY' }),
      })
      const data = (await res.json()) as { detail?: string; title?: string }
      if (!res.ok) {
        setActionError(data.detail ?? data.title ?? 'Failed to verify organization')
        return
      }
      router.refresh()
    } catch {
      setActionError('Network error. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject() {
    setActionError(null)
    setActionLoading('REJECT')
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', reason: rejectReason || undefined }),
      })
      const data = (await res.json()) as { detail?: string; title?: string }
      if (!res.ok) {
        setActionError(data.detail ?? data.title ?? 'Failed to reject organization')
        return
      }
      setShowRejectForm(false)
      setRejectReason('')
      router.refresh()
    } catch {
      setActionError('Network error. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleAddMember(e: React.SyntheticEvent) {
    e.preventDefault()
    setAddError(null)
    setAddLoading(true)
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail }),
      })
      const data = (await res.json()) as { detail?: string; title?: string }
      if (!res.ok) {
        setAddError(data.detail ?? data.title ?? 'Failed to add member')
        return
      }
      setAddEmail('')
      router.refresh()
    } catch {
      setAddError('Network error. Please try again.')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    setRemoveLoading(userId)
    try {
      const res = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string; title?: string }
        alert(data.detail ?? data.title ?? 'Failed to remove member')
        return
      }
      router.refresh()
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setRemoveLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Verify / Reject actions */}
      <Card>
        <CardHeader>
          <CardTitle>Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-label-sm text-on-surface-variant">
            Current status:{' '}
            <span className="font-semibold text-on-surface">{orgTitle}</span> is{' '}
            <span className="font-semibold">{currentStatus}</span>
          </p>

          {actionError && (
            <p className="text-label-sm text-error bg-error-container rounded-lg px-3 py-2">
              {actionError}
            </p>
          )}

          <div className="flex gap-3 flex-wrap">
            {currentStatus !== 'VERIFIED' && (
              <Button
                variant="primary"
                onClick={() => void handleVerify()}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'VERIFY' ? 'Verifying...' : 'Verify organization'}
              </Button>
            )}
            {currentStatus !== 'REJECTED' && (
              <Button
                variant="destructive"
                onClick={() => { setShowRejectForm((v) => !v); }}
                disabled={actionLoading !== null}
              >
                Reject organization
              </Button>
            )}
          </div>

          {showRejectForm && (
            <div className="space-y-3 pt-2 border-t border-outline-variant">
              <Input
                label="Rejection reason (optional)"
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); }}
                placeholder="Explain why this org is being rejected..."
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => void handleReject()}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'REJECT' ? 'Rejecting...' : 'Confirm rejection'}
                </Button>
                <Button variant="ghost" onClick={() => { setShowRejectForm(false); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Owners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-label-sm text-on-surface-variant">No owners assigned.</p>
          ) : (
            <div className="divide-y divide-outline-variant">
              {members.map((m) => (
                <div key={m.userId} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-label-md text-on-surface font-medium">
                      {m.name ?? m.email}
                    </p>
                    {m.name && (
                      <p className="text-label-sm text-on-surface-variant">{m.email}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={removeLoading === m.userId || members.length <= 1}
                    onClick={() => { void handleRemoveMember(m.userId) }}
                  >
                    {removeLoading === m.userId ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add member form */}
          <form onSubmit={(e) => void handleAddMember(e)} className="flex gap-2 items-end pt-2 border-t border-outline-variant flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Add owner by email"
                type="email"
                value={addEmail}
                onChange={(e) => { setAddEmail(e.target.value); }}
                placeholder="owner@example.com"
                required
                {...(addError ? { error: addError } : {})}
              />
            </div>
            <Button type="submit" variant="outline" disabled={addLoading}>
              {addLoading ? 'Adding...' : 'Add owner'}
            </Button>
          </form>
          {addError && <p className="text-label-sm text-error">{addError}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
