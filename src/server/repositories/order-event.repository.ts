import type {
  ActorType,
  OrderEvent,
  OrderStatus,
  Prisma,
  PrismaClient,
} from '@/generated/prisma/client';
import type { Db } from '@/server/db/types';

export interface NewOrderEvent {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: ActorType;
  actorId: string | null;
  actorLabel: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonObject | null;
}

/** The audit log is append-only: this repository deliberately has no update or delete methods. */
export class OrderEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  append(event: NewOrderEvent, tx: Db): Promise<OrderEvent> {
    const { metadata, reason, ...fields } = event;
    return tx.orderEvent.create({
      data: {
        ...fields,
        reason: reason ?? null,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  listForOrder(orderId: string, tx?: Db): Promise<OrderEvent[]> {
    return (tx ?? this.prisma).orderEvent.findMany({
      where: { orderId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}
