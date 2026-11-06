import { createTheme, type Theme } from '@mui/material/styles';
import themeColors from './themeColors.json';

/**
 * The MUI theme, built only from the tokens in themeColors.json (see docs/reference/COLOR_SYSTEM.md).
 * CSS variables with a class selector: switching light/dark is a class change on <html>, so the
 * server renders correct colours with no flash and no hydration mismatch.
 */

type Mode = keyof typeof themeColors;

/**
 * Light is the default for every new visitor; the theme toggle can switch to dark or system and the
 * choice is remembered under this key. (A new key, so a choice saved under the old default is reset.)
 */
export const DEFAULT_COLOR_MODE = 'light';
export const COLOR_MODE_STORAGE_KEY = 'mm-color-mode';

/** Flattens one mode's `base` palette and every custom group into a single MUI palette object. */
function paletteFor(mode: Mode) {
  const { base, ...groups } = themeColors[mode];
  return { ...base, ...groups };
}

/**
 * CSS-variable references for every palette token. They switch with the colour scheme, so always
 * read custom tokens through this helper inside `sx` callbacks, never `theme.palette` directly.
 */
export function tokens(theme: Theme) {
  return (theme.vars ?? theme).palette;
}

const FONT_STACK = [
  '"SF Pro Text"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

const MONO_STACK = ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'].join(',');

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class', cssVarPrefix: 'mm' },
  colorSchemes: {
    light: { palette: paletteFor('light') },
    dark: { palette: paletteFor('dark') },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: FONT_STACK,
    h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
    h3: { fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.01em' },
    h4: { fontSize: '1rem', fontWeight: 650 },
    subtitle1: { fontWeight: 600 },
    body2: { lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    overline: { letterSpacing: '0.06em', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme: Theme) => ({
        body: {
          minHeight: '100dvh',
          backgroundColor: tokens(theme).background.default,
          // A soft, fixed ambient glow from the brand tokens: the backdrop the glass app bar frosts.
          backgroundImage: `radial-gradient(1200px 600px at 10% -10%, ${tokens(theme).shell.pageGlowPrimary}, transparent 60%), radial-gradient(900px 500px at 100% 0%, ${tokens(theme).shell.pageGlowSecondary}, transparent 55%)`,
          backgroundAttachment: 'fixed',
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        },
        '::selection': { backgroundColor: tokens(theme).shell.selectionBg },
        ':focus-visible': {
          outline: `2px solid ${tokens(theme).shell.focusRing}`,
          outlineOffset: 2,
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${tokens(theme).shell.scrollbarThumb} transparent`,
        },
        'code, kbd, samp': { fontFamily: MONO_STACK },
        'a:not([class])': { color: tokens(theme).primary.main, textUnderlineOffset: '0.2em' },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 16, minHeight: 38 },
        sizeSmall: { minHeight: 32, paddingInline: 12 },
        sizeLarge: { minHeight: 46, fontSize: '1rem' },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: tokens(theme).orders.cardBg,
          borderColor: tokens(theme).orders.cardBorder,
          boxShadow: tokens(theme).orders.cardShadow,
          borderRadius: 14,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        // Dark mode would otherwise lighten raised surfaces (menus, drawer) with a white overlay
        // that is not in the palette; every surface uses its token colour instead.
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 12 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-head': {
            backgroundColor: tokens(theme).orders.tableHeaderBg,
            color: tokens(theme).orders.tableHeaderText,
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: tokens(theme).orders.cardBorder,
          fontVariantNumeric: 'tabular-nums',
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 999 },
        sizeSmall: { height: 24, fontSize: '0.75rem' },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 300 },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 12, alignItems: 'center' } },
    },
    MuiLink: {
      defaultProps: { underline: 'hover' },
    },
  },
});
