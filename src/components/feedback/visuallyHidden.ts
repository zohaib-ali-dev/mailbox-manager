/**
 * Hides content visually but keeps it for screen readers. Uses explicit '1px' strings: a bare
 * `width: 1` in MUI's sx means 100%, which once stretched a hidden label across the page.
 */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;
