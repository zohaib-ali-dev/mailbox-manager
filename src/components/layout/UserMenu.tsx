'use client';

import LogoutIcon from '@mui/icons-material/Logout';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState, type MouseEvent } from 'react';
import { initials } from '@/lib/format';
import type { UserDto } from '@/shared/types/auth.dto';
import { tokens } from '@/styles/theme';
import { RoleChip } from './RoleChip';
import { useLogout } from './useLogout';

/** Avatar button opening the account menu: name, email, role and Sign out. */
export function UserMenu({ user }: { user: UserDto }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { logout, pending } = useLogout();

  return (
    <>
      <IconButton
        aria-label={`Account menu for ${user.email}`}
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        sx={{ p: 0.5 }}
      >
        <Avatar
          sx={(theme) => ({
            width: 32,
            height: 32,
            fontSize: '0.8125rem',
            fontWeight: 700,
            bgcolor: tokens(theme).shell.navActiveBg,
            color: tokens(theme).shell.navActiveText,
          })}
        >
          {initials(user.name)}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 240, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle2" noWrap>
            {user.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }} noWrap>
            {user.email}
          </Typography>
          <RoleChip role={user.role} />
        </Box>
        <Divider />
        <MenuItem onClick={() => void logout()} disabled={pending}>
          <ListItemIcon>
            {pending ? <CircularProgress size={16} /> : <LogoutIcon fontSize="small" />}
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
