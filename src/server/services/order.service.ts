import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { PrismaClient } from '@/generated/prisma/client';
import {
  isUniqueViolation,
  MAILBOX_ADDRESS_CONSTRAINT,
  ORDER_IDEMPOTENCY_CONSTRAINT,
} from '@/server/db/prisma-errors';
import {
  ForbiddenError,
  IdempotencyKeyMismatchError,
  IdempotencyKeyRequiredError,
  NotFoundError,
} from '@/server/domain/errors';
import { buildMailboxAddress } from '@/server/domain/mailbox-address';
import { assertTransition } from '@/server/domain/order-state-machine';
import { computeRequestHash } from '@/server/domain/request-hash';
import { parseOrThrow } from '@/server/domain/validation';
import type { Viewer } from '@/server/domain/viewer';
import { toAdminOrderSummary, toOrderDetail, toOrderSummary } from '@/server/mappers/order.mapper';
import type { MailboxRepository } from '@/server/repositories/mailbox.repository';
import type { OrderRecord, OrderRepository } from '@/server/repositories/order.repository';
import {
  adminOrderListQuerySchema,
  createOrderSchema,
  idempotencyKeySchema,
  orderListQuerySchema,
} from '@/shared/schemas/order.schema';
import type {
  AdminOrderSummary,
  OrderDetail,
  OrderSummary,
  Paginated,
} from '@/shared/types/order.dto';
import type { OrderTransitionService } from './order-transition.service';

export interface CreateOrderResult {
  order: OrderDetail;
  /** True when an earlier request with the same key and payload already created this order. */
  replayed: boolean;
}

const orderIdSchema = z.uuid();
/** Retries when a generated mailbox address collides with an existing one (astronomically rare). */
const MAX_ADDRESS_COLLISION_RETRIES = 3;

export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly orders: OrderRepository,
    private readonly mailboxes: MailboxRepository,
    private readonly transitions: OrderTransitionService,
  ) {}

  /**
   * Idempotent creation. The unique (user_id, idempotency_key) constraint is the final arbiter: a
   * concurrent duplicate loses the insert race, re-reads the winner and replays it.
   */
  async createOrder(
    viewer: Viewer,
    rawInput: unknown,
    rawIdempotencyKey: unknown,
  ): Promise<CreateOrderResult> {
    if (viewer.role !== 'CUSTOMER') throw new ForbiddenError('Only customers can create orders.');

    const key = idempotencyKeySchema.safeParse(rawIdempotencyKey);
    if (!key.success) throw new IdempotencyKeyRequiredError();
    const idempotencyKey = key.data;
    const input = parseOrThrow(createOrderSchema, rawInput);
    const requestHash = computeRequestHash(input);

    const existing = await this.orders.findByUserAndKey(viewer.id, idempotencyKey);
    if (existing) return this.replay(existing, requestHash, viewer);

    for (let attempt = 1; ; attempt += 1) {
      const orderId = randomUUID();
      try {
        await this.prisma.$transaction(async (tx) => {
          const order = await this.orders.createWithMailboxes(
            {
              id: orderId,
              userId: viewer.id,
              domain: input.domain,
              provider: input.provider,
              mailboxCount: input.mailboxCount,
              idempotencyKey,
              requestHash,
              mailboxes: Array.from({ length: input.mailboxCount }, (_, index) => ({
                position: index + 1,
                address: buildMailboxAddress(orderId, index + 1, input.domain),
              })),
            },
            tx,
          );
          await this.transitions.recordCreation(tx, order, {
            type: 'CUSTOMER',
            id: viewer.id,
            label: viewer.email,
          });
        });
        return { order: await this.loadDetail(orderId, viewer), replayed: false };
      } catch (error) {
        if (isUniqueViolation(error, ORDER_IDEMPOTENCY_CONSTRAINT)) {
          const winner = await this.orders.findByUserAndKey(viewer.id, idempotencyKey);
          if (winner) return this.replay(winner, requestHash, viewer);
        }
        if (
          isUniqueViolation(error, MAILBOX_ADDRESS_CONSTRAINT) &&
          attempt < MAX_ADDRESS_COLLISION_RETRIES
        ) {
          continue;
        }
        throw error;
      }
    }
  }

  /** Customers get 404 (never 403) for orders they do not own, so ids cannot be probed. */
  async getOrderForViewer(viewer: Viewer, orderId: string): Promise<OrderDetail> {
    if (!orderIdSchema.safeParse(orderId).success) throw new NotFoundError('Order not found.');
    const order = await this.orders.findDetailById(orderId);
    if (!order || (viewer.role !== 'ADMIN' && order.userId !== viewer.id)) {
      throw new NotFoundError('Order not found.');
    }
    return toOrderDetail(order, viewer);
  }

  async listOrdersForCustomer(viewer: Viewer, rawQuery: unknown): Promise<Paginated<OrderSummary>> {
    if (viewer.role !== 'CUSTOMER') throw new ForbiddenError();
    const query = parseOrThrow(orderListQuerySchema, rawQuery);
    const { items, total } = await this.orders.listForUser(viewer.id, query.page, query.pageSize);
    return {
      items: items.map(toOrderSummary),
      meta: pageMeta(query.page, query.pageSize, total),
    };
  }

  async listOrdersForAdmin(
    viewer: Viewer,
    rawQuery: unknown,
  ): Promise<Paginated<AdminOrderSummary>> {
    if (viewer.role !== 'ADMIN') throw new ForbiddenError();
    const query = parseOrThrow(adminOrderListQuerySchema, rawQuery);
    const { items, total } = await this.orders.listAll(
      { status: query.status, provider: query.provider },
      query.page,
      query.pageSize,
    );
    return {
      items: items.map(toAdminOrderSummary),
      meta: pageMeta(query.page, query.pageSize, total),
    };
  }

  /**
   * Admin retry: FAILED -> PENDING and only FAILED mailboxes back to PENDING, in one transaction.
   * Two concurrent retries: one wins, the other gets CONCURRENT_MODIFICATION (409).
   */
  async retryOrder(viewer: Viewer, orderId: string): Promise<OrderDetail> {
    if (viewer.role !== 'ADMIN') throw new ForbiddenError('Only admins can retry orders.');
    if (!orderIdSchema.safeParse(orderId).success) throw new NotFoundError('Order not found.');

    await this.prisma.$transaction(async (tx) => {
      const order = await this.orders.findById(orderId, tx);
      if (!order) throw new NotFoundError('Order not found.');
      assertTransition(order.status, 'PENDING', 'ADMIN');
      await this.transitions.transition({
        tx,
        orderId,
        from: order.status,
        to: 'PENDING',
        actor: { type: 'ADMIN', id: viewer.id, label: viewer.email },
        reason: 'Retried by admin',
        extraFields: { lockedBy: null, lockedAt: null, lastError: null },
      });
      await this.mailboxes.resetFailedToPending(orderId, tx);
    });
    return this.loadDetail(orderId, viewer);
  }

  private async replay(
    existing: OrderRecord,
    requestHash: string,
    viewer: Viewer,
  ): Promise<CreateOrderResult> {
    if (existing.requestHash !== requestHash) throw new IdempotencyKeyMismatchError();
    return { order: await this.loadDetail(existing.id, viewer), replayed: true };
  }

  private async loadDetail(orderId: string, viewer: Viewer): Promise<OrderDetail> {
    const order = await this.orders.findDetailById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    return toOrderDetail(order, viewer);
  }
}

function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
