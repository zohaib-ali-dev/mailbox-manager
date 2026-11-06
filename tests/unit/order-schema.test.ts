import { describe, expect, it } from 'vitest';
import {
  adminOrderListQuerySchema,
  createOrderSchema,
  domainSchema,
  idempotencyKeySchema,
  mailboxCountSchema,
  orderListQuerySchema,
  providerSchema,
} from '@/shared/schemas/order.schema';
import { loginSchema } from '@/shared/schemas/auth.schema';

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message ?? '';

describe('domainSchema', () => {
  it.each([
    ['example.com', 'example.com'],
    ['sub.example.co.uk', 'sub.example.co.uk'],
    ['xn--bcher-kva.example', 'xn--bcher-kva.example'],
    ['Example.COM', 'example.com'],
    ['example.com.', 'example.com'],
    ['  example.com  ', 'example.com'],
    ['shop.xn--p1ai', 'shop.xn--p1ai'],
  ])('accepts %j as %j', (input, expected) => {
    expect(domainSchema.parse(input)).toBe(expected);
  });

  const longLabel = 'a'.repeat(64);
  const longName = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(62)}.com`;

  it.each([
    ['', /enter a domain/i],
    ['   ', /enter a domain/i],
    ['localhost', /full domain/i],
    ['-bad.com', /hyphen/i],
    ['bad-.com', /hyphen/i],
    ['a..com', /empty parts/i],
    ['http://example.com', /http/i],
    ['example.com/path', /path/i],
    ['user@example.com', /email/i],
    ['*.example.com', /wildcard/i],
    ['192.168.1.1', /ip address/i],
    ['exa mple.com', /spaces/i],
    [`${longLabel}.com`, /63 characters/i],
    [longName, /253 characters/i],
    ['münchen.de', /punycode/i],
    ['example.com:8080', /port/i],
    ['example.123', /extension/i],
    ['exa_mple.com', /letters, digits/i],
  ])('rejects %j', (input, message) => {
    const result = domainSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toMatch(message);
  });

  it('rejects non-strings', () => {
    expect(domainSchema.safeParse(42).success).toBe(false);
    expect(domainSchema.safeParse(null).success).toBe(false);
  });
});

describe('mailboxCountSchema', () => {
  it.each([1, 25, 50])('accepts %j', (value) => {
    expect(mailboxCountSchema.parse(value)).toBe(value);
  });

  it.each([0, 51, 2.5, -1, '5', true, null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %j',
    (value) => {
      expect(mailboxCountSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('providerSchema', () => {
  it('accepts google and microsoft', () => {
    expect(providerSchema.parse('google')).toBe('google');
    expect(providerSchema.parse('microsoft')).toBe('microsoft');
  });

  it.each(['Google', 'yahoo', '', 'MICROSOFT'])('rejects %j', (value) => {
    expect(providerSchema.safeParse(value).success).toBe(false);
  });
});

describe('createOrderSchema', () => {
  const valid = { domain: ' Example.com ', provider: 'google', mailboxCount: 3 };

  it('normalises a valid payload', () => {
    expect(createOrderSchema.parse(valid)).toEqual({
      domain: 'example.com',
      provider: 'google',
      mailboxCount: 3,
    });
  });

  it('rejects an unknown field', () => {
    const result = createOrderSchema.safeParse({ ...valid, isAdmin: true });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys');
  });

  it('rejects a missing field', () => {
    expect(createOrderSchema.safeParse({ domain: 'example.com', provider: 'google' }).success).toBe(
      false,
    );
  });
});

describe('idempotencyKeySchema', () => {
  it('accepts a UUID and the minimum and maximum lengths', () => {
    expect(idempotencyKeySchema.safeParse('3f1c2b9e-8a7d-4c6e-9f10-2b3c4d5e6f70').success).toBe(
      true,
    );
    expect(idempotencyKeySchema.safeParse('a'.repeat(8)).success).toBe(true);
    expect(idempotencyKeySchema.safeParse('A_b-'.repeat(32)).success).toBe(true);
  });

  it.each(['a'.repeat(7), 'a'.repeat(129), 'has space1', 'slash/key1', '', 'emoji😀key'])(
    'rejects %j',
    (value) => {
      expect(idempotencyKeySchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('list query schemas', () => {
  it('applies defaults and coerces numbers from query strings', () => {
    expect(orderListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(orderListQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(orderListQuerySchema.parse({ page: '', pageSize: '' })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it.each([{ page: '0' }, { page: '-1' }, { page: 'abc' }, { pageSize: '51' }, { page: '1.5' }])(
    'rejects %j',
    (query) => {
      expect(orderListQuerySchema.safeParse(query).success).toBe(false);
    },
  );

  it('rejects unknown query keys', () => {
    expect(orderListQuerySchema.safeParse({ sort: 'asc' }).success).toBe(false);
  });

  it('treats an empty string or "all" as no admin filter', () => {
    expect(adminOrderListQuerySchema.parse({ status: 'all', provider: '' })).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
      provider: undefined,
    });
    expect(
      adminOrderListQuerySchema.parse({ status: 'FAILED', provider: 'microsoft' }),
    ).toMatchObject({
      status: 'FAILED',
      provider: 'microsoft',
    });
  });

  it('requires exact status and provider spellings', () => {
    expect(adminOrderListQuerySchema.safeParse({ status: 'failed' }).success).toBe(false);
    expect(adminOrderListQuerySchema.safeParse({ provider: 'Google' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('trims and lowercases the email but never the password', () => {
    expect(loginSchema.parse({ email: '  Customer@Example.com ', password: ' pw ' })).toEqual({
      email: 'customer@example.com',
      password: ' pw ',
    });
  });

  it.each([
    { email: 'not-an-email', password: 'x' },
    { email: 'a@b.co', password: '' },
    { email: 'a@b.co', password: 'x'.repeat(201) },
    { email: 'a@b.co', password: 'x', extra: 1 },
  ])('rejects %j', (input) => {
    expect(loginSchema.safeParse(input).success).toBe(false);
  });
});
