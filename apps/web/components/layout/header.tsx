'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Container } from './container'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/error-boundary'

// AppKit's useAppKit hook only works client-side, so load the wallet button without SSR
// to avoid "call createAppKit before useAppKit" during static prerendering.
const ConnectButton = dynamic(
  () => import('@/components/wallet/connect-button').then((m) => m.ConnectButton),
  { ssr: false },
)

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/how-it-works', label: 'How it works' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="h-20 sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-outline-variant">
      <Container className="h-full flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="text-primary text-[1.5rem] font-extrabold tracking-[-0.01em] leading-none select-none"
        >
          Ember
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-3">
          <ErrorBoundary><ConnectButton /></ErrorBoundary>
          <Button variant="primary" asChild>
            <Link href="/projects">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors"
          onClick={() => { setMobileMenuOpen((v) => !v); }}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>
      </Container>

      {/* Mobile Menu Stub */}
      {mobileMenuOpen && (
        <div className={cn(
          'md:hidden absolute top-20 left-0 right-0 z-50',
          'bg-surface border-b border-outline-variant shadow-lg',
        )}>
          <Container className="py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-body-md text-on-surface rounded-xl hover:bg-surface-container-low transition-colors"
                onClick={() => { setMobileMenuOpen(false); }}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-outline-variant flex flex-col gap-2">
              <ErrorBoundary><ConnectButton className="justify-start" /></ErrorBoundary>
              <Button variant="primary" asChild>
                <Link href="/projects" onClick={() => { setMobileMenuOpen(false); }}>Get Started</Link>
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}
