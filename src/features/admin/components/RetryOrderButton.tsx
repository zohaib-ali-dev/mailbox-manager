'use client';

import ReplayIcon from '@mui/icons-material/Replay';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useRef, useState, type MouseEvent } from 'react';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { ApiError, apiRequest } from '@/lib/api-client';
import type { OrderDetail } from '@/shared/types/order.dto';
import { tokens } from '@/styles/theme';

interface RetryOrderButtonProps {
  orderId: string;
  /** Called with the fresh order after a successful retry. */
  onRetried?: (order: OrderDetail) => void;
  size?: 'small' | 'medium';
}

/**
 * POST /api/admin/orders/:id/retry. Shown only when the DTO says `canRetry`. A ref guard plus the
 * disabled state make double clicks send exactly one request; the server's message (for example a
 * 409 when someone else already retried) is shown in the snackbar.
 */
export function RetryOrderButton({ orderId, onRetried, size = 'medium' }: RetryOrderButtonProps) {
  const notify = useNotify();
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  /** Sends the retry once, however many clicks arrive. */
  async function retry(event: MouseEvent) {
    event.stopPropagation();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      const { data } = await apiRequest<OrderDetail>(`/api/admin/orders/${orderId}/retry`, {
        method: 'POST',
      });
      notify('Order queued for retry');
      onRetried?.(data);
    } catch (error) {
      notify(
        error instanceof ApiError ? error.message : 'Could not retry the order. Try again.',
        'error',
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <Button
      size={size}
      variant="contained"
      onClick={retry}
      disabled={pending}
      aria-busy={pending}
      startIcon={pending ? <CircularProgress size={14} color="inherit" /> : <ReplayIcon />}
      sx={(theme) => ({
        bgcolor: tokens(theme).admin.retryButtonBg,
        color: tokens(theme).admin.retryButtonText,
        whiteSpace: 'nowrap',
        '&:hover': { bgcolor: tokens(theme).admin.retryButtonHoverBg },
        '&.Mui-disabled': {
          bgcolor: tokens(theme).admin.retryButtonBg,
          color: tokens(theme).admin.retryButtonText,
          opacity: 0.7,
        },
      })}
    >
      {pending ? 'Retrying' : 'Retry'}
    </Button>
  );
}
