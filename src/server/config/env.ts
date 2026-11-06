import { z } from 'zod';

/**
 * The ONLY module that reads process.env. Validated once, at import, failing fast with the names of
 * the broken variables and never their values. Deliberately free of `server-only`: the worker, the
 * seed and the tests import it from plain Node.
 */

export const DEV_SESSION_SECRET_PLACEHOLDER =
  'dev-only-insecure-session-secret-change-me-0123456789';

const int = (min: number, max: number, fallback: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

const postgresUrl = z
  .string()
  .trim()
  .min(1, 'is required')
  .refine(
    (value) => /^postgres(ql)?:\/\//.test(value),
    'must be a postgresql:// connection string',
  );

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: postgresUrl,
    TEST_DATABASE_URL: postgresUrl.optional(),
    SESSION_SECRET: z.string().min(32, 'must be at least 32 characters'),
    SESSION_TTL_HOURS: int(1, 720, 8),
    SHOW_DEMO_CREDENTIALS: z.stringbool().default(true),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    WORKER_POLL_INTERVAL_MS: int(50, 600_000, 1000),
    WORKER_HEARTBEAT_INTERVAL_MS: int(100, 600_000, 5000),
    WORKER_LEASE_TIMEOUT_MS: int(1000, 3_600_000, 60_000),
    WORKER_SHUTDOWN_GRACE_MS: int(0, 600_000, 30_000),
    PROVIDER_CONCURRENCY: int(1, 10, 5),
    PROVIDER_CALL_TIMEOUT_MS: int(100, 600_000, 10_000),
    MOCK_PROVIDER_MIN_DELAY_MS: int(0, 600_000, 1000),
    MOCK_PROVIDER_MAX_DELAY_MS: int(0, 600_000, 3000),
    MOCK_PROVIDER_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.2),
  })
  .superRefine((value, ctx) => {
    if (value.MOCK_PROVIDER_MIN_DELAY_MS > value.MOCK_PROVIDER_MAX_DELAY_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['MOCK_PROVIDER_MIN_DELAY_MS'],
        message: 'must be less than or equal to MOCK_PROVIDER_MAX_DELAY_MS',
      });
    }
    if (3 * value.WORKER_HEARTBEAT_INTERVAL_MS >= value.WORKER_LEASE_TIMEOUT_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['WORKER_LEASE_TIMEOUT_MS'],
        message: 'must be greater than 3 x WORKER_HEARTBEAT_INTERVAL_MS',
      });
    }
    if (
      value.NODE_ENV === 'production' &&
      value.SESSION_SECRET === DEV_SESSION_SECRET_PLACEHOLDER
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_SECRET'],
        message: 'is the development placeholder; generate a real secret for production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  override readonly name = 'EnvValidationError';
}

/** Parses an env-like record. Exported for tests; the app uses `env`. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  // Empty strings mean "not set" so `FOO=` in .env falls back to the default.
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value !== ''),
  );
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const name = issue.path.join('.') || '(root)';
      const message =
        issue.code === 'invalid_type' && issue.input === undefined ? 'is required' : issue.message;
      return `  - ${name}: ${message}`;
    });
    throw new EnvValidationError(
      `Invalid environment configuration (values are never printed):\n${problems.join('\n')}`,
    );
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
