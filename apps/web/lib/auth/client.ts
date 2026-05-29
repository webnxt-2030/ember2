import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from './auth'

// inferAdditionalFields<typeof auth> surfaces server-defined custom user fields
// (e.g. `role`) on the client session type. The import is type-only, so the
// server module is never bundled into client code.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  plugins: [inferAdditionalFields<typeof auth>()],
})
