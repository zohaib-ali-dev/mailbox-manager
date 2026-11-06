'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';

/**
 * Writes list state (filters, page, page size) to the URL so it survives refresh and can be
 * shared. `undefined` or '' removes a key. Returns a pending flag while the server re-renders.
 */
export function useUrlQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (changes: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === '') params.delete(key);
        else params.set(key, String(value));
      }
      const query = params.toString();
      startTransition(() =>
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }),
      );
    },
    [pathname, router, searchParams],
  );

  return { update, isPending };
}
