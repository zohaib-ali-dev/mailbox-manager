import { MockMailboxProvider, type MockProviderTuning } from './mock-mailbox.provider';

export const MICROSOFT_FAILURE_MESSAGES = [
  'Microsoft Graph: request throttled',
  'Microsoft Graph: tenant license unavailable',
  'Microsoft Graph: service temporarily unavailable',
] as const;

/** Mock of Microsoft Graph user and mailbox provisioning. */
export class MicrosoftMockProvider extends MockMailboxProvider {
  readonly name = 'microsoft' as const;

  constructor(tuning: MockProviderTuning) {
    super({ ...tuning, externalIdPrefix: 'ms-', failureMessages: MICROSOFT_FAILURE_MESSAGES });
  }
}
