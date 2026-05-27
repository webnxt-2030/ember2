import { Container } from '@/components/layout/container'
import { ProjectCard } from '@/components/projects/project-card'
import { listLiveProjects } from '@/lib/db/projects'
import { Rocket } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Projects — Ember',
  description: 'Browse and back live crowdfunding projects on Ember.',
}

export default async function ProjectsPage() {
  const { projects } = await listLiveProjects({ page: 1, pageSize: 12 })

  return (
    <>
      <section className="bg-background py-16">
        <Container>
          <h1 className="text-display-lg text-on-surface">Live Projects</h1>
          <p className="text-body-lg text-on-surface-variant mt-4 max-w-2xl">
            Browse projects raising funds on Ember. Each project is backed by
            escrow smart contracts on Morph L2, ensuring funds only release when
            milestones are verified.
          </p>
        </Container>
      </section>

      <section className="bg-surface-container-low py-16">
        <Container>
          {projects.length === 0 ? (
            <div className="text-center py-16">
              <Rocket className="mx-auto text-on-surface-variant/30" size={64} />
              <h2 className="text-headline-md text-on-surface-variant mt-4">
                No live projects yet
              </h2>
              <p className="text-body-md text-on-surface-variant mt-2">
                Check back soon or submit your own project.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: { id: string; slug: string; title: string; summary: string; pictures: string[]; targetAmount: { toString: () => string }; totalRaised: { toString: () => string }; status: string }) => (
                <ProjectCard
                  key={project.id}
                  slug={project.slug}
                  title={project.title}
                  summary={project.summary}
                  pictures={project.pictures}
                  targetAmount={project.targetAmount.toString()}
                  totalRaised={project.totalRaised.toString()}
                  status={project.status as 'LIVE' | 'COMPLETED' | 'PAUSED'}
                />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  )
}
