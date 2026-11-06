import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createContainer } from '@/server/container';
import type { Viewer } from '@/server/domain/viewer';
import { createFakeProviders, failPositions } from '../helpers/fake-providers';
import { createTestContext, createUser, resetDatabase } from '../helpers/db';

const { prisma } = createTestContext();
const fakes = createFakeProviders();
const config = {
  providerConcurrency: 5,
  providerCallTimeoutMs: 1000,
  heartbeatIntervalMs: 5000,
  leaseTimeoutMs: 60_000,
};
const container = createContainer(prisma, { providers: fakes.registry, provisioning: config });
const { orderService, provisioningService } = container.services;

let customer: Viewer;
let admin: Viewer;

beforeEach(async () => {
  await resetDatabase(prisma);
  fakes.google.calls.length = 0;
  fakes.microsoft.calls.length = 0;
  fakes.google.behaviour = () => 'ok';
  fakes.microsoft.behaviour = () => 'ok';
  customer = await createUser(prisma, 'CUSTOMER', 'customer@example.com');
  admin = await createUser(prisma, 'ADMIN', 'admin@example.com');
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createOrder(count = 3, provider: 'google' | 'microsoft' = 'google') {
  const { order } = await orderService.createOrder(
    customer,
    { domain: 'example.com', provider, mailboxCount: count },
    crypto.randomUUID(),
  );
  return order.id;
}

const eventTrail = async (orderId: string) =>
  (
    await prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    })
  ).map((e) => `${e.fromStatus ?? 'none'}>${e.toStatus}:${e.actorType}`);

describe('worker claim (integration)', () => {
  it('gives one PENDING order to exactly one of two concurrent claimers', async () => {
    const orderId = await createOrder();
    const [a, b] = await Promise.all([
      provisioningService.claimNextOrder('worker-a'),
      provisioningService.claimNextOrder('worker-b'),
    ]);
    const winners = [a, b].filter(Boolean);
    expect(winners).toHaveLength(1);
    expect(winners[0]?.orderId).toBe(orderId);

    const row = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(row.status).toBe('PROVISIONING');
    expect(row.attempts).toBe(1);
    expect(['worker-a', 'worker-b']).toContain(row.lockedBy);
    expect(row.lockedAt).toBeInstanceOf(Date);
    expect(await prisma.orderEvent.count({ where: { orderId, toStatus: 'PROVISIONING' } })).toBe(1);
  });

  it('spreads ten orders across three concurrent claim loops with no duplicates, oldest first', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i += 1) ids.push(await createOrder(1));

    const claimLoop = async (workerId: string) => {
      const claimed: string[] = [];
      for (;;) {
        const next = await provisioningService.claimNextOrder(workerId);
        if (!next) return claimed;
        claimed.push(next.orderId);
      }
    };
    const results = await Promise.all(['w1', 'w2', 'w3'].map(claimLoop));
    const all = results.flat();

    expect(all).toHaveLength(10);
    expect(new Set(all).size).toBe(10);
    expect(new Set(all)).toEqual(new Set(ids));
    const claimEvents = await prisma.orderEvent.groupBy({
      by: ['orderId'],
      where: { toStatus: 'PROVISIONING' },
      _count: { _all: true },
    });
    expect(claimEvents.every((group) => group._count._all === 1)).toBe(true);
  });

  it('returns null when nothing is pending', async () => {
    expect(await provisioningService.claimNextOrder('idle')).toBeNull();
  });
});

describe('worker processing (integration)', () => {
  it('activates the order and every mailbox when every call succeeds', async () => {
    const orderId = await createOrder(4);
    await provisioningService.claimNextOrder('w1');
    expect(await provisioningService.processAndFinalize(orderId, 'w1')).toBe('ACTIVE');

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { mailboxes: true },
    });
    expect(order).toMatchObject({
      status: 'ACTIVE',
      lockedBy: null,
      lockedAt: null,
      lastError: null,
    });
    expect(
      order.mailboxes.every((m) => m.status === 'ACTIVE' && m.externalId && m.provisionedAt),
    ).toBe(true);
    expect(await eventTrail(orderId)).toEqual([
      'none>PENDING:CUSTOMER',
      'PENDING>PROVISIONING:WORKER',
      'PROVISIONING>ACTIVE:WORKER',
    ]);
    expect(fakes.google.calls.map((c) => c.idempotencyKey).sort()).toEqual(
      order.mailboxes.map((m) => m.id).sort(),
    );
  });

  it('fails the order with correct counts when every call fails', async () => {
    fakes.microsoft.behaviour = () => 'fail';
    const orderId = await createOrder(3, 'microsoft');
    await provisioningService.claimNextOrder('w1');
    expect(await provisioningService.processAndFinalize(orderId, 'w1')).toBe('FAILED');

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { mailboxes: true },
    });
    expect(order.status).toBe('FAILED');
    expect(order.lastError).toBe('3 of 3 mailboxes failed');
    expect(order.mailboxes.every((m) => m.status === 'FAILED' && m.lastError)).toBe(true);
    const last = await prisma.orderEvent.findFirstOrThrow({
      where: { orderId, toStatus: 'FAILED' },
    });
    expect(last).toMatchObject({
      actorType: 'WORKER',
      metadata: { active: 0, failed: 3, total: 3 },
    });
  });

  it('after a partial failure and an admin retry, re-provisions only the failed mailboxes', async () => {
    fakes.google.behaviour = failPositions(2, 4);
    const orderId = await createOrder(5);
    await provisioningService.claimNextOrder('w1');
    expect(await provisioningService.processAndFinalize(orderId, 'w1')).toBe('FAILED');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).lastError).toBe(
      '2 of 5 mailboxes failed',
    );

    const activeBefore = await prisma.mailbox.findMany({
      where: { orderId, status: 'ACTIVE' },
      orderBy: { position: 'asc' },
    });
    expect(activeBefore.map((m) => m.position)).toEqual([1, 3, 5]);

    await orderService.retryOrder(admin, orderId);
    fakes.google.calls.length = 0;
    fakes.google.behaviour = () => 'ok';
    await provisioningService.claimNextOrder('w2');
    expect(await provisioningService.processAndFinalize(orderId, 'w2')).toBe('ACTIVE');

    expect(fakes.google.calls.map((c) => c.address.slice(0, 6)).sort()).toEqual([
      'box-02',
      'box-04',
    ]);
    const activeAfter = await prisma.mailbox.findMany({
      where: { id: { in: activeBefore.map((m) => m.id) } },
      orderBy: { position: 'asc' },
    });
    expect(activeAfter.map((m) => [m.externalId, m.provisionedAt?.getTime(), m.attempts])).toEqual(
      activeBefore.map((m) => [m.externalId, m.provisionedAt?.getTime(), m.attempts]),
    );
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ status: 'ACTIVE', attempts: 2 });
    expect(await eventTrail(orderId)).toEqual([
      'none>PENDING:CUSTOMER',
      'PENDING>PROVISIONING:WORKER',
      'PROVISIONING>FAILED:WORKER',
      'FAILED>PENDING:ADMIN',
      'PENDING>PROVISIONING:WORKER',
      'PROVISIONING>ACTIVE:WORKER',
    ]);
  });

  it('records a provider timeout as a safe mailbox error', async () => {
    const slow = createFakeProviders(() => new Promise(() => {}));
    const timeoutContainer = createContainer(prisma, {
      providers: slow.registry,
      provisioning: { ...config, providerCallTimeoutMs: 50 },
    });
    const orderId = await createOrder(2);
    const svc = timeoutContainer.services.provisioningService;
    await svc.claimNextOrder('w1');
    expect(await svc.processAndFinalize(orderId, 'w1')).toBe('FAILED');
    const mailboxes = await prisma.mailbox.findMany({ where: { orderId } });
    expect(mailboxes.every((m) => m.lastError === 'Provider did not respond within 50 ms')).toBe(
      true,
    );
  });
});

describe('worker safety (integration)', () => {
  it('fencing: a worker whose lock was taken over does not finalize', async () => {
    const orderId = await createOrder(2);
    await provisioningService.claimNextOrder('old-worker');
    await prisma.order.update({ where: { id: orderId }, data: { lockedBy: 'new-worker' } });

    expect(await provisioningService.finalizeOrder(orderId, 'old-worker')).toBe('discarded');
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ status: 'PROVISIONING', lockedBy: 'new-worker' });
    expect(await prisma.orderEvent.count({ where: { orderId } })).toBe(2);
  });

  it('stops starting provider calls once the heartbeat sees the lease is lost', async () => {
    const lossy = createFakeProviders(async (_request, index) => {
      if (index === 0) {
        await prisma.order.updateMany({ data: { lockedBy: 'someone-else' } });
      }
      await new Promise((resolve) => setTimeout(resolve, 60));
      return 'ok' as const;
    });
    const lossyContainer = createContainer(prisma, {
      providers: lossy.registry,
      provisioning: { ...config, providerConcurrency: 1, heartbeatIntervalMs: 20 },
    });
    const svc = lossyContainer.services.provisioningService;
    const orderId = await createOrder(10);
    await svc.claimNextOrder('w1');

    expect(await svc.processAndFinalize(orderId, 'w1')).toBe('discarded');
    expect(lossy.google.calls.length).toBeLessThan(10);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(
      'PROVISIONING',
    );
  });

  it('sweeper: fails an expired PROVISIONING order as SYSTEM and leaves a fresh one alone', async () => {
    const stale = await createOrder(3);
    const fresh = await createOrder(1);
    await provisioningService.claimNextOrder('crashed-worker');
    await provisioningService.claimNextOrder('live-worker');
    await prisma.$executeRaw`UPDATE "orders" SET "locked_at" = now() - interval '10 minutes' WHERE "id" = ${stale}::uuid`;
    // A mailbox finished before the crash stays ACTIVE; the rest stay PENDING for the retry.
    const first = await prisma.mailbox.findFirstOrThrow({ where: { orderId: stale, position: 1 } });
    await container.repositories.mailboxes.markActive(first.id, {
      externalId: 'g-1',
      provisionedAt: new Date(),
    });

    expect(await provisioningService.failStaleOrders()).toBe(1);

    const staleOrder = await prisma.order.findUniqueOrThrow({
      where: { id: stale },
      include: { mailboxes: { orderBy: { position: 'asc' } } },
    });
    expect(staleOrder).toMatchObject({
      status: 'FAILED',
      lockedBy: null,
      lockedAt: null,
      lastError: 'Worker lease expired',
    });
    expect(staleOrder.mailboxes.map((m) => m.status)).toEqual(['ACTIVE', 'PENDING', 'PENDING']);
    const event = await prisma.orderEvent.findFirstOrThrow({
      where: { orderId: stale, toStatus: 'FAILED' },
    });
    expect(event).toMatchObject({
      actorType: 'SYSTEM',
      reason: 'Worker lease expired',
      metadata: { previousWorker: 'crashed-worker' },
    });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: fresh } })).status).toBe(
      'PROVISIONING',
    );
    expect(await provisioningService.failStaleOrders()).toBe(0);
  });

  it('picks up orders oldest first', async () => {
    const first = await createOrder(1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await createOrder(1);
    expect((await provisioningService.claimNextOrder('w1'))?.orderId).toBe(first);
  });
});
