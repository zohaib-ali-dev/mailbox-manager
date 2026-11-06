import {
  ProviderError,
  type MailboxProvider,
  type ProvisionMailboxRequest,
  type ProvisionMailboxResult,
} from '@/server/providers/mailbox-provider';
import { ProviderRegistry } from '@/server/providers/provider-registry';
import type { Provider } from '@/shared/constants';

export type FakeBehaviour = (
  request: ProvisionMailboxRequest,
  callIndex: number,
) => 'ok' | 'fail' | Promise<'ok' | 'fail'>;

/** Zero-delay provider that records every call and fails on demand. */
export class FakeProvider<P extends Provider> implements MailboxProvider {
  readonly calls: ProvisionMailboxRequest[] = [];

  constructor(
    readonly name: P,
    public behaviour: FakeBehaviour = () => 'ok',
  ) {}

  async provisionMailbox(request: ProvisionMailboxRequest): Promise<ProvisionMailboxResult> {
    const index = this.calls.length;
    this.calls.push(request);
    if ((await this.behaviour(request, index)) === 'fail') {
      throw new ProviderError(`${this.name}: simulated failure`);
    }
    return { externalId: `${this.name}-${request.mailboxId}`, provisionedAt: new Date() };
  }
}

export function createFakeProviders(behaviour?: FakeBehaviour) {
  const google = new FakeProvider('google', behaviour);
  const microsoft = new FakeProvider('microsoft', behaviour);
  return { google, microsoft, registry: new ProviderRegistry({ google, microsoft }) };
}

/** Fails the given 1-based mailbox positions (parsed from the box-NN address). */
export function failPositions(...positions: number[]): FakeBehaviour {
  return (request) => {
    const position = Number(request.address.slice(4, 6));
    return positions.includes(position) ? 'fail' : 'ok';
  };
}
