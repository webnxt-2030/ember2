import { notFound, redirect } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Progress } from '@/components/ui/progress'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'

interface ContributionDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ContributionDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const contribution = await prisma.contribution.findUnique({ where: { id } })
  if (!contribution) return { title: 'Contribution — Ember' }
  return { title: `Position #${contribution.nftTokenId} — Ember` }
}

export default async function ContributionDetailPage({ params }: ContributionDetailPageProps) {
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  const { id } = await params

  const wallets = await prisma.wallet.findMany({
    where: { userId: session.user.id },
    select: { address: true },
  })
  const walletAddresses = wallets.map((w) => w.address.toLowerCase())

  const where =
    walletAddresses.length > 0
      ? { id, OR: [{ backerId: session.user.id }, { walletAddress: { in: walletAddresses } }] }
      : { id, backerId: session.user.id }

  const contribution = await prisma.contribution.findFirst({
    where,
    include: {
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          pictures: true,
          targetAmount: true,
          totalRaised: true,
          escrowAddress: true,
          nftAddress: true,
          milestoneBps: true,
          milestones: { orderBy: { index: 'asc' } },
        },
      },
    },
  })

  if (!contribution) {
    notFound()
  }

  const amount = parseFloat(contribution.amount.toString())
  const m0Share = parseFloat(contribution.m0Share.toString())
  const remaining = amount - m0Share
  const target = parseFloat(contribution.project.targetAmount.toString())
  const raised = parseFloat(contribution.project.totalRaised.toString())
  const progress = target > 0 ? (raised / target) * 100 : 0
  const firstPicture = contribution.project.pictures.length > 0 ? contribution.project.pictures[0] : null

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const formatBasisPoints = (bps: number) => ((bps / 10000) * 100).toFixed(2) + '%'

  return (
    <>
      <section className="bg-background py-12">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-6">
            <a href="/dashboard/contributions" className="text-label-md text-primary hover:underline">
              &larr; Back to contributions
            </a>
          </nav>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 min-w-0">
              {firstPicture && (
                <div className="rounded-lg overflow-hidden mb-6 aspect-[16/9] bg-surface-container-high">
                  <img src={firstPicture} alt={contribution.project.title} className="w-full h-full object-cover" />
                </div>
              )}

              <h1 className="text-headline-lg text-on-surface mb-2">
                {contribution.project.title}
              </h1>
              <p className="text-body-md text-on-surface-variant mb-6">
                Position #{contribution.nftTokenId}
              </p>

              <div className="mb-6">
                <Progress value={Math.min(progress, 100)} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <p className="text-label-sm text-on-surface-variant mb-1">Total Contributed</p>
                  <p className="text-headline-md text-on-surface">{formatUsd(amount)}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <p className="text-label-sm text-on-surface-variant mb-1">M0 Share</p>
                  <p className="text-headline-md text-on-surface">{formatUsd(m0Share)}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <p className="text-label-sm text-on-surface-variant mb-1">Allocated Remaining</p>
                  <p className="text-headline-md text-on-surface">{formatUsd(remaining)}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <p className="text-label-sm text-on-surface-variant mb-1">Contributed At</p>
                  <p className="text-headline-md text-on-surface">
                    {new Date(contribution.contributedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <h2 className="text-headline-md text-on-surface mb-4">Allocation Breakdown</h2>
              <div className="space-y-3">
                {contribution.project.milestones.map((m: { index: number; title: string; bps: number; status: string; claimedAt: Date | null }) => {
                  const milestoneAmount = (amount * m.bps) / 10000
                  return (
                    <div
                      key={m.index}
                      className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                    >
                      <div>
                        <p className="text-label-md text-on-surface">{m.title}</p>
                        <p className="text-label-sm text-on-surface-variant">
                          {formatBasisPoints(m.bps)} · {m.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-label-md text-on-surface">{formatUsd(milestoneAmount)}</p>
                        {m.claimedAt && (
                          <p className="text-label-sm text-tertiary">Claimed</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="md:w-[340px] flex-shrink-0 space-y-6">
              <div className="rounded-xl border border-outline-variant bg-surface p-6">
                <h3 className="text-label-md text-on-surface mb-4">Position Details</h3>
                <div className="space-y-3 text-label-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Contract</span>
                    <a
                      href={`${String(process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL)}/address/${contribution.nftContract}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-primary hover:underline"
                    >
                      {contribution.nftContract.slice(0, 6)}...{contribution.nftContract.slice(-4)}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Token ID</span>
                    <span className="font-mono text-on-surface">{contribution.nftTokenId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Transaction</span>
                    <a
                      href={`${String(process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL)}/tx/${contribution.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-primary hover:underline"
                    >
                      {contribution.txHash.slice(0, 6)}...{contribution.txHash.slice(-4)}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Block</span>
                    <span className="font-mono text-on-surface">{contribution.blockNumber.toString()}</span>
                  </div>
                </div>
              </div>

              <a
                href={`/projects/${contribution.project.slug}`}
                className="block w-full rounded-xl bg-primary text-on-primary text-center px-6 py-3 text-label-md hover:bg-surface-tint transition-colors"
              >
                View Project
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
