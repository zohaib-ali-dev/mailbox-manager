import { createHash } from 'node:crypto';
import type { CreateOrderInput } from '@/shared/schemas/order.schema';

/** Same normalisation as domainSchema, so `Example.COM ` and `example.com` hash the same. */
function normaliseDomain(domain: string): string {
  const lowered = domain.trim().toLowerCase();
  return lowered.endsWith('.') ? lowered.slice(0, -1) : lowered;
}

/**
 * SHA-256 of the canonical JSON of the normalised create payload. The key order is fixed here,
 * so the caller's object key order never matters.
 */
export function computeRequestHash(input: CreateOrderInput): string {
  const canonical = JSON.stringify([
    ['domain', normaliseDomain(input.domain)],
    ['provider', input.provider],
    ['mailboxCount', input.mailboxCount],
  ]);
  return createHash('sha256').update(canonical).digest('hex');
}
