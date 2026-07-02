import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgActions } from './org-actions'
import { prisma } from '@/lib/db'

type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

interface OrgDetail {
  id: string
  title: string
  slug: string
  description: string
  logoUrl: string | null
  website: string | null
  receivingWallet: string
  verifiedStatus: VerificationStatus
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
  members: {
    userId: string
    role: string
    createdAt: Date
    user: { id: string; email: string; name: string | null; role: string }
  }[]
  projects: { id: string; title: string; status: string }[]
}

function statusToBadge(s: string): 'active' | 'pending' | 'completed' | 'failed' {
  if (s === 'VERIFIED') return 'completed'
  if (s === 'REJECTED') return 'failed'
  return 'pending'
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Organization ${id} — Admin` }
}

export default async function AdminOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let org: OrgDetail | null = null
  try {
    org = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        projects: { select: { id: true, title: true, status: true }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
  } catch {
    // DB unavailable
  }

  if (!org) notFound()

  const members = org.members.map((m: Record<string, unknown>) => ({
    userId: m.userId as string,
    email: (m.user as Record<string, unknown>).email as string,
    name: (m.user as Record<string, unknown>).name as string | null,
  }))

  return (
    <div className="py-8">
      <Container>
        {/* Breadcrumb */}
        <nav className="text-label-sm text-on-surface-variant mb-6 flex items-center gap-2">
          <Link href="/admin/organizations" className="hover:underline">
            Organizations
          </Link>
          <span>/</span>
          <span className="text-on-surface">{org.title}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-headline-lg text-on-surface font-bold">{org.title}</h1>
            <p className="text-label-sm text-on-surface-variant mt-1">{org.slug}</p>
          </div>
          <Badge status={statusToBadge(org.verifiedStatus)}>
            {org.verifiedStatus.charAt(0) + org.verifiedStatus.slice(1).toLowerCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: org info */}
          <div className="lg:col-span-7 space-y-6">
            {/* Org details */}
            <Card>
              <CardHeader>
                <CardTitle>Organization details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-label-sm text-on-surface-variant mb-1">Description</p>
                  <p className="text-body-md text-on-surface">{org.description || '—'}</p>
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant mb-1">Website</p>
                  {org.website ? (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-body-md hover:underline"
                    >
                      {org.website}
                    </a>
                  ) : (
                    <p className="text-body-md text-on-surface-variant">—</p>
                  )}
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant mb-1">Receiving wallet</p>
                  <p className="text-body-md text-on-surface font-mono break-all">
                    {org.receivingWallet}
                  </p>
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant mb-1">Created</p>
                  <p className="text-body-md text-on-surface">
                    {new Date(org.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {org.verifiedAt && (
                  <div>
                    <p className="text-label-sm text-on-surface-variant mb-1">Verified at</p>
                    <p className="text-body-md text-on-surface">
                      {new Date(org.verifiedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Projects ({org.projects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {org.projects.length === 0 ? (
                  <p className="text-label-sm text-on-surface-variant">No projects yet.</p>
                ) : (
                  <div className="divide-y divide-outline-variant">
                    {org.projects.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between">
                        <p className="text-label-md text-on-surface font-medium">{p.title}</p>
                        <Badge
                          status={
                            p.status === 'LIVE'
                              ? 'active'
                              : p.status === 'COMPLETED'
                                ? 'completed'
                                : p.status === 'CANCELLED'
                                  ? 'failed'
                                  : 'pending'
                          }
                        >
                          {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: actions */}
          <div className="lg:col-span-5">
            <OrgActions
              orgId={org.id}
              orgTitle={org.title}
              currentStatus={org.verifiedStatus}
              members={members}
            />
          </div>
        </div>
      </Container>
    </div>
  )
}
