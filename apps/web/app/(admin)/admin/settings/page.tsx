import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { assertRole } from '@/lib/auth/permissions'
import { AuthError, ForbiddenError } from '@/lib/errors'
import { Container } from '@/components/layout/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Settings — Admin' }
export const runtime = 'nodejs'

export default async function AdminSettingsPage() {
  const session = await getSession()
  try {
    assertRole(session, 'SUPER_ADMIN')
  } catch (err) {
    if (err instanceof AuthError) redirect('/auth/sign-in')
    if (err instanceof ForbiddenError) redirect('/')
    throw err
  }

  const settings = [
    { label: 'Factory Contract', value: process.env.NEXT_PUBLIC_PROJECT_FACTORY_ADDRESS ?? '—' },
    { label: 'USDT Contract', value: process.env.NEXT_PUBLIC_USDT_ADDRESS ?? '—' },
    { label: 'Morph Explorer', value: process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL ?? '—' },
    { label: 'Resend Webhook Secret', value: process.env.RESEND_WEBHOOK_SECRET ? '••••••••' : '—' },
    { label: 'Redis URL', value: process.env.REDIS_URL ? '••••••••' : '—' },
    { label: 'Database URL', value: process.env.DATABASE_URL ? '••••••••' : '—' },
  ]

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-headline-lg text-on-surface font-bold mb-8">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Platform Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-outline-variant">
              {settings.map((s) => (
                <div key={s.label} className="flex justify-between py-4">
                  <span className="text-label-md text-on-surface font-medium">{s.label}</span>
                  <span className="text-label-md text-on-surface-variant font-mono">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}
