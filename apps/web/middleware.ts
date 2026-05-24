import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const MORPH_RPC = process.env.NEXT_PUBLIC_MORPH_RPC_URL ?? 'https://rpc.morphl2.io'

// Content Security Policy
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",        // Tailwind injects styles inline
  "img-src 'self' data: blob: https:",        // wallets show remote logos
  "font-src 'self'",
  `connect-src 'self' ${MORPH_RPC} wss://${MORPH_RPC.replace('https://', '')} https://rpc-holesky.morphl2.io wss://relay.walletconnect.com https://relay.walletconnect.com https://api.web3modal.com https://pulse.walletconnect.org wss://www.walletlink.org`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

/**
 * Returns the rate limit config for a request, or null if no limit applies.
 * Indexer webhook requests bypass rate limiting via x-api-key header.
 */
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
    return { limit: 5, windowMs: 60_000, bucket: 'auth' }
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && pathname.startsWith('/api/')) {
    return { limit: 10, windowMs: 60_000, bucket: 'write' }
  }
  if (pathname.startsWith('/api/')) {
    return { limit: 60, windowMs: 60_000, bucket: 'api' }
  }

  // Non-API routes: no rate limiting
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

  // 2. Security headers
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', CSP)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0')  // disabled — CSP handles this
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
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
