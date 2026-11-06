'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons on the right (they wrap below the title on narrow screens). */
  actions?: ReactNode;
  /** Chips and small facts shown under the title. */
  meta?: ReactNode;
  back?: { href: string; label: string };
}

/** The title block every screen starts with: optional back link, title, subtitle, meta, actions. */
export function PageHeader({ title, subtitle, actions, meta, back }: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
      {back ? (
        <Link
          component={NextLink}
          href={back.href}
          color="text.secondary"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            mb: 1.5,
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1" sx={{ overflowWrap: 'anywhere', textWrap: 'balance' }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', mt: 0.75, maxWidth: '68ch' }}
            >
              {subtitle}
            </Typography>
          ) : null}
          {meta ? (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}
            >
              {meta}
            </Stack>
          ) : null}
        </Box>
        {actions ? (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
