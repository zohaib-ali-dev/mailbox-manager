'use client';

import Chip from '@mui/material/Chip';
import type { Role } from '@/shared/constants';
import { tokens } from '@/styles/theme';

/** "Customer" or "Admin", styled with the shell.roleChip* tokens. */
export function RoleChip({ role }: { role: Role }) {
  return (
    <Chip
      size="small"
      label={role === 'ADMIN' ? 'Admin' : 'Customer'}
      sx={(theme) => ({
        bgcolor: tokens(theme).shell.roleChipBg,
        color: tokens(theme).shell.roleChipText,
      })}
    />
  );
}
