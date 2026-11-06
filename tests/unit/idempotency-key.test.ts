import { describe, expect, it } from 'vitest';
import {
  freshKeyState,
  generateIdempotencyKey,
  keyForSubmit,
  payloadFingerprint,
} from '@/features/orders/hooks/idempotency-key';
import { idempotencyKeySchema } from '@/shared/schemas/order.schema';

let counter = 0;
const nextKey = () => `key-${String(++counter).padStart(8, '0')}`;
const payload = { domain: 'example.com', provider: 'google', mailboxCount: 3 };

describe('idempotency key rules', () => {
  it('uses the mount key for the first submit', () => {
    const initial = freshKeyState(nextKey);
    const sent = keyForSubmit(initial, payloadFingerprint(payload), nextKey);
    expect(sent.key).toBe(initial.key);
  });

  it('reuses the key when the same payload is resubmitted after a failure', () => {
    const first = keyForSubmit(freshKeyState(nextKey), payloadFingerprint(payload), nextKey);
    const again = keyForSubmit(
      first,
      payloadFingerprint({ ...payload, domain: ' EXAMPLE.com ' }),
      nextKey,
    );
    expect(again.key).toBe(first.key);
  });

  it('generates a new key when any field changed after a failure', () => {
    const first = keyForSubmit(freshKeyState(nextKey), payloadFingerprint(payload), nextKey);
    for (const changed of [
      { ...payload, mailboxCount: 4 },
      { ...payload, provider: 'microsoft' },
      { ...payload, domain: 'example.org' },
    ]) {
      expect(keyForSubmit(first, payloadFingerprint(changed), nextKey).key).not.toBe(first.key);
    }
  });

  it('starts fresh after a success', () => {
    const first = keyForSubmit(freshKeyState(nextKey), payloadFingerprint(payload), nextKey);
    const renewed = freshKeyState(nextKey);
    expect(keyForSubmit(renewed, payloadFingerprint(payload), nextKey).key).not.toBe(first.key);
  });
});

describe('generateIdempotencyKey', () => {
  it('produces keys the server accepts, with or without randomUUID', () => {
    const native = generateIdempotencyKey();
    const fallback = generateIdempotencyKey({
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    for (const key of [native, fallback]) {
      expect(idempotencyKeySchema.safeParse(key).success).toBe(true);
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
    expect(fallback).not.toBe(
      generateIdempotencyKey({ getRandomValues: crypto.getRandomValues.bind(crypto) }),
    );
  });
});
