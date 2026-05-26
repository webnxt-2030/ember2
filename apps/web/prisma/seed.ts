import { PrismaClient, UserRole } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD must be set')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`[seed] Super admin already exists (${email}) — skipping`)
    return
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

  await prisma.user.create({
    data: {
      email,
      emailVerified: true,
      role: UserRole.SUPER_ADMIN,
      passwordHash,
    },
  })

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[seed] Created super admin: ${email}`)
    console.log(`[seed] Password: ${password}`)
    console.log('[seed] Change the password on first login.')
  } else {
    console.log(`[seed] Created super admin: ${email}`)
  }
}

main()
  .catch((err: unknown) => {
    console.error('[seed] Failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
