import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError, ValidationError } from './errors'

function requestId(): string {
  return crypto.randomUUID()
}

export function errorResponse(
  err: unknown,
  req?: { url?: string },
): NextResponse {
  const rid = requestId()

  if (err instanceof ValidationError) {
    return NextResponse.json(
      {
        type: 'https://ember.app/errors/validation-error',
        title: 'Validation Failed',
        status: 422,
        detail: err.detail ?? err.message,
        instance: req?.url,
        requestId: rid,
        issues: err.issues,
      },
      {
        status: 422,
        headers: { 'Content-Type': 'application/problem+json' },
      },
    )
  }

  if (err instanceof AppError) {
    return NextResponse.json(
      {
        type: `https://ember.app/errors/${err.code.toLowerCase().replace(/_/g, '-')}`,
        title: err.message,
        status: err.statusCode,
        detail: err.detail,
        instance: req?.url,
        requestId: rid,
      },
      {
        status: err.statusCode,
        headers: { 'Content-Type': 'application/problem+json' },
      },
    )
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        type: 'https://ember.app/errors/validation-error',
        title: 'Validation Failed',
        status: 422,
        detail: 'Request body failed validation',
        instance: req?.url,
        requestId: rid,
        issues: err.issues,
      },
      {
        status: 422,
        headers: { 'Content-Type': 'application/problem+json' },
      },
    )
  }

  // Unknown error — log server-side, return generic 500
  console.error('[api] Unhandled error', { requestId: rid, err })
  return NextResponse.json(
    {
      type: 'https://ember.app/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      instance: req?.url,
      requestId: rid,
    },
    {
      status: 500,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  )
}

export function okResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}
