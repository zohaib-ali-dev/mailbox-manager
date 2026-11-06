import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrdersTable } from '@/features/orders/components/OrdersTable';
import { requirePageCustomer } from '@/server/auth/guards';
import { getContainer } from '@/server/container';
import { parseQueryLeniently } from '@/shared/schemas/lenient-query';
import { orderListQuerySchema } from '@/shared/schemas/order.schema';

export const metadata: Metadata = { title: 'My orders' };

/** Customer list from the URL's page and pageSize (invalid values fall back to defaults). */
export default async function MyOrdersPage({ searchParams }: PageProps<'/orders'>) {
  const viewer = await requirePageCustomer();
  const raw = await searchParams;
  const query = parseQueryLeniently(orderListQuerySchema, raw, ['page', 'pageSize']);
  const { orderService } = (await getContainer()).services;
  const { items, meta } = await orderService.listOrdersForCustomer(viewer, query);
  if (meta.total > 0 && meta.page > meta.totalPages) {
    redirect(`/orders?page=${meta.totalPages}${raw.pageSize ? `&pageSize=${query.pageSize}` : ''}`);
  }
  return <OrdersTable items={items} meta={meta} />;
}
