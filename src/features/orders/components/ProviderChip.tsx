'use client';

import Chip from '@mui/material/Chip';
import type { Provider } from '@/shared/constants';
import { tokens } from '@/styles/theme';

export const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
};

/** Provider chip: text only (no brand logos), coloured with the provider tokens. */
export function ProviderChip({
  provider,
  size = 'small',
}: {
  provider: Provider;
  size?: 'small' | 'medium';
}) {
  return (
    <Chip
      size={size}
      label={PROVIDER_LABELS[provider]}
      sx={(theme) => ({
        bgcolor: tokens(theme).provider[`${provider}Bg`],
        color: tokens(theme).provider[`${provider}Text`],
      })}
    />
  );
}
