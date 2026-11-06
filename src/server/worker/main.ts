// Worker entry point: `npm run worker`. Plain Node via tsx; imports nothing from Next.js.
import '@/server/config/load-env';
import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { env } from '@/server/config/env';
import { createContainer } from '@/server/container';
import { createPrismaClient } from '@/server/db/prisma';
import { createWorkerLogger } from './logger';
import { Worker } from './worker';

const MAX_CONNECT_BACKOFF_MS = 10_000;

async function main(): Promise<void> {
  const workerId = `${hostname()}:${process.pid}:${randomBytes(3).toString('hex')}`;
  const logger = createWorkerLogger(workerId);
  logger.info('worker starting', {
    settings: {
      logLevel: env.LOG_LEVEL,
      pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
      heartbeatIntervalMs: env.WORKER_HEARTBEAT_INTERVAL_MS,
      leaseTimeoutMs: env.WORKER_LEASE_TIMEOUT_MS,
      shutdownGraceMs: env.WORKER_SHUTDOWN_GRACE_MS,
      providerConcurrency: env.PROVIDER_CONCURRENCY,
      providerCallTimeoutMs: env.PROVIDER_CALL_TIMEOUT_MS,
      mockDelayMs: [env.MOCK_PROVIDER_MIN_DELAY_MS, env.MOCK_PROVIDER_MAX_DELAY_MS],
      mockFailureRate: env.MOCK_PROVIDER_FAILURE_RATE,
    },
  });

  const prisma = createPrismaClient();
  const container = createContainer(prisma, { logger });
  const worker = new Worker(container.services.provisioningService, logger, {
    workerId,
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
  });

  let shuttingDown = false;
  let signalCount = 0;
  const onSignal = (signal: NodeJS.Signals) => {
    signalCount += 1;
    if (signalCount > 1) {
      logger.warn('second signal received, exiting immediately', { signal });
      process.exit(1);
    }
    shuttingDown = true;
    logger.info('shutdown requested, finishing the current order', {
      signal,
      orderId: worker.busyWith ?? undefined,
      graceMs: env.WORKER_SHUTDOWN_GRACE_MS,
    });
    worker.stop();
    // Bound the wait: past the grace period, exit and let the sweeper recover the order.
    setTimeout(() => {
      logger.warn('shutdown grace period elapsed, exiting; the sweeper will recover the order', {
        orderId: worker.busyWith ?? undefined,
      });
      process.exit(0);
    }, env.WORKER_SHUTDOWN_GRACE_MS).unref();
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  // Wait for the database with backoff instead of crashing when it is not up yet.
  for (let backoff = 1000; !shuttingDown; backoff = Math.min(backoff * 2, MAX_CONNECT_BACKOFF_MS)) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      break;
    } catch (error) {
      logger.error(`database unreachable, retrying in ${backoff / 1000}s`, {
        error: error instanceof Error ? error.message : String(error),
      });
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  if (!shuttingDown) await worker.run();
  await prisma.$disconnect();
  logger.info('worker stopped');
  process.exit(0);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({ time: new Date().toISOString(), level: 'error', message: 'worker crashed', error: error instanceof Error ? error.message : String(error) })}\n`,
  );
  process.exit(1);
});
