import { cn } from '@/lib/cn'

interface ProgressDefaultProps {
  variant?: 'default' | 'success'
  value: number
  className?: string
}

interface ProgressSplitProps {
  variant: 'split'
  yes: number
  no: number
  value?: never
  className?: string
}

type ProgressProps = ProgressDefaultProps | ProgressSplitProps

const fillVariantClasses: Record<'default' | 'success', string> = {
  default: 'bg-primary',
  success: 'bg-tertiary',
}

export function Progress(props: ProgressProps) {
  const { variant = 'default', className } = props

  if (variant === 'split') {
    const { yes, no } = props as ProgressSplitProps
    const total = yes + no
    const yesPercent = total > 0 ? (yes / total) * 100 : 0
    const noPercent = total > 0 ? (no / total) * 100 : 0

    return (
      <div className={cn('flex w-full h-2 rounded-full overflow-hidden', className)}>
        <div
          className="h-full bg-tertiary rounded-l-full transition-all"
          style={{ width: `${String(yesPercent)}%` }}
          aria-label={`Yes: ${String(Math.round(yesPercent))}%`}
        />
        <div
          className="h-full bg-error rounded-r-full transition-all"
          style={{ width: `${String(noPercent)}%` }}
          aria-label={`No: ${String(Math.round(noPercent))}%`}
        />
      </div>
    )
  }

  const { value } = props as ProgressDefaultProps
  const clampedValue = Math.min(100, Math.max(0, value))
  const fillClass = fillVariantClasses[variant]

  return (
    <div
      className={cn('w-full h-2 bg-surface-variant rounded-full overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all', fillClass)}
        style={{ width: `${String(clampedValue)}%` }}
      />
    </div>
  )
}
