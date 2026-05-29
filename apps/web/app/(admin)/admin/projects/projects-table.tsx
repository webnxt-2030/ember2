'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProjectRow {
  id: string
  slug: string
  title: string
  status: string
  targetAmount: string
  totalRaised: string
  createdAt: string
  organizationTitle: string
}

interface ProjectsApiResponse {
  projects: ProjectRow[]
  page: number
  totalPages: number
}

interface ProjectsTableProps {
  initialProjects: ProjectRow[]
  initialPage: number
  initialLimit: number
  initialTotalPages: number
}

function badgeStatus(status: string) {
  if (status === 'LIVE') return 'active'
  if (status === 'COMPLETED') return 'completed'
  if (status === 'CANCELLED') return 'failed'
  return 'pending'
}

export function ProjectsTable({
  initialProjects,
  initialPage,
  initialLimit,
  initialTotalPages,
}: ProjectsTableProps) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(
    async (search: string, newPage: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (search) params.set('q', search)
        params.set('page', String(newPage))
        params.set('limit', String(initialLimit))
        const res = await fetch(`/api/admin/projects?${params.toString()}`)
        const data = (await res.json()) as ProjectsApiResponse
        if (!res.ok) {
          setError(
            (data as unknown as { detail?: string; title?: string }).detail ??
              (data as unknown as { detail?: string; title?: string }).title ??
              'Failed to fetch projects',
          )
          return
        }
        setProjects(data.projects)
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

  async function handleAction(projectId: string, action: 'pause' | 'cancel') {
    setError(null)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/${action}`, {
        method: 'POST',
      })
      const data = (await res.json()) as unknown
      if (!res.ok) {
        setError(
          (data as { detail?: string; title?: string }).detail ??
            (data as { detail?: string; title?: string }).title ??
            `Failed to ${action} project`,
        )
        return
      }
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, status: action === 'pause' ? 'PAUSED' : 'CANCELLED' }
            : p,
        ),
      )
      router.refresh()
    } catch {
      setError('Network error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <Input
            label="Search by title or slug"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
            }}
            placeholder="e.g. Green Energy DAO"
            containerClassName="flex-1"
          />
          <Button
            onClick={() => {
              void fetchProjects(q, 1)
            }}
            disabled={loading}
            className="mt-7"
          >
            {loading ? 'Loading...' : 'Search'}
          </Button>
        </div>

        {error && <p className="text-label-sm text-error mb-4">{error}</p>}

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-label-md">
            <thead className="sticky top-0 bg-surface-container z-10">
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="text-left py-2 pr-4 font-medium">Title</th>
                <th className="text-left py-2 pr-4 font-medium">Organization</th>
                <th className="text-left py-2 pr-4 font-medium">Status</th>
                <th className="text-left py-2 pr-4 font-medium">Target</th>
                <th className="text-left py-2 pr-4 font-medium">Raised</th>
                <th className="text-left py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors even:bg-surface-container-low/30"
                >
                  <td className="py-3 pr-4 text-on-surface">
                    <span className="font-medium truncate block max-w-[200px]">{p.title}</span>
                    <span className="block text-label-sm text-on-surface-variant truncate max-w-[200px]">
                      {p.slug}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-on-surface truncate max-w-[150px]">
                    {p.organizationTitle}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge status={badgeStatus(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-on-surface">{p.targetAmount} USDT</td>
                  <td className="py-3 pr-4 text-on-surface">{p.totalRaised} USDT</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {p.status !== 'PAUSED' && p.status !== 'CANCELLED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void handleAction(p.id, 'pause')
                          }}
                          disabled={loading}
                        >
                          Pause
                        </Button>
                      )}
                      {p.status !== 'CANCELLED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void handleAction(p.id, 'cancel')
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    No projects found.
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
                void fetchProjects(q, page - 1)
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
                void fetchProjects(q, page + 1)
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
