'use client';

import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import { formatDateTime, formatFullDateTime, formatRelative, isoDatePart } from '@/lib/format';
import { useIsClient } from '@/lib/use-is-client';

/**
 * Renders an ISO timestamp in the browser's local time, only after mount, so the server HTML
 * (a UTC date placeholder) and the first client render always match. The tooltip shows the full
 * timestamp and how long ago it was.
 */
export function LocalTime({ iso, relative = false }: { iso: string; relative?: boolean }) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <Box component="time" dateTime={iso} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {isoDatePart(iso)}
      </Box>
    );
  }
  return (
    <Tooltip title={`${formatFullDateTime(iso)} (${formatRelative(iso)})`}>
      <Box
        component="time"
        dateTime={iso}
        sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
      >
        {relative ? formatRelative(iso) : formatDateTime(iso)}
      </Box>
    </Tooltip>
  );
}
