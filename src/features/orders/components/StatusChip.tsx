'use client';

import Chip from '@mui/material/Chip';
import { keyframes } from '@mui/material/styles';
import type { OrderStatus } from '@/shared/constants';
import { tokens } from '@/styles/theme';
import { STATUS_VISUALS } from './statusVisuals';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

/** Shared renderer behind OrderStatusChip and MailboxStatusChip. */
export function StatusChip({
  status,
  size = 'small',
}: {
  status: OrderStatus;
  size?: 'small' | 'medium';
}) {
  const { label, Icon, token } = STATUS_VISUALS[status];
  return (
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
  );
}
