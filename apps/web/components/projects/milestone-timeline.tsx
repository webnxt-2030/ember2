import { cn } from '@/lib/cn'
import { Lock, Banknote, Vote, Check, X } from 'lucide-react'
import type { ReactNode } from 'react'

type MilestoneStatus = 'PENDING' | 'AUTO_RELEASED' | 'VOTING' | 'PASSED' | 'FAILED' | 'CLAIMED'

interface MilestoneStep {
  index: number
  title: string
  description: string
  deliverableDate: Date | null
  bps: number
  status: MilestoneStatus
  voteEndAt: Date | null
  passed: boolean | null
  claimedAt: Date | null
}

interface MilestoneTimelineProps {
  milestones: MilestoneStep[]
}

const statusMap: Record<MilestoneStatus, {
  label: string
  icon: ReactNode
  containerClass: string
  textClass: string
}> = {
  PENDING: {
    label: 'Locked',
    icon: <Lock size={14} />,
    containerClass: 'bg-surface-container-high',
    textClass: 'text-on-surface-variant',
  },
  AUTO_RELEASED: {
    label: 'Released',
    icon: <Banknote size={14} />,
    containerClass: 'bg-tertiary-container/20',
    textClass: 'text-tertiary',
  },
  VOTING: {
    label: 'Voting',
    icon: <Vote size={14} />,
    containerClass: 'bg-primary-container/20',
    textClass: 'text-primary',
  },
  PASSED: {
    label: 'Approved',
    icon: <Check size={14} />,
    containerClass: 'bg-tertiary-container/20',
    textClass: 'text-tertiary',
  },
  FAILED: {
    label: 'Rejected',
    icon: <X size={14} />,
    containerClass: 'bg-error-container/20',
    textClass: 'text-error',
  },
  CLAIMED: {
    label: 'Claimed',
    icon: <Banknote size={14} />,
    containerClass: 'bg-tertiary-container/20',
    textClass: 'text-tertiary',
  },
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
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
                  {config.icon}
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
                  Target: {new Date(milestone.deliverableDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}

              {milestone.voteEndAt && (
                <p className="text-label-sm text-on-surface-variant mt-1">
                  Voting ends:{' '}
                  {new Date(milestone.voteEndAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
