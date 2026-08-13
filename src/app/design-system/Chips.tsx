/**
 * Chip / badge primitives — design-system SSOT.
 *
 * Four families:
 *
 * 1. DraftIconChip / ManagedIconChip — circular 32×32 icon tags for
 *    AG-Grid row state. Defined in `design-system/grid/draft-state.tsx`
 *    (they are grid-specific and re-exported here for reference).
 *
 * 2. ApiConnectionChip — pill-shaped inline badge for labs that have a
 *    direct API connection to ResiYou. Used in Autocomplete option lists,
 *    the closed-state overlay, and the samples table Laboratory column.
 *    One source here; do NOT define inline copies.
 *
 * 3. LabelChip — minimal text pill for read-only status labels or tags
 *    where a full MUI Chip is too heavy.
 *
 * 4. NameWithChip — a name/identifier truncated to one line + an optional
 *    trailing chip (e.g. ApiConnectionChip). Use this instead of a bare
 *    `<span>{name}</span>` + chip whenever the name comes from user data
 *    and isn't length-bounded (lab names, sample names, …) — without an
 *    explicit max-width + ellipsis, a long value wraps to a second line
 *    and balloons row height. One source here; do NOT re-implement inline.
 *
 * ─── Usage guide ────────────────────────────────────────────────────────
 *
 *   import { ApiConnectionChip, LabelChip, NameWithChip } from '../../design-system/Chips';
 *   import { DraftChip, ManagedTag } from '../../design-system/grid/draft-state';
 *
 *   // In a dropdown option row:
 *   {LABS_WITH_API_CONNECTION.has(lab) && <ApiConnectionChip />}
 *
 *   // In a samples table cell (or any read display) next to the lab name:
 *   <NameWithChip name={lab} chip={LABS_WITH_API_CONNECTION.has(lab) && <ApiConnectionChip />} />
 *
 *   // Draft / managed tags in a grid name cell:
 *   {isManagedByFms ? <ManagedTag system="FMS" /> : isDraft && <DraftChip />}
 */

import React from 'react';
import { Box, Chip, Stack, SxProps, Theme, Tooltip } from '@mui/material';
import { Add } from '@mui/icons-material';

// ── 1. Re-export icon-circle tags (grid row state) ───────────────────────────

export { DraftChip, ManagedTag, WarningTag } from './grid/draft-state';

// ── 2. ApiConnectionChip — red pill, cloud icon + "Direct connection" ────────
//
// Visual spec: height 24 px, border-radius 12 px, primary (brand red) palette,
// 13 px Material Symbols "cloud" icon, 700 weight 0.6875 rem text. Every chip
// component is at least 24×24 — smaller and the icon reads as oversized for
// its container.
//
// Do NOT define a local DirectConnectionBadge or ApiConnectionBadge
// anywhere else — import this one instead. This includes icon-only
// variants (e.g. a confirmation-dialog circle) — any visual that signals
// "this lab has a direct API connection" must use the primary/red palette,
// never success/green, so the meaning stays consistent everywhere.

export function ApiConnectionChip({ condensed = false }: { condensed?: boolean } = {}) {
  const chip = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: condensed ? 'center' : undefined,
        gap: condensed ? 0 : '3px',
        ...(condensed
          ? { width: 24, height: 24, borderRadius: '50%' }
          : { pl: '7px', pr: '9px', height: 24, borderRadius: '12px' }),
        bgcolor: 'primary.softBg',
        color: 'primary.main',
        fontSize: '0.6875rem',
        fontWeight: 700,
        flexShrink: 0,
        lineHeight: 1,
        userSelect: 'none',
        ...(condensed ? { cursor: 'help' } : {}),
      }}
    >
      <Box
        component="span"
        className="material-symbols-outlined"
        sx={{
          fontSize: 13,
          lineHeight: 1,
          fontVariationSettings: '"FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24',
        }}
      >
        cloud
      </Box>
      {!condensed && 'Direct connection'}
    </Box>
  );

  if (!condensed) return chip;
  return (
    <Tooltip title="Direct connection" arrow placement="top" enterDelay={150}>
      {chip}
    </Tooltip>
  );
}

// ── 3. NameWithChip — one-line-truncated name + optional trailing chip ───────
//
// Fixes the "long name wraps to a second line" bug: the name gets a bounded
// max-width + ellipsis so it always stays on one line, and the chip (which
// has its own flexShrink: 0) never gets squeezed by it.

export interface NameWithChipProps {
  name: string;
  /** e.g. <ApiConnectionChip /> — pass a falsy value to render no chip. */
  chip?: React.ReactNode;
  /** Max width of the name before it truncates with an ellipsis. */
  maxWidth?: number | string;
  sx?: SxProps<Theme>;
}

export function NameWithChip({ name, chip, maxWidth = 220, sx }: NameWithChipProps) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, ...sx }}>
      <Box
        component="span"
        title={name}
        sx={{
          color: 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          maxWidth,
        }}
      >
        {name}
      </Box>
      {chip}
    </Stack>
  );
}

// ── 4. LabelChip — lightweight text pill ─────────────────────────────────────
//
// For read-only status labels (commodity, status, category, etc.) that do
// not need icon or interaction. Pass `color` / `bgcolor` via sx to tint.
//
// Visual spec: 24 px tall, 8 px horizontal padding, 0.75 rem 600-weight text,
// border-radius 12 px, neutral grey by default.

export interface LabelChipProps {
  label: string;
  /** Override fill / text color. Defaults to grey.100 fill + text.secondary. */
  sx?: React.ComponentProps<typeof Box>['sx'];
}

// ── 5. ActionChip — clickable "+ label" pill ──────────────────────────────────
//
// Used for "quick-add" patterns: analyte chips, tag suggestions, etc.
// Grey by default; transitions to primary palette on hover.
// Do NOT use MUI Chip directly for this pattern — use this component.
//
// Visual spec: MUI small Chip, Add icon, action.hover bg, text.secondary text.

export interface ActionChipProps {
  label: string;
  onClick: () => void;
}

export function ActionChip({ label, onClick }: ActionChipProps) {
  return (
    <Chip
      label={label}
      size="small"
      icon={<Add sx={{ fontSize: '14px !important' }} />}
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        bgcolor: 'action.hover',
        color: 'text.secondary',
        fontWeight: 400,
        fontSize: '0.8125rem',
        '& .MuiChip-icon': { color: 'text.disabled' },
        '&:hover': {
          bgcolor: 'primary.softBg',
          color: 'primary.main',
          '& .MuiChip-icon': { color: 'primary.main' },
        },
      }}
    />
  );
}

export function LabelChip({ label, sx }: LabelChipProps) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: '8px',
        height: 24,
        borderRadius: '12px',
        bgcolor: 'grey.100',
        color: 'text.secondary',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1,
        flexShrink: 0,
        userSelect: 'none',
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}
