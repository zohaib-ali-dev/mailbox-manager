'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { ApiError, apiRequest, isAbortError } from '@/lib/api-client';
import { usePageVisible } from '@/lib/use-page-visible';
import {
  IN_PROGRESS_STATUSES,
  ORDER_POLL_INTERVAL_MS,
  POLL_FAILURE_WARNING_THRESHOLD,
} from '@/shared/constants';
import type { OrderDetail } from '@/shared/types/order.dto';

/**
 * Live order detail. Polls GET /api/orders/:id every ORDER_POLL_INTERVAL_MS while the order is
 * PENDING or PROVISIONING and the tab is visible; stops at ACTIVE or FAILED; restarts after a
 * retry (when `replace` receives a PENDING order). Exactly one timer chain exists at a time and
 * the in-flight request is aborted on unmount. Errors keep the last good data.
 */
export function useOrderPolling(initial: OrderDetail) {
  const router = useRouter();
  const notify = useNotify();
  const visible = usePageVisible();
  const [order, setOrder] = useState(initial);
  const [failures, setFailures] = useState(0);
  const inProgress = IN_PROGRESS_STATUSES.includes(order.status);
  const orderId = order.id;

  useEffect(() => {
    if (!inProgress || !visible) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    /** One poll, then schedule the next unless this effect was cleaned up. */
    const poll = async () => {
      try {
        const { data } = await apiRequest<OrderDetail>(`/api/orders/${orderId}`, {
          signal: controller.signal,
        });
        setOrder(data);
        setFailures(0);
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          notify('Your session has expired. Please sign in again.', 'warning');
          router.refresh(); // The layout redirects to /login.
          return;
        }
        setFailures((count) => count + 1);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, ORDER_POLL_INTERVAL_MS);
    };

    timer = setTimeout(poll, ORDER_POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId, inProgress, visible, router, notify]);

  return {
    order,
    /** Replace the order with a fresh DTO (for example after a retry); polling resumes if needed. */
    replace: (next: OrderDetail) => {
      setOrder(next);
      setFailures(0);
    },
    isLive: inProgress && visible,
    connectionProblem: failures >= POLL_FAILURE_WARNING_THRESHOLD,
  };
}
