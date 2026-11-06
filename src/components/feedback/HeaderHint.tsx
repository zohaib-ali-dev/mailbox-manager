'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';

/**
 * A label with a small info icon that explains it on hover or keyboard focus. Used for table
 * headers and stat labels whose meaning is not obvious ("Attempts", "Address").
 */
export function HeaderHint({ label, hint }: { label: string; hint: string }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {label}
      <Tooltip title={hint}>
        <Box
          component="span"
          tabIndex={0}
          role="img"
          aria-label={`About ${label}: ${hint}`}
          sx={{
            display: 'inline-flex',
            cursor: 'help',
            opacity: 0.7,
            borderRadius: '50%',
            '&:hover, &:focus-visible': { opacity: 1 },
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 14 }} />
        </Box>
      </Tooltip>
    </Box>
  );
}
