import type { ActorType, MailboxStatus, OrderStatus, Provider } from '@/shared/constants';

/** Response shapes for the orders API. Dates are ISO-8601 UTC strings. */

export interface OrderSummary {
  id: string;
  domain: string;
  provider: Provider;
  mailboxCount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderSummary extends OrderSummary {
  customerEmail: string;
  attempts: number;
  canRetry: boolean;
}

export interface OrderProgress {
  total: number;
  active: number;
  failed: number;
  pending: number;
}

export interface MailboxDto {
  id: string;
  position: number;
  address: string;
  status: MailboxStatus;
  lastError: string | null;
  provisionedAt: string | null;
}

export interface OrderEventDto {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: ActorType;
  actorLabel: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  attempts: number;
  lastError: string | null;
  canRetry: boolean;
  progress: OrderProgress;
  mailboxes: MailboxDto[];
  /** Oldest first. */
  events: OrderEventDto[];
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}
