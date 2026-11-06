'use client';

import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { UserDto } from '@/shared/types/auth.dto';
import { tokens } from '@/styles/theme';
import { BrandMark } from './BrandMark';
import { NavLinks } from './NavLinks';
import { RoleChip } from './RoleChip';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { navItemsFor } from './navigation';
import { useLogout } from './useLogout';

/**
 * The signed-in frame: a frosted sticky app bar (brand, role-aware navigation, role chip, theme
 * toggle, account menu) over the content in a `lg` container. Below `md` the navigation moves
 * into a drawer.
 */
export function AppShell({ user, children }: { user: UserDto; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { logout, pending } = useLogout();
  const home = user.role === 'ADMIN' ? '/admin/orders' : '/orders';

  return (
    <>
      <Box
        component="a"
        href="#main"
        sx={(theme) => ({
          position: 'absolute',
          left: 8,
          top: -48,
          zIndex: 2000,
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: tokens(theme).primary.main,
          color: tokens(theme).primary.contrastText,
          '&:focus': { top: 8 },
        })}
      >
        Skip to content
      </Box>
      <AppBar
        position="sticky"
        elevation={0}
        sx={(theme) => ({
          bgcolor: tokens(theme).shell.appBarGlassBg,
          color: tokens(theme).shell.appBarText,
          borderBottom: `1px solid ${tokens(theme).shell.appBarBorder}`,
          backdropFilter: 'saturate(180%) blur(14px)',
          WebkitBackdropFilter: 'saturate(180%) blur(14px)',
          '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
            bgcolor: tokens(theme).shell.appBarBg,
          },
        })}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 60, md: 64 }, gap: { xs: 1, md: 3 } }}>
            <IconButton
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { md: 'none' }, ml: -1, color: 'text.secondary' }}
            >
              <MenuIcon />
            </IconButton>
            <Box
              component={NextLink}
              href={home}
              aria-label="Mailbox Manager home"
              sx={{ textDecoration: 'none', borderRadius: 1 }}
            >
              <BrandMark />
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <NavLinks role={user.role} />
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ alignItems: 'center' }}>
              <Box
                sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, mr: 0.5 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </Typography>
                <RoleChip role={user.role} />
              </Box>
              <ThemeToggle />
              <UserMenu user={user} />
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 'min(320px, 86vw)' } } }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}
        >
          <BrandMark />
          <IconButton aria-label="Close navigation" onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider />
        <List component="nav" aria-label="Main" sx={{ px: 1 }}>
          {navItemsFor(user.role).map((item) => {
            const active = item.isActive(pathname);
            return (
              <ListItemButton
                key={item.href}
                component={NextLink}
                href={item.href}
                selected={active}
                aria-current={active ? 'page' : undefined}
                onClick={() => setDrawerOpen(false)}
                sx={(theme) => ({
                  borderRadius: 2,
                  my: 0.25,
                  color: active ? tokens(theme).shell.navActiveText : tokens(theme).shell.navText,
                  '&.Mui-selected, &.Mui-selected:hover': {
                    bgcolor: tokens(theme).shell.navActiveBg,
                  },
                })}
              >
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontWeight: active ? 650 : 550 } } }}
                />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="subtitle2">{user.name}</Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mb: 1, overflowWrap: 'anywhere' }}
          >
            {user.email}
          </Typography>
          <RoleChip role={user.role} />
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={() => void logout()}
            disabled={pending}
            sx={{ mt: 2 }}
          >
            Sign out
          </Button>
        </Box>
      </Drawer>

      <Container
        component="main"
        id="main"
        tabIndex={-1}
        maxWidth="lg"
        sx={{ py: { xs: 3, md: 5 }, outline: 'none' }}
      >
        {children}
      </Container>
    </>
  );
}
