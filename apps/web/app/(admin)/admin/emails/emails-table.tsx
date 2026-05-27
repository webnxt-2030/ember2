'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface EmailRow {
  id: string
  to: string
  template: string
  status: string
  resendId: string | null
  error: string | null
  sentAt: string | null
  createdAt: string
}

interface EmailsApiResponse {
  emails: EmailRow[]
  page: number
  totalPages: number
}

interface EmailsTableProps {
  initialEmails: EmailRow[]
  initialPage: number
  initialLimit: number
  initialTotalPages: number
}

const STATUS_OPTIONS = ['QUEUED', 'PROCESSING', 'SENT', 'FAILED'] as const

function badgeStatus(status: string) {
  if (status === 'SENT') return 'completed'
  if (status === 'FAILED') return 'failed'
  if (status === 'PROCESSING') return 'active'
  return 'pending'
}

export function EmailsTable({
  initialEmails,
  initialPage,
  initialLimit,
  initialTotalPages,
}: EmailsTableProps) {
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [emails, setEmails] = useState<EmailRow[]>(initialEmails)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEmails = useCallback(
    async (search: string, st: string, newPage: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (search) params.set('q', search)
        if (st) params.set('status', st)
        params.set('page', String(newPage))
        params.set('limit', String(initialLimit))
        const res = await fetch(`/api/admin/emails?${params.toString()}`)
        const data = (await res.json()) as EmailsApiResponse
        if (!res.ok) {
          setError(
            (data as unknown as { detail?: string; title?: string }).detail ??
              (data as unknown as { detail?: string; title?: string }).title ??
              'Failed to fetch emails',
          )
          return
        }
        setEmails(data.emails)
        setPage(data.page)
        setTotalPages(data.totalPages)
      } catch {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    },
    [initialLimit],
  )

  async function handleRetry(emailId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/admin/emails/${emailId}/retry`, {
        method: 'POST',
      })
      const data = (await res.json()) as unknown
      if (!res.ok) {
        setError(
          (data as { detail?: string; title?: string }).detail ??
            (data as { detail?: string; title?: string }).title ??
            'Failed to retry email',
        )
        return
      }
      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId ? { ...e, status: 'QUEUED', error: null } : e,
        ),
      )
    } catch {
      setError('Network error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <Input
            label="Search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
            }}
            placeholder="recipient or template..."
            containerClassName="flex-1 min-w-[200px]"
          />
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
              }}
              className="bg-surface-container-lowest border border-outline rounded-xl px-3 py-2 text-label-md text-on-surface focus:border-primary outline-none"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => {
              void fetchEmails(q, statusFilter, 1)
            }}
            disabled={loading}
            className="mt-7"
          >
            {loading ? 'Loading...' : 'Filter'}
          </Button>
        </div>

        {error && <p className="text-label-sm text-error mb-4">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-label-md">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="text-left py-2 pr-4 font-medium">To</th>
                <th className="text-left py-2 pr-4 font-medium">Template</th>
                <th className="text-left py-2 pr-4 font-medium">Status</th>
                <th className="text-left py-2 pr-4 font-medium">Sent At</th>
                <th className="text-left py-2 pr-4 font-medium">Created</th>
                <th className="text-left py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors"
                >
                  <td className="py-3 pr-4 text-on-surface">{e.to}</td>
                  <td className="py-3 pr-4 text-on-surface">{e.template}</td>
                  <td className="py-3 pr-4">
                    <Badge status={badgeStatus(e.status)}>{e.status}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-on-surface">
                    {e.sentAt ? new Date(e.sentAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 pr-4 text-on-surface-variant whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    {e.status === 'FAILED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void handleRetry(e.id)
                        }}
                        disabled={loading}
                      >
                        Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {emails.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    No emails found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => {
                void fetchEmails(q, statusFilter, page - 1)
              }}
            >
              Previous
            </Button>
            <span className="text-label-md text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => {
                void fetchEmails(q, statusFilter, page + 1)
              }}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
