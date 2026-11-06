import type {
  ActorType as PrismaActorType,
  OrderStatus as PrismaOrderStatus,
} from '@/generated/prisma/enums';
import { ACTOR_TYPES, ORDER_STATUSES, type ActorType, type OrderStatus } from '@/shared/constants';
import { InvalidTransitionError } from './errors';

/**
 * The single authority on which order status changes are allowed and by whom.
 * Written as data. Creating an order (none -> PENDING by CUSTOMER) is recorded as the creation
 * event and is NOT a transition, so it is not in this table.
 */
export interface TransitionRule {
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly actors: readonly ActorType[];
  readonly meaning: string;
}

export const ORDER_TRANSITIONS: readonly TransitionRule[] = [
  {
    from: 'PENDING',
    to: 'PROVISIONING',
    actors: ['WORKER'],
    meaning: 'A worker claimed the order',
  },
  { from: 'PROVISIONING', to: 'ACTIVE', actors: ['WORKER'], meaning: 'Every mailbox is active' },
  {
    from: 'PROVISIONING',
    to: 'FAILED',
    actors: ['WORKER', 'SYSTEM'],
    meaning: 'A mailbox failed (worker) or the worker lease expired (system)',
  },
  { from: 'FAILED', to: 'PENDING', actors: ['ADMIN'], meaning: 'Admin retry' },
];

export { ORDER_STATUSES, ACTOR_TYPES };
export type { OrderStatus, ActorType };

export function canTransition(from: OrderStatus, to: OrderStatus, actor: ActorType): boolean {
  return ORDER_TRANSITIONS.some(
    (rule) => rule.from === from && rule.to === to && rule.actors.includes(actor),
  );
}

export function assertTransition(from: OrderStatus, to: OrderStatus, actor: ActorType): void {
  if (!canTransition(from, to, actor)) {
    throw new InvalidTransitionError({ from, to, actor });
  }
}

export function allowedTransitions(from: OrderStatus, actor: ActorType): OrderStatus[] {
  return ORDER_TRANSITIONS.filter((rule) => rule.from === from && rule.actors.includes(actor)).map(
    (rule) => rule.to,
  );
}

/** Only ACTIVE is terminal. FAILED can still be retried by an admin. */
export function isTerminal(status: OrderStatus): boolean {
  return !ORDER_TRANSITIONS.some((rule) => rule.from === status);
}

export function isInProgress(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'PROVISIONING';
}

// Compile-time guard: the domain literal types must equal the Prisma enums exactly. Adding a value
// to only one side breaks `npm run typecheck`. Type-only imports: no Prisma at runtime.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type AssertTrue<T extends true> = T;
export type OrderStatusMatchesPrisma = AssertTrue<Equals<OrderStatus, PrismaOrderStatus>>;
export type ActorTypeMatchesPrisma = AssertTrue<Equals<ActorType, PrismaActorType>>;
