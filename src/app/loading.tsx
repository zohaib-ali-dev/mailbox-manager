import Container from '@mui/material/Container';
import { LoadingState } from '@/components/feedback/LoadingState';

/** Root loading skeleton. */
export default function Loading() {
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <LoadingState />
    </Container>
  );
}
