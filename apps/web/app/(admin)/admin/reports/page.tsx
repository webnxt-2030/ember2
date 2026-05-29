import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Reports — Admin' }
export const runtime = 'nodejs'

export default async function AdminReportsPage() {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/')
    throw err
  }

  const [
    totalUsers,
    usersByRole,
    totalOrgs,
    orgsByStatus,
    totalProjects,
    projectsByStatus,
    totalContributions,
    totalRaised,
    emailStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    prisma.organization.count(),
    prisma.organization.groupBy({ by: ['verifiedStatus'], _count: { verifiedStatus: true } }),
    prisma.project.count(),
    prisma.project.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.contribution.count(),
    prisma.contribution.aggregate({ _sum: { amount: true } }),
    prisma.emailNotification.groupBy({ by: ['status'], _count: { status: true } }),
  ])

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface font-bold mb-8">Reports</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value={totalUsers} />
          <StatCard title="Total Organizations" value={totalOrgs} />
          <StatCard title="Total Projects" value={totalProjects} />
          <StatCard title="Total Contributions" value={totalContributions} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
            </CardHeader>
            <CardContent>
              {usersByRole.map((r) => (
                <div key={r.role} className="flex justify-between py-2 border-b border-outline-variant last:border-0">
                  <span className="text-label-md text-on-surface">{r.role}</span>
                  <span className="text-label-md font-semibold text-on-surface">{r._count.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organizations by Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {orgsByStatus.map((s) => (
                <div key={s.verifiedStatus} className="flex justify-between py-2 border-b border-outline-variant last:border-0">
                  <span className="text-label-md text-on-surface">{s.verifiedStatus}</span>
                  <span className="text-label-md font-semibold text-on-surface">{s._count.verifiedStatus}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projects by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsByStatus.map((s) => (
                <div key={s.status} className="flex justify-between py-2 border-b border-outline-variant last:border-0">
                  <span className="text-label-md text-on-surface">{s.status}</span>
                  <span className="text-label-md font-semibold text-on-surface">{s._count.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emails by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {emailStats.map((s) => (
                <div key={s.status} className="flex justify-between py-2 border-b border-outline-variant last:border-0">
                  <span className="text-label-md text-on-surface">{s.status}</span>
                  <span className="text-label-md font-semibold text-on-surface">{s._count.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Total Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-display-sm text-on-surface font-bold">
              {totalRaised._sum.amount?.toString() ?? '0'} USDT
            </p>
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-label-md text-on-surface-variant mb-1">{title}</p>
        <p className="text-headline-lg text-on-surface font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
