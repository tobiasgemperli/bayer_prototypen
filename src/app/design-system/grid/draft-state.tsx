import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { CloudOutlined, EditNoteOutlined, WarningAmberOutlined } from '@mui/icons-material';
import { CustomCellRendererProps } from 'ag-grid-community';

/**
 * Generic row-tag primitives — shared by every editable grid that needs to
 * render a status badge next to a name-field cell. The predicate that decides
 * whether to show a tag is entity-specific and lives next to each data
 * type (e.g. `isSampleDraft`, `isTreatmentDraft`). What lives here is the
 * neutral chip + the cell HOC that pins it next to a name field.
 *
 * SSOT note: this used to be duplicated inside variant folders. All grids
 * should import from here. Variant-specific cells (e.g. AnalyteCell with the
 * from-treatment lock) stay in their variants.
 *
 * Tag design — 16 px SVG glyph + a short label, on a soft tinted pill (same
 * visual language as `ApiConnectionChip` in `design-system/Chips.tsx`).
 * Previously these were icon-only 32 × 32 filled circles — tested as
 * confusing (users read them as buttons, not status indicators). The label
 * makes the meaning explicit at a glance; the tooltip stays for the extra
 * detail (e.g. which system, which analyte rule). See the V3 demo in
 * `variants/table-actions-v1/TableActionsTagsDemoPage.tsx` for the visual
 * spec.
 *
 * Icons are bundled @mui/icons-material SVGs, not the Material Symbols web
 * font — the font is loaded from Google Fonts over the network, so on a
 * slow/cold load the glyph's ligature text (e.g. literally "warning") would
 * flash before the font swaps in. SVGs render with the JS bundle, no race.
 */

const GLYPH_SIZE = 16;

interface PillTagProps {
  /** Theme palette path or raw color for the pill fill. */
  bg: string;
  /** Theme palette path or raw color for the icon + label. */
  fg: string;
  /** The glyph, e.g. <WarningAmberOutlined />. Sized/colored by PillTag. */
  icon: React.ReactElement;
  /** Short visible label, e.g. "Draft", "External data", "Unknown analyte". */
  label: string;
  /** Tooltip text on hover — kept in addition to the label for extra detail. */
  tooltip: string;
  /** Icon-only, no label — for tight spaces (e.g. a crowded grid cell). The
   *  tooltip still carries the label's meaning on hover. */
  condensed?: boolean;
}

/** Icon + label pill tag. Pass `condensed` for an icon-only circle. */
function PillTag({ bg, fg, icon, label, tooltip, condensed = false }: PillTagProps) {
  return (
    <Tooltip title={tooltip} arrow placement="top" enterDelay={150}>
      <Box
        // Marker attribute so grid CSS can exclude this subtree when muting a
        // managed row — the tag is the indicator and must stay full-colour
        // even when every other piece of text in the row is faded.
        data-tag-glyph=""
        sx={{
          display: 'inline-flex', alignItems: 'center',
          ...(condensed
            ? { justifyContent: 'center', width: 24, height: 24, borderRadius: '50%' }
            : { gap: '4px', height: 24, pl: '7px', pr: '9px', borderRadius: '12px' }),
          bgcolor: bg, color: fg,
          fontSize: '0.6875rem', fontWeight: 700, lineHeight: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          cursor: 'help',
          userSelect: 'none',
        }}
      >
        <Box
          component="span"
          sx={{ display: 'inline-flex', '& svg': { fontSize: GLYPH_SIZE } }}
        >
          {icon}
        </Box>
        {!condensed && label}
      </Box>
    </Tooltip>
  );
}

/** Draft tag — neutral grey pill, `draft` glyph + "Draft" label. */
export function DraftChip({ condensed = false }: { condensed?: boolean } = {}) {
  return (
    <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center' }}>
      <PillTag
        bg="grey.100"
        fg="text.secondary"
        icon={<EditNoteOutlined />}
        label="Draft"
        tooltip="Draft"
        condensed={condensed}
      />
    </Box>
  );
}

/**
 * Managed-by tag — red pill, `cloud` glyph + "External data" label,
 * "Managed in <system>" tooltip. Used on rows whose source of truth lives
 * in an external system (FMS, etc.) — the row is read-only here and the
 * user must edit it upstream.
 */
export function ManagedTag({ system, condensed = false }: { system: string; condensed?: boolean }) {
  return (
    <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center' }}>
      <PillTag
        bg="error.softBg"
        fg="error.main"
        icon={<CloudOutlined />}
        label="External data"
        tooltip={`Managed in ${system}`}
        condensed={condensed}
      />
    </Box>
  );
}

/**
 * Warning tag — amber pill, `warning` glyph + "Unknown analyte" label,
 * customizable tooltip. Used on analyte cells that are not found in the
 * plot's applied treatments. Exact same visual treatment as DraftChip /
 * ManagedTag — one PillTag call. Pass `condensed` for the icon-only variant
 * (e.g. inside a crowded Analyte grid cell, where the label would crowd the
 * value next to it) — see the extended/condensed demo in
 * `variants/table-actions-v1/TableActionsTagsDemoPage.tsx`.
 */
export function WarningTag({ tooltip, condensed = false }: { tooltip: string; condensed?: boolean }) {
  return (
    <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center' }}>
      <PillTag
        bg="warning.softBg"
        fg="warning.main"
        icon={<WarningAmberOutlined />}
        label="Unknown analyte"
        tooltip={tooltip}
        condensed={condensed}
      />
    </Box>
  );
}

/**
 * Wraps any "name / identifier" cell with the draft chip. Callers pass an
 * entity-specific `isDraft` predicate, so the same renderer drives Sample
 * name, Lab report ID, Treatment date, etc. When a column has a
 * valueFormatter (e.g. dateColumn), `valueFormatted` is preferred so the
 * displayed text matches the rest of the grid.
 */
export function nameCellWithDraft<T>(isDraft: (data: T) => boolean) {
  return function NameCell({ value, valueFormatted, data }: CustomCellRendererProps) {
    const draft = isDraft(data as T);
    const display = (valueFormatted ?? value ?? '') as React.ReactNode;
    const hasValue = display !== '' && display != null;
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', height: '100%', width: '100%',
        minWidth: 0,
      }}>
        <Typography component="span" sx={{
          fontSize: '0.875rem', color: hasValue ? 'text.primary' : 'text.disabled',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {hasValue ? display : '—'}
        </Typography>
        {draft && <DraftChip />}
      </Box>
    );
  };
}
