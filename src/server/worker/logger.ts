import { env } from '@/server/config/env';
import { createLogger, type Logger } from '@/server/logger';

/** One JSON line per event with time, level, workerId, orderId (when relevant) and message. */
export function createWorkerLogger(workerId: string): Logger {
  return createLogger({ level: env.LOG_LEVEL, base: { workerId } });
}
