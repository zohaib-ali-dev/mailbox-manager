import { describe, expect, it } from 'vitest';
import { InvalidTransitionError } from '@/server/domain/errors';
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  isInProgress,
  isTerminal,
} from '@/server/domain/order-state-machine';
import type { ActorType, OrderStatus } from '@/shared/constants';

// Written independently from the source table, straight from the brief:
// PENDING -> PROVISIONING -> ACTIVE | FAILED, and admin-only FAILED -> PENDING.
const STATUSES: OrderStatus[] = ['PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED'];
const ACTORS: ActorType[] = ['CUSTOMER', 'ADMIN', 'WORKER', 'SYSTEM'];
const ALLOWED = new Set([
  'PENDING>PROVISIONING:WORKER',
  'PROVISIONING>ACTIVE:WORKER',
  'PROVISIONING>FAILED:WORKER',
  'PROVISIONING>FAILED:SYSTEM',
  'FAILED>PENDING:ADMIN',
]);

const matrix = STATUSES.flatMap((from) =>
  STATUSES.flatMap((to) =>
    ACTORS.map((actor) => ({ from, to, actor, expected: ALLOWED.has(`${from}>${to}:${actor}`) })),
  ),
);

describe('order state machine', () => {
  it('covers all 64 from x to x actor combinations', () => {
    expect(matrix).toHaveLength(64);
    expect(matrix.filter((c) => c.expected)).toHaveLength(5);
  });

  it.each(matrix)('$from -> $to by $actor allowed=$expected', ({ from, to, actor, expected }) => {
    expect(canTransition(from, to, actor)).toBe(expected);
    if (expected) {
      expect(() => assertTransition(from, to, actor)).not.toThrow();
    } else {
      expect(() => assertTransition(from, to, actor)).toThrow(InvalidTransitionError);
    }
  });

  it('rejects every self-transition for every actor', () => {
    for (const status of STATUSES) {
      for (const actor of ACTORS) expect(canTransition(status, status, actor)).toBe(false);
    }
  });

  it('gives ACTIVE no outgoing transitions', () => {
    for (const actor of ACTORS) expect(allowedTransitions('ACTIVE', actor)).toEqual([]);
    expect(isTerminal('ACTIVE')).toBe(true);
    expect(isTerminal('FAILED')).toBe(false);
    expect(isTerminal('PENDING')).toBe(false);
    expect(isTerminal('PROVISIONING')).toBe(false);
  });

  it('lists allowed targets per actor', () => {
    expect(allowedTransitions('PROVISIONING', 'WORKER').sort()).toEqual(['ACTIVE', 'FAILED']);
    expect(allowedTransitions('PROVISIONING', 'SYSTEM')).toEqual(['FAILED']);
    expect(allowedTransitions('FAILED', 'ADMIN')).toEqual(['PENDING']);
    expect(allowedTransitions('FAILED', 'CUSTOMER')).toEqual([]);
    expect(allowedTransitions('PENDING', 'ADMIN')).toEqual([]);
  });

  it('marks PENDING and PROVISIONING as in progress only', () => {
    expect(STATUSES.filter(isInProgress)).toEqual(['PENDING', 'PROVISIONING']);
  });

  it('throws an error carrying from, to and actor with a 409 status', () => {
    try {
      assertTransition('ACTIVE', 'FAILED', 'ADMIN');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      const typed = error as InvalidTransitionError;
      expect(typed.details).toEqual({ from: 'ACTIVE', to: 'FAILED', actor: 'ADMIN' });
      expect(typed.code).toBe('INVALID_TRANSITION');
      expect(typed.status).toBe(409);
    }
  });
});
