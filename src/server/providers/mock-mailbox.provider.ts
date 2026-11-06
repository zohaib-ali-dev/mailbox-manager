import { randomUUID } from 'node:crypto';
import type { Provider } from '@/shared/constants';
import {
  ProviderError,
  type MailboxProvider,
  type ProvisionMailboxRequest,
  type ProvisionMailboxResult,
} from './mailbox-provider';

export type RandomFn = () => number;
export type SleepFn = (ms: number) => Promise<void>;

/** Latency and failure knobs shared by every mock provider (from MOCK_PROVIDER_* in env). */
export interface MockProviderTuning {
  minDelayMs: number;
  maxDelayMs: number;
  /** Probability (0 to 1) that one call fails. */
  failureRate: number;
  /** Defaults to Math.random. Inject a fixed sequence in tests. */
  random?: RandomFn;
  /** Defaults to a real timer. Inject an instant sleep in tests. */
  sleep?: SleepFn;
}

export interface MockProviderOptions extends MockProviderTuning {
  externalIdPrefix: string;
  failureMessages: readonly string[];
}

export const realSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulates a provider API: waits a random delay within the bounds, then fails with probability
 * `failureRate` or succeeds with a unique external id. Random draws per call, in order: delay,
 * failure roll, then (only on failure) the message index.
 */
export abstract class MockMailboxProvider implements MailboxProvider {
  abstract readonly name: Provider;

  private readonly random: RandomFn;
  private readonly sleep: SleepFn;

  protected constructor(private readonly options: MockProviderOptions) {
    const { minDelayMs, maxDelayMs, failureRate, failureMessages } = options;
    if (!Number.isFinite(minDelayMs) || minDelayMs < 0) {
      throw new RangeError('minDelayMs must be a non-negative number.');
    }
    if (!Number.isFinite(maxDelayMs) || maxDelayMs < minDelayMs) {
      throw new RangeError('maxDelayMs must be greater than or equal to minDelayMs.');
    }
    if (!Number.isFinite(failureRate) || failureRate < 0 || failureRate > 1) {
      throw new RangeError('failureRate must be between 0 and 1.');
    }
    if (failureMessages.length === 0) {
      throw new RangeError('At least one failure message is required.');
    }
    this.random = options.random ?? Math.random;
    this.sleep = options.sleep ?? realSleep;
  }

  async provisionMailbox(request: ProvisionMailboxRequest): Promise<ProvisionMailboxResult> {
    void request; // A mock needs nothing from the request; a real provider would send it.
    const { minDelayMs, maxDelayMs, failureRate, failureMessages, externalIdPrefix } = this.options;

    const delay = minDelayMs + Math.floor(this.draw() * (maxDelayMs - minDelayMs + 1));
    await this.sleep(Math.min(delay, maxDelayMs));

    if (this.draw() < failureRate) {
      const index = Math.floor(this.draw() * failureMessages.length);
      throw new ProviderError(failureMessages[index] ?? failureMessages[0]!);
    }
    return { externalId: `${externalIdPrefix}${randomUUID()}`, provisionedAt: new Date() };
  }

  /** A random number clamped to [0, 1), even if an injected function misbehaves. */
  private draw(): number {
    const value = this.random();
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.min(value, 1 - Number.EPSILON);
  }
}
