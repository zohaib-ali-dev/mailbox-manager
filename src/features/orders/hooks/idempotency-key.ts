/**
 * Pure rules behind useIdempotencyKey (unit-tested in tests/unit/idempotency-key.test.ts).
 * A key is tied to the payload it was first sent with:
 * - first submit: use the key created on mount;
 * - resubmitting the SAME payload after a failure: reuse it (a retry can never create a 2nd order);
 * - submitting a CHANGED payload after a failure: new key (it is a new request);
 * - after success: new key.
 */

export interface KeyState {
  key: string;
  /** Fingerprint of the payload this key was already sent with, or null if unused. */
  sentWith: string | null;
}

/** A UUID v4. Uses crypto.randomUUID, or getRandomValues where randomUUID is unavailable (http on a LAN IP). */
export function generateIdempotencyKey(
  cryptoApi: Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string } = globalThis.crypto,
): string {
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Canonical fingerprint of a create payload (same normalisation as the server's request hash). */
export function payloadFingerprint(payload: {
  domain: string;
  provider: string;
  mailboxCount: number;
}): string {
  const domain = payload.domain.trim().toLowerCase().replace(/\.$/, '');
  return JSON.stringify([domain, payload.provider, payload.mailboxCount]);
}

/** The key to send for `fingerprint`, and the next state. */
export function keyForSubmit(
  state: KeyState,
  fingerprint: string,
  generate: () => string = generateIdempotencyKey,
): KeyState {
  if (state.sentWith === null || state.sentWith === fingerprint)
    return { key: state.key, sentWith: fingerprint };
  return { key: generate(), sentWith: fingerprint };
}

/** After a successful create (or a 422 mismatch) the next submit gets a fresh key. */
export function freshKeyState(generate: () => string = generateIdempotencyKey): KeyState {
  return { key: generate(), sentWith: null };
}
