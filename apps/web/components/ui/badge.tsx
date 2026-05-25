import { cn } from '@/lib/cn'

type BadgeStatus = 'completed' | 'active' | 'pending' | 'failed'

const statusClasses: Record<BadgeStatus, string> = {
  completed:
    'bg-surface-container-low text-tertiary px-2 py-1 rounded-full text-label-sm font-semibold',
  active:
    'bg-primary-fixed text-on-primary-fixed-variant px-2 py-1 rounded-full text-label-sm font-semibold',
  pending:
    'bg-surface-container-high text-on-surface-variant px-2 py-1 rounded-full text-label-sm font-semibold',
  failed:
    'bg-error-container text-on-error-container px-2 py-1 rounded-full text-label-sm font-semibold',
}

interface BadgeProps {
  status: BadgeStatus
  label?: string
  className?: string
  children?: React.ReactNode
}

export function Badge({ status, label, className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center', statusClasses[status], className)}>
      {children ?? label ?? status}
    </span>
  )
}
