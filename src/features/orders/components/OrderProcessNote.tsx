'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { tokens } from '@/styles/theme';

const STEPS = [
  {
    title: 'Queued',
    body: 'Your order is saved once, even if you submit twice or the network drops.',
  },
  {
    title: 'Provisioning',
    body: 'A worker creates each mailbox with the provider, a few seconds each.',
  },
  {
    title: 'Active or failed',
    body: 'If some mailboxes fail, an admin can retry just those; active ones are kept.',
  },
] as const;

/** Side note on the new-order page: what happens after "Place order". */
export function OrderProcessNote() {
  return (
    <Card component="aside" aria-labelledby="process-title" sx={{ p: 2.5 }}>
      <Typography id="process-title" variant="h4" component="h2" sx={{ mb: 2 }}>
        What happens next
      </Typography>
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 2 }}>
        {STEPS.map((step, index) => (
          <Box
            component="li"
            key={step.title}
            sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 1.5 }}
          >
            <Box
              aria-hidden
              sx={(theme) => ({
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.8125rem',
                fontWeight: 700,
                bgcolor: tokens(theme).shell.navActiveBg,
                color: tokens(theme).shell.navActiveText,
              })}
            >
              {index + 1}
            </Box>
            <Box>
              <Typography variant="subtitle2">{step.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {step.body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Card>
  );
}
