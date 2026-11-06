import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { env } from '@/server/config/env';

export function createPrismaClient(connectionString: string = env.DATABASE_URL): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: env.LOG_LEVEL === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

// Cached on globalThis outside production so Next.js hot reload does not open a new pool each time.
const globalForPrisma = globalThis as unknown as { mailboxManagerPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.mailboxManagerPrisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.mailboxManagerPrisma = prisma;
}
