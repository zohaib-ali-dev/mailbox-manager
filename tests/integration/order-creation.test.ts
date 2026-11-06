import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ForbiddenError,
  IdempotencyKeyMismatchError,
  IdempotencyKeyRequiredError,
  ValidationError,
} from '@/server/domain/errors';
import type { Viewer } from '@/server/domain/viewer';
import { createTestContext, createUser, currentDatabaseName, resetDatabase } from '../helpers/db';

const { prisma, container } = createTestContext();
const orders = container.services.orderService;

const payload = { domain: 'example.com', provider: 'google', mailboxCount: 3 } as const;
const newKey = () => crypto.randomUUID();

let customer: Viewer;

beforeEach(async () => {
  await resetDatabase(prisma);
  customer = await createUser(prisma, 'CUSTOMER', 'customer@example.com');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('order creation (integration)', () => {
  it('runs against the _test database', async () => {
    const name = await currentDatabaseName(prisma);
    console.log(`[integration] connected to ${name}`);
    expect(name).toMatch(/_test$/);
  });

  it('creates one order, N pending mailboxes and one creation event', async () => {
    const { order, replayed } = await orders.createOrder(customer, payload, newKey());

    expect(replayed).toBe(false);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.mailbox.count({ where: { orderId: order.id, status: 'PENDING' } })).toBe(3);

    const events = await prisma.orderEvent.findMany({ where: { orderId: order.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      fromStatus: null,
      toStatus: 'PENDING',
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorLabel: 'customer@example.com',
    });

    // DTO shape: exactly the whitelisted fields, nothing internal.
    expect(Object.keys(order).sort()).toEqual(
      [
        'attempts',
        'canRetry',
        'createdAt',
        'domain',
        'events',
        'id',
        'lastError',
        'mailboxCount',
        'mailboxes',
        'progress',
        'provider',
        'status',
        'updatedAt',
      ].sort(),
    );
    expect(order).toMatchObject({
      domain: 'example.com',
      provider: 'google',
      mailboxCount: 3,
      status: 'PENDING',
      attempts: 0,
      lastError: null,
      canRetry: false,
      progress: { total: 3, active: 0, failed: 0, pending: 3 },
    });
    expect(order.mailboxes.map((m) => m.position)).toEqual([1, 2, 3]);
    expect(order.mailboxes[0]?.address).toBe(`box-01-${order.id.slice(0, 8)}@example.com`);
    expect(Object.keys(order.mailboxes[0] ?? {}).sort()).toEqual(
      ['address', 'id', 'lastError', 'position', 'provisionedAt', 'status'].sort(),
    );
    expect(order.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    const serialised = JSON.stringify(order);
    for (const secret of ['requestHash', 'idempotencyKey', 'lockedBy', 'externalId', 'userId']) {
      expect(serialised).not.toContain(secret);
    }
  });

  it('replays the same key and payload without writing anything', async () => {
    const key = newKey();
    const first = await orders.createOrder(customer, payload, key);
    const second = await orders.createOrder(customer, payload, key);

    expect(second.replayed).toBe(true);
    expect(second.order.id).toBe(first.order.id);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.orderEvent.count()).toBe(1);
  });

  it('treats EXAMPLE.com and example.com as the same payload', async () => {
    const key = newKey();
    const first = await orders.createOrder(customer, payload, key);
    const second = await orders.createOrder(customer, { ...payload, domain: ' EXAMPLE.com ' }, key);

    expect(second.replayed).toBe(true);
    expect(second.order.id).toBe(first.order.id);
  });

  it('rejects the same key with a different payload', async () => {
    const key = newKey();
    await orders.createOrder(customer, payload, key);
    await expect(
      orders.createOrder(customer, { ...payload, mailboxCount: 4 }, key),
    ).rejects.toThrow(IdempotencyKeyMismatchError);
    expect(await prisma.order.count()).toBe(1);
  });

  it('turns five concurrent identical requests into exactly one order', async () => {
    const key = newKey();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => orders.createOrder(customer, payload, key)),
    );

    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.mailbox.count()).toBe(3);
    expect(await prisma.orderEvent.count()).toBe(1);
    expect(new Set(results.map((r) => r.order.id)).size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
  });

  it('scopes keys per customer', async () => {
    const other = await createUser(prisma, 'CUSTOMER', 'customer2@example.com');
    const key = newKey();
    const a = await orders.createOrder(customer, payload, key);
    const b = await orders.createOrder(other, payload, key);

    expect(a.order.id).not.toBe(b.order.id);
    expect(b.replayed).toBe(false);
    expect(await prisma.order.count()).toBe(2);
  });

  it('forbids admins from creating orders', async () => {
    const admin = await createUser(prisma, 'ADMIN', 'admin@example.com');
    await expect(orders.createOrder(admin, payload, newKey())).rejects.toThrow(ForbiddenError);
    expect(await prisma.order.count()).toBe(0);
  });

  it('rejects invalid input with field details and writes nothing', async () => {
    const error = await orders
      .createOrder(customer, { domain: 'http://x', provider: 'yahoo', mailboxCount: '5' }, newKey())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    const paths = ((error as ValidationError).details as { path: string }[]).map((d) => d.path);
    expect(paths.sort()).toEqual(['domain', 'mailboxCount', 'provider']);
    expect(JSON.stringify((error as ValidationError).details)).not.toContain('http://x');
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderEvent.count()).toBe(0);
  });

  it('rejects a missing or malformed idempotency key', async () => {
    await expect(orders.createOrder(customer, payload, undefined)).rejects.toThrow(
      IdempotencyKeyRequiredError,
    );
    await expect(orders.createOrder(customer, payload, 'short')).rejects.toThrow(
      IdempotencyKeyRequiredError,
    );
    expect(await prisma.order.count()).toBe(0);
  });

  it('creates 50 mailboxes with unique addresses', async () => {
    const { order } = await orders.createOrder(
      customer,
      { ...payload, mailboxCount: 50 },
      newKey(),
    );
    expect(order.mailboxes).toHaveLength(50);
    expect(new Set(order.mailboxes.map((m) => m.address)).size).toBe(50);
    expect(order.mailboxes[49]?.address).toMatch(/^box-50-/);
  });
});

describe('order queries (integration)', () => {
  it('pages a customer list newest first with a correct total, and past the end is empty', async () => {
    const created: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      created.push((await orders.createOrder(customer, payload, newKey())).order.id);
    }
    const page1 = await orders.listOrdersForCustomer(customer, { page: '1', pageSize: '2' });
    expect(page1.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(page1.items.map((o) => o.id)).toEqual([created[2], created[1]]);

    const beyond = await orders.listOrdersForCustomer(customer, { page: '9', pageSize: '2' });
    expect(beyond.items).toEqual([]);
    expect(beyond.meta.total).toBe(3);
  });

  it('only lists the customer their own orders', async () => {
    const other = await createUser(prisma, 'CUSTOMER', 'customer2@example.com');
    await orders.createOrder(customer, payload, newKey());
    await orders.createOrder(other, payload, newKey());
    const list = await orders.listOrdersForCustomer(customer, {});
    expect(list.meta.total).toBe(1);
  });

  it('filters the admin list and includes the customer email', async () => {
    const admin = await createUser(prisma, 'ADMIN', 'admin@example.com');
    await orders.createOrder(customer, payload, newKey());
    await orders.createOrder(customer, { ...payload, provider: 'microsoft' }, newKey());

    const all = await orders.listOrdersForAdmin(admin, { status: 'all', provider: '' });
    expect(all.meta.total).toBe(2);
    const microsoft = await orders.listOrdersForAdmin(admin, { provider: 'microsoft' });
    expect(microsoft.items).toHaveLength(1);
    expect(microsoft.items[0]).toMatchObject({
      provider: 'microsoft',
      customerEmail: 'customer@example.com',
      canRetry: false,
    });
    await expect(orders.listOrdersForAdmin(customer, {})).rejects.toThrow(ForbiddenError);
    await expect(orders.listOrdersForAdmin(admin, { status: 'failed' })).rejects.toThrow(
      ValidationError,
    );
  });
});
