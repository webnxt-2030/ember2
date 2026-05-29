'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  wallets: { address: string; isPrimary: boolean }[]
  orgCount: number
}

interface UsersApiResponse {
  users: UserRow[]
  page: number
  totalPages: number
}

interface UsersTableProps {
  initialUsers: UserRow[]
  initialPage: number
  initialLimit: number
  initialTotalPages: number
}

const ROLE_OPTIONS = ['BACKER', 'ORG_OWNER', 'SUPER_ADMIN'] as const

export function UsersTable({
  initialUsers,
  initialPage,
  initialLimit,
  initialTotalPages,
}: UsersTableProps) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(
    async (search: string, newPage: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (search) params.set('q', search)
        params.set('page', String(newPage))
        params.set('limit', String(initialLimit))
        const res = await fetch(`/api/admin/users?${params.toString()}`)
        const data = (await res.json()) as UsersApiResponse
        if (!res.ok) {
          setError((data as unknown as { detail?: string; title?: string }).detail ??
            (data as unknown as { detail?: string; title?: string }).title ??
            'Failed to fetch users')
          return
        }
        setUsers(data.users)
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

  async function handleRoleChange(userId: string, newRole: string) {
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = (await res.json()) as unknown
      if (!res.ok) {
        setError(
          (data as { detail?: string; title?: string }).detail ??
            (data as { detail?: string; title?: string }).title ??
            'Failed to update role',
        )
        return
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      )
      router.refresh()
    } catch {
      setError('Network error')
    }
  }

  const badgeStatus = (role: string) => {
    if (role === 'SUPER_ADMIN') return 'failed'
    if (role === 'ORG_OWNER') return 'active'
    return 'pending'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <Input
            label="Search by email or wallet"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
            }}
            placeholder="e.g. alice@example.com or 0x..."
            containerClassName="flex-1"
          />
          <Button
            onClick={() => {
              void fetchUsers(q, 1)
            }}
            disabled={loading}
            className="mt-7"
          >
            {loading ? 'Loading...' : 'Search'}
          </Button>
        </div>

        {error && <p className="text-label-sm text-error mb-4">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-label-md">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="text-left py-2 pr-4 font-medium">Email</th>
                <th className="text-left py-2 pr-4 font-medium">Name</th>
                <th className="text-left py-2 pr-4 font-medium">Role</th>
                <th className="text-left py-2 pr-4 font-medium">Wallets</th>
                <th className="text-left py-2 pr-4 font-medium">Orgs</th>
                <th className="text-left py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors"
                >
                  <td className="py-3 pr-4 text-on-surface">{u.email}</td>
                  <td className="py-3 pr-4 text-on-surface">
                    {u.name ?? '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge status={badgeStatus(u.role)}>{u.role}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-on-surface-variant">
                    {u.wallets.length > 0
                      ? u.wallets.map((w) => (
                          <span key={w.address} className="block text-label-sm">
                            {w.address.slice(0, 6)}...{w.address.slice(-4)}
                            {w.isPrimary && (
                              <span className="text-primary ml-1">(primary)</span>
                            )}
                          </span>
                        ))
                      : '—'}
                  </td>
                  <td className="py-3 pr-4 text-on-surface">{u.orgCount}</td>
                  <td className="py-3">
                    <Select
                      value={u.role}
                      onChange={(e) => {
                        void handleRoleChange(u.id, e.target.value)
                      }}
                      options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
                    />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => {
                void fetchUsers(q, page - 1)
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
                void fetchUsers(q, page + 1)
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
