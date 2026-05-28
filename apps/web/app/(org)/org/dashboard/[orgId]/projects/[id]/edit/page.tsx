import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { EditProjectForm } from './edit-project-form'

export default async function EditProjectPage({
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
    include: { milestones: { orderBy: { index: 'asc' } } },
  })
  if (!project) notFound()

  if (project.status !== 'DRAFT') {
    redirect(`/org/dashboard/${orgId}/projects/${id}`)
  }

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface mb-8">Edit project</h1>
        <EditProjectForm
          orgId={orgId}
          projectId={id}
          initialTitle={project.title}
          initialSlug={project.slug}
          initialSummary={project.summary}
          initialDescription={project.description}
          initialPictures={project.pictures}
          initialSocialLinks={project.socialLinks as Record<string, string>}
          initialBackingLinks={project.backingLinks}
          initialTargetAmount={project.targetAmount.toString()}
          initialFundingDeadline={project.fundingDeadline?.toISOString().slice(0, 16) ?? ''}
          initialVotingPeriodDays={project.votingPeriodDays}
          initialMilestones={project.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            deliverableDate: m.deliverableDate?.toISOString().slice(0, 10) ?? '',
          }))}
        />
      </Container>
    </div>
  )
}
