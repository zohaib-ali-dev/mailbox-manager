// Prisma 7 no longer loads .env by itself. Existing variables win (tests point DATABASE_URL at the
// test database before invoking the CLI). DATABASE_URL may be absent: `prisma generate` runs on
// postinstall before any .env exists and needs no connection.
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  ...(process.env.DATABASE_URL ? { datasource: { url: process.env.DATABASE_URL } } : {}),
});
