'use client';

import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useState } from 'react';
import { useNotify } from './SnackbarProvider';

/** Copies `value` to the clipboard, confirms with a check mark and a snackbar. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  /** Writes to the clipboard; silently does nothing where the API is unavailable. */
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      const what = label.replace(/^Copy /, '');
      notify(`${what.charAt(0).toUpperCase()}${what.slice(1)} copied to the clipboard.`, 'info');
    } catch {
      setCopied(false);
      notify('Could not copy. Select the text and copy it manually.', 'warning');
    }
  }

  return (
    <Tooltip title={copied ? 'Copied' : label}>
      <IconButton size="small" aria-label={label} onClick={() => void copy()}>
        {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
      </IconButton>
    </Tooltip>
  );
}
