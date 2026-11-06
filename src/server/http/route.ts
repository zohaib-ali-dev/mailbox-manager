import { env } from '@/server/config/env';
import { createLogger } from '@/server/logger';
import { toErrorResponse } from './errors';

const httpLogger = createLogger({ level: env.LOG_LEVEL, base: { component: 'http' } });

/**
 * Wraps a route handler: every thrown error becomes the standard envelope, so handlers stay
 * guard -> parse -> one service call -> respond, without their own try/catch.
 */
export function route<Context = unknown>(
  handler: (request: Request, context: Context) => Promise<Response>,
): (request: Request, context: Context) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(
        error,
        httpLogger.child({ method: request.method, path: new URL(request.url).pathname }),
      );
    }
  };
}
