import type { OrderStatus, Prisma, PrismaClient, Provider } from '@/generated/prisma/client';
import type { Db } from '@/server/db/types';

/** Includes for the detail view: mailboxes by position, events oldest first, owner email. */
const detailInclude = {
  mailboxes: { orderBy: { position: 'asc' } },
  events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
  user: { select: { email: true } },
} as const satisfies Prisma.OrderInclude;

const adminListInclude = {
  user: { select: { email: true } },
} as const satisfies Prisma.OrderInclude;

/** created_at DESC, id DESC: stable when timestamps tie. */
const LIST_ORDER: Prisma.OrderOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];

export type OrderDetailRecord = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;
export type AdminOrderRecord = Prisma.OrderGetPayload<{ include: typeof adminListInclude }>;
export type OrderRecord = Prisma.OrderGetPayload<object>;

export interface NewOrder {
  id: string;
  userId: string;
  domain: string;
  provider: Provider;
  mailboxCount: number;
  idempotencyKey: string;
  requestHash: string;
  mailboxes: { position: number; address: string }[];
}

export interface AdminOrderFilters {
  status?: OrderStatus;
  provider?: Provider;
}

/** Fields a transition may set besides `status`. */
export type TransitionExtraFields = Omit<Prisma.OrderUpdateManyMutationInput, 'status'>;

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Order and all of its mailboxes. Call inside a transaction so neither exists without the other. */
  async createWithMailboxes(order: NewOrder, tx: Db): Promise<OrderRecord> {
    const { mailboxes, ...fields } = order;
    const created = await tx.order.create({ data: fields });
    await tx.mailbox.createMany({
      data: mailboxes.map((mailbox) => ({ ...mailbox, orderId: order.id })),
    });
    return created;
  }

  findByUserAndKey(userId: string, idempotencyKey: string, tx?: Db): Promise<OrderRecord | null> {
    return (tx ?? this.prisma).order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
  }

  findById(id: string, tx?: Db): Promise<OrderRecord | null> {
    return (tx ?? this.prisma).order.findUnique({ where: { id } });
  }

  findDetailById(id: string, tx?: Db): Promise<OrderDetailRecord | null> {
    return (tx ?? this.prisma).order.findUnique({ where: { id }, include: detailInclude });
  }

  async listForUser(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: OrderRecord[]; total: number }> {
    const where: Prisma.OrderWhereInput = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: LIST_ORDER,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async listAll(
    filters: AdminOrderFilters,
    page: number,
    pageSize: number,
  ): Promise<{ items: AdminOrderRecord[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.provider ? { provider: filters.provider } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: adminListInclude,
        orderBy: LIST_ORDER,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Conditional status write: matches only while the status is still `from` (and `locked_by` still
   * equals `expectedLockedBy` when given). Returns the number of rows updated (0 or 1).
   * ONLY OrderTransitionService may call this.
   */
  async updateStatusIfCurrent(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    extraFields: TransitionExtraFields,
    expectedLockedBy: string | null | undefined,
    tx: Db,
  ): Promise<number> {
    const result = await tx.order.updateMany({
      where: {
        id,
        status: from,
        ...(expectedLockedBy !== undefined ? { lockedBy: expectedLockedBy } : {}),
      },
      data: { ...extraFields, status: to },
    });
    return result.count;
  }
}
