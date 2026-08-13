import React from 'react';
import {
  Box, Typography, Tooltip, Checkbox, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Close as CloseIcon, KeyboardArrowDown } from '@mui/icons-material';
import { TableCard } from '../../design-system/TableCard';
import { VariantPicker } from '../../main/VariantPicker';

/**
 * V3 — Tag concept demo.
 *
 * Tags are a 16 px Material Symbols glyph + a short label on a soft tinted
 * pill (same visual language as `ApiConnectionChip`). The DRAFT tag is a
 * grey pill with a "Draft" label; the "managed-by" tag is a red pill with
 * an "External data" label — the dynamic system name (rows might come from
 * FieldClimate, Climate FieldView, or any other source) lives in the
 * tooltip instead, so the visible label stays short and consistent while
 * the tooltip still carries the specific detail.
 *
 * Previously these were icon-only circles with no label — user testing
 * showed people read them as buttons rather than status indicators. The
 * label removes that ambiguity at a glance; the tooltip is kept for the
 * extra detail.
 *
 * When a row is sourced from an external system every cell renders in a
 * muted text color and the cursor becomes not-allowed. The tag itself stays
 * at full opacity because it carries its own bg + foreground; the muted look
 * is driven by `color: rgba(...)` on cell text, not by the CSS `opacity`
 * property — that way tags never inherit the fade.
 */
export function TableActionsTagsDemoPage() {
  return (
    <Box sx={{ height: '100vh', width: '100%', overflowY: 'auto', bgcolor: '#FFFFFF' }}>
      <Box sx={{ width: '100%', px: 5, py: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Row tags use a 16 px Material Symbols glyph plus a short label on a soft
          tinted pill. Grey pill + "Draft" marks rows the user has not yet committed.
          Red pill + "External data" marks rows managed by another system; those
          rows render in muted text and the cursor signals that they cannot be edited
          here. Tags themselves stay at full opacity even on faded rows so they
          remain unmistakable. The tooltip still names the specific system.
        </Typography>

        <DemoTable />
        <WarningTagDensityDemo />
        <TagPlacementDemo />
      </Box>
      <VariantPicker />
    </Box>
  );
}

const COL_DATE = 180;
const COL_PRODUCT = 220;
const COL_METHOD = 160;
const COL_DOSE = 140;
const COL_DOSE_UNIT = 120;
const COL_WATER = 140;
const COL_WATER_UNIT = 120;

// Real-sounding FMS brand so the tooltip reads naturally (Hispatec is a
// Spanish agritech platform — good stand-in for a third-party source).
const MANAGED_IN_SYSTEM = 'Hispatec';

function DemoTable() {
  return (
    <TableCard>
      <Table aria-label="demo" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ width: 52 }}><Checkbox /></TableCell>
            <Th width={COL_DATE}>Application date</Th>
            <Th width={COL_PRODUCT}>Product</Th>
            <Th width={COL_METHOD}>Method</Th>
            <Th width={COL_DOSE}>Product dose</Th>
            <Th width={COL_DOSE_UNIT}>Dose unit</Th>
            <Th width={COL_WATER}>Water volume</Th>
            <Th width={COL_WATER_UNIT}>Water unit</Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Row 1 — Draft */}
          <TableRow hover>
            <TableCell padding="checkbox"><Checkbox /></TableCell>
            <Td width={COL_DATE}>Mar 10, 2024</Td>
            <NameTd width={COL_PRODUCT} tag={<DraftTag />}>DECIS FLUX®</NameTd>
            <Td width={COL_METHOD}>Foliar spray</Td>
            <Td width={COL_DOSE}>1.0</Td>
            <Td width={COL_DOSE_UNIT}>L/ha</Td>
            <Td width={COL_WATER}>1000</Td>
            <Td width={COL_WATER_UNIT}>L/ha</Td>
          </TableRow>

          {/* Row 2 — Saved, no tag */}
          <TableRow hover>
            <TableCell padding="checkbox"><Checkbox /></TableCell>
            <Td width={COL_DATE}>Mar 5, 2024</Td>
            <NameTd width={COL_PRODUCT}>Roundup</NameTd>
            <Td width={COL_METHOD}>Broadcast</Td>
            <Td width={COL_DOSE}>2.0</Td>
            <Td width={COL_DOSE_UNIT}>L/ha</Td>
            <Td width={COL_WATER}>500</Td>
            <Td width={COL_WATER_UNIT}>L/ha</Td>
          </TableRow>

          {/* Row 3 — Managed in Climate FieldView (read-only from API) */}
          <ManagedRow system={MANAGED_IN_SYSTEM}>
            <MutedTd width={COL_DATE}>Feb 20, 2024</MutedTd>
            <MutedNameTd width={COL_PRODUCT} tag={<ManagedTag system={MANAGED_IN_SYSTEM} />}>Confidor</MutedNameTd>
            <MutedTd width={COL_METHOD}>Soil drench</MutedTd>
            <MutedTd width={COL_DOSE}>1.5</MutedTd>
            <MutedTd width={COL_DOSE_UNIT}>L/ha</MutedTd>
            <MutedTd width={COL_WATER}>1200</MutedTd>
            <MutedTd width={COL_WATER_UNIT}>L/ha</MutedTd>
          </ManagedRow>
        </TableBody>
      </Table>
    </TableCard>
  );
}

/* ─── Cell primitives ─────────────────────────────────────────────────────── */

function Th({ children, width }: { children: React.ReactNode; width: number }) {
  return (
    <TableCell sx={{ width, fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
      {children}
    </TableCell>
  );
}

function Td({ children, width }: { children: React.ReactNode; width: number }) {
  return (
    <TableCell sx={{ width, color: 'text.primary', fontSize: '0.875rem' }}>
      {children}
    </TableCell>
  );
}

/* nameField cell — value + optional tag. */
function NameTd({ children, width, tag }: { children: React.ReactNode; width: number; tag?: React.ReactNode }) {
  return (
    <TableCell sx={{ width, color: 'text.primary', fontSize: '0.875rem' }}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <span>{children}</span>
        {tag}
      </Box>
    </TableCell>
  );
}

/* Muted variants — used for "managed-in" rows. Text color is rgba so it
   visually fades while the tag, which carries its own bg + color, stays full. */
const MUTED_TEXT = 'rgba(0,0,0,0.45)';

function MutedTd({ children, width }: { children: React.ReactNode; width: number }) {
  return (
    <TableCell sx={{ width, color: MUTED_TEXT, fontSize: '0.875rem' }}>
      {children}
    </TableCell>
  );
}

function MutedNameTd({ children, width, tag }: { children: React.ReactNode; width: number; tag?: React.ReactNode }) {
  return (
    <TableCell sx={{ width, color: MUTED_TEXT, fontSize: '0.875rem' }}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <span>{children}</span>
        {tag}
      </Box>
    </TableCell>
  );
}

/* ─── Tag — 16 px Material Symbols glyph + short label on a soft pill ────── */

/** Lets a CircleTag tell its enclosing ManagedRow "I'm being hovered" so the
 *  row-wide tooltip can close while the tag's own tooltip is open. */
const TagHoverGate = React.createContext<((hovered: boolean) => void) | null>(null);

function CircleTag({
  bg, fg, symbol, label, tooltip, condensed = false,
}: {
  bg: string; fg: string; symbol: string; label: string; tooltip: string; condensed?: boolean;
}) {
  const setTagHover = React.useContext(TagHoverGate);
  return (
    <Tooltip title={tooltip} arrow placement="top" enterDelay={150}>
      <Box
        onMouseEnter={() => setTagHover?.(true)}
        onMouseLeave={() => setTagHover?.(false)}
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
          // The tag is its own visual unit — bg + fg always at full opacity
          // regardless of the parent row's muted text color (we don't use
          // CSS `opacity`, so nothing fades it).
        }}
      >
        <Box
          component="span"
          className="material-symbols-outlined"
          sx={{
            fontSize: 16,
            lineHeight: 1,
            fontVariationSettings: '"FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24',
            userSelect: 'none',
          }}
        >
          {symbol}
        </Box>
        {!condensed && label}
      </Box>
    </Tooltip>
  );
}

function DraftTag() {
  return (
    <CircleTag
      bg="grey.100"
      fg="text.secondary"
      symbol="draft"
      label="Draft"
      tooltip="Draft"
    />
  );
}

function ManagedTag({ system }: { system: string }) {
  return (
    <CircleTag
      bg="error.softBg"
      fg="error.main"
      symbol="cloud"
      label="External data"
      tooltip={`Managed in ${system}`}
    />
  );
}

const UNKNOWN_ANALYTE_TOOLTIP = 'This is an analyte we have not detected in any of the applied treatments in our system';

function WarningTag({ condensed = false }: { condensed?: boolean }) {
  return (
    <CircleTag
      bg="warning.softBg"
      fg="warning.main"
      symbol="warning"
      label="Unknown analyte"
      tooltip={UNKNOWN_ANALYTE_TOOLTIP}
      condensed={condensed}
    />
  );
}

/* ─── Extended vs condensed density demo ──────────────────────────────────── */
//
// Every tag now supports two densities: extended (icon + label — the default,
// roomy layouts) and condensed (icon only, tooltip carries the label — tight
// cells). The Analyte grid column always uses condensed for its "unknown
// analyte" warning: the column already shows the analyte name, so a text
// label next to it would crowd the value it's warning about.

function WarningTagDensityDemo() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
        Warning tag: extended vs condensed
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.6 }}>
        Same amber "unknown analyte" warning, two densities. Extended (icon + label) is the
        default for roomy layouts. Condensed (icon only) is for tight spaces, for example a
        grid's Analyte column, where the label would crowd the analyte value next to it. The
        tooltip still carries the full message on hover.
      </Typography>
      <Box sx={{ display: 'flex', gap: 5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Extended
          </Typography>
          <WarningTag />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Condensed
          </Typography>
          <WarningTag condensed />
        </Box>
      </Box>
    </Box>
  );
}

/* ─── Tag placement in an editable dropdown cell ──────────────────────────── */
//
// A cell tag always sits directly next to the value it describes — the same
// rule as the laboratory picker's "Direct connection" badge, which sits right
// after the lab name, before the field's own trailing controls (the clear ×
// and the dropdown chevron). Appending the tag after those controls instead
// reads as disconnected from the value and gets lost past unrelated icons.

function MockDropdownCell({ name, tagAfterControls = false }: { name: string; tagAfterControls?: boolean }) {
  const iconBtnSx = { width: 30, height: 30, padding: '5px', color: 'action.active' } as const;
  const tag = <WarningTag condensed />;
  const clearAndChevron = (
    <>
      <IconButton size="small" tabIndex={-1} sx={iconBtnSx}><CloseIcon sx={{ fontSize: 20 }} /></IconButton>
      <IconButton size="small" tabIndex={-1} sx={iconBtnSx}><KeyboardArrowDown sx={{ fontSize: 20 }} /></IconButton>
    </>
  );

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', height: 44, width: 260,
      border: '1px solid', borderColor: 'divider', borderRadius: '8px', pl: 1.5, bgcolor: '#FFFFFF',
    }}>
      {tagAfterControls ? (
        <>
          <Box sx={{ flex: 1, fontSize: '0.875rem', color: 'text.primary' }}>{name}</Box>
          {clearAndChevron}
          {tag}
        </>
      ) : (
        <>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box sx={{ fontSize: '0.875rem', color: 'text.primary', whiteSpace: 'nowrap' }}>{name}</Box>
            {tag}
          </Box>
          {clearAndChevron}
        </>
      )}
    </Box>
  );
}

function TagPlacementDemo() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
        Tag placement in an editable dropdown cell
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.6 }}>
        Same rule as the laboratory picker's "Direct connection" badge: the tag sits right next
        to the value, before the cell's own clear (×) and chevron controls, not after them.
      </Typography>
      <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'error.main', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Wrong: trails past the controls
          </Typography>
          <MockDropdownCell name="boscalid" tagAfterControls />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'success.main', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Right: sits next to the name
          </Typography>
          <MockDropdownCell name="boscalid" />
        </Box>
      </Box>
    </Box>
  );
}

/* ─── Managed-by row — non-interactive cursor + row-level tooltip ─────────── */

function ManagedRow({ children, system }: { children: React.ReactNode; system: string }) {
  const tooltip = `To make changes, update it in ${system}`;
  const [rowHover, setRowHover] = React.useState(false);
  const [tagHover, setTagHover] = React.useState(false);
  // While a CircleTag inside the row is hovered, its own tooltip is showing —
  // suppress the row-wide tooltip to avoid two overlapping cards.
  const open = rowHover && !tagHover;

  return (
    <TagHoverGate.Provider value={setTagHover}>
      <Tooltip
        title={tooltip}
        arrow
        placement="top"
        enterDelay={150}
        followCursor
        open={open}
        disableHoverListener
        disableFocusListener
        disableTouchListener
      >
        <TableRow
          hover
          onMouseEnter={() => setRowHover(true)}
          onMouseLeave={() => { setRowHover(false); setTagHover(false); }}
          sx={{
            '& .MuiTableCell-root': { cursor: 'not-allowed' },
            '& .MuiCheckbox-root': { pointerEvents: 'none' },
          }}
        >
          <TableCell padding="checkbox"><Checkbox disabled /></TableCell>
          {children}
        </TableRow>
      </Tooltip>
    </TagHoverGate.Provider>
  );
}
