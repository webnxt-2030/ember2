import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MilestoneTimeline } from '@/components/projects/milestone-timeline'
import { Progress } from '@/components/ui/progress'
import { ClaimButton } from '@/components/milestones/claim-button'
import { PublishButton } from './publish-button'
import Link from 'next/link'

export const metadata = { title: 'Project — Ember' }

export default async function OrgProjectDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>
}) {
  const { orgId, id } = await params
  const session = await getSession()

  try {
    await assertOwnsOrg(session, orgId, prisma)
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/org/dashboard')
    throw err
  }

  const project = await prisma.project.findUnique({
    where: { id, organizationId: orgId },
    include: {
      milestones: { orderBy: { index: 'asc' } },
      organization: { select: { receivingWallet: true, title: true } },
    },
  })
  if (!project) notFound()

  const backerCount = await prisma.contribution.groupBy({
    by: ['walletAddress'],
    where: { projectId: id },
    _count: { walletAddress: true },
  }).then((rows) => rows.length)

  const target = parseFloat(project.targetAmount.toString())
  const raised = parseFloat(project.totalRaised.toString())
  const progress = target > 0 ? (raised / target) * 100 : 0

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <div className="py-8">
      <Container>
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            href={`/org/dashboard/${orgId}`}
            className="text-label-md text-primary hover:underline"
          >
            &larr; Back to organization
          </Link>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-headline-lg text-on-surface">{project.title}</h1>
              <Badge
                status={
                  project.status === 'LIVE'
                    ? 'active'
                    : project.status === 'DRAFT'
                      ? 'pending'
                      : project.status === 'COMPLETED'
                        ? 'completed'
                        : 'failed'
                }
              >
                {project.status}
              </Badge>
            </div>
            <p className="text-label-sm text-on-surface-variant mt-1">{project.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            {project.status === 'DRAFT' && (
              <Link
                href={`/org/dashboard/${orgId}/projects/${id}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-label-md text-on-surface-variant">Target</p>
              <p className="text-display-lg text-on-surface mt-1">{formatUsd(target)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-label-md text-on-surface-variant">Raised</p>
              <p className="text-display-lg text-on-surface mt-1">{formatUsd(raised)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-label-md text-on-surface-variant">Backers</p>
              <p className="text-display-lg text-on-surface mt-1">
                {backerCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Progress value={Math.min(progress, 100)} />
          <p className="text-label-sm text-on-surface-variant mt-2">
            {progress.toFixed(1)}% funded
          </p>
        </div>

        {project.status === 'DRAFT' && (
          <div className="mt-8">
            <PublishButton projectId={id} orgId={orgId} />
          </div>
        )}

        {/* Milestones */}
        <div className="mt-12">
          <h2 className="text-headline-md text-on-surface mb-6">Milestones</h2>
          <div className="grid lg:grid-cols-[1fr_300px] gap-8">
            <MilestoneTimeline
              slug={project.slug}
              escrowAddress={project.escrowAddress as `0x${string}` | null}
              milestones={project.milestones.map((m) => ({
                index: m.index,
                title: m.title,
                description: m.description,
                deliverableDate: m.deliverableDate,
                bps: m.bps,
                status: m.status,
                voteEndAt: m.voteEndAt,
                passed: m.passed,
                claimedAt: m.claimedAt,
              }))}
            />

            {/* Actions sidebar */}
            <div className="space-y-4">
              {project.milestones.map((m: { id: string; index: number; title: string; status: string; bps: number }) => {
                const canSubmit =
                  m.index !== 0 &&
                  m.status === 'PENDING' &&
                  (project.status === 'LIVE' || project.status === 'COMPLETED')
                return (
                  <Card key={m.id} variant={m.status === 'VOTING' ? 'active' : 'default'}>
                    <CardHeader>
                      <CardTitle className="text-label-md">Milestone {m.index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-body-md text-on-surface mb-1">{m.title}</p>
                      <p className="text-label-sm text-on-surface-variant">
                        {(m.bps / 100).toFixed(2)}% &middot; {m.status}
                      </p>
                      {canSubmit && (
                        <Link
                          href={`/org/dashboard/${orgId}/projects/${id}/milestones/${String(m.index)}`}
                          className="mt-4 block w-full"
                        >
                          <button className="w-full bg-primary text-on-primary rounded-xl px-6 py-3 text-label-md shadow-sm hover:bg-surface-tint transition-colors">
                            Submit for vote
                          </button>
                        </Link>
                      )}
                      {m.status === 'PASSED' && project.escrowAddress && (
                        <div className="mt-4">
                          <ClaimButton
                            projectId={project.id}
                            milestoneIndex={m.index}
                            escrowContractId={project.escrowAddress}
                            orgWallet={project.organization.receivingWallet}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
