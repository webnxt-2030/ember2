import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Organizations — Admin' }

type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

function statusToBadge(s: string): 'active' | 'pending' | 'completed' | 'failed' {
  if (s === 'VERIFIED') return 'completed'
  if (s === 'REJECTED') return 'failed'
  return 'pending'
}

interface OrgRow {
  id: string
  title: string
  slug: string
  verifiedStatus: VerificationStatus
  createdAt: Date
  members: { user: { email: string } }[]
}

const STATUS_FILTERS = ['All', 'PENDING', 'VERIFIED', 'REJECTED'] as const

export default async function AdminOrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const validStatus =
    status && (['PENDING', 'VERIFIED', 'REJECTED'] as string[]).includes(status)
      ? (status as VerificationStatus)
      : undefined

   
  const where = validStatus ? { verifiedStatus: validStatus } : {}

  let orgs: OrgRow[] = []
  try {
    orgs = await prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { members: { include: { user: { select: { email: true } } } } },
    })
  } catch {
    // DB not available in dev — show empty
  }

  return (
    <div className="py-8">
      <Container>
        <div className="flex justify-between items-center">
          <h1 className="text-headline-lg text-on-surface">Organizations</h1>
          <Button variant="primary" asChild>
            <Link href="/admin/organizations/new">
              <span className="material-symbols-outlined text-[18px] mr-1">add_business</span>
              New organization
            </Link>
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const isActive = s === 'All' ? !validStatus : validStatus === s
            const href = s === 'All' ? '/admin/organizations' : `/admin/organizations?status=${s}`
            return (
              <Link
                key={s}
                href={href}
                className={cn(
                  'px-3 py-1 rounded-xl text-label-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                  isActive
                    ? 'bg-primary-fixed text-on-primary-fixed-variant font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                {s === 'All' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </Link>
            )
          })}
        </div>

        {/* Table */}
        <div className="mt-6 border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-body-md">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left p-4 text-label-sm text-on-surface-variant font-medium">
                  Organization
                </th>
                <th className="text-left p-4 text-label-sm text-on-surface-variant font-medium">
                  Status
                </th>
                <th className="text-left p-4 text-label-sm text-on-surface-variant font-medium hidden sm:table-cell">
                  Owners
                </th>
                <th className="text-left p-4 text-label-sm text-on-surface-variant font-medium hidden md:table-cell">
                  Created
                </th>
                <th className="text-left p-4 text-label-sm text-on-surface-variant font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant text-label-md">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-4">
                      <p className="text-label-md text-on-surface font-medium">{org.title}</p>
                      <p className="text-label-sm text-on-surface-variant">{org.slug}</p>
                    </td>
                    <td className="p-4">
                      <Badge status={statusToBadge(org.verifiedStatus)}>
                        {org.verifiedStatus.charAt(0) + org.verifiedStatus.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <p className="text-label-sm text-on-surface-variant">
                        {org.members.length} owner{org.members.length !== 1 ? 's' : ''}
                      </p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <p className="text-label-sm text-on-surface-variant">
                        {new Date(org.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="text-primary text-label-sm hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none rounded"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Container>
    </div>
  )
}
