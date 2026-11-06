import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import type { Metadata, Viewport } from 'next';
import { APP_NAME } from '@/shared/constants';
import { ThemeRegistry } from '@/styles/ThemeRegistry';
import { COLOR_MODE_STORAGE_KEY, DEFAULT_COLOR_MODE } from '@/styles/theme';

export const metadata: Metadata = {
  title: { template: `%s · ${APP_NAME}`, default: APP_NAME },
  description:
    'Internal tool for ordering and provisioning pre-warmed Google and Microsoft mailboxes.',
  applicationName: APP_NAME,
  // Internal tool: never indexed.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  formatDetection: { email: false, telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
};

/** Root layout: sets the colour scheme class before paint (no flash) and provides the theme. */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript
          attribute="class"
          defaultMode={DEFAULT_COLOR_MODE}
          modeStorageKey={COLOR_MODE_STORAGE_KEY}
        />
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
