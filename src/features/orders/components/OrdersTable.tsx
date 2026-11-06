'use client';

import { visuallyHidden } from '@/components/feedback/visuallyHidden';
import AddIcon from '@mui/icons-material/Add';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/feedback/EmptyState';
import { HeaderHint } from '@/components/feedback/HeaderHint';
import { ListPagination } from '@/components/feedback/ListPagination';
import { LiveIndicator } from '@/components/feedback/LiveIndicator';
import { LocalTime } from '@/components/feedback/LocalTime';
import { PageHeader } from '@/components/feedback/PageHeader';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { useUrlQuery } from '@/lib/use-url-query';
import { CUSTOMER_LIST_REFRESH_MS, IN_PROGRESS_STATUSES } from '@/shared/constants';
import type { OrderSummary, PageMeta } from '@/shared/types/order.dto';
import {
  clickableRowStyles,
  domainCellStyles,
  mutedTextStyles,
  tableScrollStyles,
} from '../styles/ordersStyles';
import { useStatusChangeNotifier } from '../hooks/useStatusChangeNotifier';
import { OrderCardList } from './OrderCardList';
import { OrderStatusChip } from './OrderStatusChip';
import { ProviderChip } from './ProviderChip';

/**
 * "My orders": server-rendered rows, URL-driven pagination, row click to the detail page and
 * auto-refresh every 3 s only while a visible row is still in progress.
 */
export function OrdersTable({ items, meta }: { items: OrderSummary[]; meta: PageMeta }) {
  const router = useRouter();
  const { update, isPending } = useUrlQuery();
  const hasInProgress = items.some((order) => IN_PROGRESS_STATUSES.includes(order.status));
  useAutoRefresh(hasInProgress, CUSTOMER_LIST_REFRESH_MS);
  useStatusChangeNotifier(items);

  const newOrderButton = (
    <Button component={NextLink} href="/orders/new" variant="contained" startIcon={<AddIcon />}>
      New order
    </Button>
  );

  return (
    <>
      <PageHeader
        title="My orders"
        subtitle="Track every mailbox order. Orders in progress update on their own."
        meta={
          hasInProgress ? (
            <LiveIndicator
              label="Updating while orders are in progress"
              hint="The list refreshes every 3 seconds while an order on this page is Pending or Provisioning."
            />
          ) : null
        }
        actions={meta.total > 0 ? newOrderButton : null}
      />
      <Card sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: 3 }}>
          {isPending ? <LinearProgress sx={{ height: 3 }} aria-label="Loading orders" /> : null}
        </Box>
        {items.length === 0 ? (
          <EmptyState
            icon={<InboxOutlinedIcon />}
            title={meta.total === 0 ? 'No orders yet' : 'Nothing on this page'}
            description={
              meta.total === 0
                ? 'Order pre-warmed Google or Microsoft mailboxes for your domain. Provisioning starts right away.'
                : 'Go back to the first page to see your orders.'
            }
            action={
              meta.total === 0 ? (
                <Button
                  component={NextLink}
                  href="/orders/new"
                  variant="contained"
                  startIcon={<AddIcon />}
                >
                  Create your first order
                </Button>
              ) : (
                <Button variant="contained" onClick={() => update({ page: undefined })}>
                  First page
                </Button>
              )
            }
          />
        ) : (
          <>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <OrderCardList items={items} />
            </Box>
            <Box sx={{ ...tableScrollStyles, display: { xs: 'none', sm: 'block' } }}>
              <Table sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Created</TableCell>
                    <TableCell>Domain</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell align="right">
                      <HeaderHint
                        label="Mailboxes"
                        hint="How many mailboxes you ordered for the domain."
                      />
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">
                      <Box component="span" sx={visuallyHidden}>
                        Open
                      </Box>
                    </TableCell>
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
                      <TableCell align="right">
                        <Link
                          component={NextLink}
                          href={`/orders/${order.id}`}
                          onClick={(event) => event.stopPropagation()}
                          sx={{ fontWeight: 600 }}
                          aria-label={`View order for ${order.domain}`}
                        >
                          View
                        </Link>
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
