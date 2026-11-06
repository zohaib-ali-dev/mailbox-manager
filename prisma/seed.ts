import '@/server/config/load-env';
import { env } from '@/server/config/env';
import { createPrismaClient } from '@/server/db/prisma';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import type { Role } from '@/generated/prisma/client';

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export const SEED_USERS: readonly SeedUser[] = [
  { email: 'admin@example.com', name: 'Ada Admin', password: 'Admin123!', role: 'ADMIN' },
  {
    email: 'customer@example.com',
    name: 'Casey Customer',
    password: 'Customer123!',
    role: 'CUSTOMER',
  },
  {
    email: 'customer2@example.com',
    name: 'Chris Customer',
    password: 'Customer123!',
    role: 'CUSTOMER',
  },
];

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production.');
  }
  const prisma = createPrismaClient();
  try {
    for (const user of SEED_USERS) {
      const email = user.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      // Keep the stored hash when the password already matches, so re-running changes nothing.
      const passwordHash =
        existing && (await verifyPassword(user.password, existing.passwordHash))
          ? existing.passwordHash
          : await hashPassword(user.password);
      await prisma.user.upsert({
        where: { email },
        create: { email, name: user.name, role: user.role, passwordHash },
        update: { name: user.name, role: user.role, passwordHash },
      });
    }
    const users = await prisma.user.findMany({ orderBy: { email: 'asc' } });
    console.log(`Seeded ${users.length} users:`);
    for (const user of users) console.log(`  ${user.role.padEnd(8)} ${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
