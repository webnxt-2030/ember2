import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

// Must be Node.js runtime: ioredis depends on Node.js net/tls (not available in Edge runtime)
export const runtime = 'nodejs'

const MORPH_RPC = process.env.NEXT_PUBLIC_MORPH_RPC_URL ?? 'https://rpc-hoodi.morph.network'

// Content Security Policy. Next injects inline bootstrap/hydration <script> tags, so a
// strict script-src must allow them: in production via a per-request nonce (Next applies
// it to its scripts automatically when the CSP is on the request headers); in dev we relax
// to 'unsafe-inline'/'unsafe-eval' because Turbopack HMR uses inline scripts and eval.
function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind inline + Material Symbols
    "img-src 'self' data: blob: https:", // wallets show remote logos
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${MORPH_RPC} wss://${MORPH_RPC.replace('https://', '')} https://rpc-hoodi.morph.network wss://relay.walletconnect.com https://relay.walletconnect.com https://api.web3modal.com https://api.web3modal.org https://explorer-api.walletconnect.com https://pulse.walletconnect.org https://*.reown.com wss://www.walletlink.org`,
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com", // demo video embed
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
}

function getRateLimitConfig(
  req: NextRequest,
): { limit: number; windowMs: number; bucket: string } | null {
  const { pathname } = req.nextUrl
  const method = req.method

  // Indexer webhook bypass — must match server-only INDEXER_API_KEY
  const apiKey = req.headers.get('x-api-key')
  if (apiKey && apiKey === process.env.INDEXER_API_KEY) return null

  if (pathname.startsWith('/api/upload')) {
    return { limit: 10, windowMs: 60_000, bucket: 'upload' }
  }
  if (pathname.startsWith('/api/auth')) {
    // Session reads happen on every page load (useSession) and aren't a
    // brute-force target — keep them on a generous bucket. The strict 5/min
    // limit is reserved for sign-in/sign-up/callback/credential attempts.
    if (pathname.startsWith('/api/auth/get-session')) {
      return { limit: 60, windowMs: 60_000, bucket: 'auth-session' }
    }
    return { limit: 10, windowMs: 60_000, bucket: 'auth' }
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && pathname.startsWith('/api/')) {
    return { limit: 10, windowMs: 60_000, bucket: 'write' }
  }
  if (pathname.startsWith('/api/')) {
    return { limit: 60, windowMs: 60_000, bucket: 'api' }
  }

  return null
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function middleware(req: NextRequest) {
  // 1. Rate limiting
  const limitConfig = getRateLimitConfig(req)
  if (limitConfig) {
    const ip = getClientIp(req)
    const key = `ratelimit:${limitConfig.bucket}:${ip}`
    const result = await rateLimit(key, limitConfig.limit, limitConfig.windowMs)
    if (!result.success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset),
        },
      })
    }
  }

  // 2. Security headers — per-request CSP nonce (Next reads it from the request headers
  //    and applies it to its own inline scripts).
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce, process.env.NODE_ENV !== 'production')

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0')  // disabled — CSP handles this
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  )
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
