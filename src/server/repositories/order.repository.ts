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

  /**
   * Worker claim, step 1: locks the oldest PENDING order with FOR UPDATE SKIP LOCKED, so two
   * workers can never select the same row. Must run inside the claiming transaction. Also returns
   * the database clock, used for `locked_at`.
   */
  async lockNextPending(tx: Db): Promise<{ id: string; dbNow: Date } | null> {
    const rows = await tx.$queryRaw<{ id: string; db_now: Date }[]>`
      SELECT "id", now() AS "db_now"
      FROM "orders"
      WHERE "status" = 'PENDING'
      ORDER BY "created_at", "id"
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    const row = rows[0];
    return row ? { id: row.id, dbNow: row.db_now } : null;
  }

  /**
   * Lease heartbeat: sets `locked_at` to the database clock while this worker still holds the
   * PROVISIONING lease. Returns false when the lease is lost. Does not touch `status`.
   */
  async renewLease(id: string, workerId: string): Promise<boolean> {
    const updated = await this.prisma.$executeRaw`
      UPDATE "orders"
      SET "locked_at" = now()
      WHERE "id" = ${id}::uuid AND "status" = 'PROVISIONING' AND "locked_by" = ${workerId}`;
    return updated === 1;
  }

  /**
   * Sweeper: locks PROVISIONING orders whose lease is older than `leaseTimeoutMs` by the DATABASE
   * clock (never the worker's clock), skipping rows another sweeper already holds.
   */
  async lockExpiredLeases(
    leaseTimeoutMs: number,
    limit: number,
    tx: Db,
  ): Promise<{ id: string; lockedBy: string | null }[]> {
    const rows = await tx.$queryRaw<{ id: string; locked_by: string | null }[]>`
      SELECT "id", "locked_by"
      FROM "orders"
      WHERE "status" = 'PROVISIONING'
        AND ("locked_at" IS NULL OR "locked_at" < now() - (${leaseTimeoutMs}::int * interval '1 millisecond'))
      ORDER BY "locked_at" NULLS FIRST, "id"
      LIMIT ${limit}::int
      FOR UPDATE SKIP LOCKED`;
    return rows.map((row) => ({ id: row.id, lockedBy: row.locked_by }));
  }
}
