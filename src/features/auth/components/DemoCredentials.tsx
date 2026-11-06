'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { tokens } from '@/styles/theme';
import { DEMO_ACCOUNTS } from '../demo-accounts';

/** The seeded accounts with "Use" buttons that fill the login form. */
export function DemoCredentials({ onUse }: { onUse: (email: string, password: string) => void }) {
  return (
    <Box
      component="section"
      aria-labelledby="demo-accounts-title"
      sx={(theme) => ({
        mt: 3,
        p: 2,
        borderRadius: '12px',
        bgcolor: tokens(theme).auth.demoBoxBg,
        border: `1px dashed ${tokens(theme).auth.demoBoxBorder}`,
        color: tokens(theme).auth.demoBoxText,
      })}
    >
      <Typography id="demo-accounts-title" variant="subtitle2" sx={{ mb: 1.25 }}>
        Demo accounts
      </Typography>
      <Stack spacing={1}>
        {DEMO_ACCOUNTS.map((account) => (
          <Stack
            key={account.email}
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {account.label}
              </Typography>
              <Typography
                variant="caption"
                component="p"
                sx={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  overflowWrap: 'anywhere',
                  opacity: 0.85,
                }}
              >
                {account.email} · {account.password}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onUse(account.email, account.password)}
              aria-label={`Use the ${account.label.toLowerCase()} account`}
              sx={{ flexShrink: 0 }}
            >
              Use
            </Button>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
