import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrgProfileForm } from './org-profile-form'
import Link from 'next/link'

export default async function OrgDashboardDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  const session = await getSession()

  try {
    await assertOwnsOrg(session, orgId, prisma)
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/org/dashboard')
    throw err
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      projects: { orderBy: { createdAt: 'desc' }, take: 10 },
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  })
  if (!org) notFound()

  const totalRaised = org.projects.reduce(
    (sum: number, p: { totalRaised: { toString(): string } }) => sum + Number(p.totalRaised),
    0,
  )
  const liveCount = org.projects.filter((p: { status: string }) => p.status === 'LIVE').length

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-headline-lg text-on-surface">{org.title}</h1>
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
            <p className="text-label-sm text-on-surface-variant mt-1">{org.slug}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-label-md text-on-surface-variant">Projects</p>
              <p className="text-display-lg text-on-surface mt-1">{org.projects.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-label-md text-on-surface-variant">Live now</p>
              <p className="text-display-lg text-on-surface mt-1">{liveCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-label-md text-on-surface-variant">Total raised (USDT)</p>
              <p className="text-display-lg text-on-surface mt-1">{totalRaised.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects list */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-headline-md text-on-surface">Projects</h2>
          <Link
            href={`/org/dashboard/${orgId}/projects/new`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-label-md text-on-primary hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New project
          </Link>
        </div>
        <div className="mt-4">
          {org.projects.length === 0 ? (
            <p className="text-body-md text-on-surface-variant mt-4">No projects yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {org.projects.map(
                (p: { id: string; title: string; slug: string; status: string }) => (
                  <Link key={p.id} href={`/org/dashboard/${orgId}/projects/${p.id}`} className="block">
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="py-4 flex items-center justify-between">
                        <div>
                          <p className="text-label-md text-on-surface">{p.title}</p>
                          <p className="text-label-sm text-on-surface-variant">{p.slug}</p>
                        </div>
                        <Badge
                          status={
                            p.status === 'LIVE'
                              ? 'active'
                              : p.status === 'DRAFT'
                                ? 'pending'
                                : p.status === 'COMPLETED'
                                  ? 'completed'
                                  : 'failed'
                          }
                        >
                          {p.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>

        {/* Profile settings */}
        <div className="mt-12">
          <h2 className="text-headline-md text-on-surface">Organization settings</h2>
          <div className="mt-4 max-w-xl">
            <OrgProfileForm
              orgId={org.id}
              initialTitle={org.title}
              initialDescription={org.description}
              initialLogoUrl={org.logoUrl ?? ''}
              initialWebsite={org.website ?? ''}
            />
          </div>
        </div>
      </Container>
    </div>
  )
}
