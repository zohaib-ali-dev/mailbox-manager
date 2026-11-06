import { describe, expect, it } from 'vitest';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '@/server/auth/password';

describe('password hashing', () => {
  it('hashes with bcrypt cost 10 and verifies', async () => {
    const hash = await hashPassword('Customer123!');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    expect(await verifyPassword('Customer123!', hash)).toBe(true);
    expect(await verifyPassword('customer123!', hash)).toBe(false);
    expect(await verifyPassword(' Customer123!', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('has a real cost-10 dummy hash that matches nothing obvious', async () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2[aby]\$10\$.{53}$/);
    expect(await verifyPassword('', DUMMY_PASSWORD_HASH)).toBe(false);
    expect(await verifyPassword('Admin123!', DUMMY_PASSWORD_HASH)).toBe(false);
  });

  it('treats a malformed stored hash as a failed login, not a crash', async () => {
    expect(await verifyPassword('anything', 'not-a-bcrypt-hash')).toBe(false);
  });
});
