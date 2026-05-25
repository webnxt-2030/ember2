import Link from 'next/link'
import { Container } from './container'

const footerLinks = [
  { href: '/projects', label: 'Projects' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
]

export function Footer() {
  return (
    <footer className="bg-surface-container border-t border-outline-variant py-12">
      <Container>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          {/* Left: Wordmark + tagline */}
          <div className="flex flex-col gap-1">
            <span
              className="text-primary text-[1.25rem] leading-none select-none font-extrabold tracking-[-0.01em]"
            >
              Ember
            </span>
            <span className="text-body-md text-on-surface-variant">
              Crowdfunding that delivers.
            </span>
          </div>

          {/* Center: Nav links */}
          <nav className="flex flex-col md:flex-row gap-3 md:gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-body-md text-on-surface hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: Legal tagline */}
          <p className="text-label-sm text-on-surface-variant">
            Ember. Secured by Morph L2.
          </p>
        </div>
      </Container>
    </footer>
  )
}
