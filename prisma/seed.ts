import '@/server/config/load-env';
import type { Role } from '@/generated/prisma/client';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { env } from '@/server/config/env';
import { createContainer, type Container } from '@/server/container';
import { createPrismaClient } from '@/server/db/prisma';
import type { Viewer } from '@/server/domain/viewer';
import type { OrderStatus, Provider } from '@/shared/constants';

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export const SEED_USERS: readonly SeedUser[] = [
  { email: 'admin@example.com', name: 'Ada Admin', password: 'Admin123!', role: 'ADMIN' },
  {
    email: 'customer@example.com',
    name: 'Casey Customer',
    password: 'Customer123!',
    role: 'CUSTOMER',
  },
  {
    email: 'customer2@example.com',
    name: 'Chris Customer',
    password: 'Customer123!',
    role: 'CUSTOMER',
  },
];

/**
 * One simulated worker run: claim, provision (the listed positions fail), finalize. `expired`
 * simulates a crashed worker whose lease the system sweeper expired.
 */
interface SeedRun {
  failPositions?: number[];
  expired?: boolean;
}

interface SeedOrder {
  key: string;
  owner: string;
  domain: string;
  provider: Provider;
  count: number;
  /** Runs separated by an admin retry. */
  runs: SeedRun[];
}

/** ACTIVE and FAILED only: the worker stays idle until someone creates a real order. */
const SEED_ORDERS: readonly SeedOrder[] = [
  {
    key: 'seed-001',
    owner: 'customer@example.com',
    domain: 'acme-outreach.com',
    provider: 'google',
    count: 3,
    runs: [{}],
  },
  {
    key: 'seed-002',
    owner: 'customer@example.com',
    domain: 'northwind-mail.io',
    provider: 'microsoft',
    count: 5,
    runs: [{}],
  },
  {
    key: 'seed-003',
    owner: 'customer@example.com',
    domain: 'contoso-sales.com',
    provider: 'microsoft',
    count: 10,
    runs: [{ failPositions: [2, 5, 9] }],
  },
  {
    key: 'seed-004',
    owner: 'customer@example.com',
    domain: 'globex-growth.dev',
    provider: 'google',
    count: 2,
    runs: [{}],
  },
  {
    key: 'seed-005',
    owner: 'customer@example.com',
    domain: 'initech-leads.co',
    provider: 'google',
    count: 20,
    runs: [{ failPositions: [3, 7, 11, 16, 20] }],
  },
  {
    key: 'seed-006',
    owner: 'customer@example.com',
    domain: 'umbrella-reach.com',
    provider: 'microsoft',
    count: 4,
    runs: [{ failPositions: [2] }, {}],
  },
  {
    key: 'seed-007',
    owner: 'customer2@example.com',
    domain: 'hooli-mail.xyz',
    provider: 'google',
    count: 1,
    runs: [{}],
  },
  {
    key: 'seed-008',
    owner: 'customer2@example.com',
    domain: 'piedpiper-outbound.net',
    provider: 'microsoft',
    count: 8,
    runs: [{ failPositions: [4, 8] }],
  },
  {
    key: 'seed-009',
    owner: 'customer2@example.com',
    domain: 'stark-ventures.co',
    provider: 'google',
    count: 6,
    runs: [{}],
  },
  {
    key: 'seed-010',
    owner: 'customer2@example.com',
    domain: 'wayne-partners.com',
    provider: 'microsoft',
    count: 12,
    runs: [{ expired: true }],
  },
  {
    key: 'seed-011',
    owner: 'customer2@example.com',
    domain: 'cyberdyne-sales.ai',
    provider: 'google',
    count: 15,
    runs: [{ failPositions: [6] }, { failPositions: [] }],
  },
  {
    key: 'seed-012',
    owner: 'customer2@example.com',
    domain: 'soylent-reach.com',
    provider: 'microsoft',
    count: 3,
    runs: [{}],
  },
];

const SEED_WORKER = 'seed-worker:1';
const FAILURE_MESSAGES: Record<Provider, string> = {
  google: 'Google Workspace API: rate limit exceeded',
  microsoft: 'Microsoft Graph: request throttled',
};

/** Keeps every event of an order on its own millisecond so the audit log order is unambiguous. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 3));

async function seedUsers(container: Container): Promise<Map<string, Viewer>> {
  const { prisma } = container;
  const viewers = new Map<string, Viewer>();
  for (const user of SEED_USERS) {
    const email = user.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    // Keep the stored hash when the password already matches, so re-running changes nothing.
    const passwordHash =
      existing && (await verifyPassword(user.password, existing.passwordHash))
        ? existing.passwordHash
        : await hashPassword(user.password);
    const saved = await prisma.user.upsert({
      where: { email },
      create: { email, name: user.name, role: user.role, passwordHash },
      update: { name: user.name, role: user.role, passwordHash },
    });
    viewers.set(email, { id: saved.id, email: saved.email, name: saved.name, role: saved.role });
  }
  return viewers;
}

async function currentStatus(container: Container, orderId: string): Promise<OrderStatus> {
  const order = await container.repositories.orders.findById(orderId);
  if (!order) throw new Error(`Seed order ${orderId} disappeared.`);
  return order.status;
}

/** Plays one worker run through the real transition service and mailbox repository. */
async function playRun(container: Container, orderId: string, provider: Provider, run: SeedRun) {
  const { prisma } = container;
  const { orderTransitions } = container.services;
  const { mailboxes } = container.repositories;
  const worker = { type: 'WORKER', id: SEED_WORKER, label: SEED_WORKER } as const;

  await tick();
  await prisma.$transaction((tx) =>
    orderTransitions.transition({
      tx,
      orderId,
      from: 'PENDING',
      to: 'PROVISIONING',
      actor: worker,
      extraFields: { lockedBy: SEED_WORKER, lockedAt: new Date(), attempts: { increment: 1 } },
    }),
  );

  if (run.expired) {
    await tick();
    await prisma.$transaction((tx) =>
      orderTransitions.transition({
        tx,
        orderId,
        from: 'PROVISIONING',
        to: 'FAILED',
        actor: { type: 'SYSTEM', id: null, label: 'system' },
        reason: 'Worker lease expired',
        metadata: { previousWorker: SEED_WORKER },
        extraFields: { lockedBy: null, lockedAt: null, lastError: 'Worker lease expired' },
      }),
    );
    return;
  }

  const failing = new Set(run.failPositions ?? []);
  for (const mailbox of await mailboxes.listNotActive(orderId)) {
    if (failing.has(mailbox.position)) {
      await mailboxes.markFailed(mailbox.id, FAILURE_MESSAGES[provider]);
    } else {
      await mailboxes.markActive(mailbox.id, {
        externalId: `${provider === 'google' ? 'g' : 'ms'}-seed-${mailbox.id.slice(0, 8)}`,
        provisionedAt: new Date(),
      });
    }
  }

  const counts = await mailboxes.countByStatus(orderId);
  const total = counts.ACTIVE + counts.FAILED + counts.PENDING;
  const succeeded = counts.ACTIVE === total;
  await tick();
  await prisma.$transaction((tx) =>
    orderTransitions.transition({
      tx,
      orderId,
      from: 'PROVISIONING',
      to: succeeded ? 'ACTIVE' : 'FAILED',
      actor: worker,
      expectedLockedBy: SEED_WORKER,
      metadata: succeeded
        ? { active: counts.ACTIVE, total }
        : { active: counts.ACTIVE, failed: counts.FAILED, total },
      extraFields: {
        lockedBy: null,
        lockedAt: null,
        lastError: succeeded ? null : `${counts.FAILED} of ${total} mailboxes failed`,
      },
    }),
  );
}

async function seedOrders(container: Container, viewers: Map<string, Viewer>, admin: Viewer) {
  const { orderService } = container.services;
  let created = 0;
  for (const seed of SEED_ORDERS) {
    const owner = viewers.get(seed.owner);
    if (!owner) throw new Error(`Unknown seed owner ${seed.owner}.`);
    const { order, replayed } = await orderService.createOrder(
      owner,
      { domain: seed.domain, provider: seed.provider, mailboxCount: seed.count },
      seed.key,
    );
    if (replayed) continue; // Already seeded: fixed keys make the seed idempotent.
    created += 1;
    for (const [index, run] of seed.runs.entries()) {
      if (index > 0) {
        await tick();
        await orderService.retryOrder(admin, order.id);
      }
      await playRun(container, order.id, seed.provider, run);
    }
    const status = await currentStatus(container, order.id);
    if (status !== 'ACTIVE' && status !== 'FAILED') {
      throw new Error(`Seed order ${seed.key} ended in ${status}.`);
    }
  }
  return created;
}

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production.');
  }
  const prisma = createPrismaClient();
  try {
    const container = createContainer(prisma);
    const viewers = await seedUsers(container);
    const admin = viewers.get('admin@example.com');
    if (!admin) throw new Error('Admin seed user missing.');
    const created = await seedOrders(container, viewers, admin);

    const users = await prisma.user.findMany({ orderBy: { email: 'asc' } });
    console.log(`Users (${users.length}):`);
    for (const user of users) console.log(`  ${user.role.padEnd(8)} ${user.email}`);
    const byStatus = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
    const summary = byStatus.map((group) => `${group.status} ${group._count._all}`).join(', ');
    console.log(`Orders: ${await prisma.order.count()} (${summary}); created this run: ${created}`);
    console.log(`Order events: ${await prisma.orderEvent.count()}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
