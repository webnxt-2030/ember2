import { cn } from '@/lib/cn'

type DotStatus = 'live' | 'pending' | 'success' | 'failed'

const statusClasses: Record<DotStatus, string> = {
  live: 'bg-primary animate-pulse',
  pending: 'bg-surface-container-high',
  success: 'bg-tertiary',
  failed: 'bg-error',
}

interface StatusDotProps {
  status: DotStatus
  className?: string
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full flex-shrink-0',
        statusClasses[status],
        className,
      )}
      aria-label={status}
    />
  )
}
