'use client'

import { cn } from '@/lib/cn'
import { VotePanel } from '@/components/vote/vote-panel'

type MilestoneStatus = 'PENDING' | 'AUTO_RELEASED' | 'VOTING' | 'PASSED' | 'FAILED' | 'CLAIMED'

interface MilestoneStep {
  index: number
  title: string
  description: string
  deliverableDate: Date | string | null
  bps: number
  status: MilestoneStatus
  voteEndAt: Date | string | null
  passed: boolean | null
  claimedAt: Date | string | null
}

interface MilestoneTimelineProps {
  milestones: MilestoneStep[]
  slug: string
  escrowAddress?: `0x${string}` | null
}

const statusMap: Record<MilestoneStatus, {
  label: string
  icon: string
  containerClass: string
  textClass: string
}> = {
  PENDING: {
    label: 'Locked',
    icon: 'lock',
    containerClass: 'bg-surface-container-high',
    textClass: 'text-on-surface-variant',
  },
  AUTO_RELEASED: {
    label: 'Released',
    icon: 'payments',
    containerClass: 'bg-tertiary-container/20',
    textClass: 'text-tertiary',
  },
  VOTING: {
    label: 'Voting',
    icon: 'how_to_vote',
    containerClass: 'bg-primary-container/20',
    textClass: 'text-primary',
  },
  PASSED: {
    label: 'Approved',
    icon: 'check',
    containerClass: 'bg-tertiary-container/20',
    textClass: 'text-tertiary',
  },
  FAILED: {
    label: 'Rejected',
    icon: 'close',
    containerClass: 'bg-error-container/20',
    textClass: 'text-error',
  },
  CLAIMED: {
    label: 'Claimed',
    icon: 'payments',
    containerClass: 'bg-tertiary-container/20',
    textClass: 'text-tertiary',
  },
}

function formatDate(date: Date | string | null): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function MilestoneTimeline({ milestones, slug, escrowAddress }: MilestoneTimelineProps) {
  return (
    <div className="relative">
      {milestones.map((milestone, i) => {
        const config = statusMap[milestone.status]
        const isLast = i === milestones.length - 1

        return (
          <div key={milestone.index} className="relative flex">
            <div className="flex flex-col items-center mr-6">
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex-shrink-0 z-10',
                  milestone.status === 'VOTING'
                    ? 'border-primary-fixed-dim bg-primary shadow-[0_0_0_4px_rgba(183,35,1,0.12)]'
                    : 'border-outline-variant bg-surface',
                )}
              />
              {!isLast && (
                <div className="w-0.5 bg-surface-container-high flex-1 min-h-[60px]" />
              )}
            </div>

            <div
              className={cn(
                'flex-1 pb-8',
                milestone.status === 'VOTING' && 'rounded-lg border-2 border-primary-fixed-dim bg-surface p-4 shadow-sm',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-label-sm text-on-surface-variant">
                  Milestone {milestone.index + 1}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-semibold',
                    config.containerClass,
                    config.textClass,
                  )}
                >
                  {milestone.status === 'VOTING' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                  <span className="material-symbols-outlined text-[16px]">{config.icon}</span>
                  {config.label}
                </span>
                <span className="text-label-sm text-on-surface-variant ml-auto">
                  {(milestone.bps / 100).toFixed(2)}%
                </span>
              </div>

              <h4 className="text-body-md font-semibold text-on-surface">
                {milestone.title}
              </h4>
              <p className="text-label-md text-on-surface-variant mt-1">
                {milestone.description}
              </p>

              {milestone.deliverableDate && (
                <p className="text-label-sm text-on-surface-variant mt-2">
                  Target: {formatDate(milestone.deliverableDate)}
                </p>
              )}

              {milestone.voteEndAt && (
                <p className="text-label-sm text-on-surface-variant mt-1">
                  Voting ends: {formatDate(milestone.voteEndAt)}
                </p>
              )}

              {milestone.status === 'VOTING' && escrowAddress && (
                <VotePanel
                  slug={slug}
                  milestoneIndex={milestone.index}
                  escrowContractId={escrowAddress}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
