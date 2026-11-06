import { ERROR_CODES, type ErrorCode } from '@/shared/errors/error-codes';

/**
 * Base class for every expected error. `message` is always safe to show to users; anything
 * internal stays in logs. `details` must never echo user input values.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? ERROR_CODES[code].defaultMessage);
    this.name = new.target.name;
    this.code = code;
    this.status = ERROR_CODES[code].status;
    this.details = details;
  }
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends AppError {
  constructor(details: ValidationIssue[], message?: string) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class InvalidJsonError extends AppError {
  constructor(message?: string) {
    super('INVALID_JSON', message);
  }
}

export class IdempotencyKeyRequiredError extends AppError {
  constructor(message?: string) {
    super('IDEMPOTENCY_KEY_REQUIRED', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super('UNAUTHENTICATED', message);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS');
  }
}

export class ForbiddenError extends AppError {
  constructor(message?: string) {
    super('FORBIDDEN', message);
  }
}

export class CsrfRejectedError extends AppError {
  constructor() {
    super('CSRF_REJECTED');
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string) {
    super('NOT_FOUND', message);
  }
}

export interface InvalidTransitionDetails {
  from: string;
  to: string;
  actor: string;
}

export class InvalidTransitionError extends AppError {
  declare readonly details: InvalidTransitionDetails;

  constructor(details: InvalidTransitionDetails) {
    super('INVALID_TRANSITION', undefined, details);
  }
}

export class ConcurrentModificationError extends AppError {
  constructor(details?: { currentStatus?: string }) {
    super('CONCURRENT_MODIFICATION', undefined, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor() {
    super('PAYLOAD_TOO_LARGE');
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor() {
    super('UNSUPPORTED_MEDIA_TYPE');
  }
}

export class IdempotencyKeyMismatchError extends AppError {
  constructor() {
    super('IDEMPOTENCY_KEY_MISMATCH');
  }
}

export class InternalError extends AppError {
  constructor() {
    super('INTERNAL_ERROR');
  }
}
