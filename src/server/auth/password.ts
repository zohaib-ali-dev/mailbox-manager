import bcrypt from 'bcryptjs';

/** Pure module (no `server-only`): used by the auth service, the seed and tests. */

export const BCRYPT_COST = 10;

/**
 * A real cost-10 bcrypt hash of a random string nobody knows. Login compares against it when the
 * email is unknown, so an unknown email costs the same time as a wrong password.
 */
export const DUMMY_PASSWORD_HASH = '$2b$10$wSzTWJOAtDMXanWufC3idO4EqXpfhEcQFdMU15QqhK18X4gZm19L.';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    // A malformed stored hash is a failed login, never a crash.
    return false;
  }
}
