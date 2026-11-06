import Box from '@mui/material/Box';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { safeNextPath } from '@/lib/safe-redirect';
import { getCurrentViewer, homePathFor } from '@/server/auth/guards';
import { env } from '@/server/config/env';

export const metadata: Metadata = { title: 'Sign in' };

/** /login: signed-in viewers go home; otherwise the form, with a sanitised `next` target. */
export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const viewer = await getCurrentViewer();
  if (viewer) redirect(homePathFor(viewer));
  const { next } = await searchParams;
  const target = safeNextPath(Array.isArray(next) ? next[0] : next, '/');

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: { xs: 4, sm: 8 },
      }}
    >
      <AuthCard>
        <LoginForm next={target} showDemo={env.SHOW_DEMO_CREDENTIALS} />
      </AuthCard>
    </Box>
  );
}
