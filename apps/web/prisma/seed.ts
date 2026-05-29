import 'dotenv/config'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
})

async function createUser(email: string, password: string, name: string, role: UserRole) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.user.delete({ where: { email } })
    console.log(`[seed] Removed existing user ${email}`)
  }

  await auth.api.signUpEmail({ body: { email, password, name } })
  await prisma.user.update({
    where: { email },
    data: { role, emailVerified: true },
  })

  console.log(`[seed] Created ${role}: ${email}`)
}

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD must be set')
  }

  // 1. Super Admin
  await createUser(email, password, 'Super Admin', UserRole.SUPER_ADMIN)

  // 2. Org Owner
  const orgOwnerEmail = 'owner@ember.example'
  await createUser(orgOwnerEmail, password, 'Org Owner', UserRole.ORG_OWNER)

  const orgOwner = await prisma.user.findUnique({ where: { email: orgOwnerEmail } })
  if (!orgOwner) throw new Error('Org owner not found after creation')

  // Create demo organization
  const existingOrg = await prisma.organization.findUnique({ where: { slug: 'demo-org' } })
  if (existingOrg) {
    await prisma.organization.delete({ where: { slug: 'demo-org' } })
    console.log('[seed] Removed existing organization demo-org')
  }

  const org = await prisma.organization.create({
    data: {
      slug: 'demo-org',
      title: 'Demo Organization',
      description: 'A demo organization for local development.',
      receivingWallet: '0xb048739bc01b1a582F63c380d5507324880bf116',
      verifiedStatus: 'VERIFIED',
      verifiedAt: new Date(),
      members: {
        create: {
          userId: orgOwner.id,
          role: 'OWNER',
        },
      },
    },
  })
  console.log(`[seed] Created organization: ${org.title} (${org.slug})`)

  // 3. Backer
  await createUser('backer@ember.example', password, 'Backer', UserRole.BACKER)

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[seed] Password for all accounts: ${password}`)
    console.log('[seed] Change passwords on first login.')
  }
}

main()
  .catch((err: unknown) => {
    console.error('[seed] Failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
