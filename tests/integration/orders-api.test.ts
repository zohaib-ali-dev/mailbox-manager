import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Viewer } from '@/server/domain/viewer';
import { createTestContext, createUser, resetDatabase } from '../helpers/db';

// The session is mocked: guards return whichever viewer the test sets. Everything below the guard
// (route wrapper, body reader, service, database) is real.
const session = vi.hoisted(() => ({ viewer: null as Viewer | null }));
vi.mock('@/server/auth/guards', async () => {
  const { ForbiddenError, UnauthorizedError } = await import('@/server/domain/errors');
  const requireViewer = async () => {
    if (!session.viewer) throw new UnauthorizedError();
    return session.viewer;
  };
  return {
    getCurrentViewer: async () => session.viewer,
    requireViewer,
    requireCustomer: async () => {
      const viewer = await requireViewer();
      if (viewer.role !== 'CUSTOMER') throw new ForbiddenError();
      return viewer;
    },
    requireAdmin: async () => {
      const viewer = await requireViewer();
      if (viewer.role !== 'ADMIN') throw new ForbiddenError();
      return viewer;
    },
  };
});

const { POST, GET } = await import('@/app/api/orders/route');
const { prisma: appPrisma } = await import('@/server/db/prisma');
const { prisma } = createTestContext();

const ORIGIN = 'http://localhost:3000';
const body = { domain: 'example.com', provider: 'google', mailboxCount: 2 };

function post(payload: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request(`${ORIGIN}/api/orders`, {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: ORIGIN,
        'content-type': 'application/json',
        ...headers,
      },
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    }),
    undefined,
  );
}

async function errorCode(response: Response) {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

beforeEach(async () => {
  await resetDatabase(prisma);
  session.viewer = await createUser(prisma, 'CUSTOMER', 'customer@example.com');
});

afterAll(async () => {
  await prisma.$disconnect();
  await appPrisma.$disconnect();
});

describe('POST /api/orders (route level)', () => {
  it('returns 201 with Idempotent-Replayed false, then 200 true for the same key', async () => {
    const key = crypto.randomUUID();
    const first = await post(body, { 'Idempotency-Key': key });
    expect(first.status).toBe(201);
    expect(first.headers.get('idempotent-replayed')).toBe('false');
    expect(first.headers.get('cache-control')).toBe('no-store');
    const created = (await first.json()) as { data: { id: string; status: string } };
    expect(created.data.status).toBe('PENDING');

    const second = await post({ ...body, domain: 'EXAMPLE.com' }, { 'idempotency-key': key });
    expect(second.status).toBe(200);
    expect(second.headers.get('idempotent-replayed')).toBe('true');
    expect(((await second.json()) as { data: { id: string } }).data.id).toBe(created.data.id);
    expect(await prisma.order.count()).toBe(1);
  });

  it('returns 422 when the key is reused with a different payload', async () => {
    const key = crypto.randomUUID();
    await post(body, { 'Idempotency-Key': key });
    const response = await post({ ...body, mailboxCount: 3 }, { 'Idempotency-Key': key });
    expect(response.status).toBe(422);
    expect(await errorCode(response)).toBe('IDEMPOTENCY_KEY_MISMATCH');
  });

  it('returns 400 without a key or with a malformed one', async () => {
    const missing = await post(body);
    expect(missing.status).toBe(400);
    expect(await errorCode(missing)).toBe('IDEMPOTENCY_KEY_REQUIRED');
    expect((await post(body, { 'Idempotency-Key': 'bad key!' })).status).toBe(400);
  });

  it('returns 400 with field details for a string count, and writes nothing', async () => {
    const response = await post(
      { ...body, mailboxCount: '5' },
      { 'Idempotency-Key': crypto.randomUUID() },
    );
    expect(response.status).toBe(400);
    const payload = (await response.json()) as {
      error: { code: string; details: { path: string }[] };
    };
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details.map((d) => d.path)).toEqual(['mailboxCount']);
    expect(await prisma.order.count()).toBe(0);
  });

  it('returns 403 for an admin viewer and 401 without a session', async () => {
    session.viewer = await createUser(prisma, 'ADMIN', 'admin@example.com');
    expect((await post(body, { 'Idempotency-Key': crypto.randomUUID() })).status).toBe(403);
    session.viewer = null;
    expect((await post(body, { 'Idempotency-Key': crypto.randomUUID() })).status).toBe(401);
  });

  it('returns 415 without a JSON content type', async () => {
    const response = await post(body, {
      'Idempotency-Key': crypto.randomUUID(),
      'content-type': 'text/plain',
    });
    expect(response.status).toBe(415);
    expect(await errorCode(response)).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns 400 INVALID_JSON for a malformed body and 403 for a foreign origin', async () => {
    expect(
      await errorCode(await post('{"domain":', { 'Idempotency-Key': crypto.randomUUID() })),
    ).toBe('INVALID_JSON');
    const foreign = await post(body, {
      'Idempotency-Key': crypto.randomUUID(),
      origin: 'http://evil.test',
    });
    expect(foreign.status).toBe(403);
    expect(await errorCode(foreign)).toBe('CSRF_REJECTED');
  });
});

describe('GET /api/orders (route level)', () => {
  it('returns the list with meta, and 400 for a bad page', async () => {
    await post(body, { 'Idempotency-Key': crypto.randomUUID() });
    const response = await GET(new Request(`${ORIGIN}/api/orders?page=1&pageSize=10`), undefined);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { data: unknown[]; meta: unknown };
    expect(payload.data).toHaveLength(1);
    expect(payload.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
    expect((await GET(new Request(`${ORIGIN}/api/orders?page=0`), undefined)).status).toBe(400);
  });
});
