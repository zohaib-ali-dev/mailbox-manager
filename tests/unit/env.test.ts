import { describe, expect, it, vi } from 'vitest';

// env.ts validates process.env on import; give it a valid minimum so the module loads.
vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://u:p@localhost:5432/unit_test';
  process.env.SESSION_SECRET ??= 'unit-test-secret-that-is-at-least-32-characters';
});
import { DEV_SESSION_SECRET_PLACEHOLDER, EnvValidationError, parseEnv } from '@/server/config/env';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  SESSION_SECRET: 'a-real-secret-that-is-at-least-32-characters-long',
};

describe('parseEnv', () => {
  it('applies defaults and coerces numbers', () => {
    const env = parseEnv(base);
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      SESSION_TTL_HOURS: 8,
      SHOW_DEMO_CREDENTIALS: true,
      MOCK_PROVIDER_FAILURE_RATE: 0.2,
      PROVIDER_CONCURRENCY: 5,
    });
    expect(
      parseEnv({ ...base, SHOW_DEMO_CREDENTIALS: 'false', PROVIDER_CONCURRENCY: '3' }),
    ).toMatchObject({
      SHOW_DEMO_CREDENTIALS: false,
      PROVIDER_CONCURRENCY: 3,
    });
  });

  it('names missing variables and never prints values', () => {
    const secretValue = 'postgresql://user:hunter2@db/x';
    let message = '';
    try {
      parseEnv({ DATABASE_URL: secretValue, MOCK_PROVIDER_FAILURE_RATE: '7' });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      message = (error as Error).message;
    }
    expect(message).toContain('SESSION_SECRET: is required');
    expect(message).toContain('MOCK_PROVIDER_FAILURE_RATE');
    expect(message).not.toContain('hunter2');
    expect(message).not.toContain('7');
  });

  it('enforces the cross-field rules', () => {
    expect(() =>
      parseEnv({ ...base, MOCK_PROVIDER_MIN_DELAY_MS: '500', MOCK_PROVIDER_MAX_DELAY_MS: '100' }),
    ).toThrow(/MOCK_PROVIDER_MIN_DELAY_MS/);
    expect(() =>
      parseEnv({ ...base, WORKER_HEARTBEAT_INTERVAL_MS: '5000', WORKER_LEASE_TIMEOUT_MS: '15000' }),
    ).toThrow(/WORKER_LEASE_TIMEOUT_MS/);
    expect(() => parseEnv({ ...base, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('refuses the placeholder secret in production, but not while building or in development', () => {
    const placeholder = { ...base, SESSION_SECRET: DEV_SESSION_SECRET_PLACEHOLDER };
    expect(() => parseEnv({ ...placeholder, NODE_ENV: 'production' })).toThrow(
      /SESSION_SECRET: is the development placeholder/,
    );
    expect(() =>
      parseEnv({ ...placeholder, NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }),
    ).not.toThrow();
    expect(() => parseEnv(placeholder)).not.toThrow();
  });

  it('treats empty strings as unset', () => {
    expect(parseEnv({ ...base, LOG_LEVEL: '' }).LOG_LEVEL).toBe('info');
  });
});
