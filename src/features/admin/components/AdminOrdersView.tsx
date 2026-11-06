'use client';

import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ListPagination } from '@/components/feedback/ListPagination';
import { LiveIndicator } from '@/components/feedback/LiveIndicator';
import { LocalTime } from '@/components/feedback/LocalTime';
import { PageHeader } from '@/components/feedback/PageHeader';
import { OrderCardList } from '@/features/orders/components/OrderCardList';
import { OrderStatusChip } from '@/features/orders/components/OrderStatusChip';
import { ProviderChip } from '@/features/orders/components/ProviderChip';
import {
  clickableRowStyles,
  domainCellStyles,
  mutedTextStyles,
  tableScrollStyles,
} from '@/features/orders/styles/ordersStyles';
import { pluralize } from '@/lib/format';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { useUrlQuery } from '@/lib/use-url-query';
import { ADMIN_LIST_REFRESH_MS, IN_PROGRESS_STATUSES } from '@/shared/constants';
import type { AdminOrderSummary, PageMeta } from '@/shared/types/order.dto';
import { tokens } from '@/styles/theme';
import { OrderFilters, type AdminFilters } from './OrderFilters';
import { RetryOrderButton } from './RetryOrderButton';

/**
 * Admin list rendered from server data: URL-driven filters and pagination, Refresh, auto-refresh
 * every 5 s while a visible row is in progress, row click to the detail page, inline retry (only
 * where the DTO says canRetry) and an empty state.
 */
export function AdminOrdersView({
  items,
  meta,
  filters,
}: {
  items: AdminOrderSummary[];
  meta: PageMeta;
  filters: AdminFilters;
}) {
  const router = useRouter();
  const { update, isPending } = useUrlQuery();
  const [refreshing, startRefresh] = useTransition();
  const hasInProgress = items.some((order) => IN_PROGRESS_STATUSES.includes(order.status));
  useAutoRefresh(hasInProgress, ADMIN_LIST_REFRESH_MS);

  const resetFilters = () => update({ status: undefined, provider: undefined, page: undefined });

  return (
    <>
      <PageHeader
        title="All orders"
        subtitle="Every customer order. Filter by status or provider, open an order to see its audit log, and retry failed ones."
        meta={
          hasInProgress ? <LiveIndicator label="Refreshing while orders are in progress" /> : null
        }
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            Refresh
          </Button>
        }
      />
      <Card sx={{ overflow: 'hidden' }}>
        <OrderFilters
          filters={filters}
          onChange={(changes) => update({ ...changes, page: undefined })}
          onReset={resetFilters}
        />
        <Box sx={{ height: 3 }}>
          {isPending || refreshing ? (
            <LinearProgress sx={{ height: 3 }} aria-label="Loading orders" />
          ) : null}
        </Box>
        {items.length === 0 ? (
          <EmptyState
            icon={<FilterAltOffIcon />}
            title={
              filters.status || filters.provider ? 'No orders match these filters' : 'No orders yet'
            }
            description={
              filters.status || filters.provider
                ? 'Try another status or provider, or reset the filters.'
                : 'Orders appear here as soon as a customer creates one.'
            }
            action={
              filters.status || filters.provider ? (
                <Button variant="contained" onClick={resetFilters}>
                  Reset filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <OrderCardList
                items={items}
                renderExtra={(order) => (
                  <Typography
                    variant="body2"
                    sx={(theme) => ({
                      color: tokens(theme).admin.customerEmailText,
                      overflowWrap: 'anywhere',
                    })}
                  >
                    {order.customerEmail} · {pluralize(order.attempts, 'attempt')}
                  </Typography>
                )}
                renderActions={(order) =>
                  order.canRetry ? (
                    <RetryOrderButton
                      orderId={order.id}
                      size="small"
                      onRetried={() => router.refresh()}
                    />
                  ) : null
                }
              />
            </Box>
            <Box sx={{ ...tableScrollStyles, display: { xs: 'none', md: 'block' } }}>
              <Table size="medium" sx={{ minWidth: 920 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Created</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Domain</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell align="right">Mailboxes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Attempts</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((order) => (
                    <TableRow
                      key={order.id}
                      hover
                      onClick={() => router.push(`/orders/${order.id}`)}
                      sx={clickableRowStyles}
                    >
                      <TableCell sx={mutedTextStyles}>
                        <LocalTime iso={order.createdAt} />
                      </TableCell>
                      <TableCell
                        sx={(theme) => ({
                          color: tokens(theme).admin.customerEmailText,
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        })}
                      >
                        {order.customerEmail}
                      </TableCell>
                      <TableCell sx={domainCellStyles}>
                        <span title={order.domain}>{order.domain}</span>
                      </TableCell>
                      <TableCell>
                        <ProviderChip provider={order.provider} />
                      </TableCell>
                      <TableCell align="right">{order.mailboxCount}</TableCell>
                      <TableCell>
                        <OrderStatusChip status={order.status} />
                      </TableCell>
                      <TableCell align="right" sx={mutedTextStyles}>
                        {order.attempts}
                      </TableCell>
                      <TableCell
                        align="right"
                        // Clicks anywhere in the actions cell (including on a disabled,
                        // mid-retry button) never open the row.
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
                        >
                          {order.canRetry ? (
                            <RetryOrderButton
                              orderId={order.id}
                              size="small"
                              onRetried={() => router.refresh()}
                            />
                          ) : null}
                          <Link
                            component={NextLink}
                            href={`/orders/${order.id}`}
                            onClick={(event) => event.stopPropagation()}
                            sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
                            aria-label={`View order for ${order.domain}`}
                          >
                            View
                          </Link>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <ListPagination meta={meta} onChange={(changes) => update(changes)} />
          </>
        )}
      </Card>
    </>
  );
}
