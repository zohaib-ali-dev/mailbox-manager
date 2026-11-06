import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mailbox Manager',
  description: 'Internal tool for ordering and provisioning pre-warmed mailboxes.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
