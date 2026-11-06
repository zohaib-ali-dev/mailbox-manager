import 'server-only';
import { cookies } from 'next/headers';
import { env } from '@/server/config/env';
import type { UserDto } from '@/shared/types/auth.dto';
import { signSessionToken, verifySessionToken, type SessionClaims } from './session-token';

/** The session cookie: httpOnly, SameSite=Lax, Secure in production, path /. */
export const SESSION_COOKIE = 'mm_session';

export async function readSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value, env.SESSION_SECRET);
}

/** Signs a token for the user and sets the cookie. Call only after a successful login. */
export async function startSession(user: Pick<UserDto, 'id' | 'role'>): Promise<void> {
  const token = await signSessionToken(
    { userId: user.id, role: user.role },
    { secret: env.SESSION_SECRET, ttlHours: env.SESSION_TTL_HOURS },
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: env.SESSION_TTL_HOURS * 3600,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
