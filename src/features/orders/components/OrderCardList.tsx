'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import type { ReactNode } from 'react';
import { LocalTime } from '@/components/feedback/LocalTime';
import { pluralize } from '@/lib/format';
import type { OrderSummary } from '@/shared/types/order.dto';
import { tokens } from '@/styles/theme';
import { OrderStatusChip } from './OrderStatusChip';
import { ProviderChip } from './ProviderChip';

interface OrderCardListProps<T extends OrderSummary> {
  items: T[];
  /** Extra line under the facts, e.g. the customer email for admins. */
  renderExtra?: (order: T) => ReactNode;
  /** Actions shown at the bottom of a card, e.g. Retry. Clicks there never open the order. */
  renderActions?: (order: T) => ReactNode;
}

/**
 * The phone layout of an order list: one tappable card per order with the domain, status,
 * provider, size and date, so nothing important hides in a sideways-scrolling table.
 */
export function OrderCardList<T extends OrderSummary>({
  items,
  renderExtra,
  renderActions,
}: OrderCardListProps<T>) {
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {items.map((order) => {
        const actions = renderActions?.(order);
        return (
          <Box
            component="li"
            key={order.id}
            sx={(theme) => ({
              position: 'relative',
              px: 2,
              py: 1.75,
              borderBottom: `1px solid ${tokens(theme).orders.cardBorder}`,
              '&:last-of-type': { borderBottom: 0 },
              '&:hover': { bgcolor: tokens(theme).orders.rowHoverBg },
            })}
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
            >
              <Box
                component={NextLink}
                href={`/orders/${order.id}`}
                sx={{
                  color: 'text.primary',
                  textDecoration: 'none',
                  fontWeight: 650,
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  // The link covers the whole card, so the card is one big tap target.
                  '&::after': { content: '""', position: 'absolute', inset: 0 },
                }}
              >
                {order.domain}
              </Box>
              <OrderStatusChip status={order.status} />
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1 }}
            >
              <ProviderChip provider={order.provider} />
              <Typography
                variant="body2"
                sx={(theme) => ({ color: tokens(theme).orders.mutedText })}
              >
                {pluralize(order.mailboxCount, 'mailbox', 'mailboxes')} ·{' '}
                <LocalTime iso={order.createdAt} />
              </Typography>
            </Stack>
            {renderExtra ? <Box sx={{ mt: 0.75 }}>{renderExtra(order)}</Box> : null}
            {actions ? (
              <Box sx={{ position: 'relative', zIndex: 1, mt: 1.5, display: 'flex', gap: 1 }}>
                {actions}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
