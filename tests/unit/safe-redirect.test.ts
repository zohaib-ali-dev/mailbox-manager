import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safe-redirect';

describe('safeNextPath', () => {
  it.each([
    ['/orders', '/orders'],
    ['/orders/abc?x=1#top', '/orders/abc?x=1#top'],
    ['/admin/orders?status=FAILED', '/admin/orders?status=FAILED'],
  ])('keeps the relative path %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '\\\\evil.test',
    'javascript:alert(1)',
    'orders',
    '',
    '/orders\n',
    '/%5C%5Cevil.test'.replace('%5C%5C', '\\\\'),
    undefined,
    ['/orders'],
  ])('rejects %j', (input) => {
    expect(safeNextPath(input, '/home')).toBe('/home');
  });
});
