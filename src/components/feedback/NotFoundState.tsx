'use client';

import SearchOffIcon from '@mui/icons-material/SearchOff';
import Button from '@mui/material/Button';
import NextLink from 'next/link';
import { EmptyState } from './EmptyState';

/** The 404 message: missing pages and orders the viewer may not see look identical. */
export function NotFoundState() {
  return (
    <EmptyState
      icon={<SearchOffIcon />}
      title="Page not found"
      description="This page does not exist, or you do not have access to it."
      action={
        <Button component={NextLink} href="/" variant="contained">
          Go to your orders
        </Button>
      }
    />
  );
}
