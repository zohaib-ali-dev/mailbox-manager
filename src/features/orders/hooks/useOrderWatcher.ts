'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { apiRequest, isAbortError } from '@/lib/api-client';
import { ORDER_POLL_INTERVAL_MS } from '@/shared/constants';
import type { OrderDetail } from '@/shared/types/order.dto';
import { finishMessage } from './useStatusChangeNotifier';

/**
 * Follows specific orders in the background until they finish, then announces the result and
 * refreshes the page. Used after a retry from the admin list, where the retried order may leave
 * the current filter (Failed -> Pending) and would otherwise never be seen finishing.
 */
export function useOrderWatcher() {
  const router = useRouter();
  const notify = useNotify();
  const [watched, setWatched] = useState<string[]>([]);

  /** Starts following an order (no-op if it is already followed). */
  const watch = useCallback((orderId: string) => {
    setWatched((ids) => (ids.includes(orderId) ? ids : [...ids, orderId]));
  }, []);

  useEffect(() => {
    if (watched.length === 0) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      for (const id of watched) {
        apiRequest<OrderDetail>(`/api/orders/${id}`, { signal: controller.signal })
          .then(({ data }) => {
            const message = finishMessage(data);
            if (!message) return;
            setWatched((ids) => ids.filter((watchedId) => watchedId !== id));
            notify(message.text, message.severity);
            router.refresh();
          })
          .catch((error: unknown) => {
            // Aborted on unmount: nothing to do. Any other failure is transient: the next tick
            // tries again, and the order keeps being followed.
            if (isAbortError(error)) return;
          });
      }
    }, ORDER_POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [watched, notify, router]);

  return { watch };
}
