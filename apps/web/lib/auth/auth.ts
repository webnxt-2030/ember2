import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [nextCookies()],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24, // rotate after 1 day of activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    },
  },
  emailAndPassword: {
    enabled: true,
    // Credentials sign-in is restricted to SUPER_ADMIN in the sign-in handler
    // Better Auth handles the credential check; role guard is in the API route
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'BACKER',
        input: false, // not user-settable via API
      },
      passwordHash: {
        type: 'string',
        returned: false, // never return in API responses
        input: false,
        required: false,
      },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
})
