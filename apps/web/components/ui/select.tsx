import { cn } from '@/lib/cn'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  containerClassName?: string
}

export function Select({
  label,
  error,
  options,
  containerClassName,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-label-md text-on-surface font-medium"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3',
          'text-body-md text-on-surface',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
          'transition-colors appearance-none',
          'bg-[right_0.75rem_center] bg-no-repeat pr-10',
          // Custom chevron using inline SVG background
          '[background-image:url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")]',
          'dark:[background-image:url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%239ca3af\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")]',
          error && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-label-sm text-error">{error}</p>
      )}
    </div>
  )
}
