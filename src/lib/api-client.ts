import type { ErrorCode } from '@/shared/errors/error-codes';
import type { PageMeta } from '@/shared/types/order.dto';

/**
 * Browser fetch wrapper for the JSON API. Parses the `{ data, meta }` and `{ error }` envelopes and
 * throws a typed ApiError, so components branch on `code` instead of parsing responses themselves.
 */

export interface ApiFieldIssue {
  path: string;
  message: string;
}

/** A failed API call. `kind: 'network'` means the request never got an HTTP answer. */
export class ApiError extends Error {
  readonly code: ErrorCode | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  readonly status: number;
  readonly details?: unknown;
  readonly kind: 'api' | 'network';

  constructor(init: {
    code: ApiError['code'];
    message: string;
    status: number;
    details?: unknown;
    kind: ApiError['kind'];
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.details = init.details;
    this.kind = init.kind;
  }

  /** Field-level validation issues, when the server sent them. */
  get fieldIssues(): ApiFieldIssue[] {
    return Array.isArray(this.details)
      ? (this.details as ApiFieldIssue[]).filter(
          (d) => d && typeof d.path === 'string' && typeof d.message === 'string',
        )
      : [];
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: PageMeta;
  response: Response;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** True for the error a fetch throws when its AbortSignal fires. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Calls the API with same-origin credentials and returns the parsed success envelope. */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', body, headers = {}, signal } = options;
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
      status: 0,
      kind: 'network',
    });
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    meta?: PageMeta;
    error?: { code: ErrorCode; message: string; details?: unknown };
  } | null;

  if (!response.ok || !payload || payload.error) {
    throw new ApiError({
      code: payload?.error?.code ?? 'UNKNOWN_ERROR',
      message:
        payload?.error?.message ??
        (response.status >= 500
          ? 'Something went wrong on our side. Please try again.'
          : 'The request could not be completed.'),
      status: response.status,
      details: payload?.error?.details,
      kind: 'api',
    });
  }
  return { data: payload.data as T, meta: payload.meta, response };
}
