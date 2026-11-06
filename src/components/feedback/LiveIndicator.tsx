'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import { tokens } from '@/styles/theme';

const pulse = keyframes`0% { transform: scale(1); opacity: 0.7; } 70% { transform: scale(2.4); opacity: 0; } 100% { opacity: 0; }`;

/** "Live" badge with a pulsing dot while a screen refreshes itself. */
export function LiveIndicator({ label = 'Live' }: { label?: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }} role="status">
      <Box
        aria-hidden
        sx={(theme) => ({
          position: 'relative',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: tokens(theme).status.provisioningText,
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            bgcolor: tokens(theme).status.provisioningText,
            animation: `${pulse} 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite`,
          },
          '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none' } },
        })}
      />
      <Typography
        variant="caption"
        sx={(theme) => ({ color: tokens(theme).status.provisioningText, fontWeight: 650 })}
      >
        {label}
      </Typography>
    </Box>
  );
}
