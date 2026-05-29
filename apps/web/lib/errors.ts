export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly detail?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class AuthError extends AppError {
  constructor(detail?: string) {
    super('AUTH_REQUIRED', 'Authentication required', 401, detail)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends AppError {
  constructor(detail?: string) {
    super('FORBIDDEN', 'Access denied', 403, detail)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(
    detail: string,
    public readonly issues?: unknown[],
  ) {
    super('VALIDATION_ERROR', 'Validation failed', 422, detail)
    this.name = 'ValidationError'
  }
}

export class ConflictError extends AppError {
  constructor(detail: string) {
    super('CONFLICT', 'Resource conflict', 409, detail)
    this.name = 'ConflictError'
  }
}

export class ChainError extends AppError {
  constructor(detail: string) {
    super('CHAIN_ERROR', 'Blockchain error', 502, detail)
    this.name = 'ChainError'
  }
}
