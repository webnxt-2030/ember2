import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const MORPH_RPC = process.env.NEXT_PUBLIC_MORPH_RPC_URL ?? 'https://rpc.morphl2.io'

// Content Security Policy
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",         // Tailwind injects styles inline
  "img-src 'self' data: blob: https:",         // wallets show remote logos
  "font-src 'self'",
  `connect-src 'self' ${MORPH_RPC} wss://${MORPH_RPC.replace('https://', '')} https://rpc-holesky.morphl2.io wss://relay.walletconnect.com https://relay.walletconnect.com https://api.web3modal.com https://pulse.walletconnect.org wss://www.walletlink.org`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('Content-Security-Policy', CSP)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0')   // disabled — CSP handles this
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
