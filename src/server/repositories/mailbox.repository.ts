import type { Mailbox, MailboxStatus, PrismaClient } from '@/generated/prisma/client';
import type { Db } from '@/server/db/types';

export type MailboxStatusCounts = Record<MailboxStatus, number>;

export class MailboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** FAILED mailboxes go back to PENDING; ACTIVE ones are never touched. */
  async resetFailedToPending(orderId: string, tx?: Db): Promise<number> {
    const result = await (tx ?? this.prisma).mailbox.updateMany({
      where: { orderId, status: 'FAILED' },
      data: { status: 'PENDING', lastError: null },
    });
    return result.count;
  }

  /** Conditional on the mailbox not already being ACTIVE, so a mailbox is never provisioned twice. */
  async markActive(
    id: string,
    result: { externalId: string; provisionedAt: Date },
    tx?: Db,
  ): Promise<boolean> {
    const updated = await (tx ?? this.prisma).mailbox.updateMany({
      where: { id, status: { not: 'ACTIVE' } },
      data: {
        status: 'ACTIVE',
        externalId: result.externalId,
        provisionedAt: result.provisionedAt,
        lastError: null,
        attempts: { increment: 1 },
      },
    });
    return updated.count === 1;
  }

  async markFailed(id: string, lastError: string, tx?: Db): Promise<boolean> {
    const updated = await (tx ?? this.prisma).mailbox.updateMany({
      where: { id, status: { not: 'ACTIVE' } },
      data: { status: 'FAILED', lastError, attempts: { increment: 1 } },
    });
    return updated.count === 1;
  }

  listNotActive(orderId: string, tx?: Db): Promise<Mailbox[]> {
    return (tx ?? this.prisma).mailbox.findMany({
      where: { orderId, status: { not: 'ACTIVE' } },
      orderBy: { position: 'asc' },
    });
  }

  async countByStatus(orderId: string, tx?: Db): Promise<MailboxStatusCounts> {
    const groups = await (tx ?? this.prisma).mailbox.groupBy({
      by: ['status'],
      where: { orderId },
      _count: { _all: true },
    });
    const counts: MailboxStatusCounts = { PENDING: 0, ACTIVE: 0, FAILED: 0 };
    for (const group of groups) counts[group.status] = group._count._all;
    return counts;
  }
}
