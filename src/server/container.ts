import type { PrismaClient } from '@/generated/prisma/client';
import { MailboxRepository } from '@/server/repositories/mailbox.repository';
import { OrderEventRepository } from '@/server/repositories/order-event.repository';
import { OrderRepository } from '@/server/repositories/order.repository';
import { UserRepository } from '@/server/repositories/user.repository';
import { OrderTransitionService } from '@/server/services/order-transition.service';
import { OrderService } from '@/server/services/order.service';

/**
 * Composition root: the only place repositories and services are constructed (constructor
 * injection). Tests call createContainer with their own Prisma client.
 */
export function createContainer(prisma: PrismaClient) {
  const users = new UserRepository(prisma);
  const orders = new OrderRepository(prisma);
  const mailboxes = new MailboxRepository(prisma);
  const orderEvents = new OrderEventRepository(prisma);
  const orderTransitions = new OrderTransitionService(orders, orderEvents);
  const orderService = new OrderService(prisma, orders, mailboxes, orderTransitions);

  return {
    prisma,
    repositories: { users, orders, mailboxes, orderEvents },
    services: { orderTransitions, orderService },
  };
}

export type Container = ReturnType<typeof createContainer>;

let appContainer: Container | undefined;

/** The app-wide container, built lazily on first use with the shared Prisma singleton. */
export async function getContainer(): Promise<Container> {
  if (!appContainer) {
    const { prisma } = await import('@/server/db/prisma');
    appContainer = createContainer(prisma);
  }
  return appContainer;
}
