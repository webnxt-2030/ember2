import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { OrgSettingsForm } from './org-settings-form'
import Link from 'next/link'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { title: true } })
  return { title: org ? `Settings — ${org.title}` : 'Org Settings' }
}

export default async function OrgSettingsPage({
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

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      title: true,
      description: true,
      logoUrl: true,
      website: true,
      receivingWallet: true,
      verifiedStatus: true,
    },
  })
  if (!org) notFound()

  return (
    <div className="py-8">
      <Container>
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            href={`/org/dashboard/${orgId}`}
            className="text-label-md text-primary hover:underline"
          >
            &larr; Back to {org.title}
          </Link>
        </nav>

        <h1 className="text-headline-lg text-on-surface">Organization settings</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Update your organization profile. Changing the receiving wallet will reset your
          verification status to Pending and require re-review by a Super Admin.
        </p>

        <div className="mt-8 max-w-xl">
          <OrgSettingsForm
            orgId={org.id}
            initialTitle={org.title}
            initialDescription={org.description}
            initialLogoUrl={org.logoUrl ?? ''}
            initialWebsite={org.website ?? ''}
            initialReceivingWallet={org.receivingWallet}
            verifiedStatus={org.verifiedStatus}
          />
        </div>
      </Container>
    </div>
  )
}
