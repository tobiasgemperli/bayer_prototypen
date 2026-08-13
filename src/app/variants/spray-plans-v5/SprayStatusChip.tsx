import React, { useState } from 'react';
import { Box, Menu, MenuItem } from '@mui/material';
import { ArrowDropDown, Check } from '@mui/icons-material';
import { SprayStatus, STATUS_ORDER, STATUS_LABEL } from '../../data/plots-data';
import { STATUS_COLORS } from '../../design-system/status-colors';

interface SprayStatusChipProps {
  status: SprayStatus;
  /** Called when the user picks a new status. The chip itself is dumb — the
   *  parent (cell renderer) owns gating + persistence. */
  onSelect: (next: SprayStatus) => void;
  /** When true, chip is a passive read-only indicator (no menu). */
  readOnly?: boolean;
  /** Render without the trailing arrow + click behaviour. Useful inside menu rows. */
  staticDisplay?: boolean;
}

// ── Material 3 design tokens — applied locally. ───────────────────────────────
// m3.material.io references:
//   Chips (filter/assist style): height 32dp, corner 8dp, label-large 14sp/500,
//   leading 12dp / trailing 8dp when there is an icon.
//   Menus: container 4dp corners, level-2 elevation, 8dp vertical padding,
//   items 48dp height, 12dp horizontal padding, state layer on-surface 8% (hover),
//   12% (focus/pressed).

const M3_CHIP_SX = (colors: { bg: string; fg: string; border: string }, interactive: boolean) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  height: '26px',
  pl: '10px',
  pr: interactive ? '6px' : '10px',
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  bgcolor: colors.bg,
  color: colors.fg,
  fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
  fontSize: '12.5px',
  fontWeight: 500,
  letterSpacing: '0.1px',
  lineHeight: 1,
  cursor: interactive ? 'pointer' : 'default',
  position: 'relative',
  overflow: 'hidden',
  // M3 state-layer pattern: an overlay that brightens on hover / focus / press.
  '&::before': interactive ? {
    content: '""',
    position: 'absolute',
    inset: 0,
    bgcolor: 'currentColor',
    opacity: 0,
    transition: 'opacity 120ms cubic-bezier(0.2, 0, 0, 1)',
    pointerEvents: 'none',
  } : undefined,
  '&:hover::before': interactive ? { opacity: 0.08 } : undefined,
  '&:focus-visible::before': interactive ? { opacity: 0.12 } : undefined,
  '&:active::before': interactive ? { opacity: 0.12 } : undefined,
  '&:focus-visible': interactive ? { outline: 'none' } : undefined,
});

export function SprayStatusChip({ status, onSelect, readOnly = false, staticDisplay = false }: SprayStatusChipProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);
  const colors = STATUS_COLORS[status];
  const interactive = !readOnly && !staticDisplay;

  return (
    <>
      <Box
        component={interactive ? 'button' : 'span'}
        onClick={interactive ? (e: React.MouseEvent) => { e.stopPropagation(); setAnchor(e.currentTarget as HTMLElement); } : undefined}
        disabled={readOnly}
        sx={M3_CHIP_SX(colors, interactive)}
      >
        <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>{STATUS_LABEL[status]}</Box>
        {interactive && (
          <ArrowDropDown sx={{ fontSize: 16, opacity: 0.85, position: 'relative', zIndex: 1, ml: '-2px' }} />
        )}
      </Box>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        // M3 menu container: 4dp corners, level-2 elevation, surface-container.
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: '4px',
              minWidth: '200px',
              borderRadius: '4px',
              // M3 elevation level 2 (light theme)
              boxShadow:
                '0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
              border: 'none',
              bgcolor: '#FFFFFF',
              py: '8px',
            },
          },
          list: { sx: { py: 0 } },
        }}
      >
        {STATUS_ORDER.map((s) => {
          const isCurrent = s === status;
          return (
            <MenuItem
              key={s}
              onClick={() => { setAnchor(null); if (!isCurrent) onSelect(s); }}
              sx={{
                height: '48px',
                px: '12px',
                gap: '12px',
                // M3 state layer
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  bgcolor: '#1D1B20',
                  opacity: 0,
                  transition: 'opacity 120ms cubic-bezier(0.2, 0, 0, 1)',
                  pointerEvents: 'none',
                },
                '&:hover': { bgcolor: 'transparent' },
                '&:hover::before': { opacity: 0.08 },
                '&.Mui-focusVisible::before': { opacity: 0.12 },
                '&:active::before': { opacity: 0.12 },
                '&.Mui-selected': { bgcolor: 'transparent' },
                '&.Mui-selected::before': { opacity: 0.08 },
              }}
            >
              <SprayStatusChip status={s} onSelect={() => {}} staticDisplay />
              {isCurrent && (
                <Check
                  sx={{
                    ml: 'auto',
                    fontSize: 18,
                    color: 'rgba(29,27,32,0.6)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
