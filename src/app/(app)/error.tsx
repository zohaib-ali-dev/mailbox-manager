'use client';

import { ErrorState } from '@/components/feedback/ErrorState';

/** Error boundary inside the app shell, so navigation stays available. */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
