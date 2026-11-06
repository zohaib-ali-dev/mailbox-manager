# Mailbox Manager — Color System Guide

## Overview

Every colour in this project is a **token**. Tokens live in one JSON file and reach components through the MUI theme. This gives consistent light and dark modes and makes hard-coded colours unnecessary (and a lint error).

**Colour flow:** `src/styles/themeColors.json` → `src/styles/theme.ts` (MUI theme with CSS variables and light/dark colour schemes) → `ThemeRegistry` → components read `theme.vars.palette.<group>.<token>`.

**Why feature tokens live under `palette`:** MUI generates a CSS variable per colour scheme only for palette entries. With feature tokens inside the palette, switching light/dark is a class change on `<html>`. The server renders the correct colours, there is no flash of the wrong theme and no hydration mismatch. (This is the one deliberate difference from a `theme.custom` setup.)

---

## Key files

| File | Purpose |
|---|---|
| `src/styles/themeColors.json` | Single source of truth for ALL colours (light and dark) |
| `src/styles/theme.ts` | Builds the MUI theme from the JSON: `cssVariables` with `colorSchemeSelector: 'class'`, `colorSchemes.light` / `colorSchemes.dark`, typography, shape, component overrides. Exports a `tokens(theme)` helper. |
| `src/styles/mui-custom-theme.d.ts` | TypeScript augmentation of MUI `Palette` / `PaletteOptions` with every custom group |
| `src/styles/ThemeRegistry.tsx` | Client component: App Router Emotion cache provider + `ThemeProvider` + `CssBaseline` |
| `src/app/layout.tsx` | Renders `InitColorSchemeScript` (attribute `class`) and sets `suppressHydrationWarning` on `<html>` |
| `src/features/<feature>/styles/<feature>Styles.ts` | Reusable style helpers for one feature |

---

## Token file structure

`themeColors.json` has one object per mode. Each mode has the **base palette** (standard MUI keys) and the **custom groups** (one per feature area). Both modes must have exactly the same keys.

```json
{
  "light": {
    "base": { "primary": {}, "secondary": {}, "error": {}, "warning": {}, "info": {}, "success": {},
              "background": {}, "text": {}, "divider": "" },
    "shell": {}, "auth": {}, "orders": {}, "status": {}, "provider": {}, "audit": {}, "admin": {}
  },
  "dark": { "...": "same keys" }
}
```

`theme.ts` spreads `base` and every custom group into `colorSchemes.<mode>.palette`, so a new group is picked up without touching `theme.ts`.

---

## The tokens (use these exact values)

### Base palette

| Key | Light | Dark |
|---|---|---|
| primary.main / light / dark / contrastText | `#2563EB` / `#3B82F6` / `#1D4ED8` / `#FFFFFF` | `#60A5FA` / `#93C5FD` / `#3B82F6` / `#0B1220` |
| secondary.main / light / dark / contrastText | `#0F766E` / `#14B8A6` / `#115E59` / `#FFFFFF` | `#2DD4BF` / `#5EEAD4` / `#14B8A6` / `#0B1220` |
| error.main / light / dark / contrastText | `#DC2626` / `#EF4444` / `#B91C1C` / `#FFFFFF` | `#F87171` / `#FCA5A5` / `#EF4444` / `#0B1220` |
| warning.main / light / dark / contrastText | `#B45309` / `#D97706` / `#92400E` / `#FFFFFF` | `#FBBF24` / `#FCD34D` / `#F59E0B` / `#0B1220` |
| info.main / light / dark / contrastText | `#0284C7` / `#0EA5E9` / `#0369A1` / `#FFFFFF` | `#38BDF8` / `#7DD3FC` / `#0EA5E9` / `#0B1220` |
| success.main / light / dark / contrastText | `#16A34A` / `#22C55E` / `#15803D` / `#FFFFFF` | `#4ADE80` / `#86EFAC` / `#22C55E` / `#0B1220` |
| background.default / paper | `#F8FAFC` / `#FFFFFF` | `#0B1220` / `#111827` |
| text.primary / secondary / disabled | `#0F172A` / `#475569` / `#94A3B8` | `#F1F5F9` / `#94A3B8` / `#64748B` |
| divider | `#E2E8F0` | `#1F2937` |

### `shell` — app bar and navigation

| Token | Light | Dark |
|---|---|---|
| appBarBg | `#FFFFFF` | `#0F172A` |
| appBarText | `#0F172A` | `#F1F5F9` |
| appBarBorder | `#E2E8F0` | `#1F2937` |
| brandColor | `#2563EB` | `#60A5FA` |
| navText | `#475569` | `#94A3B8` |
| navActiveText | `#1D4ED8` | `#93C5FD` |
| navActiveBg | `#EFF6FF` | `rgba(96, 165, 250, 0.12)` |
| roleChipBg | `#F1F5F9` | `#1E293B` |
| roleChipText | `#334155` | `#CBD5E1` |

### `auth` — login page

| Token | Light | Dark |
|---|---|---|
| pageBg | `#F1F5F9` | `#0B1220` |
| cardBg | `#FFFFFF` | `#111827` |
| cardBorder | `#E2E8F0` | `#1F2937` |
| cardShadow | `0 10px 30px rgba(15, 23, 42, 0.08)` | `0 10px 30px rgba(0, 0, 0, 0.45)` |
| titleColor | `#0F172A` | `#F1F5F9` |
| subtitleColor | `#64748B` | `#94A3B8` |
| demoBoxBg | `#F8FAFC` | `#0F172A` |
| demoBoxBorder | `#CBD5E1` | `#334155` |
| demoBoxText | `#334155` | `#CBD5E1` |

### `orders` — tables, cards, detail page

| Token | Light | Dark |
|---|---|---|
| cardBg | `#FFFFFF` | `#111827` |
| cardBorder | `#E2E8F0` | `#1F2937` |
| tableHeaderBg | `#F8FAFC` | `#0F172A` |
| tableHeaderText | `#475569` | `#94A3B8` |
| rowHoverBg | `#F8FAFC` | `#1E293B` |
| mutedText | `#64748B` | `#94A3B8` |
| statCardBg | `#F8FAFC` | `#0F172A` |
| statValueText | `#0F172A` | `#F1F5F9` |
| progressTrackBg | `#E2E8F0` | `#1F2937` |
| progressBarBg | `#16A34A` | `#4ADE80` |
| emptyIconColor | `#94A3B8` | `#475569` |
| codeBg | `#F1F5F9` | `#1E293B` |

### `status` — order and mailbox status chips

Order statuses and mailbox statuses use the same tokens (mailboxes have no PROVISIONING state).

| Token | Light | Dark |
|---|---|---|
| pendingBg | `#F1F5F9` | `#1E293B` |
| pendingText | `#334155` | `#CBD5E1` |
| pendingBorder | `#CBD5E1` | `#334155` |
| provisioningBg | `#EFF6FF` | `rgba(96, 165, 250, 0.15)` |
| provisioningText | `#1D4ED8` | `#93C5FD` |
| provisioningBorder | `#BFDBFE` | `rgba(96, 165, 250, 0.35)` |
| activeBg | `#F0FDF4` | `rgba(74, 222, 128, 0.12)` |
| activeText | `#15803D` | `#86EFAC` |
| activeBorder | `#BBF7D0` | `rgba(74, 222, 128, 0.35)` |
| failedBg | `#FEF2F2` | `rgba(248, 113, 113, 0.12)` |
| failedText | `#B91C1C` | `#FCA5A5` |
| failedBorder | `#FECACA` | `rgba(248, 113, 113, 0.35)` |

### `provider` — provider chips (text labels only, no brand logos)

| Token | Light | Dark |
|---|---|---|
| googleBg | `#FFF7ED` | `rgba(251, 146, 60, 0.15)` |
| googleText | `#C2410C` | `#FDBA74` |
| microsoftBg | `#EEF2FF` | `rgba(129, 140, 248, 0.15)` |
| microsoftText | `#4338CA` | `#A5B4FC` |

### `audit` — audit log timeline

| Token | Light | Dark |
|---|---|---|
| timelineLine | `#E2E8F0` | `#1F2937` |
| dotBg | `#FFFFFF` | `#111827` |
| dotBorder | `#94A3B8` | `#64748B` |
| timestampText | `#64748B` | `#94A3B8` |
| reasonText | `#334155` | `#CBD5E1` |
| metadataBg | `#F8FAFC` | `#0F172A` |
| actorCustomerText | `#0F766E` | `#5EEAD4` |
| actorAdminText | `#7C3AED` | `#C4B5FD` |
| actorWorkerText | `#1D4ED8` | `#93C5FD` |
| actorSystemText | `#B45309` | `#FCD34D` |

### `admin` — admin list screen

| Token | Light | Dark |
|---|---|---|
| filterBarBg | `#FFFFFF` | `#111827` |
| filterBarBorder | `#E2E8F0` | `#1F2937` |
| customerEmailText | `#334155` | `#CBD5E1` |
| retryButtonBg | `#B45309` | `#FBBF24` |
| retryButtonHoverBg | `#92400E` | `#F59E0B` |
| retryButtonText | `#FFFFFF` | `#0B1220` |

---

## Status → token mapping

| Status | Label | Icon (MUI icons) | Tokens |
|---|---|---|---|
| PENDING | Pending | `HourglassEmpty` | `status.pendingBg`, `status.pendingText`, `status.pendingBorder` |
| PROVISIONING | Provisioning | `Autorenew` | `status.provisioning*` |
| ACTIVE | Active | `CheckCircle` | `status.active*` |
| FAILED | Failed | `ErrorOutline` | `status.failed*` |

The mapping lives in one place (`OrderStatusChip` / `MailboxStatusChip`), never repeated in pages.

---

## How to use colours in components

### Option 1: `sx` callback with the `tokens()` helper (most common)

`tokens(theme)` is exported from `src/styles/theme.ts` and returns `(theme.vars ?? theme).palette`, i.e. CSS-variable references that switch with the colour scheme.

```tsx
<Box sx={(theme) => ({ backgroundColor: tokens(theme).orders.cardBg })} />
<Chip sx={(theme) => ({ bgcolor: tokens(theme).status.failedBg, color: tokens(theme).status.failedText })} />
```

### Option 2: `sx` palette string paths (short form)

```tsx
<Typography sx={{ color: 'orders.mutedText' }} />
<Box sx={{ bgcolor: 'background.paper', borderColor: 'divider' }} />
```

### Option 3: style helpers for patterns reused inside a feature

```tsx
// src/features/orders/styles/ordersStyles.ts
export const getCardStyles = (theme: Theme) => ({
  backgroundColor: tokens(theme).orders.cardBg,
  border: `1px solid ${tokens(theme).orders.cardBorder}`,
});

// in a component
<Card sx={(theme) => getCardStyles(theme)} />
```

### Standard MUI colour props (for generic colours)

```tsx
<Button color="primary" />
<Alert severity="error" />
```

Never read `theme.palette.*` directly for custom tokens inside `sx` callbacks; it returns the light value and does not switch with dark mode. Always go through `tokens(theme)`.

---

## How to add colours for a new feature

1. **Add the group to `themeColors.json`** under both `light` and `dark`, with the same keys.
2. **Add an interface** for the group in `mui-custom-theme.d.ts` and add it to both `Palette` and `PaletteOptions`.
3. **No change to `theme.ts`** is needed if it spreads every group (it must). If it lists groups explicitly, add the group there.
4. **Use it** through `tokens(theme).<group>.<token>`.

To add a token to an existing group: add it to both modes in the JSON, then to the group's interface. Done.

---

## Dark mode

- MUI stores the chosen mode itself (`light`, `dark` or `system`; default `system`). Persistence is handled by MUI; do not add another storage mechanism.
- `ThemeToggle` uses `useColorScheme()`. The current mode is undefined during server rendering, so the toggle renders a neutral placeholder until mounted.
- Never branch on `theme.palette.mode` to pick colours. Use tokens; they already switch.

---

## Rules

1. **Never hard-code colours.** ESLint flags hex, `rgb(`, `rgba(` and `hsl(` literals anywhere in `src/` except `src/styles/`.
2. **Every token exists in both light and dark.**
3. **Semantic names**: `cardBg`, `titleColor`; never `blue1` or `gray2`.
4. **Group by feature**: each screen area gets its own group.
5. **Style helpers** for patterns reused by several components in a feature.
6. **Base palette** (`primary`, `error`, `text.secondary`, `divider`…) for generic colours that need no feature-specific value.
7. **No brand logos** for Google or Microsoft; provider chips are text with tokens.

---

## Naming conventions

| Token type | Pattern | Examples |
|---|---|---|
| Backgrounds | `*Bg` | `cardBg`, `pageBg`, `tableHeaderBg` |
| Text | `*Text`, `*Color` | `mutedText`, `titleColor`, `timestampText` |
| Borders | `*Border` | `cardBorder`, `failedBorder` |
| Shadows | `*Shadow` | `cardShadow` |
| States | state as prefix or suffix | `rowHoverBg`, `retryButtonHoverBg`, `navActiveText` |
