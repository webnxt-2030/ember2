'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { cn } from '@/lib/cn'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'LIVE', label: 'Live' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PAUSED', label: 'Paused' },
] as const

interface FilterBarProps {
  orgOptions: Array<{ value: string; label: string }>
  className?: string
}

export function FilterBar({ orgOptions, className }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') ?? ''
  const currentOrg = searchParams.get('orgId') ?? ''
  const currentCategory = searchParams.get('category') ?? ''
  const currentMinRaise = searchParams.get('minRaise') ?? ''
  const currentMaxRaise = searchParams.get('maxRaise') ?? ''

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page') // reset to page 1 on filter change
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router],
  )

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-outline-variant pb-0">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParam('status', tab.value)}
            className={cn(
              'px-4 py-2 text-label-md transition-colors border-b-2 -mb-px',
              currentStatus === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Secondary filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category / org name text search */}
        <div className="flex flex-col gap-1">
          <label htmlFor="category-filter" className="text-label-sm text-on-surface-variant">
            Organization
          </label>
          <input
            id="category-filter"
            type="text"
            placeholder="Search org..."
            value={currentCategory}
            onChange={(e) => updateParam('category', e.target.value)}
            className="bg-surface-container-lowest border border-outline rounded-xl px-3 py-2 text-label-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none w-44"
          />
        </div>

        {/* Org ID filter (for precise filtering by org) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="org-select" className="text-label-sm text-on-surface-variant">
            By Org
          </label>
          <select
            id="org-select"
            value={currentOrg}
            onChange={(e) => updateParam('orgId', e.target.value)}
            className="bg-surface-container-lowest border border-outline rounded-xl px-3 py-2 text-label-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">All Organizations</option>
            {orgOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Min raise */}
        <div className="flex flex-col gap-1">
          <label htmlFor="min-raise" className="text-label-sm text-on-surface-variant">
            Min Raise (USDT)
          </label>
          <input
            id="min-raise"
            type="number"
            placeholder="0"
            min="0"
            value={currentMinRaise}
            onChange={(e) => updateParam('minRaise', e.target.value)}
            className="bg-surface-container-lowest border border-outline rounded-xl px-3 py-2 text-label-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none w-32"
          />
        </div>

        {/* Max raise */}
        <div className="flex flex-col gap-1">
          <label htmlFor="max-raise" className="text-label-sm text-on-surface-variant">
            Max Raise (USDT)
          </label>
          <input
            id="max-raise"
            type="number"
            placeholder="Any"
            min="0"
            value={currentMaxRaise}
            onChange={(e) => updateParam('maxRaise', e.target.value)}
            className="bg-surface-container-lowest border border-outline rounded-xl px-3 py-2 text-label-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none w-32"
          />
        </div>

        {/* Reset */}
        {(currentStatus || currentOrg || currentCategory || currentMinRaise || currentMaxRaise) && (
          <button
            onClick={() => router.push('/projects', { scroll: false })}
            className="self-end text-label-md text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}