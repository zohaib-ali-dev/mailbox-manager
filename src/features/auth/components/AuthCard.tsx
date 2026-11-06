'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { tokens } from '@/styles/theme';

/** The frosted sign-in card over the auth backdrop, with the brand above it. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ width: '100%', maxWidth: 440 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <BrandMark />
      </Box>
      <Box
        sx={(theme) => ({
          p: { xs: 3, sm: 4 },
          borderRadius: '18px',
          bgcolor: tokens(theme).auth.cardGlassBg,
          border: `1px solid ${tokens(theme).auth.cardGlassBorder}`,
          boxShadow: tokens(theme).auth.cardShadow,
          backdropFilter: 'saturate(160%) blur(18px)',
          WebkitBackdropFilter: 'saturate(160%) blur(18px)',
          '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
            bgcolor: tokens(theme).auth.cardBg,
          },
        })}
      >
        <Typography
          variant="h2"
          component="h1"
          sx={(theme) => ({ color: tokens(theme).auth.titleColor })}
        >
          Sign in
        </Typography>
        <Typography
          variant="body2"
          sx={(theme) => ({ color: tokens(theme).auth.subtitleColor, mt: 0.75, mb: 3 })}
        >
          Order, track and retry pre-warmed Google and Microsoft mailboxes.
        </Typography>
        {children}
      </Box>
      <Typography
        variant="caption"
        component="p"
        sx={{ textAlign: 'center', color: 'text.secondary', mt: 3 }}
      >
        Internal tool. Access is limited to provisioned accounts.
      </Typography>
    </Box>
  );
}
