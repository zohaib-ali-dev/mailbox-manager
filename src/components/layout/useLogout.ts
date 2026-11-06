'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { ApiError, apiRequest } from '@/lib/api-client';

/** Logs out (POST /api/auth/logout), then replaces the route with /login and refreshes. */
export function useLogout() {
  const router = useRouter();
  const notify = useNotify();
  const [pending, setPending] = useState(false);

  const logout = useCallback(async () => {
    if (pending) return;
    setPending(true);
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      notify('You are signed out.', 'info');
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setPending(false);
      notify(error instanceof ApiError ? error.message : 'Could not sign out. Try again.', 'error');
    }
  }, [pending, router, notify]);

  return { logout, pending };
}
