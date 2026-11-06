'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { OrderProgress as Progress } from '@/shared/types/order.dto';
import { tokens } from '@/styles/theme';

const STATS = [
  { key: 'total', label: 'Total', hint: 'Mailboxes in this order.' },
  { key: 'active', label: 'Active', hint: 'Created by the provider and ready to use.' },
  {
    key: 'failed',
    label: 'Failed',
    hint: 'The provider returned an error. An admin retry sends only these again.',
  },
  {
    key: 'pending',
    label: 'Pending',
    hint: 'Not provisioned yet: waiting for, or being handled by, a worker.',
  },
] as const;

/** Progress bar (active / total) and the four mailbox counts in one summary card. */
export function OrderProgress({ progress }: { progress: Progress }) {
  const percent = progress.total === 0 ? 0 : Math.round((progress.active / progress.total) * 100);
  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}
      >
        <Typography variant="subtitle2" component="h2">
          Provisioning progress
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
        >
          {progress.active} of {progress.total} active ({percent}%)
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        aria-label="Mailboxes active"
        sx={(theme) => ({
          height: 8,
          borderRadius: 999,
          bgcolor: tokens(theme).orders.progressTrackBg,
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            bgcolor: tokens(theme).orders.progressBarBg,
          },
        })}
      />
      <Box
        component="dl"
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 1,
          m: 0,
          mt: 2,
          '& > div': {
            bgcolor: tokens(theme).orders.statCardBg,
            border: `1px solid ${tokens(theme).orders.cardBorder}`,
            borderRadius: '10px',
            px: 1.5,
            py: 1.25,
          },
        })}
      >
        {STATS.map(({ key, label, hint }) => (
          <Tooltip key={key} title={hint} placement="top">
            <div style={{ cursor: 'help' }}>
              <Typography
                component="dt"
                variant="caption"
                sx={(theme) => ({ color: tokens(theme).orders.mutedText, fontWeight: 600 })}
              >
                {label}
              </Typography>
              <Typography
                component="dd"
                sx={(theme) => ({
                  m: 0,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  fontVariantNumeric: 'tabular-nums',
                  color:
                    key === 'failed' && progress.failed > 0
                      ? tokens(theme).status.failedText
                      : key === 'active' && progress.active > 0
                        ? tokens(theme).status.activeText
                        : tokens(theme).orders.statValueText,
                })}
              >
                {progress[key]}
              </Typography>
            </div>
          </Tooltip>
        ))}
      </Box>
    </Card>
  );
}
