import React from 'react';
import {
  Box, Typography, Tooltip, Checkbox,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { TableCard } from '../../design-system/TableCard';
import { VariantPicker } from '../../main/VariantPicker';

/**
 * V2 — Long error message behavior demo.
 *
 * Mirrors the live grid (AG-Grid) behavior per AC-3: the data row carries the
 * errored cell chrome, and the error messages live in a SEPARATE full-width
 * row directly below. Messages clamp to two lines + ellipsis; hover reveals
 * the full text in the standard MUI tooltip anchored below.
 */
export function TableActionsErrorDemoPage() {
  return (
    <Box sx={{ height: '100vh', width: '100%', overflowY: 'auto', bgcolor: '#FFFFFF' }}>
      <Box sx={{ width: '100%', px: 5, py: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          When a row has validation errors, each errored cell carries the red tint and border while the messages render in a separate full-width row directly below the data row. Long messages clamp to two lines and end with an ellipsis; hover the truncated text to read the full message in the standard tooltip, anchored below so the row above stays visible.
        </Typography>

        <DemoTable />
      </Box>
      <VariantPicker />
    </Box>
  );
}

/* ── Column widths (px) ───────────────────────────────────────────────────── */

const COL_DATE = 180;
const COL_PRODUCT = 200;
const COL_METHOD = 200;
const COL_DOSE = 140;
const COL_DOSE_UNIT = 140;
const COL_WATER = 140;
const COL_WATER_UNIT = 140;

/* ── Errors per column ────────────────────────────────────────────────────── */

const ERRORS: Record<string, string> = {
  date: 'Date is required',
  product: 'Product is required',
  method:
    'Method must be one of the approved spray application methods for this crop and compatible with the product selected. Foliar spray is recommended for systemic insecticides like the one above.',
  dose:
    'Dose must be a positive number expressed in the selected unit. Negative values, blanks, and characters other than digits are not accepted by the residue forecast engine.',
  doseUnit: 'Unit is required',
  water: 'Water volume is required',
  waterUnit: 'Unit is required',
};

/* ── Cell chrome shared between data + error rows ─────────────────────────── */

const CELL_ERRORED_BG = 'rgba(211,47,47,0.06)';
const CELL_ERRORED_BORDER = '1px solid rgba(211,47,47,0.45)';
const BRAND_RED_INSET = 'inset 4px 0 0 #d4183d';

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
          {/* Data row — value with .cell-errored chrome. */}
          <TableRow hover>
            <TableCell padding="checkbox"><Checkbox /></TableCell>
            <DataCell width={COL_DATE} value="" firstCell />
            <DataCell width={COL_PRODUCT} value="" />
            <DataCell width={COL_METHOD} value="Aerial" />
            <DataCell width={COL_DOSE} value="-12" />
            <DataCell width={COL_DOSE_UNIT} value="" />
            <DataCell width={COL_WATER} value="" />
            <DataCell width={COL_WATER_UNIT} value="" />
          </TableRow>

          {/* Error row — message only, separate full-width row below. */}
          <TableRow>
            <ErrorCell padding="checkbox" />
            <ErrorCell width={COL_DATE} message={ERRORS.date} />
            <ErrorCell width={COL_PRODUCT} message={ERRORS.product} />
            <ErrorCell width={COL_METHOD} message={ERRORS.method} />
            <ErrorCell width={COL_DOSE} message={ERRORS.dose} />
            <ErrorCell width={COL_DOSE_UNIT} message={ERRORS.doseUnit} />
            <ErrorCell width={COL_WATER} message={ERRORS.water} />
            <ErrorCell width={COL_WATER_UNIT} message={ERRORS.waterUnit} />
          </TableRow>
        </TableBody>
      </Table>
    </TableCard>
  );
}

function Th({ children, width }: { children: React.ReactNode; width: number }) {
  return (
    <TableCell sx={{ width, color: 'text.secondary', fontSize: '0.75rem' }}>
      {children}
    </TableCell>
  );
}

/**
 * Data row cell — shows the value with .cell-errored chrome (red tint + red
 * border). Normal cell padding. The first cell of the row gets the 4 px
 * brand-red inset that marks the row as pending.
 */
function DataCell({
  width,
  value,
  firstCell = false,
}: {
  width: number;
  value: string;
  firstCell?: boolean;
}) {
  return (
    <TableCell
      sx={{
        width,
        bgcolor: CELL_ERRORED_BG,
        border: CELL_ERRORED_BORDER,
        boxShadow: firstCell ? BRAND_RED_INSET : 'none',
        fontSize: '0.875rem',
        color: 'text.primary',
      }}
    >
      {value}
    </TableCell>
  );
}

/**
 * Error row cell — message only, top + left aligned, transparent bg, no
 * bottom border. Clamps to 2 lines + ellipsis. If truncated, the standard
 * MUI tooltip surfaces the full text on hover, anchored below.
 */
function ErrorCell({
  width,
  message,
  padding,
}: {
  width?: number;
  message?: string;
  padding?: 'checkbox';
}) {
  if (padding === 'checkbox') {
    return (
      <TableCell
        padding="checkbox"
        sx={{ bgcolor: 'transparent', borderBottom: 'none' }}
      />
    );
  }

  // Approximate two-line capacity at this cell's usable width.
  const usable = Math.max(40, (width ?? 0) - 8);
  const charsPerLine = Math.max(6, Math.floor(usable / 6.2));
  const truncates = (message ?? '').length > charsPerLine * 2;

  const messageBox = (
    <Box
      sx={{
        fontSize: '12px',
        color: 'error.main',
        lineHeight: 1.3,
        wordBreak: 'break-word',
        textAlign: 'left',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        cursor: truncates ? 'help' : 'default',
      }}
    >
      {message}
    </Box>
  );

  return (
    <TableCell
      sx={{
        width,
        verticalAlign: 'top',
        textAlign: 'left',
        bgcolor: 'transparent',
        borderBottom: 'none',
        pl: 0,
        pr: '8px',
        py: '8px',
      }}
    >
      {truncates ? (
        <Tooltip
          title={message}
          arrow
          placement="bottom-start"
          enterDelay={150}
          slotProps={{ tooltip: { sx: { maxWidth: 400 } } }}
        >
          {messageBox}
        </Tooltip>
      ) : messageBox}
    </TableCell>
  );
}
