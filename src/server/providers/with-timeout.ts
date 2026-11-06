import { ProviderTimeoutError } from './mailbox-provider';

/**
 * Rejects with ProviderTimeoutError when `promise` takes longer than `timeoutMs`. The timer is
 * cleared in every outcome, so nothing keeps the process alive.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ProviderTimeoutError(timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
