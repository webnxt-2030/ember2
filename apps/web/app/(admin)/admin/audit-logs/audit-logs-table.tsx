'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LogRow {
  id: string
  type: string
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  actorUserId: string | null
  actorWallet: string | null
  actorEmail: string | null
}

interface AuditLogsApiResponse {
  logs: LogRow[]
  page: number
  totalPages: number
}

interface AuditLogsTableProps {
  initialLogs: LogRow[]
  initialPage: number
  initialLimit: number
  initialTotalPages: number
}

const ACTIVITY_TYPES = [
  'USER_SIGNED_UP',
  'USER_SIGNED_IN',
  'USER_SIGNED_OUT',
  'WALLET_LINKED',
  'WALLET_UNLINKED',
  'ORG_CREATED',
  'ORG_UPDATED',
  'ORG_VERIFIED',
  'ORG_REJECTED',
  'ORG_MEMBER_ADDED',
  'ORG_MEMBER_REMOVED',
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_PUBLISHED',
  'PROJECT_PAUSED',
  'PROJECT_CANCELLED',
  'PROJECT_COMPLETED',
  'CONTRIBUTION_RECEIVED',
  'MILESTONE_SUBMITTED',
  'MILESTONE_VOTE_CAST',
  'MILESTONE_RESOLVED',
  'MILESTONE_CLAIMED',
  'EMAIL_SENT',
  'EMAIL_FAILED',
  'ADMIN_ACTION',
] as const

function badgeStatus(type: string) {
  if (type.startsWith('PROJECT_')) return 'active'
  if (type.startsWith('MILESTONE_')) return 'pending'
  if (type.startsWith('ORG_')) return 'completed'
  if (type.startsWith('EMAIL_')) return 'failed'
  return 'pending'
}

function downloadCsv(rows: LogRow[]) {
  const headers = ['Date', 'Type', 'Actor', 'Wallet', 'Target Type', 'Target ID', 'Metadata', 'IP Address']
  const escape = (v: unknown) => {
    const s = typeof v === 'string' ? v : JSON.stringify(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.createdAt,
        r.type,
        r.actorEmail ?? '',
        r.actorWallet ?? '',
        r.targetType ?? '',
        r.targetId ?? '',
        JSON.stringify(r.metadata),
        r.ipAddress ?? '',
      ]
        .map(escape)
        .join(','),
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function AuditLogsTable({
  initialLogs,
  initialPage,
  initialLimit,
  initialTotalPages,
}: AuditLogsTableProps) {
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [logs, setLogs] = useState<LogRow[]>(initialLogs)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(
    async (
      search: string,
      type: string,
      from: string,
      to: string,
      newPage: number,
    ) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (search) params.set('q', search)
        if (type) params.set('type', type)
        if (from) params.set('from', from)
        if (to) params.set('to', to)
        params.set('page', String(newPage))
        params.set('limit', String(initialLimit))
        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
        const data = (await res.json()) as AuditLogsApiResponse
        if (!res.ok) {
          setError(
            (data as unknown as { detail?: string; title?: string }).detail ??
              (data as unknown as { detail?: string; title?: string }).title ??
              'Failed to fetch audit logs',
          )
          return
        }
        setLogs(data.logs)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <Input
            label="Search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
            }}
            placeholder="email, wallet, target..."
            containerClassName="flex-1 min-w-[200px]"
          />
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
            }}
            options={[
              { value: '', label: 'All' },
              ...ACTIVITY_TYPES.map((t) => ({ value: t, label: t })),
            ]}
            containerClassName="w-[220px]"
          />
          <Input
            label="From"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
            }}
            containerClassName="w-[160px]"
          />
          <Input
            label="To"
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
            }}
            containerClassName="w-[160px]"
          />
          <Button
            onClick={() => {
              void fetchLogs(q, typeFilter, fromDate, toDate, 1)
            }}
            disabled={loading}
            className="mt-7"
          >
            {loading ? 'Loading...' : 'Filter'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              downloadCsv(logs)
            }}
            disabled={logs.length === 0}
            className="mt-7"
          >
            Export CSV
          </Button>
        </div>

        {error && <p className="text-label-sm text-error mb-4">{error}</p>}

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-label-md">
            <thead className="sticky top-0 bg-surface-container z-10">
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                <th className="text-left py-2 pr-4 font-medium">Type</th>
                <th className="text-left py-2 pr-4 font-medium">Actor</th>
                <th className="text-left py-2 pr-4 font-medium">Target</th>
                <th className="text-left py-2 pr-4 font-medium">Metadata</th>
                <th className="text-left py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors even:bg-surface-container-low/30"
                >
                  <td className="py-3 pr-4 text-on-surface whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge status={badgeStatus(l.type)}>{l.type}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-on-surface truncate max-w-[200px]">
                    {l.actorEmail ?? l.actorWallet ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-on-surface">
                    <span className="truncate block max-w-[150px]">{l.targetType ?? '—'}</span>
                    {l.targetId && (
                      <span className="block text-label-sm text-on-surface-variant truncate max-w-[150px]">
                        {l.targetId}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-on-surface-variant max-w-[250px] truncate" title={JSON.stringify(l.metadata)}>
                    {JSON.stringify(l.metadata)}
                  </td>
                  <td className="py-3 text-on-surface-variant whitespace-nowrap">
                    {l.ipAddress ?? '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    No logs found.
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
                void fetchLogs(q, typeFilter, fromDate, toDate, page - 1)
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
                void fetchLogs(q, typeFilter, fromDate, toDate, page + 1)
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
