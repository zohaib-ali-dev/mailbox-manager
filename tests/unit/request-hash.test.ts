import { describe, expect, it } from 'vitest';
import { computeRequestHash } from '@/server/domain/request-hash';

describe('computeRequestHash', () => {
  const base = { domain: 'example.com', provider: 'google', mailboxCount: 3 } as const;

  it('is a 64-character hex SHA-256 digest', () => {
    expect(computeRequestHash(base)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('ignores domain case, surrounding whitespace and a trailing dot', () => {
    const hash = computeRequestHash(base);
    expect(computeRequestHash({ ...base, domain: 'EXAMPLE.com' })).toBe(hash);
    expect(computeRequestHash({ ...base, domain: '  example.com  ' })).toBe(hash);
    expect(computeRequestHash({ ...base, domain: 'example.com.' })).toBe(hash);
  });

  it('ignores the key order of the input object', () => {
    expect(computeRequestHash({ mailboxCount: 3, provider: 'google', domain: 'example.com' })).toBe(
      computeRequestHash(base),
    );
  });

  it('changes when any field changes', () => {
    const hash = computeRequestHash(base);
    expect(computeRequestHash({ ...base, domain: 'example.org' })).not.toBe(hash);
    expect(computeRequestHash({ ...base, provider: 'microsoft' })).not.toBe(hash);
    expect(computeRequestHash({ ...base, mailboxCount: 4 })).not.toBe(hash);
  });
});
