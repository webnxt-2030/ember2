import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { ContributeStepper } from '@/components/contribute/contribute-stepper'
import { SafeMarkdown } from '@/components/safe-markdown'
import { MilestoneTimeline } from '@/components/projects/milestone-timeline'
import { Progress } from '@/components/ui/progress'
import { StatusDot } from '@/components/ui/status-dot'
import { Badge } from '@/components/ui/badge'
import { getProjectBySlug } from '@/lib/db/projects'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return { title: 'Project — Ember' }
  return { title: `${project.title} — Ember` }
}

interface ProjectMilestone {
  index: number
  title: string
  description: string
  deliverableDate: Date | null
  bps: number
  status: 'PENDING' | 'AUTO_RELEASED' | 'VOTING' | 'PASSED' | 'FAILED' | 'CLAIMED'
  voteEndAt: Date | null
  passed: boolean | null
  claimedAt: Date | null
}

interface ProjectDetail {
  id: string
  slug: string
  title: string
  summary: string
  description: string | null
  status: string
  pictures: string[]
  targetAmount: { toString: () => string }
  totalRaised: { toString: () => string }
  escrowAddress: string | null
  organization: { name: string }
  milestones: ProjectMilestone[]
  _count: { contributions: number }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params
  const project = (await getProjectBySlug(slug)) as unknown as ProjectDetail | null

  if (project?.status !== 'LIVE') {
    notFound()
  }

  const target = parseFloat(project.targetAmount.toString())
  const raised = parseFloat(project.totalRaised.toString())
  const progress = target > 0 ? (raised / target) * 100 : 0
  const isFunded = target > 0 && raised >= target
  const backerCount = project._count.contributions
  const firstPicture = project.pictures.length > 0 ? project.pictures[0] : null

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
      <section className="bg-background py-8">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-6">
            <a href="/projects" className="text-label-md text-primary hover:underline">
              &larr; Back to projects
            </a>
          </nav>
        </Container>
      </section>

      <section className="bg-background pb-16">
        <Container>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              {firstPicture && (
                <div className="rounded-lg overflow-hidden mb-8 aspect-[16/9] bg-surface-container-high">
                  <img
                    src={firstPicture}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <StatusDot status="live" />
                <span className="text-label-sm text-on-surface-variant">
                  {project.organization.name}
                </span>
                <span className="text-label-sm text-on-surface-variant">&middot;</span>
                <span className="text-label-sm text-on-surface-variant">Live</span>
                {isFunded && (
                  <Badge status="completed" label="Funded" />
                )}
              </div>

              <h1 className="text-display-lg text-on-surface">{project.title}</h1>
              <p className="text-body-lg text-on-surface-variant mt-2">{project.summary}</p>

              {project.description && (
                <div className="mt-8">
                  <SafeMarkdown content={project.description} />
                </div>
              )}

              {project.milestones.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-headline-lg text-on-surface mb-6">Milestones</h2>
                  <MilestoneTimeline
                    slug={slug}
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
                </div>
              )}
            </div>

            <div className="lg:w-[380px] flex-shrink-0">
              <div className="lg:sticky lg:top-8 space-y-6">
                <div className="rounded-lg border border-outline-variant bg-surface p-6">
                  <div className="mb-4">
                    <Progress value={Math.min(progress, 100)} />
                  </div>

                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-headline-md text-on-surface">
                      {formatUsd(raised)}
                    </span>
                    <span className="text-label-md text-on-surface-variant">
                      of {formatUsd(target)}
                    </span>
                  </div>

                  <p className="text-label-md text-on-surface-variant mb-3">
                    {backerCount} {backerCount === 1 ? 'backer' : 'backers'}
                  </p>

                  <p className="text-label-sm text-on-surface-variant">
                    {progress >= 100
                      ? 'Funded'
                      : `${progress.toFixed(1)}% funded`}
                  </p>

                  {isFunded && (
                    <div className="mt-3">
                      <Badge status="completed" label="Fully Funded" className="w-full justify-center" />
                    </div>
                  )}
                </div>

                {project.escrowAddress ? (
                  <ContributeStepper
                    escrowAddress={project.escrowAddress as `0x${string}`}
                    projectId={project.id}
                  />
                ) : (
                  <div className="rounded-lg border border-outline-variant bg-surface-container-low p-6 text-center">
                    <span className="material-symbols-outlined text-on-surface-variant/40 text-[32px]">
                      hourglass
                    </span>
                    <p className="text-label-md text-on-surface-variant mt-2">
                      Contributions coming soon
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
