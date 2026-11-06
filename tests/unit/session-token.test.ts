import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import {
  SESSION_AUDIENCE,
  SESSION_ISSUER,
  signSessionToken,
  verifySessionToken,
} from '@/server/auth/session-token';

const SECRET = 'unit-test-secret-that-is-at-least-32-characters';
const USER = '3f1c2b9e-8a7d-4c6e-9f10-2b3c4d5e6f70';
const NOW = 1_800_000_000;

describe('session token', () => {
  it('round-trips the user id and role', async () => {
    const token = await signSessionToken(
      { userId: USER, role: 'ADMIN' },
      { secret: SECRET, ttlHours: 8, now: NOW },
    );
    expect(await verifySessionToken(token, SECRET, NOW + 60)).toEqual({
      userId: USER,
      role: 'ADMIN',
    });
  });

  it('rejects an expired token', async () => {
    const token = await signSessionToken(
      { userId: USER, role: 'CUSTOMER' },
      { secret: SECRET, ttlHours: 1, now: NOW },
    );
    expect(await verifySessionToken(token, SECRET, NOW + 3599)).not.toBeNull();
    expect(await verifySessionToken(token, SECRET, NOW + 3601)).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signSessionToken(
      { userId: USER, role: 'CUSTOMER' },
      { secret: SECRET, ttlHours: 8, now: NOW },
    );
    const [header, payload, signature] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString()) as Record<
      string,
      unknown
    >;
    const forged = Buffer.from(JSON.stringify({ ...claims, role: 'ADMIN' })).toString('base64url');
    expect(await verifySessionToken(`${header}.${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSessionToken(
      { userId: USER, role: 'CUSTOMER' },
      { secret: 'another-secret-that-is-also-32-characters-long', ttlHours: 8, now: NOW },
    );
    expect(await verifySessionToken(token, SECRET, NOW)).toBeNull();
  });

  it('rejects the wrong audience or issuer', async () => {
    const key = new TextEncoder().encode(SECRET);
    const base = () =>
      new SignJWT({ role: 'CUSTOMER' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(USER)
        .setIssuedAt(NOW)
        .setExpirationTime(NOW + 3600);
    const wrongAudience = await base()
      .setIssuer(SESSION_ISSUER)
      .setAudience('someone-else')
      .sign(key);
    const wrongIssuer = await base()
      .setIssuer('someone-else')
      .setAudience(SESSION_AUDIENCE)
      .sign(key);
    expect(await verifySessionToken(wrongAudience, SECRET, NOW)).toBeNull();
    expect(await verifySessionToken(wrongIssuer, SECRET, NOW)).toBeNull();
  });

  it('rejects an unknown role, garbage, an unsigned token and empty input', async () => {
    const key = new TextEncoder().encode(SECRET);
    const badRole = await new SignJWT({ role: 'SUPERUSER' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER)
      .setIssuer(SESSION_ISSUER)
      .setAudience(SESSION_AUDIENCE)
      .setIssuedAt(NOW)
      .setExpirationTime(NOW + 3600)
      .sign(key);
    const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(`{"sub":"${USER}","role":"ADMIN"}`).toString('base64url')}.`;
    expect(await verifySessionToken(badRole, SECRET, NOW)).toBeNull();
    expect(await verifySessionToken('not.a.jwt', SECRET, NOW)).toBeNull();
    expect(await verifySessionToken(unsigned, SECRET, NOW)).toBeNull();
    expect(await verifySessionToken('', SECRET, NOW)).toBeNull();
    expect(await verifySessionToken(undefined, SECRET, NOW)).toBeNull();
  });
});
