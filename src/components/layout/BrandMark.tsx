'use client';

import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { APP_NAME } from '@/shared/constants';
import { tokens } from '@/styles/theme';

/** The "Mailbox Manager" brand: a tinted mark plus the name. */
export function BrandMark({ hideNameOnPhone = false }: { hideNameOnPhone?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 34,
          height: 34,
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: tokens(theme).primary.main,
          color: tokens(theme).primary.contrastText,
          boxShadow: `0 4px 14px ${tokens(theme).shell.focusRing}`,
          '& svg': { fontSize: 20 },
        })}
      >
        <MarkEmailReadOutlinedIcon />
      </Box>
      <Typography
        component="span"
        sx={(theme) => ({
          fontWeight: 750,
          fontSize: '1.0625rem',
          letterSpacing: '-0.015em',
          color: tokens(theme).shell.appBarText,
          whiteSpace: 'nowrap',
          display: hideNameOnPhone ? { xs: 'none', sm: 'inline' } : 'inline',
        })}
      >
        {APP_NAME}
      </Typography>
    </Box>
  );
}
