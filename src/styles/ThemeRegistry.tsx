'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { ReactNode } from 'react';
import { SnackbarProvider } from '@/components/feedback/SnackbarProvider';
import { theme } from './theme';

/**
 * Client-side theme root: the App Router Emotion cache (styles stream with the server HTML), the
 * MUI theme with light, dark and system modes, CssBaseline, and the app-wide snackbar (at the root
 * so a message survives navigation, e.g. "Welcome back" after login or "Signed out" on /login).
 */
export function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mm' }}>
      <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
        <CssBaseline enableColorScheme />
        <SnackbarProvider>{children}</SnackbarProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
