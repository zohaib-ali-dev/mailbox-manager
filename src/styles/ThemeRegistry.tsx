'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { ReactNode } from 'react';
import { SnackbarProvider } from '@/components/feedback/SnackbarProvider';
import { COLOR_MODE_STORAGE_KEY, DEFAULT_COLOR_MODE, theme } from './theme';

/**
 * Client-side theme root: the App Router Emotion cache (styles stream with the server HTML), the
 * MUI theme (light by default; dark and system on request), CssBaseline, and the app-wide snackbar (at the root
 * so a message survives navigation, e.g. "Welcome back" after login or "Signed out" on /login).
 */
export function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mm' }}>
      <ThemeProvider
        theme={theme}
        defaultMode={DEFAULT_COLOR_MODE}
        modeStorageKey={COLOR_MODE_STORAGE_KEY}
        disableTransitionOnChange
      >
        <CssBaseline enableColorScheme />
        <SnackbarProvider>{children}</SnackbarProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
