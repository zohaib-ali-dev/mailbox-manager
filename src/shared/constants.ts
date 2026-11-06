/** Shared limits and intervals. Safe in the browser and on the server. */

export const APP_NAME = 'Mailbox Manager';

export const MIN_MAILBOXES = 1;
export const MAX_MAILBOXES = 50;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const ORDER_POLL_INTERVAL_MS = 2000;

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
export const IDEMPOTENT_REPLAYED_HEADER = 'Idempotent-Replayed';
export const IDEMPOTENCY_KEY_MIN_LENGTH = 8;
export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

/** Value sets mirrored by the Prisma enums (a compile-time check in src/server/domain ties them). */
export const ORDER_STATUSES = ['PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const MAILBOX_STATUSES = ['PENDING', 'ACTIVE', 'FAILED'] as const;
export type MailboxStatus = (typeof MAILBOX_STATUSES)[number];

export const PROVIDERS = ['google', 'microsoft'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const ACTOR_TYPES = ['CUSTOMER', 'ADMIN', 'WORKER', 'SYSTEM'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const ROLES = ['CUSTOMER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];
