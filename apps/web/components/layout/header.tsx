'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Container } from './container'
import { Button } from '@/components/ui/button'

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
          <Button variant="ghost">Connect Wallet</Button>
          <Button variant="primary" asChild>
            <Link href="/projects">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-[24px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
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
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-outline-variant flex flex-col gap-2">
              <Button variant="ghost" className="justify-start">Connect Wallet</Button>
              <Button variant="primary" asChild>
                <Link href="/projects" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}
