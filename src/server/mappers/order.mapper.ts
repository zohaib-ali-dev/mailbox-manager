import type { Mailbox, OrderEvent } from '@/generated/prisma/client';
import { canTransition } from '@/server/domain/order-state-machine';
import type { Viewer } from '@/server/domain/viewer';
import type {
  AdminOrderRecord,
  OrderDetailRecord,
  OrderRecord,
} from '@/server/repositories/order.repository';
import type {
  AdminOrderSummary,
  MailboxDto,
  OrderDetail,
  OrderEventDto,
  OrderProgress,
  OrderSummary,
} from '@/shared/types/order.dto';

/** Explicit whitelists: nothing outside these fields ever leaves the server. */

const iso = (date: Date) => date.toISOString();

function canRetry(status: OrderRecord['status'], viewer: Pick<Viewer, 'role'>): boolean {
  return viewer.role === 'ADMIN' && canTransition(status, 'PENDING', 'ADMIN');
}

export function toOrderSummary(order: OrderRecord): OrderSummary {
  return {
    id: order.id,
    domain: order.domain,
    provider: order.provider,
    mailboxCount: order.mailboxCount,
    status: order.status,
    createdAt: iso(order.createdAt),
    updatedAt: iso(order.updatedAt),
  };
}

export function toAdminOrderSummary(order: AdminOrderRecord): AdminOrderSummary {
  return {
    ...toOrderSummary(order),
    customerEmail: order.user.email,
    attempts: order.attempts,
    canRetry: canRetry(order.status, { role: 'ADMIN' }),
  };
}

function toMailboxDto(mailbox: Mailbox): MailboxDto {
  return {
    id: mailbox.id,
    position: mailbox.position,
    address: mailbox.address,
    status: mailbox.status,
    lastError: mailbox.lastError,
    provisionedAt: mailbox.provisionedAt ? iso(mailbox.provisionedAt) : null,
  };
}

function toMetadata(value: OrderEvent['metadata']): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toOrderEventDto(event: OrderEvent): OrderEventDto {
  return {
    id: event.id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    actorType: event.actorType,
    actorLabel: event.actorLabel,
    reason: event.reason,
    metadata: toMetadata(event.metadata),
    createdAt: iso(event.createdAt),
  };
}

function toProgress(mailboxes: Mailbox[]): OrderProgress {
  const progress: OrderProgress = { total: mailboxes.length, active: 0, failed: 0, pending: 0 };
  for (const mailbox of mailboxes) {
    if (mailbox.status === 'ACTIVE') progress.active += 1;
    else if (mailbox.status === 'FAILED') progress.failed += 1;
    else progress.pending += 1;
  }
  return progress;
}

export function toOrderDetail(order: OrderDetailRecord, viewer: Pick<Viewer, 'role'>): OrderDetail {
  return {
    ...toOrderSummary(order),
    attempts: order.attempts,
    lastError: order.lastError,
    canRetry: canRetry(order.status, viewer),
    progress: toProgress(order.mailboxes),
    mailboxes: order.mailboxes.map(toMailboxDto),
    events: order.events.map(toOrderEventDto),
  };
}
