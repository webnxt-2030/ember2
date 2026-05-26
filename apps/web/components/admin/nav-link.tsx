'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

interface AdminNavLinkProps {
  href: string
  label: string
  icon: string
}

export function AdminNavLink({ href, label, icon }: AdminNavLinkProps) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-label-md transition-colors',
        active
          ? 'bg-primary-fixed text-on-primary-fixed-variant'
          : 'text-on-surface hover:bg-surface-container-low',
      )}
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        {icon}
      </span>
      {label}
    </Link>
  )
}
