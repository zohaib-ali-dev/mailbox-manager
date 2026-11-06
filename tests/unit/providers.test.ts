import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_FAILURE_MESSAGES,
  GoogleMockProvider,
} from '@/server/providers/google-mock.provider';
import { ProviderError, ProviderTimeoutError } from '@/server/providers/mailbox-provider';
import {
  MICROSOFT_FAILURE_MESSAGES,
  MicrosoftMockProvider,
} from '@/server/providers/microsoft-mock.provider';
import { createMockProviderRegistry } from '@/server/providers/provider-registry';
import { withTimeout } from '@/server/providers/with-timeout';

const request = {
  orderId: 'order-1',
  mailboxId: 'mailbox-1',
  address: 'box-01-abcdef12@example.com',
  domain: 'example.com',
  idempotencyKey: 'mailbox-1',
};

/** Returns the given values in order, then repeats the last one. */
function sequence(...values: number[]) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)]!;
}

function tuning(overrides: Partial<ConstructorParameters<typeof GoogleMockProvider>[0]> = {}) {
  const sleeps: number[] = [];
  return {
    sleeps,
    options: {
      minDelayMs: 1000,
      maxDelayMs: 3000,
      failureRate: 0.2,
      random: Math.random,
      sleep: async (ms: number) => {
        sleeps.push(ms);
      },
      ...overrides,
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('mock mailbox providers', () => {
  it('follows a fixed random sequence: draws are delay, failure roll, message', async () => {
    // Call 1: delay 0.5, roll 0.9 (>= 0.2, success). Call 2: delay 0, roll 0.1 (fail), message 0.99.
    const { options, sleeps } = tuning({ random: sequence(0.5, 0.9, 0, 0.1, 0.99) });
    const provider = new GoogleMockProvider(options);

    const ok = await provider.provisionMailbox(request);
    expect(ok.externalId).toMatch(/^g-/);
    expect(ok.provisionedAt).toBeInstanceOf(Date);

    const failure = await provider.provisionMailbox(request).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ProviderError);
    expect((failure as ProviderError).message).toBe(GOOGLE_FAILURE_MESSAGES.at(-1));
    expect((failure as ProviderError).retryable).toBe(true);
    expect(sleeps).toEqual([2000, 1000]);
  });

  it('never fails with failureRate 0', async () => {
    const { options } = tuning({ failureRate: 0 });
    const provider = new MicrosoftMockProvider(options);
    for (let i = 0; i < 200; i += 1)
      await expect(provider.provisionMailbox(request)).resolves.toBeTruthy();
  });

  it('always fails with failureRate 1, even if random returns exactly 1', async () => {
    const { options } = tuning({ failureRate: 1, random: sequence(0.3, 1, 0.5) });
    const provider = new MicrosoftMockProvider(options);
    await expect(provider.provisionMailbox(request)).rejects.toBeInstanceOf(ProviderError);
    const { options: real } = tuning({ failureRate: 1 });
    const realProvider = new GoogleMockProvider(real);
    for (let i = 0; i < 100; i += 1) {
      await expect(realProvider.provisionMailbox(request)).rejects.toBeInstanceOf(ProviderError);
    }
  });

  it('keeps every delay within the bounds', async () => {
    const { options, sleeps } = tuning({ failureRate: 0, minDelayMs: 1000, maxDelayMs: 3000 });
    const provider = new GoogleMockProvider(options);
    for (let i = 0; i < 300; i += 1) await provider.provisionMailbox(request);
    expect(Math.min(...sleeps)).toBeGreaterThanOrEqual(1000);
    expect(Math.max(...sleeps)).toBeLessThanOrEqual(3000);

    const edges = tuning({ failureRate: 0, random: sequence(0, 0.5, 0.9999999, 0.5) });
    const edgeProvider = new GoogleMockProvider(edges.options);
    await edgeProvider.provisionMailbox(request);
    await edgeProvider.provisionMailbox(request);
    expect(edges.sleeps).toEqual([1000, 3000]);
  });

  it('returns unique external ids with a per-provider prefix', async () => {
    const { options } = tuning({ failureRate: 0 });
    const google = new GoogleMockProvider(options);
    const microsoft = new MicrosoftMockProvider(options);
    const ids = new Set<string>();
    for (let i = 0; i < 100; i += 1) ids.add((await google.provisionMailbox(request)).externalId);
    expect(ids.size).toBe(100);
    expect((await microsoft.provisionMailbox(request)).externalId).toMatch(/^ms-/);
  });

  it('uses different failure messages per provider', async () => {
    const { options } = tuning({ failureRate: 1 });
    const google = (await new GoogleMockProvider(options)
      .provisionMailbox(request)
      .catch((e: unknown) => e)) as Error;
    const microsoft = (await new MicrosoftMockProvider(options)
      .provisionMailbox(request)
      .catch((e: unknown) => e)) as Error;
    expect(GOOGLE_FAILURE_MESSAGES).toContain(google.message);
    expect(MICROSOFT_FAILURE_MESSAGES).toContain(microsoft.message);
    expect(
      GOOGLE_FAILURE_MESSAGES.some((m) =>
        (MICROSOFT_FAILURE_MESSAGES as readonly string[]).includes(m),
      ),
    ).toBe(false);
  });

  it('guards its own constructor arguments', () => {
    expect(() => new GoogleMockProvider(tuning({ failureRate: 1.5 }).options)).toThrow(RangeError);
    expect(() => new GoogleMockProvider(tuning({ failureRate: -0.1 }).options)).toThrow(RangeError);
    expect(
      () => new GoogleMockProvider(tuning({ minDelayMs: 500, maxDelayMs: 100 }).options),
    ).toThrow(RangeError);
    expect(() => new GoogleMockProvider(tuning({ minDelayMs: -1 }).options)).toThrow(RangeError);
  });
});

describe('provider registry', () => {
  it('returns the right strategy for each provider', () => {
    const registry = createMockProviderRegistry(tuning().options);
    expect(registry.get('google')).toBeInstanceOf(GoogleMockProvider);
    expect(registry.get('google').name).toBe('google');
    expect(registry.get('microsoft')).toBeInstanceOf(MicrosoftMockProvider);
    expect(registry.get('microsoft').name).toBe('microsoft');
  });

  it('throws for an unknown provider at runtime', () => {
    const registry = createMockProviderRegistry(tuning().options);
    expect(() => registry.get('yahoo' as never)).toThrow(/unknown mailbox provider/i);
  });
});

describe('withTimeout', () => {
  it('resolves with the value when the promise settles in time and clears its timer', async () => {
    vi.useFakeTimers();
    const result = withTimeout(Promise.resolve('done'), 1000);
    await expect(result).resolves.toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('passes through the original rejection and clears its timer', async () => {
    vi.useFakeTimers();
    const result = withTimeout(Promise.reject(new ProviderError('boom')), 1000);
    await expect(result).rejects.toThrow('boom');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects with ProviderTimeoutError on time and leaves no timer running', async () => {
    vi.useFakeTimers();
    const never = new Promise<string>(() => {});
    const result = withTimeout(never, 1000);
    const assertion = expect(result).rejects.toBeInstanceOf(ProviderTimeoutError);
    await vi.advanceTimersByTimeAsync(999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
