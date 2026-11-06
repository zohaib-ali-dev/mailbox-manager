import type { Prisma, PrismaClient } from '@/generated/prisma/client';

/** Either the root client or an interactive transaction client. */
export type Db = PrismaClient | Prisma.TransactionClient;
export type TransactionClient = Prisma.TransactionClient;
