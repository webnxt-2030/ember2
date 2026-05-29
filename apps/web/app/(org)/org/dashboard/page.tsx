import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Container } from '@/components/layout/container'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Your Organizations — Ember' }

export default async function OrgDashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect('/auth/sign-in')

  const memberships = await prisma.organizationMember
    .findMany({
      where: { userId: session.user.id },
      include: {
        organization: {
          include: { projects: { select: { id: true, status: true } } },
        },
      },
    })
    .catch(() => [])

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface">Your organizations</h1>
        {memberships.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <span
                className="material-symbols-outlined text-on-surface-variant text-[48px]"
                aria-hidden="true"
              >
                group
              </span>
              <p className="text-headline-md text-on-surface mt-4">No organizations</p>
              <p className="text-body-md text-on-surface-variant mt-2">
                You are not an org owner. Contact a Super Admin to be assigned to an organization.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberships.map((m: (typeof memberships)[number]) => {
              const org = m.organization
              const liveCount = org.projects.filter(
                (p: { status: string }) => p.status === 'LIVE',
              ).length
              return (
                <Link href={`/org/dashboard/${org.id}`} key={org.id}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-headline-md text-on-surface">{org.title}</p>
                          <p className="text-label-sm text-on-surface-variant mt-1">{org.slug}</p>
                        </div>
                        <Badge
                          status={
                            org.verifiedStatus === 'VERIFIED'
                              ? 'completed'
                              : org.verifiedStatus === 'REJECTED'
                                ? 'failed'
                                : 'pending'
                          }
                        >
                          {org.verifiedStatus}
                        </Badge>
                      </div>
                      <div className="mt-4 flex gap-4 text-label-sm text-on-surface-variant">
                        <span>
                          {org.projects.length} project
                          {org.projects.length !== 1 ? 's' : ''}
                        </span>
                        {liveCount > 0 && (
                          <span className="text-tertiary">{liveCount} live</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </Container>
    </div>
  )
}
