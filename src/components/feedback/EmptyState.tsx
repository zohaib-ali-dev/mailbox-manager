'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { tokens } from '@/styles/theme';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

/** A calm "nothing here yet" block that always offers the next step when there is one. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      role="status"
      sx={{
        textAlign: 'center',
        px: 3,
        py: { xs: 6, md: 8 },
        display: 'grid',
        justifyItems: 'center',
        gap: 1.5,
      }}
    >
      <Box
        aria-hidden
        sx={(theme) => ({
          color: tokens(theme).orders.emptyIconColor,
          display: 'grid',
          placeItems: 'center',
          width: 56,
          height: 56,
          borderRadius: '16px',
          bgcolor: tokens(theme).orders.statCardBg,
          border: `1px solid ${tokens(theme).orders.cardBorder}`,
          '& svg': { fontSize: 28 },
        })}
      >
        {icon}
      </Box>
      <Typography variant="h3" component="p">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: '46ch' }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
    </Box>
  );
}
