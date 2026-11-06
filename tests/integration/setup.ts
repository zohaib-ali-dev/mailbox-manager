// Runs in every integration test file BEFORE the file's imports, so the app's env module and any
// Prisma client see the test database, never the development one.
import { resolveTestDatabaseUrl } from '../helpers/test-database';

const { url } = resolveTestDatabaseUrl();
process.env.DATABASE_URL = url;
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
