import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { errorResponse } from '@/lib/api-response'
import { AppError, AuthError, ValidationError } from '@/lib/errors'
import { getStorageDriver } from '@/lib/storage'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'node:crypto'
import path from 'node:path'

export const runtime = 'nodejs'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAGIC_CHECKS: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  'image/webp': (b) =>
    b.slice(0, 4).toString('ascii') === 'RIFF' &&
    b.slice(8, 12).toString('ascii') === 'WEBP',
  'image/gif': (b) => b.slice(0, 4).toString('ascii') === 'GIF8',
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = await rateLimit(`ratelimit:upload:${ip}`, 10, 60_000)
  if (!rl.success) {
    return errorResponse(new AppError('RATE_LIMITED', 'Too Many Requests', 429), req)
  }

  const session = await getSession()
  if (!session?.user) {
    return errorResponse(new AuthError(), req)
  }

  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 5_242_880)

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return errorResponse(new ValidationError('Expected multipart/form-data'), req)
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return errorResponse(new ValidationError('Missing file field'), req)
  }

  const mimeType = file.type
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return errorResponse(
      new ValidationError(
        `Unsupported file type "${mimeType}". Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      ),
      req,
    )
  }

  if (file.size > maxBytes) {
    return errorResponse(
      new ValidationError(
        `File exceeds maximum size of ${Math.round(maxBytes / 1024 / 1024)} MB`,
      ),
      req,
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const magicCheck = MAGIC_CHECKS[mimeType]
  if (!magicCheck || !magicCheck(buffer)) {
    return errorResponse(
      new ValidationError(`File content does not match declared type "${mimeType}"`),
      req,
    )
  }

  const ext = MIME_TO_EXT[mimeType] ?? 'bin'
  const key = path.posix.join(
    'uploads',
    session.user.id,
    `${crypto.randomUUID()}.${ext}`,
  )

  const storage = getStorageDriver()
  await storage.put(key, buffer, mimeType)

  return NextResponse.json({ url: `/api/files/${key}` }, { status: 201 })
}
