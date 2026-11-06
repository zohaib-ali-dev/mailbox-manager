import type { Logger } from '@/server/logger';
import type { ProvisioningService } from '@/server/services/provisioning.service';

export interface WorkerOptions {
  workerId: string;
  pollIntervalMs: number;
  /** Pause after an unexpected error in one iteration. */
  errorBackoffMs?: number;
}

/** Sleeps for `ms`, or less if `signal` aborts. Never rejects. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}

/**
 * The loop: sweep expired leases -> claim -> process and finalize, or sleep when idle. One order at
 * a time per process; scale by running more processes. Scheduling only: every rule lives in
 * ProvisioningService.
 */
export class Worker {
  private stopping = false;
  private readonly wake = new AbortController();
  private currentOrderId: string | null = null;

  constructor(
    private readonly provisioning: ProvisioningService,
    private readonly logger: Logger,
    private readonly options: WorkerOptions,
  ) {}

  get busyWith(): string | null {
    return this.currentOrderId;
  }

  /** Stops claiming new orders. The current order (if any) runs to completion. */
  stop(): void {
    this.stopping = true;
    this.wake.abort();
  }

  /** Resolves once the loop has stopped. */
  async run(): Promise<void> {
    const { workerId, pollIntervalMs, errorBackoffMs = 2000 } = this.options;
    this.logger.info('worker loop started');
    while (!this.stopping) {
      try {
        const swept = await this.provisioning.failStaleOrders();
        if (swept > 0)
          this.logger.warn('sweeper failed orders with expired leases', { count: swept });
        if (this.stopping) break;

        const claimed = await this.provisioning.claimNextOrder(workerId);
        if (!claimed) {
          this.logger.debug('no pending orders');
          await sleep(pollIntervalMs, this.wake.signal);
          continue;
        }

        this.currentOrderId = claimed.orderId;
        const log = this.logger.child({ orderId: claimed.orderId });
        log.info('order claimed', { attempts: claimed.attempts });
        const startedAt = Date.now();
        const outcome = await this.provisioning.processAndFinalize(claimed.orderId, workerId);
        log.info('order finished', { outcome, durationMs: Date.now() - startedAt });
      } catch (error) {
        this.logger.error('worker iteration failed, backing off', {
          orderId: this.currentOrderId ?? undefined,
          error,
        });
        await sleep(errorBackoffMs, this.wake.signal);
      } finally {
        this.currentOrderId = null;
      }
    }
    this.logger.info('worker loop stopped');
  }
}
