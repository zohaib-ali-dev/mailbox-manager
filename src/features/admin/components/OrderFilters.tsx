'use client';

import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { STATUS_VISUALS } from '@/features/orders/components/statusVisuals';
import { PROVIDER_LABELS } from '@/features/orders/components/ProviderChip';
import { ORDER_STATUSES, PROVIDERS, type OrderStatus, type Provider } from '@/shared/constants';
import { tokens } from '@/styles/theme';

export interface AdminFilters {
  status?: OrderStatus;
  provider?: Provider;
}

/** Status and provider selects plus Reset. Values come from and go to the URL. */
export function OrderFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: AdminFilters;
  onChange: (changes: { status?: string; provider?: string }) => void;
  onReset: () => void;
}) {
  const active = Boolean(filters.status || filters.provider);
  return (
    <Box
      role="search"
      aria-label="Filter orders"
      sx={(theme) => ({
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr 1fr', sm: '200px 200px auto' },
        alignItems: 'center',
        p: 2,
        bgcolor: tokens(theme).admin.filterBarBg,
        borderBottom: `1px solid ${tokens(theme).admin.filterBarBorder}`,
      })}
    >
      <TextField
        select
        size="small"
        label="Status"
        value={filters.status ?? 'all'}
        onChange={(event) =>
          onChange({ status: event.target.value === 'all' ? undefined : event.target.value })
        }
      >
        <MenuItem value="all">All statuses</MenuItem>
        {ORDER_STATUSES.map((status) => (
          <MenuItem key={status} value={status}>
            {STATUS_VISUALS[status].label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Provider"
        value={filters.provider ?? 'all'}
        onChange={(event) =>
          onChange({ provider: event.target.value === 'all' ? undefined : event.target.value })
        }
      >
        <MenuItem value="all">All providers</MenuItem>
        {PROVIDERS.map((provider) => (
          <MenuItem key={provider} value={provider}>
            {PROVIDER_LABELS[provider]}
          </MenuItem>
        ))}
      </TextField>
      <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
        <Button
          startIcon={<FilterAltOffIcon />}
          onClick={onReset}
          disabled={!active}
          color="inherit"
          sx={{ color: 'text.secondary' }}
        >
          Reset filters
        </Button>
      </Box>
    </Box>
  );
}
