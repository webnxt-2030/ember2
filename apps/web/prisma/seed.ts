import 'dotenv/config'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma 7 requires a driver adapter (same setup as lib/db).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Minimal Better Auth instance for seeding. Creating the admin through Better Auth
// stores the credential in the Account table with Better Auth's own password hashing,
// so the app's email sign-in (POST /api/auth/sign-in/email) will accept it. Writing
// User.passwordHash directly (the old approach) does not work — Better Auth never reads it.
const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
})

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD must be set')
  }

  // Recreate from scratch so the user always has a valid Better Auth credential.
  // Deleting the user cascades to its Account/Session rows (onDelete: Cascade).
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.user.delete({ where: { email } })
    console.log(`[seed] Removed existing user ${email} to recreate with a credential`)
  }

  await auth.api.signUpEmail({ body: { email, password, name: 'Super Admin' } })

  // signUpEmail creates the user with the default role; promote to SUPER_ADMIN.
  await prisma.user.update({
    where: { email },
    data: { role: UserRole.SUPER_ADMIN, emailVerified: true },
  })

  console.log(`[seed] Created super admin: ${email}`)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[seed] Password: ${password}`)
    console.log('[seed] Change the password on first login.')
  }
}

main()
  .catch((err: unknown) => {
    console.error('[seed] Failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
