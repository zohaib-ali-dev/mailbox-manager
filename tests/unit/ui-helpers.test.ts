import { describe, expect, it } from 'vitest';
import { summariseEventMetadata } from '@/lib/order-display';
import { parseQueryLeniently } from '@/shared/schemas/lenient-query';
import { adminOrderListQuerySchema, orderListQuerySchema } from '@/shared/schemas/order.schema';

describe('parseQueryLeniently', () => {
  const keys = ['status', 'provider', 'page', 'pageSize'];

  it('falls back to defaults for invalid values instead of failing', () => {
    expect(
      parseQueryLeniently(adminOrderListQuerySchema, { status: 'banana', page: '-3' }, keys),
    ).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
      provider: undefined,
    });
  });

  it('keeps valid values, takes the first of repeated keys and ignores unknown keys', () => {
    expect(
      parseQueryLeniently(
        adminOrderListQuerySchema,
        { status: 'FAILED', provider: ['microsoft', 'google'], page: '2', sort: 'x' },
        keys,
      ),
    ).toMatchObject({ status: 'FAILED', provider: 'microsoft', page: 2 });
    expect(
      parseQueryLeniently(orderListQuerySchema, { pageSize: '51', page: '3' }, [
        'page',
        'pageSize',
      ]),
    ).toEqual({
      page: 3,
      pageSize: 20,
    });
  });
});

describe('summariseEventMetadata', () => {
  it.each([
    [{ active: 7, failed: 3, total: 10 }, '3 of 10 mailboxes failed'],
    [{ active: 4, total: 4 }, 'All 4 mailboxes active'],
    [{ active: 1, total: 1 }, 'The mailbox is active'],
    [{ mailboxCount: 5 }, '5 mailboxes ordered'],
    [{ previousWorker: 'host:1:abc' }, 'Previous worker: host:1:abc'],
    [{ unrelated: true }, null],
    [null, null],
  ])('%j -> %j', (metadata, expected) => {
    expect(summariseEventMetadata({ metadata })).toBe(expected);
  });
});
