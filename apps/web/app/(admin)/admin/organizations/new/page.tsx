import { Container } from '@/components/layout/container'
import { CreateOrgForm } from './create-org-form'

export const metadata = { title: 'New Organization — Admin' }

export default function NewOrganizationPage() {
  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface">Create organization</h1>
        <p className="text-body-md text-on-surface-variant mt-2">
          Assign at least one owner. Owners must already have Ember accounts.
        </p>
        <div className="mt-8 max-w-xl">
          <CreateOrgForm />
        </div>
      </Container>
    </div>
  )
}
