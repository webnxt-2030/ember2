import Link from 'next/link'
import { cn } from '@/lib/cn'

interface PaginationProps {
  page: number
  pageSize: number
  totalPages: number
  totalCount: number
  className?: string
}

export function Pagination({ page, pageSize, totalPages, totalCount, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: Array<number | 'ellipsis'> = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('ellipsis')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
  }

  function buildHref(p: number) {
    const params = new URLSearchParams()
    params.set('page', String(p))
    return `/projects?${params.toString()}`
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4 py-8', className)}
    >
      <p className="text-label-md text-on-surface-variant">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} projects
      </p>

      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={buildHref(page - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline hover:bg-surface-container-low transition-colors text-label-md text-on-surface"
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </Link>
        )}

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-on-surface-variant">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-xl text-label-md transition-colors',
                p === page
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline hover:bg-surface-container-low text-on-surface',
              )}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Link>
          ),
        )}

        {page < totalPages && (
          <Link
            href={buildHref(page + 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline hover:bg-surface-container-low transition-colors text-label-md text-on-surface"
            aria-label="Next page"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </Link>
        )}
      </div>
    </nav>
  )
}