import { cn } from '@/lib/cn'

type CardVariant = 'default' | 'featured' | 'active'

const variantClasses: Record<CardVariant, string> = {
  default:
    'bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm',
  featured:
    'bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-2xl shadow-primary/10',
  active:
    'bg-surface-container-lowest border-2 border-primary-fixed-dim rounded-xl p-6 shadow-sm',
}

interface CardProps {
  variant?: CardVariant
  className?: string
  children?: React.ReactNode
}

export function Card({ variant = 'default', className, children }: CardProps) {
  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  className?: string
  children?: React.ReactNode
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2 mb-4', className)}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  className?: string
  children?: React.ReactNode
}

export function CardTitle({ className, children }: CardTitleProps) {
  return (
    <h3 className={cn('text-headline-md text-on-surface', className)}>
      {children}
    </h3>
  )
}

interface CardContentProps {
  className?: string
  children?: React.ReactNode
}

export function CardContent({ className, children }: CardContentProps) {
  return (
    <div className={cn('text-body-md text-on-surface-variant', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  className?: string
  children?: React.ReactNode
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div className={cn('flex items-center mt-4 pt-4 border-t border-outline-variant', className)}>
      {children}
    </div>
  )
}
