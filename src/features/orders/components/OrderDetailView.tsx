'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CopyButton } from '@/components/feedback/CopyButton';
import { LiveIndicator } from '@/components/feedback/LiveIndicator';
import { LocalTime } from '@/components/feedback/LocalTime';
import { PageHeader } from '@/components/feedback/PageHeader';
import { RetryOrderButton } from '@/features/admin/components/RetryOrderButton';
import { pluralize } from '@/lib/format';
import type { OrderDetail } from '@/shared/types/order.dto';
import { useMemo } from 'react';
import { useOrderPolling } from '../hooks/useOrderPolling';
import { useStatusChangeNotifier } from '../hooks/useStatusChangeNotifier';
import { codeStyles, mutedTextStyles } from '../styles/ordersStyles';
import { AuditLogTimeline } from './AuditLogTimeline';
import { MailboxTable } from './MailboxTable';
import { OrderProgress } from './OrderProgress';
import { OrderStatusChip } from './OrderStatusChip';
import { ProviderChip } from './ProviderChip';

/**
 * Order detail for the owner or an admin: header, progress, failure alert with retry (only when
 * the DTO says canRetry), per-mailbox table and the audit log. Updates live while in progress.
 */
export function OrderDetailView({
  initial,
  back,
}: {
  initial: OrderDetail;
  back: { href: string; label: string };
}) {
  const { order, replace, isLive, connectionProblem } = useOrderPolling(initial);
  const watched = useMemo(() => [order], [order]);
  useStatusChangeNotifier(watched);

  return (
    <>
      <PageHeader
        back={back}
        title={order.domain}
        meta={
          <>
            <OrderStatusChip status={order.status} size="medium" />
            <ProviderChip provider={order.provider} size="medium" />
            <Typography variant="body2" sx={mutedTextStyles}>
              {pluralize(order.mailboxCount, 'mailbox', 'mailboxes')} · Created{' '}
              <LocalTime iso={order.createdAt} />
              {order.attempts > 1 ? ` · ${order.attempts} attempts` : ''}
            </Typography>
            {isLive ? (
              <LiveIndicator
                label="Updating live"
                hint="This page checks for changes every 2 seconds until the order is Active or Failed."
              />
            ) : null}
          </>
        }
        actions={
          order.canRetry ? <RetryOrderButton orderId={order.id} onRetried={replace} /> : null
        }
      />

      <Stack spacing={2.5}>
        {connectionProblem ? (
          <Alert severity="warning">
            Live updates are having trouble reaching the server. The last known status is shown and
            we keep trying.
          </Alert>
        ) : null}

        {order.status === 'FAILED' && order.lastError ? (
          <Alert severity="error">
            <AlertTitle>Provisioning failed</AlertTitle>
            {order.lastError}.{' '}
            {order.canRetry
              ? 'Retry provisions only the mailboxes that failed; active ones are kept.'
              : 'An admin can retry the failed mailboxes.'}
          </Alert>
        ) : null}

        <OrderProgress progress={order.progress} />

        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            // Stacked: the mailbox table needs the full content width so every column fits.
            gridTemplateColumns: 'minmax(0, 1fr)',
            alignItems: 'start',
          }}
        >
          <MailboxTable mailboxes={order.mailboxes} />
          <AuditLogTimeline events={order.events} />
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <Typography variant="caption">Order ID</Typography>
          <Box
            component="code"
            sx={(theme) => ({ ...codeStyles(theme), overflowWrap: 'anywhere' })}
          >
            {order.id}
          </Box>
          <CopyButton value={order.id} label="Copy order ID" />
        </Stack>
      </Stack>
    </>
  );
}
