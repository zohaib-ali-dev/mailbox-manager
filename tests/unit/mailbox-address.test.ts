import { describe, expect, it } from 'vitest';
import { buildMailboxAddress } from '@/server/domain/mailbox-address';

const ORDER_A = '3f1c2b9e-8a7d-4c6e-9f10-2b3c4d5e6f70';
const ORDER_B = '9a8b7c6d-1111-4222-8333-444455556666';

describe('buildMailboxAddress', () => {
  it('uses box-NN-<first 8 chars of the order id>@<domain>', () => {
    expect(buildMailboxAddress(ORDER_A, 7, 'example.com')).toBe('box-07-3f1c2b9e@example.com');
  });

  it('zero-pads to two digits and keeps larger numbers intact', () => {
    expect(buildMailboxAddress(ORDER_A, 1, 'example.com')).toMatch(/^box-01-/);
    expect(buildMailboxAddress(ORDER_A, 50, 'example.com')).toMatch(/^box-50-/);
  });

  it('gives different orders different addresses', () => {
    expect(buildMailboxAddress(ORDER_A, 1, 'example.com')).not.toBe(
      buildMailboxAddress(ORDER_B, 1, 'example.com'),
    );
  });

  it('rejects a position below 1 or a fraction', () => {
    expect(() => buildMailboxAddress(ORDER_A, 0, 'example.com')).toThrow(RangeError);
    expect(() => buildMailboxAddress(ORDER_A, 1.5, 'example.com')).toThrow(RangeError);
  });
});
