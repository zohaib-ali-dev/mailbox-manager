'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import Button from '@mui/material/Button';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  action?: ReactNode;
}

/** A recoverable error: says what happened and offers a retry when one makes sense. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'The page could not be loaded. Try again in a moment.',
  onRetry,
  action,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={<ErrorOutlineIcon />}
      title={title}
      description={description}
      action={
        action ??
        (onRetry ? (
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={onRetry}>
            Try again
          </Button>
        ) : null)
      }
    />
  );
}
