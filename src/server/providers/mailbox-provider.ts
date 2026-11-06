import type { Provider } from '@/shared/constants';

/** Strategy interface: the worker talks to every mailbox provider through this. */
export interface ProvisionMailboxRequest {
  orderId: string;
  mailboxId: string;
  address: string;
  domain: string;
  /** The mailbox id, so a real provider could de-duplicate retried calls. */
  idempotencyKey: string;
}

export interface ProvisionMailboxResult {
  externalId: string;
  provisionedAt: Date;
}

export interface MailboxProvider {
  readonly name: Provider;
  provisionMailbox(request: ProvisionMailboxRequest): Promise<ProvisionMailboxResult>;
}

/** A provider failure. `message` is safe to show on the order detail page. */
export class ProviderError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable?: boolean } = {}) {
    super(message);
    this.name = new.target.name;
    this.retryable = options.retryable ?? true;
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(timeoutMs: number) {
    super(`Provider did not respond within ${timeoutMs} ms`, { retryable: true });
  }
}
