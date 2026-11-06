import Container from '@mui/material/Container';
import type { Metadata } from 'next';
import { NotFoundState } from '@/components/feedback/NotFoundState';

export const metadata: Metadata = { title: 'Not found' };

/** Root 404 (outside the app shell). */
export default function NotFound() {
  return (
    <Container maxWidth="sm" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <NotFoundState />
    </Container>
  );
}
