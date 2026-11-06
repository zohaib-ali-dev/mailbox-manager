import type { Provider } from '@/shared/constants';
import { GoogleMockProvider } from './google-mock.provider';
import type { MailboxProvider } from './mailbox-provider';
import { MicrosoftMockProvider } from './microsoft-mock.provider';
import type { MockProviderTuning } from './mock-mailbox.provider';

export type ProviderMap = { readonly [P in Provider]: MailboxProvider & { readonly name: P } };

/**
 * Picks the strategy for an order's provider. Adding a provider means a new class plus one entry
 * here; the worker never changes.
 */
export class ProviderRegistry {
  constructor(private readonly providers: ProviderMap) {}

  get(provider: Provider): MailboxProvider {
    switch (provider) {
      case 'google':
        return this.providers.google;
      case 'microsoft':
        return this.providers.microsoft;
      default: {
        // Exhaustive: a new Provider value is a compile error until it is handled above.
        const unknown: never = provider;
        throw new Error(`Unknown mailbox provider: ${String(unknown)}`);
      }
    }
  }
}

export function createMockProviderRegistry(tuning: MockProviderTuning): ProviderRegistry {
  return new ProviderRegistry({
    google: new GoogleMockProvider(tuning),
    microsoft: new MicrosoftMockProvider(tuning),
  });
}
