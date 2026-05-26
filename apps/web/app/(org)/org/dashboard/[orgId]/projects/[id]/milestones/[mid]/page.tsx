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
    where: { id, organizationId: orgId },
    include: {
      organization: { select: { receivingWallet: true } },
      milestones: { orderBy: { index: 'asc' } },
    },
  })
  if (!project) notFound()

  const milestone = project.milestones.find((m: { index: number }) => m.index === milestoneIndex)
  if (!milestone) notFound()

  const canSubmit =
    milestone.index !== 0 &&
    milestone.status === 'PENDING' &&
    (project.status === 'LIVE' || project.status === 'COMPLETED') &&
    !!project.escrowAddress

  const raised = parseFloat(project.totalRaised.toString())
  const milestoneAmount = (raised * milestone.bps) / 10000

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

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
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="text-label-sm text-on-surface-variant mb-1">Allocation</p>
                <p className="text-headline-md text-on-surface">{formatUsd(milestoneAmount)}</p>
                <p className="text-label-sm text-on-surface-variant">{(milestone.bps / 100).toFixed(2)}%</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="text-label-sm text-on-surface-variant mb-1">Total Raised</p>
                <p className="text-headline-md text-on-surface">{formatUsd(raised)}</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="text-label-sm text-on-surface-variant mb-1">Status</p>
                <p className="text-headline-md text-on-surface">{milestone.status}</p>
              </div>
            </div>

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
                  {raised > 0 && (
                    <div className="mt-4">
                      <Progress
                        value={
                          (parseFloat(milestone.weightYes.toString()) +
                            parseFloat(milestone.weightNo.toString())) > 0
                            ? (parseFloat(milestone.weightYes.toString()) /
                              (parseFloat(milestone.weightYes.toString()) +
                                parseFloat(milestone.weightNo.toString()))) * 100
                            : 0
                        }
                      />
                      <div className="flex justify-between text-label-sm mt-2">
                        <span className="text-tertiary">
                          YES {formatUsd(parseFloat(milestone.weightYes.toString()))}
                        </span>
                        <span className="text-error">
                          NO {formatUsd(parseFloat(milestone.weightNo.toString()))}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <div className="mt-4">
              <h2 className="text-headline-md text-on-surface mb-4">
                All milestones
              </h2>
              <MilestoneTimeline
                slug={project.slug}
                escrowAddress={project.escrowAddress as `0x${string}` | null}
                milestones={project.milestones.map((m: { index: number; title: string; description: string; deliverableDate: Date | null; bps: number; status: string; voteEndAt: Date | null; passed: boolean | null; claimedAt: Date | null }) => ({
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
          <div className="space-y-4">
            {canSubmit && (
              <SubmitForm
                projectId={id}
                orgId={orgId}
                milestoneIndex={milestoneIndex}
                escrowAddress={project.escrowAddress as `0x${string}`}
              />
            )}

            {milestone.status === 'PASSED' && project.escrowAddress && (
              <Card>
                <CardHeader>
                  <CardTitle>Claim Funds</CardTitle>
                </CardHeader>
                <CardContent>
                  <ClaimButton
                    projectId={project.id}
                    milestoneIndex={milestone.index}
                    escrowAddress={project.escrowAddress as `0x${string}`}
                    orgWallet={project.organization.receivingWallet as `0x${string}`}
                  />
                </CardContent>
              </Card>
            )}

            {milestone.status === 'CLAIMED' && milestone.claimedAt && (
              <Card>
                <CardHeader>
                  <CardTitle>Claimed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-label-md text-tertiary">
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    Claimed on {new Date(milestone.claimedAt).toLocaleDateString()}
                  </div>
                  {milestone.claimedTxHash && (
                    <a
                      href={`${process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL}/tx/${milestone.claimedTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-label-md mt-2 block"
                    >
                      View transaction
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {!canSubmit && milestone.status !== 'PASSED' && milestone.status !== 'CLAIMED' && (
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
