'use client';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/shared/constants';
import { tokens } from '@/styles/theme';
import { navItemsFor } from './navigation';

/** Desktop navigation: the active link uses the shell.navActive* tokens. */
export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <Stack component="nav" aria-label="Main" direction="row" spacing={0.5}>
      {navItemsFor(role).map((item) => {
        const active = item.isActive(pathname);
        return (
          <Button
            key={item.href}
            component={NextLink}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            sx={(theme) => ({
              color: active ? tokens(theme).shell.navActiveText : tokens(theme).shell.navText,
              bgcolor: active ? tokens(theme).shell.navActiveBg : 'transparent',
              fontWeight: active ? 650 : 550,
              px: 1.5,
              '&:hover': {
                bgcolor: active ? tokens(theme).shell.navActiveBg : tokens(theme).orders.rowHoverBg,
                color: tokens(theme).shell.navActiveText,
              },
            })}
          >
            {item.label}
          </Button>
        );
      })}
    </Stack>
  );
}
