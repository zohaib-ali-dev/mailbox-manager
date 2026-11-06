'use client';

import { visuallyHidden } from './visuallyHidden';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/** Skeleton of a page header plus a table card, shown while a route segment loads. */
export function LoadingState({ rows = 6 }: { rows?: number }) {
  return (
    <Box aria-busy="true" aria-live="polite">
      <Box component="span" sx={visuallyHidden}>
        Loading
      </Box>
      <Skeleton variant="text" width={220} height={44} />
      <Skeleton variant="text" width={320} sx={{ mb: 3 }} />
      <Card>
        <Stack spacing={0} sx={{ p: 2 }}>
          {Array.from({ length: rows }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={36} sx={{ my: 0.75 }} />
          ))}
        </Stack>
      </Card>
    </Box>
  );
}
