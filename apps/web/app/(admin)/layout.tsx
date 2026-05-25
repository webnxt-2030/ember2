import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { AdminNavLink } from '@/components/admin/nav-link'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/organizations', label: 'Organizations', icon: 'business' },
  { href: '/admin/users', label: 'Users', icon: 'group' },
  { href: '/admin/projects', label: 'Projects', icon: 'rocket_launch' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: 'manage_history' },
  { href: '/admin/emails', label: 'Emails', icon: 'mail' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/')
    throw err
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-surface-container border-r border-outline-variant flex-shrink-0 overflow-y-auto flex flex-col">
        <header className="p-6 border-b border-outline-variant">
          <span className="text-primary font-extrabold tracking-[-0.01em] text-title-lg">
            Ember
          </span>
          <p className="text-label-sm text-on-surface-variant mt-0.5">Admin</p>
        </header>
        <nav className="p-4 space-y-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <AdminNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}
