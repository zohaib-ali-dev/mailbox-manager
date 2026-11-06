import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ConcurrentModificationError,
  ForbiddenError,
  InvalidTransitionError,
  NotFoundError,
} from '@/server/domain/errors';
import type { Viewer } from '@/server/domain/viewer';
import { createTestContext, createUser, resetDatabase } from '../helpers/db';

const { prisma, container } = createTestContext();
const { orderService, orderTransitions } = container.services;
const { mailboxes } = container.repositories;
const WORKER = { type: 'WORKER', id: 'test-worker', label: 'test-worker' } as const;

let customer: Viewer;
let admin: Viewer;

beforeEach(async () => {
  await resetDatabase(prisma);
  customer = await createUser(prisma, 'CUSTOMER', 'customer@example.com');
  admin = await createUser(prisma, 'ADMIN', 'admin@example.com');
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Creates an order and drives it to FAILED with mailbox 1 ACTIVE and the rest FAILED. */
async function createFailedOrder(count = 3): Promise<string> {
  const { order } = await orderService.createOrder(
    customer,
    { domain: 'example.com', provider: 'microsoft', mailboxCount: count },
    crypto.randomUUID(),
  );
  await prisma.$transaction((tx) =>
    orderTransitions.transition({
      tx,
      orderId: order.id,
      from: 'PENDING',
      to: 'PROVISIONING',
      actor: WORKER,
      extraFields: { lockedBy: 'test-worker', lockedAt: new Date(), attempts: { increment: 1 } },
    }),
  );
  const [first, ...rest] = order.mailboxes;
  await mailboxes.markActive(first!.id, { externalId: 'ms-1', provisionedAt: new Date() });
  for (const mailbox of rest) await mailboxes.markFailed(mailbox.id, 'Microsoft Graph: throttled');
  await prisma.$transaction((tx) =>
    orderTransitions.transition({
      tx,
      orderId: order.id,
      from: 'PROVISIONING',
      to: 'FAILED',
      actor: WORKER,
      expectedLockedBy: 'test-worker',
      metadata: { active: 1, failed: count - 1, total: count },
      extraFields: {
        lockedBy: null,
        lockedAt: null,
        lastError: `${count - 1} of ${count} mailboxes failed`,
      },
    }),
  );
  return order.id;
}

describe('admin retry (integration)', () => {
  it('moves FAILED to PENDING, writes an ADMIN event and resets only failed mailboxes', async () => {
    const orderId = await createFailedOrder(3);
    const before = await prisma.mailbox.findFirstOrThrow({ where: { orderId, position: 1 } });

    const detail = await orderService.retryOrder(admin, orderId);

    expect(detail.status).toBe('PENDING');
    expect(detail.lastError).toBeNull();
    expect(detail.canRetry).toBe(false);
    expect(detail.progress).toEqual({ total: 3, active: 1, failed: 0, pending: 2 });
    expect(detail.events.map((e) => [e.fromStatus, e.toStatus, e.actorType])).toEqual([
      [null, 'PENDING', 'CUSTOMER'],
      ['PENDING', 'PROVISIONING', 'WORKER'],
      ['PROVISIONING', 'FAILED', 'WORKER'],
      ['FAILED', 'PENDING', 'ADMIN'],
    ]);
    expect(detail.events.at(-1)).toMatchObject({
      reason: 'Retried by admin',
      actorLabel: 'admin@example.com',
    });

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(row).toMatchObject({ lockedBy: null, lockedAt: null, lastError: null });
    const after = await prisma.mailbox.findFirstOrThrow({ where: { orderId, position: 1 } });
    expect(after).toMatchObject({
      status: 'ACTIVE',
      externalId: before.externalId,
      provisionedAt: before.provisionedAt,
    });
  });

  it('shows canRetry only to admins on FAILED orders', async () => {
    const orderId = await createFailedOrder(2);
    expect((await orderService.getOrderForViewer(admin, orderId)).canRetry).toBe(true);
    expect((await orderService.getOrderForViewer(customer, orderId)).canRetry).toBe(false);
    const list = await orderService.listOrdersForAdmin(admin, { status: 'FAILED' });
    expect(list.items[0]?.canRetry).toBe(true);
  });

  it('rejects retrying an order that is not FAILED with INVALID_TRANSITION', async () => {
    const { order } = await orderService.createOrder(
      customer,
      { domain: 'example.com', provider: 'google', mailboxCount: 1 },
      crypto.randomUUID(),
    );
    const error = await orderService.retryOrder(admin, order.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InvalidTransitionError);
    expect((error as InvalidTransitionError).details).toMatchObject({
      from: 'PENDING',
      to: 'PENDING',
    });
    expect((error as InvalidTransitionError).status).toBe(409);
  });

  it('lets only one of two concurrent retries succeed; the other gets a 409', async () => {
    const orderId = await createFailedOrder(2);
    const results = await Promise.allSettled([
      orderService.retryOrder(admin, orderId),
      orderService.retryOrder(admin, orderId),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = rejected[0]!.reason as ConcurrentModificationError | InvalidTransitionError;
    expect(
      [ConcurrentModificationError, InvalidTransitionError].some((c) => reason instanceof c),
    ).toBe(true);
    expect(reason.status).toBe(409);
    expect(await prisma.orderEvent.count({ where: { orderId, actorType: 'ADMIN' } })).toBe(1);
  });

  it('forbids customers from retrying', async () => {
    const orderId = await createFailedOrder(2);
    await expect(orderService.retryOrder(customer, orderId)).rejects.toThrow(ForbiddenError);
  });

  it('returns 404 for unknown and malformed order ids', async () => {
    await expect(orderService.retryOrder(admin, crypto.randomUUID())).rejects.toThrow(
      NotFoundError,
    );
    await expect(orderService.retryOrder(admin, 'not-a-uuid')).rejects.toThrow(NotFoundError);
  });
});

describe('order visibility (integration)', () => {
  it("returns 404, never 403, when a customer opens another customer's order", async () => {
    const other = await createUser(prisma, 'CUSTOMER', 'customer2@example.com');
    const { order } = await orderService.createOrder(
      other,
      { domain: 'example.com', provider: 'google', mailboxCount: 1 },
      crypto.randomUUID(),
    );
    await expect(orderService.getOrderForViewer(customer, order.id)).rejects.toThrow(NotFoundError);
    await expect(orderService.getOrderForViewer(customer, 'nope')).rejects.toThrow(NotFoundError);
    expect((await orderService.getOrderForViewer(admin, order.id)).id).toBe(order.id);
    expect((await orderService.getOrderForViewer(other, order.id)).id).toBe(order.id);
  });

  it('rejects a transition with the wrong actor and when the status already moved', async () => {
    const orderId = await createFailedOrder(2);
    await expect(
      prisma.$transaction((tx) =>
        orderTransitions.transition({
          tx,
          orderId,
          from: 'FAILED',
          to: 'PENDING',
          actor: { type: 'CUSTOMER', id: customer.id, label: customer.email },
        }),
      ),
    ).rejects.toThrow(InvalidTransitionError);
    await expect(
      prisma.$transaction((tx) =>
        orderTransitions.transition({
          tx,
          orderId,
          from: 'PROVISIONING',
          to: 'ACTIVE',
          actor: WORKER,
        }),
      ),
    ).rejects.toThrow(ConcurrentModificationError);
    expect(await prisma.orderEvent.count({ where: { orderId } })).toBe(3);
  });
});
