'use client';

import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { keyframes } from '@mui/material/styles';
import type { OrderStatus } from '@/shared/constants';
import { tokens } from '@/styles/theme';
import { STATUS_VISUALS } from './statusVisuals';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

interface StatusChipProps {
  status: OrderStatus;
  size?: 'small' | 'medium';
  /** Which explanation the tooltip shows. */
  kind?: 'order' | 'mailbox';
}

/** Shared renderer behind OrderStatusChip and MailboxStatusChip, with a tooltip explaining the status. */
export function StatusChip({ status, size = 'small', kind = 'order' }: StatusChipProps) {
  const { label, Icon, token, orderHint, mailboxHint } = STATUS_VISUALS[status];
  return (
    <Tooltip title={kind === 'order' ? orderHint : mailboxHint}>
      <Chip
        size={size}
        label={label}
        icon={<Icon aria-hidden />}
        variant="outlined"
        sx={(theme) => {
          const palette = tokens(theme).status;
          return {
            bgcolor: palette[`${token}Bg`],
            color: palette[`${token}Text`],
            borderColor: palette[`${token}Border`],
            cursor: 'help',
            '& .MuiChip-icon': {
              color: 'inherit',
              fontSize: 16,
              ml: '6px',
              ...(status === 'PROVISIONING'
                ? {
                    animation: `${spin} 1.4s linear infinite`,
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }
                : {}),
            },
          };
        }}
      />
    </Tooltip>
  );
}
