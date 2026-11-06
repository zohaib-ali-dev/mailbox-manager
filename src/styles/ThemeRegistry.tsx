'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { ReactNode } from 'react';
import { theme } from './theme';

/**
 * Client-side theme root: the App Router Emotion cache (styles stream with the server HTML), the
 * MUI theme with light, dark and system modes, and CssBaseline.
 */
export function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mm' }}>
      <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
