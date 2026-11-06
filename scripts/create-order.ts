// Dev CLI: create an order through OrderService (to exercise the worker before the UI exists).
// npm run order:create -- --email customer@example.com --domain example.com --provider google --count 3
import '@/server/config/load-env';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { env } from '@/server/config/env';
import { createContainer } from '@/server/container';
import { createPrismaClient } from '@/server/db/prisma';
import { AppError } from '@/server/domain/errors';

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') throw new Error('Refusing to run: NODE_ENV is production.');

  const { values } = parseArgs({
    options: {
      email: { type: 'string', default: 'customer@example.com' },
      domain: { type: 'string', default: 'example.com' },
      provider: { type: 'string', default: 'google' },
      count: { type: 'string', default: '3' },
    },
    strict: true,
  });

  const prisma = createPrismaClient();
  try {
    const { services, repositories } = createContainer(prisma);
    const user = await repositories.users.findByEmail(values.email ?? '');
    if (!user) throw new Error(`No user with email ${values.email}. Run npm run db:seed first.`);
    const count = Number(values.count);
    const { order } = await services.orderService.createOrder(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { domain: values.domain, provider: values.provider, mailboxCount: count },
      randomUUID(),
    );
    console.log(
      `Created order ${order.id} (${order.provider}, ${order.mailboxCount} mailboxes, ${order.domain}) status ${order.status}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof AppError) {
    const details = Array.isArray(error.details)
      ? (error.details as { path: string; message: string }[])
          .map((d) => `\n  - ${d.path}: ${d.message}`)
          .join('')
      : '';
    console.error(`${error.code}: ${error.message}${details}`);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exit(1);
});
