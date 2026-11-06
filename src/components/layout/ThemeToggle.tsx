'use client';

import CheckIcon from '@mui/icons-material/Check';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import { useState, type MouseEvent } from 'react';
import { useIsClient } from '@/lib/use-is-client';

const MODES = [
  { value: 'light', label: 'Light', Icon: LightModeIcon },
  { value: 'dark', label: 'Dark', Icon: DarkModeIcon },
  { value: 'system', label: 'System', Icon: SettingsBrightnessIcon },
] as const;

/**
 * Light / dark / system switch. MUI stores the choice itself. The mode is unknown during server
 * rendering, so a same-sized neutral placeholder renders until mount (no hydration mismatch).
 */
export function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const isClient = useIsClient();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!isClient || !mode) {
    return (
      <IconButton aria-label="Colour theme" disabled sx={{ color: 'text.secondary' }}>
        <SettingsBrightnessIcon fontSize="small" />
      </IconButton>
    );
  }

  const current = MODES.find((m) => m.value === mode) ?? MODES[2];
  return (
    <>
      <Tooltip title={`Theme: ${current.label}`}>
        <IconButton
          aria-label={`Colour theme: ${current.label}`}
          aria-haspopup="menu"
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
          sx={{ color: 'text.secondary' }}
        >
          <current.Icon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {MODES.map(({ value, label, Icon }) => (
          <MenuItem
            key={value}
            selected={value === mode}
            onClick={() => {
              setMode(value);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
            {value === mode ? <CheckIcon fontSize="small" sx={{ ml: 2 }} /> : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
