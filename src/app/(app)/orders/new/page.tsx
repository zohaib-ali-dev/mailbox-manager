import type { Metadata } from 'next';
import { PageHeader } from '@/components/feedback/PageHeader';
import Box from '@mui/material/Box';
import { CreateOrderForm } from '@/features/orders/components/CreateOrderForm';
import { OrderProcessNote } from '@/features/orders/components/OrderProcessNote';
import { requirePageCustomer } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'New order' };

/** Create-order page (customers only; admins are sent to the admin list). */
export default async function NewOrderPage() {
  await requirePageCustomer();
  return (
    <>
      <PageHeader
        back={{ href: '/orders', label: 'My orders' }}
        title="New order"
        subtitle="Mailboxes are provisioned in the background. You can watch each one go live on the order page."
      />
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'start',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 320px' },
        }}
      >
        <CreateOrderForm />
        <OrderProcessNote />
      </Box>
    </>
  );
}
