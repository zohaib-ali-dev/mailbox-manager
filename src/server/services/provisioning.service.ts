import type { PrismaClient } from '@/generated/prisma/client';
import { ConcurrentModificationError, NotFoundError } from '@/server/domain/errors';
import { silentLogger, type Logger } from '@/server/logger';
import { ProviderError } from '@/server/providers/mailbox-provider';
import type { ProviderRegistry } from '@/server/providers/provider-registry';
import { withTimeout } from '@/server/providers/with-timeout';
import type { MailboxRepository } from '@/server/repositories/mailbox.repository';
import type { OrderRepository } from '@/server/repositories/order.repository';
import type { OrderTransitionService } from './order-transition.service';

export interface ProvisioningConfig {
  /** Provider calls in flight per order (1 to 10). */
  providerConcurrency: number;
  providerCallTimeoutMs: number;
  heartbeatIntervalMs: number;
  leaseTimeoutMs: number;
}

export interface ClaimedOrder {
  orderId: string;
  attempts: number;
}

export interface ProcessResult {
  /** True when another actor took the lease; the result must not be finalized. */
  leaseLost: boolean;
  attempted: number;
}

export type FinalizeOutcome = 'ACTIVE' | 'FAILED' | 'discarded';

const SAFE_UNEXPECTED_FAILURE = 'Provider call failed unexpectedly';
const SWEEP_BATCH = 20;

/**
 * Turns PENDING orders into ACTIVE or FAILED ones safely:
 * claim (short transaction, SKIP LOCKED) -> process (no transaction, bounded concurrency, timeout
 * per call, heartbeat) -> finalize (transaction, fenced on locked_by). failStaleOrders recovers
 * orders of crashed workers.
 */
export class ProvisioningService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly orders: OrderRepository,
    private readonly mailboxes: MailboxRepository,
    private readonly transitions: OrderTransitionService,
    private readonly providers: ProviderRegistry,
    private readonly config: ProvisioningConfig,
    private readonly logger: Logger = silentLogger,
  ) {}

  /** Claims the oldest PENDING order for this worker, or returns null when there is none. */
  async claimNextOrder(workerId: string): Promise<ClaimedOrder | null> {
    return this.prisma.$transaction(async (tx) => {
      const next = await this.orders.lockNextPending(tx);
      if (!next) return null;
      await this.transitions.transition({
        tx,
        orderId: next.id,
        from: 'PENDING',
        to: 'PROVISIONING',
        actor: { type: 'WORKER', id: workerId, label: workerId },
        extraFields: { lockedBy: workerId, lockedAt: next.dbNow, attempts: { increment: 1 } },
      });
      const order = await this.orders.findById(next.id, tx);
      return { orderId: next.id, attempts: order?.attempts ?? 1 };
    });
  }

  /**
   * Provisions every mailbox that is not ACTIVE yet, OUTSIDE any transaction. Each mailbox row is
   * written as soon as its call settles. Stops starting new calls once the lease is lost.
   */
  async processOrder(orderId: string, workerId: string): Promise<ProcessResult> {
    const log = this.logger.child({ orderId });
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');

    let leaseLost = !(await this.renewLeaseSafely(orderId, workerId, log));
    if (leaseLost) {
      log.warn('lease not held at start of processing, skipping');
      return { leaseLost: true, attempted: 0 };
    }

    let heartbeatRunning = false;
    const heartbeat = setInterval(() => {
      if (heartbeatRunning || leaseLost) return;
      heartbeatRunning = true;
      void this.renewLeaseSafely(orderId, workerId, log)
        .then((held) => {
          if (!held) {
            leaseLost = true;
            log.warn('lease lost, no new provider calls will start');
          }
        })
        .finally(() => {
          heartbeatRunning = false;
        });
    }, this.config.heartbeatIntervalMs);

    const provider = this.providers.get(order.provider);
    const pending = await this.mailboxes.listNotActive(orderId);
    let attempted = 0;

    try {
      await runPool(
        pending,
        this.config.providerConcurrency,
        () => leaseLost,
        async (mailbox) => {
          attempted += 1;
          try {
            const result = await withTimeout(
              provider.provisionMailbox({
                orderId,
                mailboxId: mailbox.id,
                address: mailbox.address,
                domain: order.domain,
                idempotencyKey: mailbox.id,
              }),
              this.config.providerCallTimeoutMs,
            );
            await this.mailboxes.markActive(mailbox.id, result);
            log.debug('mailbox provisioned', { mailboxId: mailbox.id });
          } catch (error) {
            const message =
              error instanceof ProviderError ? error.message : SAFE_UNEXPECTED_FAILURE;
            if (!(error instanceof ProviderError)) {
              log.error('unexpected provider failure', { mailboxId: mailbox.id, error });
            }
            await this.mailboxes.markFailed(mailbox.id, message).catch((writeError: unknown) =>
              log.error('could not record mailbox failure', {
                mailboxId: mailbox.id,
                error: writeError,
              }),
            );
          }
        },
      );
    } finally {
      clearInterval(heartbeat);
    }
    return { leaseLost, attempted };
  }

  /**
   * Decides ACTIVE (every mailbox active) or FAILED in one transaction, fenced on locked_by: if
   * another actor already decided (sweeper, retry), the result is discarded.
   */
  async finalizeOrder(orderId: string, workerId: string): Promise<FinalizeOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const counts = await this.mailboxes.countByStatus(orderId, tx);
        const total = counts.ACTIVE + counts.FAILED + counts.PENDING;
        const succeeded = total > 0 && counts.ACTIVE === total;
        const failed = total - counts.ACTIVE;
        await this.transitions.transition({
          tx,
          orderId,
          from: 'PROVISIONING',
          to: succeeded ? 'ACTIVE' : 'FAILED',
          actor: { type: 'WORKER', id: workerId, label: workerId },
          expectedLockedBy: workerId,
          metadata: succeeded
            ? { active: counts.ACTIVE, total }
            : { active: counts.ACTIVE, failed, total },
          extraFields: {
            lockedBy: null,
            lockedAt: null,
            lastError: succeeded ? null : `${failed} of ${total} mailboxes failed`,
          },
        });
        return succeeded ? 'ACTIVE' : 'FAILED';
      });
    } catch (error) {
      if (error instanceof ConcurrentModificationError || error instanceof NotFoundError) {
        this.logger.warn('lease lost, result discarded', { orderId });
        return 'discarded';
      }
      throw error;
    }
  }

  /** Process then finalize, unless the lease was lost while processing. */
  async processAndFinalize(orderId: string, workerId: string): Promise<FinalizeOutcome> {
    const result = await this.processOrder(orderId, workerId);
    if (result.leaseLost) {
      this.logger.warn('lease lost, result discarded', { orderId });
      return 'discarded';
    }
    return this.finalizeOrder(orderId, workerId);
  }

  /**
   * Moves PROVISIONING orders with an expired lease (database clock) to FAILED as SYSTEM. Their
   * unfinished mailboxes stay PENDING and are provisioned on retry. Returns how many were failed.
   */
  async failStaleOrders(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const expired = await this.orders.lockExpiredLeases(
        this.config.leaseTimeoutMs,
        SWEEP_BATCH,
        tx,
      );
      for (const order of expired) {
        await this.transitions.transition({
          tx,
          orderId: order.id,
          from: 'PROVISIONING',
          to: 'FAILED',
          actor: { type: 'SYSTEM', id: null, label: 'system' },
          reason: 'Worker lease expired',
          metadata: { previousWorker: order.lockedBy },
          expectedLockedBy: order.lockedBy,
          extraFields: { lockedBy: null, lockedAt: null, lastError: 'Worker lease expired' },
        });
        this.logger.warn('worker lease expired, order failed', {
          orderId: order.id,
          previousWorker: order.lockedBy,
        });
      }
      return expired.length;
    });
  }

  private async renewLeaseSafely(orderId: string, workerId: string, log: Logger): Promise<boolean> {
    try {
      return await this.orders.renewLease(orderId, workerId);
    } catch (error) {
      // A transient database error is not proof the lease is gone; fencing protects finalize.
      log.error('heartbeat failed', { error });
      return true;
    }
  }
}

/** Runs `task` over `items` with at most `limit` in flight; stops taking new items when told to. */
async function runPool<T>(
  items: readonly T[],
  limit: number,
  shouldStop: () => boolean,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length && !shouldStop()) {
      const item = items[next];
      next += 1;
      if (item !== undefined) await task(item);
    }
  });
  await Promise.all(lanes);
}
