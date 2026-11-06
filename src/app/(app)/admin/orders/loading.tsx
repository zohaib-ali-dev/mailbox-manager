import { LoadingState } from '@/components/feedback/LoadingState';

/**
 * Skeleton while this page's server data loads. Kept at page level (not around the layouts) so a
 * notFound() in a guard or page still answers with a real 404 status.
 */
export default function Loading() {
  return <LoadingState />;
}
