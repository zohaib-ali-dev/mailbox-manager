import { MockMailboxProvider, type MockProviderTuning } from './mock-mailbox.provider';

export const GOOGLE_FAILURE_MESSAGES = [
  'Google Workspace API: rate limit exceeded',
  'Google Workspace API: domain verification pending',
  'Google Workspace API: backend error, try again later',
] as const;

/** Mock of the Google Workspace Admin SDK. */
export class GoogleMockProvider extends MockMailboxProvider {
  readonly name = 'google' as const;

  constructor(tuning: MockProviderTuning) {
    super({ ...tuning, externalIdPrefix: 'g-', failureMessages: GOOGLE_FAILURE_MESSAGES });
  }
}
