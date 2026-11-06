import { execFileSync } from 'node:child_process';
import { resolveTestDatabaseUrl } from '../helpers/test-database';

/** Runs once: applies every migration to the test database with `prisma migrate deploy`. */
export default function setup(): void {
  const { url, name } = resolveTestDatabaseUrl();
  console.log(`[integration] test database: ${name}`);
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, DATABASE_URL: url },
  });
  console.log(`[integration] migrations applied to ${name}`);
}
