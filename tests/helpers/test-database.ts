// Test-only helper: resolves and guards the integration test database URL.
import { config } from 'dotenv';

config({ quiet: true });

export function resolveTestDatabaseUrl(): { url: string; name: string } {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set. Integration tests need their own database.');
  }
  let name: string;
  try {
    name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid connection string.');
  }
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against "${name}": the database name must end with _test.`,
    );
  }
  return { url, name };
}
