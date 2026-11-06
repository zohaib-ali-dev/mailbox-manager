'use client';

import Container from '@mui/material/Container';
import { ErrorState } from '@/components/feedback/ErrorState';

/** Root error boundary: a recoverable message, never the stack trace. */
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container maxWidth="sm" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <ErrorState onRetry={reset} />
    </Container>
  );
}
