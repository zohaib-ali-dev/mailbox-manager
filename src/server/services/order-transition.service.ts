import type { Prisma } from '@/generated/prisma/client';
import type { TransactionClient } from '@/server/db/types';
import { ConcurrentModificationError, NotFoundError } from '@/server/domain/errors';
import { assertTransition } from '@/server/domain/order-state-machine';
import type { OrderEventRepository } from '@/server/repositories/order-event.repository';
import type {
  OrderRepository,
  TransitionExtraFields,
} from '@/server/repositories/order.repository';
import type { ActorType, OrderStatus } from '@/shared/constants';

export interface TransitionActor {
  type: ActorType;
  /** User id or worker id. */
  id: string | null;
  /** Display snapshot: user email or worker id. */
  label: string | null;
}

export interface TransitionRequest {
  tx: TransactionClient;
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  actor: TransitionActor;
  reason?: string;
  metadata?: Prisma.InputJsonObject;
  extraFields?: TransitionExtraFields;
  /** Fencing: when given, the update only matches while `locked_by` still equals this value. */
  expectedLockedBy?: string | null;
}

/**
 * The ONLY code that changes `orders.status`. Every change is asserted against the state machine,
 * written with a conditional update and recorded in the audit log, all in the caller's transaction.
 */
export class OrderTransitionService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: OrderEventRepository,
  ) {}

  async transition(request: TransitionRequest): Promise<void> {
    const { tx, orderId, from, to, actor } = request;
    assertTransition(from, to, actor.type);

    const updated = await this.orders.updateStatusIfCurrent(
      orderId,
      from,
      to,
      request.extraFields ?? {},
      request.expectedLockedBy,
      tx,
    );
    if (updated === 0) {
      const current = await this.orders.findById(orderId, tx);
      if (!current) throw new NotFoundError();
      throw new ConcurrentModificationError({ currentStatus: current.status });
    }

    await this.events.append(
      {
        orderId,
        fromStatus: from,
        toStatus: to,
        actorType: actor.type,
        actorId: actor.id,
        actorLabel: actor.label,
        reason: request.reason ?? null,
        metadata: request.metadata ?? null,
      },
      tx,
    );
  }

  /**
   * Writes the creation event (from null to PENDING). Not a transition: the order row was just
   * inserted with status PENDING in the same transaction.
   */
  async recordCreation(
    tx: TransactionClient,
    order: { id: string; mailboxCount: number },
    actor: TransitionActor,
  ): Promise<void> {
    await this.events.append(
      {
        orderId: order.id,
        fromStatus: null,
        toStatus: 'PENDING',
        actorType: actor.type,
        actorId: actor.id,
        actorLabel: actor.label,
        reason: 'Order created',
        metadata: { mailboxCount: order.mailboxCount },
      },
      tx,
    );
  }
}
