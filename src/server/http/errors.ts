import { ZodError } from 'zod';
import { AppError } from '@/server/domain/errors';
import { toValidationIssues } from '@/server/domain/validation';
import type { Logger } from '@/server/logger';
import { ERROR_CODES } from '@/shared/errors/error-codes';
import { errorResponse } from './responses';

/**
 * Maps any thrown value to the standard error envelope. AppError -> its status, code, message and
 * details; ZodError -> 400 VALIDATION_ERROR with `[{ path, message }]`; anything else -> a generic
 * 500 while the real error and stack are logged server-side only.
 */
export function toErrorResponse(error: unknown, logger: Logger): Response {
  if (error instanceof AppError) {
    if (error.status >= 500) logger.error('request failed', { code: error.code, error });
    return errorResponse(error.status, error.code, error.message, error.details);
  }
  if (error instanceof ZodError) {
    const { status, defaultMessage } = ERROR_CODES.VALIDATION_ERROR;
    return errorResponse(status, 'VALIDATION_ERROR', defaultMessage, toValidationIssues(error));
  }
  logger.error('unexpected error', { error });
  const { status, defaultMessage } = ERROR_CODES.INTERNAL_ERROR;
  return errorResponse(status, 'INTERNAL_ERROR', defaultMessage);
}
