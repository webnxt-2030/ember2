import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getStorageDriver } from '@/lib/storage'
import { Readable } from 'node:stream'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params

  // Block path traversal
  if (segments.some((s) => s === '..' || s === '.')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const key = segments.join('/')
  const storage = getStorageDriver()
  const result = await storage.get(key)

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const webStream = Readable.toWeb(result.stream) as ReadableStream<Uint8Array>

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': result.mimeType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
