import type { Theme } from '@mui/material/styles';
import { tokens } from '@/styles/theme';

/** Reusable style helpers for the orders feature (tokens only). */

/** A table that scrolls sideways inside its card on narrow screens, never the page. */
export const tableScrollStyles = {
  // `relative` makes this the containing block for absolutely positioned helpers inside the
  // table (screen-reader labels), so they are clipped here instead of widening the page.
  position: 'relative',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
} as const;

/** Clickable table row with the rowHover token. */
export const clickableRowStyles = (theme: Theme) => ({
  cursor: 'pointer',
  transition: 'background-color 120ms ease-out',
  '&:hover': { backgroundColor: tokens(theme).orders.rowHoverBg },
  '&:last-of-type td': { borderBottom: 0 },
});

/** A domain on one line; very long names end in an ellipsis (full name in the title tooltip). */
export const domainCellStyles = {
  fontWeight: 600,
  maxWidth: 220,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

/** Muted secondary text used in tables and meta lines. */
export const mutedTextStyles = (theme: Theme) => ({ color: tokens(theme).orders.mutedText });

/** Inline code-like chip for ids and addresses. */
export const codeStyles = (theme: Theme) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '0.8125rem',
  backgroundColor: tokens(theme).orders.codeBg,
  borderRadius: '6px',
  padding: '2px 6px',
});
