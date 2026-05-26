import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { prisma } from '@/lib/db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.email) {
            await prisma.$transaction(async (tx) => {
              await tx.emailNotification.create({
                data: {
                  to: user.email,
                  template: 'WELCOME',
                  payload: {
                    name: user.name ?? user.email,
                  },
                  status: 'QUEUED',
                },
              })
              await tx.inAppNotification.create({
                data: {
                  userId: user.id,
                  type: 'WELCOME',
                  title: 'Welcome to Ember',
                  message: 'Your account is ready. Start backing projects on Ember.',
                  linkUrl: '/projects',
                },
              })
            })
          }
        },
      },
    },
  },
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
