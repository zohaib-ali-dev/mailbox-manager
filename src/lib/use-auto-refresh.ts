'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePageVisible } from './use-page-visible';

/**
 * Re-renders the current server page every `intervalMs` while `enabled` and the tab is visible.
 * One interval at a time: it is cleared whenever either condition changes or on unmount.
 */
export function useAutoRefresh(enabled: boolean, intervalMs: number): void {
  const router = useRouter();
  const visible = usePageVisible();
  useEffect(() => {
    if (!enabled || !visible) return;
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, visible, intervalMs, router]);
}
