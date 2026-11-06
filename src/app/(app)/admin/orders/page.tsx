import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminOrdersView } from '@/features/admin/components/AdminOrdersView';
import { requirePageAdmin } from '@/server/auth/guards';
import { getContainer } from '@/server/container';
import { adminOrderListQuerySchema } from '@/shared/schemas/order.schema';
import { parseQueryLeniently } from '@/shared/schemas/lenient-query';

export const metadata: Metadata = { title: 'All orders' };

/**
 * Admin list, rendered on the server from the URL. Invalid query values fall back to defaults; a
 * page past the end (for example after a filter change) goes to the last page.
 */
export default async function AdminOrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  const viewer = await requirePageAdmin();
  const raw = await searchParams;
  const query = parseQueryLeniently(adminOrderListQuerySchema, raw, [
    'status',
    'provider',
    'page',
    'pageSize',
  ]);
  const { orderService } = (await getContainer()).services;
  const { items, meta } = await orderService.listOrdersForAdmin(viewer, query);

  if (meta.total > 0 && meta.page > meta.totalPages) {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.provider) params.set('provider', query.provider);
    if (raw.pageSize) params.set('pageSize', String(query.pageSize));
    params.set('page', String(meta.totalPages));
    redirect(`/admin/orders?${params.toString()}`);
  }

  return (
    <AdminOrdersView
      items={items}
      meta={meta}
      filters={{ status: query.status, provider: query.provider }}
    />
  );
}
