import type { ErrorCode } from '@/shared/errors/error-codes';

/** Every API response is JSON and never cached. */
const BASE_HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' } as const;

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

function json(body: unknown, status: number, headers?: HeadersInit): Response {
  const merged = new Headers(headers);
  for (const [key, value] of Object.entries(BASE_HEADERS)) merged.set(key, value);
  return new Response(JSON.stringify(body), { status, headers: merged });
}

/** 200 `{ data }` or `{ data, meta }`. */
export function ok<T>(data: T, meta?: unknown, headers?: HeadersInit): Response {
  return json(meta === undefined ? { data } : { data, meta }, 200, headers);
}

/** 201 `{ data }`. */
export function created<T>(data: T, headers?: HeadersInit): Response {
  return json({ data }, 201, headers);
}

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): Response {
  const body: ErrorBody = {
    error: { code, message, ...(details === undefined ? {} : { details }) },
  };
  return json(body, status);
}
