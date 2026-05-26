import type { InferClientAPI } from 'better-auth/types'
import { createAuthClient } from 'better-auth/react'

type AuthClient = InferClientAPI<{ baseURL: string }>

export const authClient: AuthClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
})
