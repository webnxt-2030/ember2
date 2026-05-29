import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Votes — Ember',
}

export default async function VotesPage() {
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  const userId = session.user.id

  // Get all wallet addresses for this user
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    select: { address: true },
  })
  const walletAddresses = wallets.map((w: { address: string }) => w.address.toLowerCase())

  const contributionFilter =
    walletAddresses.length > 0
      ? { OR: [{ backerId: userId }, { walletAddress: { in: walletAddresses } }] }
      : { backerId: userId }

  // Active votes: milestones in VOTING for projects the user contributed to
  const activeVotes = await prisma.milestone.findMany({
    where: {
      status: 'VOTING',
      project: {
        contributions: {
          some: contributionFilter,
        },
      },
    },
    include: {
      project: {
        select: {
          slug: true,
          title: true,
          totalRaised: true,
        },
      },
      votes: {
        where: {
          walletAddress: { in: walletAddresses },
        },
        select: {
          choice: true,
          weight: true,
        },
      },
    },
    orderBy: { voteEndAt: 'asc' },
  })

  // Historical votes: all milestone votes cast by this user's wallets
  const historicalVotes = await prisma.milestoneVote.findMany({
    where: {
      walletAddress: { in: walletAddresses },
    },
    include: {
      milestone: {
        include: {
          project: {
            select: {
              slug: true,
              title: true,
              totalRaised: true,
            },
          },
        },
      },
    },
    orderBy: { votedAt: 'desc' },
  })

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const milestoneStatusBadge = (status: string, _passed: boolean | null) => {
    switch (status) {
      case 'PASSED':
        return <Badge status="completed" label="Passed" />
      case 'FAILED':
        return <Badge status="failed" label="Failed" />
      case 'CLAIMED':
        return <Badge status="completed" label="Claimed" />
      case 'VOTING':
        return <Badge status="active" label="Voting" />
      case 'AUTO_RELEASED':
        return <Badge status="completed" label="Released" />
      default:
        return <Badge status="pending" label={status} />
    }
  }

  return (
    <>
      <section className="bg-background py-12">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-headline-lg text-on-surface">Your Votes</h1>
            <a href="/dashboard" className="text-label-md text-primary hover:underline">
              &larr; Back to dashboard
            </a>
          </div>

          {/* Active Votes */}
          <div className="mb-12">
            <h2 className="text-headline-md text-on-surface mb-4">Active Votes</h2>
            {activeVotes.length === 0 ? (
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-8 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-[32px]">
                  how_to_vote
                </span>
                <p className="text-label-md text-on-surface-variant mt-2">
                  No active votes right now.
                </p>
                <a
                  href="/projects"
                  className="inline-flex items-center justify-center gap-2 mt-4 rounded-xl bg-primary px-4 py-2 text-label-md text-on-primary hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">explore</span>
                  Browse projects
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {activeVotes.map((milestone: { id: string; project: { slug: string; title: string; totalRaised: { toString: () => string } }; title: string; voteEndAt: Date | null; weightYes: { toString: () => string }; weightNo: { toString: () => string }; votes: { choice: string; weight: { toString: () => string } }[] }) => {
                  const totalRaised = parseFloat(milestone.project.totalRaised.toString())
                  const userVote = milestone.votes[0]
                  const weightYes = parseFloat(milestone.weightYes.toString())
                  const weightNo = parseFloat(milestone.weightNo.toString())

                  return (
                    <a
                      key={milestone.id}
                      href={`/projects/${milestone.project.slug}`}
                      className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-label-md text-on-surface">
                          {milestone.project.title}
                        </span>
                        {userVote ? (
                          <Badge status="completed" label={`Voted ${userVote.choice}`} />
                        ) : (
                          <Badge status="active" label="Vote open" />
                        )}
                      </div>
                      <p className="text-label-sm text-on-surface-variant mb-3">
                        {milestone.title}
                      </p>
                      {totalRaised > 0 && (
                        <div className="mb-3">
                          <Progress
                            value={((weightYes + weightNo) / totalRaised) * 100}
                          />
                          <div className="flex justify-between text-label-sm mt-1">
                            <span className="text-tertiary">
                              YES {formatUsd(weightYes)}
                            </span>
                            <span className="text-error">
                              NO {formatUsd(weightNo)}
                            </span>
                          </div>
                        </div>
                      )}
                      {milestone.voteEndAt && (
                        <p className="text-label-sm text-on-surface-variant">
                          Ends {new Date(milestone.voteEndAt).toLocaleDateString()}
                        </p>
                      )}
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* Historical Votes */}
          <div>
            <h2 className="text-headline-md text-on-surface mb-4">Historical Votes</h2>
            {historicalVotes.length === 0 ? (
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-8 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-[32px]">
                  history
                </span>
                <p className="text-label-md text-on-surface-variant mt-2">
                  You haven't voted on any milestones yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {historicalVotes.map((vote: { id: string; choice: string; weight: { toString: () => string }; votedAt: Date; milestone: { title: string; status: string; passed: boolean | null; weightYes: { toString: () => string }; weightNo: { toString: () => string }; project: { slug: string; title: string; totalRaised: { toString: () => string } } } }) => {
                  const milestone = vote.milestone
                  const totalRaised = parseFloat(milestone.project.totalRaised.toString())
                  const weightYes = parseFloat(milestone.weightYes.toString())
                  const weightNo = parseFloat(milestone.weightNo.toString())

                  return (
                    <a
                      key={vote.id}
                      href={`/projects/${milestone.project.slug}`}
                      className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-label-md text-on-surface">
                          {milestone.project.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            status={vote.choice === 'YES' ? 'completed' : 'failed'}
                            label={`Voted ${vote.choice}`}
                          />
                          {milestoneStatusBadge(milestone.status, milestone.passed)}
                        </div>
                      </div>
                      <p className="text-label-sm text-on-surface-variant mb-3">
                        {milestone.title}
                      </p>
                      {totalRaised > 0 && milestone.status !== 'VOTING' && (
                        <div className="mb-3">
                          <Progress
                            value={
                              weightYes + weightNo > 0
                                ? (weightYes / (weightYes + weightNo)) * 100
                                : 0
                            }
                          />
                          <div className="flex justify-between text-label-sm mt-1">
                            <span className="text-tertiary">
                              YES {formatUsd(weightYes)}
                            </span>
                            <span className="text-error">
                              NO {formatUsd(weightNo)}
                            </span>
                          </div>
                          {milestone.passed !== null && (
                            <p className="text-label-sm text-on-surface-variant mt-1">
                              Outcome: {milestone.passed ? 'Passed' : 'Failed'}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-label-sm text-on-surface-variant">
                        Voted on {new Date(vote.votedAt).toLocaleDateString()} with{' '}
                        {formatUsd(parseFloat(vote.weight.toString()))}
                      </p>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  )
}
