import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Vote, History } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Ember',
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  const userId = session.user.id

  const [contributionsAgg, activeVotes, recentActivity] = await Promise.all([
    prisma.contribution.aggregate({
      where: { backerId: userId },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.milestone.findMany({
      where: {
        status: 'VOTING',
        project: { contributions: { some: { backerId: userId } } },
      },
      include: {
        project: { select: { slug: true, title: true } },
        votes: { where: { walletAddress: { in: [] } } }, // placeholder; we filter client-side or via subquery
      },
      orderBy: { voteEndAt: 'asc' },
      take: 5,
    }),
    prisma.contribution.findMany({
      where: { backerId: userId },
      orderBy: { contributedAt: 'desc' },
      take: 5,
      include: { project: { select: { slug: true, title: true } } },
    }),
  ])

  const totalContributed = parseFloat(contributionsAgg._sum.amount?.toString() ?? '0')
  const positionsCount = contributionsAgg._count.id

  // Fetch user's wallets to check which active votes they've already cast
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    select: { address: true },
  })
  const walletAddresses = wallets.map((w: { address: string }) => w.address.toLowerCase())

  const activeVotesWithStatus = await Promise.all(
    activeVotes.map(async (milestone: { id: string; title: string; voteEndAt: Date | null; project: { slug: string; title: string } }) => {
      const hasVoted = await prisma.milestoneVote.findFirst({
        where: {
          milestoneId: milestone.id,
          walletAddress: { in: walletAddresses },
        },
      })
      return {
        ...milestone,
        hasVoted: !!hasVoted,
      }
    }),
  )

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
      <section className="bg-background py-12">
        <Container>
          <h1 className="text-headline-lg text-on-surface mb-8">Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <p className="text-label-sm text-on-surface-variant mb-1">Total Contributed</p>
              <p className="text-display-lg text-on-surface">{formatUsd(totalContributed)}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <p className="text-label-sm text-on-surface-variant mb-1">Positions</p>
              <p className="text-display-lg text-on-surface">{positionsCount}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <p className="text-label-sm text-on-surface-variant mb-1">Active Votes</p>
              <p className="text-display-lg text-on-surface">{activeVotesWithStatus.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-headline-md text-on-surface">Active Votes</h2>
                <a href="/dashboard/votes" className="text-label-md text-primary hover:underline">
                  View all
                </a>
              </div>
              {activeVotesWithStatus.length === 0 ? (
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6 text-center">
                  <Vote className="mx-auto text-on-surface-variant/40" size={32} />
                  <p className="text-label-md text-on-surface-variant mt-2">No active votes.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeVotesWithStatus.map((vote: { id: string; project: { slug: string; title: string }; title: string; voteEndAt: Date | null; hasVoted: boolean }) => (
                    <a
                      key={vote.id}
                      href={`/projects/${vote.project.slug}`}
                      className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-label-md text-on-surface">{vote.project.title}</span>
                        {vote.hasVoted ? (
                          <Badge status="completed" label="Voted" />
                        ) : (
                          <Badge status="active" label="Vote open" />
                        )}
                      </div>
                      <p className="text-label-sm text-on-surface-variant mb-2">{vote.title}</p>
                      {vote.voteEndAt && (
                        <p className="text-label-sm text-on-surface-variant">
                          Ends {new Date(vote.voteEndAt).toLocaleDateString()}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-headline-md text-on-surface">Recent Activity</h2>
                <a href="/dashboard/contributions" className="text-label-md text-primary hover:underline">
                  View all
                </a>
              </div>
              {recentActivity.length === 0 ? (
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6 text-center">
                  <History className="mx-auto text-on-surface-variant/40" size={32} />
                  <p className="text-label-md text-on-surface-variant mt-2">No activity yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity: { id: string; amount: { toString: () => string }; contributedAt: Date; project: { title: string } }) => (
                    <a
                      key={activity.id}
                      href={`/dashboard/contributions/${activity.id}`}
                      className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-label-md text-on-surface">
                          Contributed {formatUsd(parseFloat(activity.amount.toString()))}
                        </span>
                        <span className="text-label-sm text-on-surface-variant">
                          {new Date(activity.contributedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-label-sm text-on-surface-variant">{activity.project.title}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
