import React from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant =
  | 'primary'
  | 'primary-hero'
  | 'outline'
  | 'outline-tinted'
  | 'ghost'
  | 'destructive'

export type ButtonSize = 'default' | 'sm' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary rounded-xl px-6 py-3 text-label-md shadow-sm hover:bg-surface-tint transition-colors',
  'primary-hero':
    'bg-primary text-on-primary rounded-xl px-8 py-4 text-label-md shadow-lg shadow-primary/20 hover:bg-surface-tint hover:scale-[0.98] transition-all',
  outline:
    'bg-surface text-on-surface border border-outline rounded-xl px-6 py-3 text-label-md hover:bg-surface-container-low transition-colors',
  'outline-tinted':
    'text-primary border border-primary rounded-xl px-6 py-3 text-label-md hover:bg-primary-fixed transition-colors',
  ghost:
    'text-on-surface hover:bg-surface-container-low rounded-xl px-4 py-2 text-label-md transition-colors',
  destructive:
    'bg-error text-on-error rounded-xl px-6 py-3 text-label-md hover:opacity-90 transition-opacity',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: '',
  sm: '!px-4 !py-2 text-label-sm',
  lg: '!px-8 !py-4',
}

interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  className?: string
}

interface ButtonAsChildProps extends ButtonBaseProps {
  asChild: true
  children: React.ReactElement<{ className?: string }>
  onClick?: never
  type?: never
}

interface ButtonElementProps extends ButtonBaseProps {
  asChild?: false
  children?: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
}

export type ButtonProps = ButtonAsChildProps | ButtonElementProps

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'default',
    disabled = false,
    className,
    children,
  } = props

  const composedClass = cn(
    'inline-flex items-center justify-center font-medium select-none cursor-pointer',
    variantClasses[variant],
    sizeClasses[size],
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    className,
  )

  if ('asChild' in props && props.asChild) {
    const child = props.children as React.ReactElement<{ className?: string }>
    return React.cloneElement(child, {
      className: cn(composedClass, child.props.className),
    })
  }

  const elementProps = props as ButtonElementProps
  return (
    <button
      type={elementProps.type ?? 'button'}
      disabled={disabled}
      onClick={elementProps.onClick}
      className={composedClass}
    >
      {children}
    </button>
  )
}
