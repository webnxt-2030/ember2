import { Container } from '@/components/layout/container'
import { ProjectWizard } from './project-wizard'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AuthError, ForbiddenError } from '@/lib/errors'

export const metadata = { title: 'New Project — Ember' }

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  const session = await getSession()

  try {
    await assertOwnsOrg(session, orgId, prisma)
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/org/dashboard')
    throw err
  }

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface">New project</h1>
        <p className="text-body-md text-on-surface-variant mt-2">
          Fill in all four steps, then submit to save as a draft.
        </p>
        <div className="mt-8">
          <ProjectWizard orgId={orgId} />
        </div>
      </Container>
    </div>
  )
}
