import type { z } from 'zod';
import {
  CsrfRejectedError,
  InvalidJsonError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from '@/server/domain/errors';
import { parseOrThrow } from '@/server/domain/validation';

export const MAX_JSON_BODY_BYTES = 10 * 1024;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isJsonContentType(request: Request): boolean {
  const mediaType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  return mediaType === 'application/json';
}

/** Reads the body as text, refusing more than `limit` bytes even when Content-Length lies. */
async function readLimitedText(request: Request, limit: number): Promise<string> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw new PayloadTooLargeError();
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Requires `Content-Type: application/json` (415), at most 10 KB (413) and a JSON object body
 * (400 INVALID_JSON), then validates with the schema (400 VALIDATION_ERROR).
 */
export async function readJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  if (!isJsonContentType(request)) throw new UnsupportedMediaTypeError();
  let text: string;
  try {
    text = await readLimitedText(request, MAX_JSON_BODY_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) throw error;
    throw new InvalidJsonError();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new InvalidJsonError();
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidJsonError();
  }
  return parseOrThrow(schema, parsed);
}

/**
 * For body-less mutations (logout, retry): any body that is sent must still be JSON and small, so
 * a cross-site form post cannot reach them.
 */
export async function assertJsonIfBody(request: Request): Promise<void> {
  const declared = request.headers.get('content-length');
  const hasBody =
    (declared !== null && declared !== '0') || request.headers.has('transfer-encoding');
  if (!hasBody) return;
  if (!isJsonContentType(request)) throw new UnsupportedMediaTypeError();
  await readLimitedText(request, MAX_JSON_BODY_BYTES);
}

/** The host the browser addressed (behind a proxy, the forwarded host). */
function requestHost(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwarded || request.headers.get('host');
  if (host) return host.toLowerCase();
  try {
    return new URL(request.url).host.toLowerCase();
  } catch {
    return null;
  }
}

function originHost(value: string | null): string | null {
  if (!value || value === 'null') return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * CSRF defence for mutating methods: the Origin header (or Referer when Origin is absent) must
 * match the request host. Missing both is rejected too.
 */
export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;
  const expected = requestHost(request);
  const actual = originHost(request.headers.get('origin') ?? request.headers.get('referer'));
  if (!expected || !actual || actual !== expected) throw new CsrfRejectedError();
}

/** Query string -> plain object for zod (the last value wins for repeated keys). */
export function searchParamsOf(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}
