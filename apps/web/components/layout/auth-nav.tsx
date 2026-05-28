'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

interface AuthNavProps {
  /** Render as a stacked, full-width block for the mobile menu. */
  mobile?: boolean
  /** Called after navigating, so the mobile menu can close itself. */
  onNavigate?: () => void
}

export function AuthNav({ mobile = false, onNavigate }: AuthNavProps) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the account dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    function handlePointer(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  async function handleSignOut() {
    setMenuOpen(false)
    onNavigate?.()
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  // Avoid a flash of the wrong state during the initial session fetch.
  if (isPending) {
    return <div className="w-20 h-10" aria-hidden="true" />
  }

  if (!session) {
    return (
      <Button variant={mobile ? 'outline' : 'ghost'} asChild>
        <Link
          href="/auth/sign-in"
          className={cn(mobile && 'justify-start')}
          onClick={() => { onNavigate?.() }}
        >
          Sign in
        </Link>
      </Button>
    )
  }

  const { user } = session
  const isStaff = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  const isOrgOwner = user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN'

  // Mobile: flat list of links instead of a dropdown.
  if (mobile) {
    return (
      <div className="flex flex-col gap-1">
        <span className="px-4 py-2 text-label-sm text-on-surface-variant truncate">
          {user.name || user.email}
        </span>
        <Link
          href="/dashboard"
          className="px-4 py-3 text-body-md text-on-surface rounded-xl hover:bg-surface-container-low transition-colors"
          onClick={() => { onNavigate?.() }}
        >
          Dashboard
        </Link>
        {isOrgOwner && (
          <Link
            href="/org/dashboard"
            className="px-4 py-3 text-body-md text-on-surface rounded-xl hover:bg-surface-container-low transition-colors"
            onClick={() => { onNavigate?.() }}
          >
            My Organizations
          </Link>
        )}
        {isStaff && (
          <Link
            href="/admin"
            className="px-4 py-3 text-body-md text-on-surface rounded-xl hover:bg-surface-container-low transition-colors"
            onClick={() => { onNavigate?.() }}
          >
            Admin
          </Link>
        )}
        <button
          type="button"
          onClick={() => { void handleSignOut() }}
          className="px-4 py-3 text-left text-body-md text-on-surface rounded-xl hover:bg-surface-container-low transition-colors"
        >
          Sign out
        </button>
      </div>
    )
  }

  // Desktop: avatar/initial trigger + dropdown.
  const label = user.name || user.email || 'Account'
  const initial = label.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => { setMenuOpen((v) => !v) }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Account menu"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-on-primary text-label-md font-semibold select-none cursor-pointer hover:bg-surface-tint transition-colors"
      >
        {initial}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-12 z-50 min-w-56',
            'bg-surface border border-outline-variant rounded-xl shadow-lg py-2',
          )}
        >
          <div className="px-4 py-2 border-b border-outline-variant">
            <p className="text-label-md text-on-surface truncate">{user.name || 'Account'}</p>
            {user.email && (
              <p className="text-label-sm text-on-surface-variant truncate">{user.email}</p>
            )}
          </div>
          <Link
            href="/dashboard"
            role="menuitem"
            className="block px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
            onClick={() => { setMenuOpen(false) }}
          >
            Dashboard
          </Link>
          {isOrgOwner && (
            <Link
              href="/org/dashboard"
              role="menuitem"
              className="block px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
              onClick={() => { setMenuOpen(false) }}
            >
              My Organizations
            </Link>
          )}
          {isStaff && (
            <Link
              href="/admin"
              role="menuitem"
              className="block px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
              onClick={() => { setMenuOpen(false) }}
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => { void handleSignOut() }}
            className="block w-full text-left px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
