import { AppShell } from '@/components/layout/AppShell';
import { requirePageViewer } from '@/server/auth/guards';
import { toUserDto } from '@/server/mappers/user.mapper';

/** Every signed-in screen: requires a session (else /login?next=...) and renders the shell. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePageViewer();
  return <AppShell user={toUserDto(viewer)}>{children}</AppShell>;
}
