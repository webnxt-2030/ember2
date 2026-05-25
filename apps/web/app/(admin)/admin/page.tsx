import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — prisma client may not be generated in dev
import { prisma } from '@/lib/db'

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-label-md text-on-surface-variant">{label}</p>
        <p className="text-display-sm text-on-surface mt-1 font-bold">{value}</p>
        {sub && <p className="text-label-sm text-on-surface-variant mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

function formatRelative(date: Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function activityIcon(type: string): string {
  if (type.startsWith('ORG_')) return 'business'
  if (type.startsWith('PROJECT_')) return 'rocket_launch'
  if (type.startsWith('CONTRIBUTION_')) return 'payments'
  if (type.startsWith('MILESTONE_')) return 'flag'
  if (type.startsWith('USER_')) return 'person'
  if (type.startsWith('WALLET_')) return 'account_balance_wallet'
  if (type.startsWith('EMAIL_')) return 'mail'
  return 'event_note'
}

function activityLabel(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function AdminDashboardPage() {
  type OrgRow = { id: string; title: string; createdAt: Date }
  type ActivityRow = { id: string; type: string; createdAt: Date }
  type AggResult = { _sum: { amount: unknown } }

  let orgCount = 0
  let pendingCount = 0
  let liveCount = 0
  let totalRaised: AggResult = { _sum: { amount: null } }
  let pendingOrgs: OrgRow[] = []
  let recentActivity: ActivityRow[] = []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (prisma as any).organization.count(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (prisma as any).organization.count({ where: { verifiedStatus: 'PENDING' } }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (prisma as any).project.count({ where: { status: 'LIVE' } }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (prisma as any).contribution.aggregate({ _sum: { amount: true } }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (prisma as any).organization.findMany({
        where: { verifiedStatus: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: { id: true, title: true, createdAt: true },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (prisma as any).activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, createdAt: true },
      }),
    ])

    orgCount = results[0] as number
    pendingCount = results[1] as number
    liveCount = results[2] as number
    totalRaised = results[3] as AggResult
    pendingOrgs = results[4] as OrgRow[]
    recentActivity = results[5] as ActivityRow[]
  } catch {
    // DB not available in dev — show zeros
  }

  const raisedAmount = totalRaised._sum.amount
  const raisedFormatted =
    raisedAmount != null
      ? Number(raisedAmount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '0.00'

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface font-bold">Admin Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <StatCard label="Organizations" value={orgCount} />
          <StatCard label="Pending verification" value={pendingCount} />
          <StatCard label="Live projects" value={liveCount} />
          <StatCard label="Total raised (USDT)" value={raisedFormatted} />
        </div>

        {/* Lower row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          {/* Pending verifications */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>Pending verifications</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingOrgs.length === 0 ? (
                  <p className="text-label-md text-on-surface-variant py-4 text-center">
                    No pending verifications.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-label-md">
                      <thead>
                        <tr className="border-b border-outline-variant text-on-surface-variant">
                          <th className="text-left py-2 pr-4 font-medium">Name</th>
                          <th className="text-left py-2 pr-4 font-medium">Created</th>
                          <th className="text-left py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingOrgs.map((org) => (
                          <tr
                            key={org.id}
                            className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors"
                          >
                            <td className="py-3 pr-4 text-on-surface font-medium">{org.title}</td>
                            <td className="py-3 pr-4 text-on-surface-variant">
                              {formatDate(org.createdAt)}
                            </td>
                            <td className="py-3">
                              <Badge status="pending">
                                <Link
                                  href={`/admin/organizations/${org.id}`}
                                  className="hover:underline"
                                >
                                  Review
                                </Link>
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-label-md text-on-surface-variant py-4 text-center">
                    No recent activity.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {recentActivity.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-3">
                        <span
                          className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5 flex-shrink-0"
                          aria-hidden="true"
                        >
                          {activityIcon(entry.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-label-sm text-on-surface truncate">
                            {activityLabel(entry.type)}
                          </p>
                          <p className="text-label-sm text-on-surface-variant">
                            {formatRelative(entry.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  )
}
