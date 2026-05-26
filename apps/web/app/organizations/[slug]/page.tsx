import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'

interface OrgPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: OrgPageProps): Promise<Metadata> {
  const { slug } = await params
  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) return { title: 'Organization — Ember' }
  return { title: `${org.title} — Ember` }
}

export default async function OrganizationPage({ params }: OrgPageProps) {
  const { slug } = await params

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      projects: {
        where: { status: 'LIVE' },
        orderBy: { publishedAt: 'desc' },
        include: {
          _count: { select: { contributions: { distinct: ['walletAddress'] } } },
        },
      },
    },
  })

  if (!org) {
    notFound()
  }

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
      <section className="bg-background py-12">
        <Container>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {org.logoUrl && (
              <div className="w-20 h-20 rounded-full overflow-hidden border border-outline-variant bg-surface-container-high flex-shrink-0">
                <img src={org.logoUrl} alt={org.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-headline-lg text-on-surface">{org.title}</h1>
                {org.verifiedStatus === 'VERIFIED' && (
                  <Badge status="completed" label="Verified" />
                )}
              </div>
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-label-md text-primary hover:underline mb-2 inline-block"
                >
                  {org.website}
                </a>
              )}
              {org.description && (
                <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
                  {org.description}
                </p>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-background pb-16">
        <Container>
          <h2 className="text-headline-md text-on-surface mb-6">Projects</h2>

          {org.projects.length === 0 ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-8 text-center">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-[32px]">
                folder_open
              </span>
              <p className="text-label-md text-on-surface-variant mt-2">
                No live projects yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {org.projects.map((project: { id: string; slug: string; title: string; summary: string; pictures: string[]; targetAmount: { toString: () => string }; totalRaised: { toString: () => string }; _count: { contributions: number } }) => {
                const target = parseFloat(project.targetAmount.toString())
                const raised = parseFloat(project.totalRaised.toString())
                const progress = target > 0 ? (raised / target) * 100 : 0
                const backerCount = project._count.contributions
                const firstPicture = project.pictures.length > 0 ? project.pictures[0] : null

                return (
                  <a
                    key={project.id}
                    href={`/projects/${project.slug}`}
                    className="group block rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden hover:shadow-sm transition-shadow"
                  >
                    {firstPicture && (
                      <div className="aspect-[16/9] bg-surface-container-high overflow-hidden">
                        <img
                          src={firstPicture}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-headline-md text-on-surface mb-1 line-clamp-2">
                        {project.title}
                      </h3>
                      <p className="text-body-md text-on-surface-variant line-clamp-2 mb-4">
                        {project.summary}
                      </p>
                      <div className="mb-3">
                        <Progress value={Math.min(progress, 100)} />
                      </div>
                      <div className="flex justify-between items-center text-label-sm text-on-surface-variant">
                        <span>{formatUsd(raised)} raised</span>
                        <span>{backerCount} {backerCount === 1 ? 'backer' : 'backers'}</span>
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
