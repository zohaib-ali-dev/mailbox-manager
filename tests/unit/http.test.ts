import { describe, expect, it } from 'vitest';
import { z, ZodError } from 'zod';
import * as errors from '@/server/domain/errors';
import { toErrorResponse } from '@/server/http/errors';
import { assertJsonIfBody, assertSameOrigin, readJsonBody } from '@/server/http/request';
import { created, ok } from '@/server/http/responses';
import { silentLogger, type Logger } from '@/server/logger';
import { ERROR_CODES } from '@/shared/errors/error-codes';

const recordingLogger = () => {
  const entries: { message: string; fields?: Record<string, unknown> }[] = [];
  const logger: Logger = {
    ...silentLogger,
    error: (message, fields) => entries.push({ message, fields }),
    child: () => logger,
  };
  return { logger, entries };
};

const errorCases: [errors.AppError, number, string][] = [
  [new errors.ValidationError([{ path: 'domain', message: 'bad' }]), 400, 'VALIDATION_ERROR'],
  [new errors.InvalidJsonError(), 400, 'INVALID_JSON'],
  [new errors.IdempotencyKeyRequiredError(), 400, 'IDEMPOTENCY_KEY_REQUIRED'],
  [new errors.UnauthorizedError(), 401, 'UNAUTHENTICATED'],
  [new errors.InvalidCredentialsError(), 401, 'INVALID_CREDENTIALS'],
  [new errors.ForbiddenError(), 403, 'FORBIDDEN'],
  [new errors.CsrfRejectedError(), 403, 'CSRF_REJECTED'],
  [new errors.NotFoundError(), 404, 'NOT_FOUND'],
  [
    new errors.InvalidTransitionError({ from: 'ACTIVE', to: 'PENDING', actor: 'ADMIN' }),
    409,
    'INVALID_TRANSITION',
  ],
  [
    new errors.ConcurrentModificationError({ currentStatus: 'PENDING' }),
    409,
    'CONCURRENT_MODIFICATION',
  ],
  [new errors.PayloadTooLargeError(), 413, 'PAYLOAD_TOO_LARGE'],
  [new errors.UnsupportedMediaTypeError(), 415, 'UNSUPPORTED_MEDIA_TYPE'],
  [new errors.IdempotencyKeyMismatchError(), 422, 'IDEMPOTENCY_KEY_MISMATCH'],
  [new errors.InternalError(), 500, 'INTERNAL_ERROR'],
];

describe('error mapping', () => {
  it('covers every registry code', () => {
    expect(new Set(errorCases.map(([, , code]) => code))).toEqual(
      new Set(Object.keys(ERROR_CODES)),
    );
  });

  it.each(errorCases)('maps %s to its status and envelope', async (error, status, code) => {
    const response = toErrorResponse(error, silentLogger);
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as {
      error: { code: string; message: string; details?: unknown };
    };
    expect(body.error.code).toBe(code);
    expect(body.error.message).toBe(error.message);
    if (error.details !== undefined) expect(body.error.details).toEqual(error.details);
    else expect(body.error).not.toHaveProperty('details');
  });

  it('maps a ZodError to VALIDATION_ERROR without echoing input values', async () => {
    const result = z.strictObject({ count: z.number() }).safeParse({ count: 'secret-input-value' });
    const response = toErrorResponse(result.error as ZodError, silentLogger);
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).not.toContain('secret-input-value');
    expect(JSON.parse(text)).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: [{ path: 'count' }] },
    });
  });

  it('turns an unknown error into a generic 500 and logs the real one server-side only', async () => {
    const { logger, entries } = recordingLogger();
    const internal = new Error('relation "orders" does not exist at /srv/app/db.ts:42');
    const response = toErrorResponse(internal, logger);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain('relation');
    expect(text).not.toContain('db.ts');
    expect(text).not.toContain('stack');
    expect(JSON.parse(text)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: ERROR_CODES.INTERNAL_ERROR.defaultMessage },
    });
    expect(entries[0]?.fields?.error).toBe(internal);
  });
});

describe('responses', () => {
  it('wraps data, adds meta only when given and never caches', async () => {
    const response = ok({ a: 1 }, undefined, { 'Idempotent-Replayed': 'true' });
    expect(await response.json()).toEqual({ data: { a: 1 } });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('idempotent-replayed')).toBe('true');
    expect(await ok([], { page: 1 }).json()).toEqual({ data: [], meta: { page: 1 } });
    expect(created({ id: 'x' }).status).toBe(201);
  });
});

const jsonRequest = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3000/api/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });

describe('readJsonBody', () => {
  const schema = z.strictObject({ name: z.string() });

  it('parses and validates a JSON object, accepting a charset parameter', async () => {
    const request = jsonRequest('{"name":"x"}', {
      'content-type': 'application/json; charset=utf-8',
    });
    expect(await readJsonBody(request, schema)).toEqual({ name: 'x' });
  });

  it('rejects a wrong or missing content type with 415', async () => {
    await expect(
      readJsonBody(jsonRequest('{}', { 'content-type': 'text/plain' }), schema),
    ).rejects.toThrow(errors.UnsupportedMediaTypeError);
    const noType = new Request('http://localhost/api/x', { method: 'POST', body: '{}' });
    noType.headers.delete('content-type');
    await expect(readJsonBody(noType, schema)).rejects.toThrow(errors.UnsupportedMediaTypeError);
  });

  it('rejects a body over 10 KB with 413, even without a declared length', async () => {
    const big = JSON.stringify({ name: 'x'.repeat(11 * 1024) });
    await expect(readJsonBody(jsonRequest(big), schema)).rejects.toThrow(
      errors.PayloadTooLargeError,
    );
    const streamed = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const request = new Request('http://localhost/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: streamed,
      duplex: 'half',
    } as RequestInit);
    await expect(readJsonBody(request, schema)).rejects.toThrow(errors.PayloadTooLargeError);
  });

  it.each(['{not json', '', '[]', '[{"name":"x"}]', 'null', '"text"', '42'])(
    'rejects %j with INVALID_JSON',
    async (body) => {
      await expect(readJsonBody(jsonRequest(body), schema)).rejects.toThrow(
        errors.InvalidJsonError,
      );
    },
  );

  it('rejects unknown fields with VALIDATION_ERROR naming each field', async () => {
    const error = await readJsonBody(jsonRequest('{"name":"x","role":"ADMIN"}'), schema).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(errors.ValidationError);
    expect((error as errors.ValidationError).details).toEqual([
      { path: 'role', message: 'Unknown field.' },
    ]);
  });
});

describe('assertJsonIfBody', () => {
  it('allows an empty body and a JSON body, refuses a form body', async () => {
    await expect(
      assertJsonIfBody(new Request('http://localhost/x', { method: 'POST' })),
    ).resolves.toBeUndefined();
    await expect(
      assertJsonIfBody(jsonRequest('{}', { 'content-length': '2' })),
    ).resolves.toBeUndefined();
    const form = new Request('http://localhost/x', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '3' },
      body: 'a=b',
    });
    await expect(assertJsonIfBody(form)).rejects.toThrow(errors.UnsupportedMediaTypeError);
  });
});

describe('assertSameOrigin', () => {
  const post = (headers: Record<string, string>) =>
    new Request('http://localhost:3000/api/x', {
      method: 'POST',
      headers: { host: 'localhost:3000', ...headers },
    });

  it('accepts a matching Origin, or a matching Referer when Origin is absent', () => {
    expect(() => assertSameOrigin(post({ origin: 'http://localhost:3000' }))).not.toThrow();
    expect(() =>
      assertSameOrigin(post({ referer: 'http://localhost:3000/orders/new' })),
    ).not.toThrow();
  });

  it('rejects a mismatching, null or missing origin', () => {
    expect(() => assertSameOrigin(post({ origin: 'http://evil.test' }))).toThrow(
      errors.CsrfRejectedError,
    );
    expect(() => assertSameOrigin(post({ origin: 'http://localhost:3001' }))).toThrow(
      errors.CsrfRejectedError,
    );
    expect(() => assertSameOrigin(post({ origin: 'null' }))).toThrow(errors.CsrfRejectedError);
    expect(() => assertSameOrigin(post({ referer: 'not a url' }))).toThrow(
      errors.CsrfRejectedError,
    );
    expect(() => assertSameOrigin(post({}))).toThrow(errors.CsrfRejectedError);
  });

  it('ignores safe methods', () => {
    const get = new Request('http://localhost:3000/api/x', {
      headers: { origin: 'http://evil.test' },
    });
    expect(() => assertSameOrigin(get)).not.toThrow();
  });
});
