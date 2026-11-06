import type { ActorType } from '@/shared/constants';
import type { OrderEventDto } from '@/shared/types/order.dto';
import { pluralize } from './format';

/** Display label for an audit-log actor type. */
export const ACTOR_LABELS: Record<ActorType, string> = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin',
  WORKER: 'Worker',
  SYSTEM: 'System',
};

/** Tooltip explaining who an audit-log actor is. */
export const ACTOR_HINTS: Record<ActorType, string> = {
  CUSTOMER: 'The customer who placed the order.',
  ADMIN: 'An admin action, for example a retry.',
  WORKER: 'The background worker process (host:process:id) that provisioned the order.',
  SYSTEM: 'Automatic recovery: the worker stopped responding, so the order was failed safely.',
};

const asCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

/**
 * A short, human summary of an audit event's metadata, e.g. "3 of 10 mailboxes failed".
 * Display only: it reads the numbers the server recorded and never decides anything.
 */
export function summariseEventMetadata(event: Pick<OrderEventDto, 'metadata'>): string | null {
  const meta = event.metadata;
  if (!meta) return null;
  const total = asCount(meta.total);
  const failed = asCount(meta.failed);
  const active = asCount(meta.active);
  const ordered = asCount(meta.mailboxCount);
  if (total !== null && failed !== null && failed > 0)
    return `${failed} of ${pluralize(total, 'mailbox', 'mailboxes')} failed`;
  if (total !== null && active !== null && active === total) {
    return total === 1 ? 'The mailbox is active' : `All ${total} mailboxes active`;
  }
  if (ordered !== null) return `${pluralize(ordered, 'mailbox', 'mailboxes')} ordered`;
  if (typeof meta.previousWorker === 'string') return `Previous worker: ${meta.previousWorker}`;
  return null;
}
