'use client';

import type { AlertColor } from '@mui/material/Alert';
import { useEffect, useRef } from 'react';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { pluralize } from '@/lib/format';
import { IN_PROGRESS_STATUSES, type OrderStatus } from '@/shared/constants';

export interface WatchedOrder {
  id: string;
  domain: string;
  status: OrderStatus;
  mailboxCount: number;
  /** Detail data only: the server's summary, e.g. "2 of 20 mailboxes failed". */
  lastError?: string | null;
}

/** The snackbar text for an order that just finished, or null while it is still in progress. */
export function finishMessage(order: WatchedOrder): { text: string; severity: AlertColor } | null {
  if (order.status === 'ACTIVE') {
    return {
      text: `${order.domain} is ready: ${pluralize(order.mailboxCount, 'mailbox', 'mailboxes')} active.`,
      severity: 'success',
    };
  }
  if (order.status === 'FAILED') {
    return {
      text: `${order.domain}: provisioning failed${order.lastError ? ` (${order.lastError})` : ''}.`,
      severity: 'error',
    };
  }
  return null;
}

/**
 * Shows a snackbar when an order on screen finishes while the user is watching: "ready" when it
 * turns ACTIVE, "failed" when it turns FAILED. Only transitions seen live count (in progress ->
 * final), so opening a page full of old failed orders announces nothing.
 */
export function useStatusChangeNotifier(orders: readonly WatchedOrder[]): void {
  const notify = useNotify();
  const previous = useRef(new Map<string, OrderStatus>());

  useEffect(() => {
    for (const order of orders) {
      const before = previous.current.get(order.id);
      previous.current.set(order.id, order.status);
      if (!before || !IN_PROGRESS_STATUSES.includes(before)) continue;
      const message = finishMessage(order);
      if (message) notify(message.text, message.severity);
    }
  }, [orders, notify]);
}
