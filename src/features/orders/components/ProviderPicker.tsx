'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PROVIDERS, type Provider } from '@/shared/constants';
import { tokens } from '@/styles/theme';
import { PROVIDER_LABELS } from './ProviderChip';

const DESCRIPTIONS: Record<Provider, string> = {
  google: 'Google Workspace mailboxes',
  microsoft: 'Microsoft 365 mailboxes',
};

/** Two selectable cards backed by native radio inputs (arrow keys and screen readers just work). */
export function ProviderPicker({
  value,
  onChange,
  error,
}: {
  value: Provider | null;
  onChange: (provider: Provider) => void;
  error?: string;
}) {
  return (
    <Box
      component="fieldset"
      sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
      aria-describedby={error ? 'provider-error' : undefined}
    >
      <Typography component="legend" variant="subtitle2" sx={{ mb: 1 }}>
        Provider
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        {PROVIDERS.map((provider) => {
          const selected = value === provider;
          return (
            <Box
              component="label"
              key={provider}
              sx={(theme) => ({
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 2,
                cursor: 'pointer',
                borderRadius: '12px',
                border: `1.5px solid ${selected ? tokens(theme).orders.selectedCardBorder : error ? tokens(theme).error.main : tokens(theme).orders.cardBorder}`,
                bgcolor: selected
                  ? tokens(theme).orders.selectedCardBg
                  : tokens(theme).orders.cardBg,
                transition: 'border-color 120ms ease-out, background-color 120ms ease-out',
                '&:hover': { borderColor: tokens(theme).orders.selectedCardBorder },
                '&:has(input:focus-visible)': {
                  outline: `2px solid ${tokens(theme).shell.focusRing}`,
                  outlineOffset: 2,
                },
              })}
            >
              <Box
                component="input"
                type="radio"
                name="provider"
                value={provider}
                checked={selected}
                onChange={() => onChange(provider)}
                sx={(theme) => ({
                  accentColor: tokens(theme).primary.main,
                  width: 18,
                  height: 18,
                  m: 0,
                  flexShrink: 0,
                })}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={(theme) => ({
                    fontWeight: 700,
                    color: tokens(theme).provider[`${provider}Text`],
                  })}
                >
                  {PROVIDER_LABELS[provider]}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {DESCRIPTIONS[provider]}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
      {error ? (
        <Typography
          id="provider-error"
          variant="caption"
          role="alert"
          sx={{ color: 'error.main', mt: 0.75, display: 'block' }}
        >
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
