import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MilestoneTimeline } from '@/components/projects/milestone-timeline'
import { SafeMarkdown } from '@/components/safe-markdown'
import Link from 'next/link'
import { SubmitForm } from './submit-form'

export default async function OrgMilestoneDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string; mid: string }>
}) {
  const { orgId, id, mid } = await params
  const milestoneIndex = Number(mid)

  if (!Number.isFinite(milestoneIndex) || milestoneIndex < 0) {
    notFound()
  }

  const session = await getSession()

  try {
    await assertOwnsOrg(session, orgId, prisma)
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/org/dashboard')
    throw err
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { index: 'asc' } },
    },
  })
  if (project?.organizationId !== orgId) notFound()

  const milestone = project.milestones.find((m) => m.index === milestoneIndex)
  if (!milestone) notFound()

  const canSubmit =
    milestone.index !== 0 &&
    milestone.status === 'PENDING' &&
    (project.status === 'LIVE' || project.status === 'COMPLETED') &&
    !!project.escrowAddress

  return (
    <div className="py-8">
      <Container>
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            href={`/org/dashboard/${orgId}/projects/${id}`}
            className="text-label-md text-primary hover:underline"
          >
            &larr; Back to project
          </Link>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-headline-lg text-on-surface">
                Milestone {milestone.index + 1}
              </h1>
              <Badge
                status={
                  milestone.status === 'VOTING'
                    ? 'active'
                    : milestone.status === 'PASSED' || milestone.status === 'CLAIMED'
                      ? 'completed'
                      : milestone.status === 'FAILED'
                        ? 'failed'
                        : 'pending'
                }
              >
                {milestone.status}
              </Badge>
            </div>
            <p className="text-body-lg text-on-surface-variant mt-2">
              {milestone.title}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-8 mt-8">
          {/* Left: details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-body-md text-on-surface">
                  {milestone.description}
                </p>
              </CardContent>
            </Card>

            {milestone.updateNote && (
              <Card>
                <CardHeader>
                  <CardTitle>Update note</CardTitle>
                </CardHeader>
                <CardContent>
                  <SafeMarkdown content={milestone.updateNote} />
                </CardContent>
              </Card>
            )}

            {milestone.voteEndAt && (
              <Card>
                <CardHeader>
                  <CardTitle>Voting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body-md text-on-surface">
                    Voting ends:{' '}
                    {new Date(milestone.voteEndAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <div className="mt-4">
              <h2 className="text-headline-md text-on-surface mb-4">
                All milestones
              </h2>
              <MilestoneTimeline
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
            </div>
          </div>

          {/* Right: actions */}
          <div>
            {canSubmit ? (
              <SubmitForm
                projectId={id}
                orgId={orgId}
                milestoneIndex={milestoneIndex}
                escrowAddress={project.escrowAddress as `0x${string}`}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Submission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body-md text-on-surface-variant">
                    {milestone.index === 0
                      ? 'Milestone 0 is auto-released and does not require submission.'
                      : milestone.status !== 'PENDING'
                        ? `This milestone is already ${milestone.status.toLowerCase()}.`
                        : !project.escrowAddress
                          ? 'Project escrow is not deployed yet.'
                          : 'This milestone cannot be submitted at this time.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
