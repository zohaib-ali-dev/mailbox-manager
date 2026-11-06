import { redirect } from 'next/navigation';
import { getCurrentViewer, homePathFor } from '@/server/auth/guards';

/** `/` only routes: signed out -> /login, customer -> /orders, admin -> /admin/orders. */
export default async function HomePage() {
  const viewer = await getCurrentViewer();
  redirect(viewer ? homePathFor(viewer) : '/login');
}
