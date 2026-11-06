// Palette type augmentation: every custom token group from themeColors.json becomes a typed
// palette entry, so `tokens(theme).orders.cardBg` type-checks and dark mode works through CSS vars.
import type themeColors from './themeColors.json';

type Groups = (typeof themeColors)['light'];

declare module '@mui/material/styles' {
  interface Palette {
    shell: Groups['shell'];
    auth: Groups['auth'];
    orders: Groups['orders'];
    status: Groups['status'];
    provider: Groups['provider'];
    audit: Groups['audit'];
    admin: Groups['admin'];
  }
  interface PaletteOptions {
    shell?: Groups['shell'];
    auth?: Groups['auth'];
    orders?: Groups['orders'];
    status?: Groups['status'];
    provider?: Groups['provider'];
    audit?: Groups['audit'];
    admin?: Groups['admin'];
  }
}
