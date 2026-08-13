import React, { useState } from 'react';
import {
  Box, Popover, MenuItem, Checkbox, Typography, Button, Divider,
} from '@mui/material';
import { ArrowDropDown } from '@mui/icons-material';
import { SprayStatus, STATUS_ORDER, STATUS_LABEL } from '../../data/plots-data';
import { SprayStatusChip } from './SprayStatusChip';

interface SprayFilterProps {
  value: Set<SprayStatus>;
  onChange: (next: Set<SprayStatus>) => void;
}

/** Status filter — Notion-inspired but in our DS style.
 *
 *  Trigger: a 36-px pill button matching the form-field aesthetic (white bg,
 *  8-px corners, divider border, chevron) — visually consistent with the
 *  Season/Crop Autocompletes in AddPlotForm.
 *
 *  Popover: M3 surface-container, 4-px corners, level-2 elevation. Each row
 *  is a 48-px MenuItem with a leading Checkbox and the same SprayStatusChip
 *  used in the grid (SSOT). "Show all" footer when the selection is narrowed.
 */
export function SprayFilter({ value, onChange }: SprayFilterProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  const selected = STATUS_ORDER.filter((s) => value.has(s));
  const allSelected = selected.length === STATUS_ORDER.length;
  const noneSelected = selected.length === 0;

  const summary = allSelected
    ? 'All statuses'
    : noneSelected
      ? 'No status'
      : selected.length <= 2
        ? selected.map((s) => STATUS_LABEL[s]).join(', ')
        : `${selected.length} statuses`;

  const toggle = (s: SprayStatus) => {
    const next = new Set(value);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange(next);
  };

  return (
    <>
      <Box
        component="button"
        onClick={(e) => setAnchor(e.currentTarget as HTMLElement)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          height: 36,
          minWidth: 200,
          pl: 1.5,
          pr: 1,
          border: '1px solid',
          borderColor: open ? 'primary.main' : 'rgba(0,0,0,0.23)',
          borderRadius: '8px',
          bgcolor: 'white',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          transition: 'border-color 120ms, background-color 120ms',
          '&:hover': { borderColor: open ? 'primary.main' : 'text.primary' },
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', flexShrink: 0 }}>
          Status:
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.primary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {summary}
        </Typography>
        <ArrowDropDown sx={{ fontSize: 22, color: 'text.secondary', flexShrink: 0 }} />
      </Box>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: '4px',
              minWidth: 240,
              borderRadius: '4px',
              boxShadow:
                '0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
              border: 'none',
              bgcolor: '#FFFFFF',
              py: '8px',
            },
          },
        }}
      >
        {STATUS_ORDER.map((s) => {
          const checked = value.has(s);
          return (
            <MenuItem
              key={s}
              onClick={() => toggle(s)}
              sx={{
                height: 48,
                px: 1.5,
                gap: 1.5,
                position: 'relative',
                // M3 state-layer pattern
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
              }}
            >
              <Checkbox checked={checked} sx={{ p: 0.5, position: 'relative', zIndex: 1 }} />
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <SprayStatusChip status={s} onSelect={() => {}} staticDisplay />
              </Box>
            </MenuItem>
          );
        })}

        {!allSelected && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ px: 1.5, pb: 0.5 }}>
              <Button
                size="small"
                onClick={() => onChange(new Set(STATUS_ORDER))}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Show all
              </Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  );
}
