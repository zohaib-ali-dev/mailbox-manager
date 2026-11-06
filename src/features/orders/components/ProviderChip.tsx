'use client';

import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import type { Provider } from '@/shared/constants';
import { tokens } from '@/styles/theme';

export const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
};

export const PROVIDER_HINTS: Record<Provider, string> = {
  google: 'Google Workspace mailboxes (mocked provider in this demo).',
  microsoft: 'Microsoft 365 mailboxes (mocked provider in this demo).',
};

/** Provider chip: text only (no brand logos), coloured with the provider tokens, with a tooltip. */
export function ProviderChip({
  provider,
  size = 'small',
}: {
  provider: Provider;
  size?: 'small' | 'medium';
}) {
  return (
    <Tooltip title={PROVIDER_HINTS[provider]}>
      <Chip
        size={size}
        label={PROVIDER_LABELS[provider]}
        sx={(theme) => ({
          bgcolor: tokens(theme).provider[`${provider}Bg`],
          color: tokens(theme).provider[`${provider}Text`],
          cursor: 'help',
        })}
      />
    </Tooltip>
  );
}
