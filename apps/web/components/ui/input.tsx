import { cn } from '@/lib/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  containerClassName?: string
}

export function Input({
  label,
  error,
  containerClassName,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      <label
        htmlFor={inputId}
        className="text-label-md text-on-surface font-medium"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3',
          'text-body-md text-on-surface placeholder:text-on-surface-variant',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
          'transition-colors',
          error && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        {...props}
      />
      {error && (
        <p className="text-label-sm text-error">{error}</p>
      )}
    </div>
  )
}
