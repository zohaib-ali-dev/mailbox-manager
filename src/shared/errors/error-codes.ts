/**
 * Error code registry shared by the server (to build responses) and the browser (to branch on
 * codes). Messages are safe to show to users.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: {
    status: 400,
    defaultMessage: 'Some fields are invalid. Check them and try again.',
  },
  INVALID_JSON: { status: 400, defaultMessage: 'The request body must be a valid JSON object.' },
  IDEMPOTENCY_KEY_REQUIRED: {
    status: 400,
    defaultMessage:
      'An Idempotency-Key header of 8 to 128 letters, digits, "-" or "_" is required.',
  },
  UNAUTHENTICATED: { status: 401, defaultMessage: 'Please sign in to continue.' },
  INVALID_CREDENTIALS: { status: 401, defaultMessage: 'Incorrect email or password.' },
  FORBIDDEN: { status: 403, defaultMessage: 'You do not have permission to do that.' },
  CSRF_REJECTED: { status: 403, defaultMessage: 'This request came from an unexpected origin.' },
  NOT_FOUND: { status: 404, defaultMessage: 'We could not find what you were looking for.' },
  INVALID_TRANSITION: {
    status: 409,
    defaultMessage: 'This order cannot move to that status from its current status.',
  },
  CONCURRENT_MODIFICATION: {
    status: 409,
    defaultMessage: 'This order was changed by someone else. Refresh and try again.',
  },
  PAYLOAD_TOO_LARGE: { status: 413, defaultMessage: 'The request body is too large.' },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    defaultMessage: 'Send the request body as JSON (Content-Type: application/json).',
  },
  IDEMPOTENCY_KEY_MISMATCH: {
    status: 422,
    defaultMessage: 'This Idempotency-Key was already used with a different order.',
  },
  INTERNAL_ERROR: {
    status: 500,
    defaultMessage: 'Something went wrong on our side. Please try again.',
  },
} as const satisfies Record<string, { status: number; defaultMessage: string }>;

export type ErrorCode = keyof typeof ERROR_CODES;

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_CODES, value);
}
