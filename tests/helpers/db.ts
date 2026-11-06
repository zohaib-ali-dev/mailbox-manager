import type { PrismaClient } from '@/generated/prisma/client';
import { createContainer } from '@/server/container';
import { createPrismaClient } from '@/server/db/prisma';
import { hashPassword } from '@/server/auth/password';
import type { Viewer } from '@/server/domain/viewer';
import type { Role } from '@/shared/constants';
import { resolveTestDatabaseUrl } from './test-database';

export function createTestContext() {
  const { url } = resolveTestDatabaseUrl();
  const prisma = createPrismaClient(url);
  return { prisma, container: createContainer(prisma) };
}

/** Empties every table before a test. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "order_events", "mailboxes", "orders", "users" RESTART IDENTITY CASCADE',
  );
}

let passwordHash: Promise<string> | undefined;

export async function createUser(
  prisma: PrismaClient,
  role: Role,
  email: string = `${role.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}@example.com`,
): Promise<Viewer> {
  passwordHash ??= hashPassword('Password123!');
  const user = await prisma.user.create({
    data: { email, name: `Test ${role}`, role, passwordHash: await passwordHash },
  });
  return { id: user.id, email: user.email, role: user.role };
}

export async function currentDatabaseName(prisma: PrismaClient): Promise<string> {
  const rows = await prisma.$queryRaw<{ name: string }[]>`select current_database() as name`;
  return rows[0]?.name ?? '';
}
