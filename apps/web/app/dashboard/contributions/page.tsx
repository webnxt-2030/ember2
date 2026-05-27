import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Progress } from '@/components/ui/progress'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { Banknote } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contributions — Ember',
}

export default async function ContributionsPage() {
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  const contributions = await prisma.contribution.findMany({
    where: { backerId: session.user.id },
    orderBy: { contributedAt: 'desc' },
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
          milestones: { orderBy: { index: 'asc' }, select: { index: true, title: true, bps: true, status: true } },
        },
      },
    },
  })

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
      <section className="bg-background py-12">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-headline-lg text-on-surface">Contributions</h1>
            <a href="/dashboard" className="text-label-md text-primary hover:underline">
              &larr; Back to dashboard
            </a>
          </div>

          {contributions.length === 0 ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-8 text-center">
              <Banknote className="mx-auto text-on-surface-variant/40" size={32} />
              <p className="text-label-md text-on-surface-variant mt-2">
                No contributions yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {contributions.map((c: { id: string; amount: { toString: () => string }; m0Share: { toString: () => string }; contributedAt: Date; nftTokenId: string; project: { title: string; pictures: string[]; targetAmount: { toString: () => string }; totalRaised: { toString: () => string } } }) => {
                const amount = parseFloat(c.amount.toString())
                const m0Share = parseFloat(c.m0Share.toString())
                const remaining = amount - m0Share
                const target = parseFloat(c.project.targetAmount.toString())
                const raised = parseFloat(c.project.totalRaised.toString())
                const progress = target > 0 ? (raised / target) * 100 : 0
                const firstPicture = c.project.pictures.length > 0 ? c.project.pictures[0] : null

                return (
                  <a
                    key={c.id}
                    href={`/dashboard/contributions/${c.id}`}
                    className="flex flex-col md:flex-row gap-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 hover:shadow-sm transition-shadow"
                  >
                    {firstPicture && (
                      <div className="md:w-48 flex-shrink-0 rounded-lg overflow-hidden aspect-[16/9] bg-surface-container-high">
                        <img src={firstPicture} alt={c.project.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-headline-md text-on-surface">{c.project.title}</h2>
                        <span className="text-label-sm text-on-surface-variant">
                          {new Date(c.contributedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-body-md text-on-surface mb-3">
                        Contributed {formatUsd(amount)}
                      </p>
                      <div className="mb-3">
                        <Progress value={Math.min(progress, 100)} />
                      </div>
                      <div className="flex flex-wrap gap-4 text-label-sm text-on-surface-variant">
                        <span>M0 share: {formatUsd(m0Share)}</span>
                        <span>Remaining allocation: {formatUsd(remaining)}</span>
                        <span>NFT #{c.nftTokenId}</span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </Container>
      </section>
    </>
  )
}
