import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'
import { SettingsClient } from './settings-client'

export const metadata: Metadata = {
  title: 'Settings — Ember',
}

export default async function SettingsPage() {
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  const [user, wallets, preferences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.wallet.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        address: true,
        isPrimary: true,
        verifiedAt: true,
      },
    }),
    prisma.emailPreference.findMany({
      where: { userId: session.user.id },
      select: {
        template: true,
        unsubscribed: true,
      },
    }),
  ])

  if (!user) {
    redirect('/auth/sign-in')
  }

  const preferenceMap = preferences.reduce<Record<string, boolean>>(
    (acc, p) => {
      acc[p.template] = p.unsubscribed
      return acc
    },
    {},
  )

  return (
    <section className="bg-background py-12">
      <Container>
        <h1 className="text-headline-lg text-on-surface mb-8">Settings</h1>

        <SettingsClient
          user={{
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          }}
          wallets={wallets.map((w) => ({
            id: w.id,
            address: w.address,
            isPrimary: w.isPrimary,
            verifiedAt: w.verifiedAt.toISOString(),
          }))}
          emailPreferences={preferenceMap}
        />
      </Container>
    </section>
  )
}
