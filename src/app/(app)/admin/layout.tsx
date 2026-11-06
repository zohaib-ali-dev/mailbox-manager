import { requirePageAdmin } from '@/server/auth/guards';

/** The admin area: anyone who is not an admin gets the 404 page. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageAdmin();
  return children;
}
