import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';
import { ROLES, type Role } from '@/shared/constants';

/** Pure (no Next.js imports): signs and verifies the HS256 session JWT. */

export const SESSION_ISSUER = 'mailbox-manager';
export const SESSION_AUDIENCE = 'mailbox-manager-web';

export interface SessionClaims {
  userId: string;
  role: Role;
}

export interface SessionTokenOptions {
  secret: string;
  ttlHours: number;
  /** Seconds since epoch; injectable for tests. */
  now?: number;
}

const encode = (secret: string) => new TextEncoder().encode(secret);

export function signSessionToken(
  claims: SessionClaims,
  options: SessionTokenOptions,
): Promise<string> {
  const issuedAt = options.now ?? Math.floor(Date.now() / 1000);
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + Math.round(options.ttlHours * 3600))
    .sign(encode(options.secret));
}

/**
 * Returns the claims, or null for any invalid token: bad signature, wrong issuer or audience,
 * expired, wrong algorithm or malformed. The role is only a hint; guards re-read the user.
 */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  now?: number,
): Promise<SessionClaims | null> {
  if (!token || token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(token, encode(secret), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      algorithms: ['HS256'],
      ...(now !== undefined ? { currentDate: new Date(now * 1000) } : {}),
    });
    const role = payload.role;
    if (typeof payload.sub !== 'string' || !ROLES.includes(role as Role)) return null;
    return { userId: payload.sub, role: role as Role };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError || error instanceof TypeError) return null;
    throw error;
  }
}
