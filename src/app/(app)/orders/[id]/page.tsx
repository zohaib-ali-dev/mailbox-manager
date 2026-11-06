import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderDetailView } from '@/features/orders/components/OrderDetailView';
import { requirePageViewer } from '@/server/auth/guards';
import { getContainer } from '@/server/container';
import { NotFoundError } from '@/server/domain/errors';

export const metadata: Metadata = { title: 'Order details' };

/** Order detail (owner or admin). Anyone else, or an unknown id, gets the 404 page. */
export default async function OrderDetailPage({ params }: PageProps<'/orders/[id]'>) {
  const viewer = await requirePageViewer();
  const { id } = await params;
  const { orderService } = (await getContainer()).services;
  const order = await orderService.getOrderForViewer(viewer, id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const back =
    viewer.role === 'ADMIN'
      ? { href: '/admin/orders', label: 'All orders' }
      : { href: '/orders', label: 'My orders' };
  return <OrderDetailView initial={order} back={back} />;
}
