import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  CustomCellRendererProps,
  IHeaderParams,
  themeQuartz,
} from 'ag-grid-community';
import { ClipboardModule, CellSelectionModule } from 'ag-grid-enterprise';
import { Autocomplete, Box, Button, ButtonProps, Checkbox, IconButton, InputAdornment, Paper, TableSortLabel, TextField, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, InfoOutlined, KeyboardArrowDown, Search as SearchIcon } from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { ActionMenu, ActionItem } from '../ActionMenu';
import { theme } from '../../theme';

// Register AG Grid modules once for every grid in the app.
ModuleRegistry.registerModules([AllCommunityModule, ClipboardModule, CellSelectionModule]);

// ── Visual theme — shared by every editable grid so they look identical ────────

export const gridTheme = themeQuartz.withParams({
  fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
  fontSize: 14,
  backgroundColor: '#ffffff',
  foregroundColor: 'rgba(0,0,0,0.87)',
  borderColor: 'rgba(0,0,0,0.12)',
  rowBorderColor: 'rgba(0,0,0,0.12)',
  headerBackgroundColor: '#ffffff',
  headerTextColor: 'rgba(0,0,0,0.6)',
  rowHeight: 52,
  headerHeight: 52,
  rowHoverColor: 'rgba(0,0,0,0.04)',
  selectedRowBackgroundColor: 'rgba(25,118,210,0.08)',
  oddRowBackgroundColor: '#ffffff',
  checkboxCheckedColor: '#1976d2',
  checkboxUncheckedColor: 'rgba(0,0,0,0.38)',
  checkboxIndeterminateColor: '#1976d2',
  wrapperBorder: false,
  columnBorder: false,
  headerColumnBorder: false,
  cellHorizontalPaddingScale: 1,
});

// ── Dropdown editor — single SSOT for every editable-grid dropdown ────────────
// One Autocomplete-based editor used everywhere: Method, Product, Season, Units,
// lab fields, spray fields. Variants are pure props:
//   - searchPlaceholder: placeholder inside the input (default "Search…")
//   - createLabel + onCreate: optional "+ Add <thing>" pinned at the list end.
//     Clicking it cancels the in-cell edit and hands off to the host's Dialog
//     (e.g. Create season).
// Cell becomes the search input; listbox opens below via MUI Popper. No
// freeSolo, no implicit create-on-type.
//
// Back-compat: the previous plain-list editor was also exported as
// `DropdownEditor`. The Autocomplete editor was `SearchableDropdownEditor`.
// Both names now resolve here so existing call sites keep working — but the
// chrome is the same everywhere, satisfying the SSOT requirement.

const CREATE_ACTION = '__searchable_create__';

export interface DropdownEditorParams {
  /** Existing options the user can pick from. */
  values: string[];
  /** Placeholder inside the input. */
  searchPlaceholder?: string;
  /** When set, an always-visible row is rendered at the bottom of the list. */
  createLabel?: string;
  /** Invoked when the create row is chosen. Host should open its Dialog. */
  onCreate?: () => void;
  /** Optional grey suffix shown next to each option in the listbox (e.g. the
   *  sample code next to a sample name). Map: option value → secondary text. */
  secondaryByValue?: Record<string, string>;
  /** Text shown in the listbox when `values` is empty (e.g. because a caller
   *  filtered them by another field). Defaults to MUI Autocomplete's own
   *  "No options" when omitted. */
  noOptionsText?: string;
}
/** @deprecated Use `DropdownEditorParams`. Kept for back-compat. */
export type SearchableDropdownEditorParams = DropdownEditorParams;

export const DropdownEditor = forwardRef<any, any>((props, ref) => {
  const {
    value, values,
    searchPlaceholder = 'Search…',
    createLabel, onCreate,
    secondaryByValue,
    noOptionsText,
    stopEditing, onValueChange,
  } = props as { value: string; stopEditing: () => void; onValueChange: (v: string) => void } & DropdownEditorParams;

  const valueRef = useRef<string>(value ?? '');
  const [input, setInput] = useState<string>(value ?? '');
  const options = values as string[];
  const canCreate = !!createLabel && !!onCreate;

  React.useImperativeHandle(ref, () => ({
    getValue: () => valueRef.current || value || '',
  }));

  const commit = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) { stopEditing(); return; }
    valueRef.current = trimmed;
    onValueChange(trimmed);
    stopEditing();
  };

  return (
    <Autocomplete
      open
      autoHighlight
      size="small"
      fullWidth
      {...(noOptionsText != null ? { noOptionsText } : {})}
      // The Autocomplete's listbox is locked open while the cell is in edit
      // mode, so MUI's internal close logic is suppressed. We surface its
      // close intents here: clicking the chevron again (reason 'toggleInput')
      // or pressing Esc closes the cell editor.
      onClose={(_, reason) => {
        if (reason === 'toggleInput' || reason === 'escape') stopEditing();
      }}
      // Use the same KeyboardArrowDown glyph as DropdownCellRenderer so the
      // closed-state and open-state chevrons read as the SAME icon (just
      // rotated 180° when the listbox opens). The × clear button stays enabled
      // — it slides in to the LEFT of the chevron without pushing the chevron
      // because endAdornment is anchored to a fixed right offset.
      popupIcon={<KeyboardArrowDown fontSize="small" />}
      value={(value as string) || null}
      inputValue={input}
      onInputChange={(_, v, reason) => { if (reason !== 'reset') setInput(v); }}
      options={canCreate ? [...options, CREATE_ACTION] : options}
      getOptionLabel={(opt) => opt === CREATE_ACTION ? '' : opt}
      filterOptions={(opts, state) => {
        const q = state.inputValue.toLowerCase();
        const filtered = opts.filter(o => {
          if (o === CREATE_ACTION) return false;
          if (o.toLowerCase().includes(q)) return true;
          // Make the grey suffix (e.g. sample code) searchable too — typing
          // "bih" should match "Sample Name (bih-hba-pgg)".
          const sec = secondaryByValue?.[o];
          return !!sec && sec.toLowerCase().includes(q);
        });
        if (canCreate) filtered.push(CREATE_ACTION);
        return filtered;
      }}
      onChange={(_, v) => {
        if (v === CREATE_ACTION) {
          // Cancel the cell edit (no commit) and hand off to the host modal.
          stopEditing();
          onCreate?.();
        } else if (v == null) {
          // X clear button — commit an empty value so the cell is cleared.
          valueRef.current = '';
          setInput('');
          onValueChange('');
          stopEditing();
        } else if (typeof v === 'string') {
          commit(v);
        }
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        if (option === CREATE_ACTION) {
          return (
            <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 6 }}>
              <AddIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>
                {createLabel}
              </Typography>
            </li>
          );
        }
        const secondary = secondaryByValue?.[option];
        return (
          <li
            key={key} {...rest}
            style={{
              ...rest.style,
              paddingTop: 6, paddingBottom: 6, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span>{option}</span>
            {secondary && (
              // Same 0.875rem size as the primary value so they read as one
              // line of text, just two-tone. text.secondary keeps the suffix
              // legible against the brand-tinted "selected/hover" background
              // (rgba(0,0,0,0.6) ≈ 60 % black, still passes contrast on the
              // soft pink hover state used by the listbox).
              <span style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.875rem' }}>
                {secondary}
              </span>
            )}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus
          placeholder={searchPlaceholder}
          sx={{
            width: '100%',
            height: '100%',
            // Fill the cell height + center vertically so the input text lines up
            // with the other cells in the row (cells are 52px; default MUI small
            // TextField is ~32px and would float to the top of the cell).
            '& .MuiOutlinedInput-root': {
              height: '100%',
              bgcolor: 'transparent',
              alignItems: 'center',
              // Borderless — the cell's own edit-state border is the focus ring.
              '& fieldset': { border: 'none' },
            },
            '& .MuiOutlinedInput-input': {
              fontSize: '0.875rem',
              height: '100%',
              boxSizing: 'border-box',
              padding: '0 14px',
            },
            '& .MuiAutocomplete-endAdornment': { right: 8 },
          }}
        />
      )}
      slotProps={{
        // Bottom-start so the popup hangs directly below the cell with no gap.
        popper: { sx: { zIndex: 1400 }, placement: 'bottom-start' },
        // Top corners flush with the cell's bottom so it reads as one control.
        paper: { elevation: 8, sx: { borderRadius: '0 0 8px 8px', mt: 0, py: 0.5 } },
      }}
      sx={{
        width: '100%', height: '100%',
        // Aligns the open-state input text with the closed-state cell value.
        // The Autocomplete wrapper has a 7 px internal left offset before its
        // input element; AG-Grid's closed cell padding-left is 16 px. The
        // editing-cell CSS in GridStyles forces input[type="text"] to padding
        // 0 16px !important — we bump specificity here (chained class on the
        // same element) and !important to beat it. 16 - 7 = 9 px gives a
        // matching text x-position.
        '&.MuiAutocomplete-root .MuiAutocomplete-input.MuiAutocomplete-input': {
          padding: '0 9px !important',
        },
        // Anchor the chevron at the same pixel column as the closed-state
        // IconButton so it doesn't jump 8 px when the cell enters edit mode.
        // Measured against AG-Grid's default cell padding-right.
        '&.MuiAutocomplete-root .MuiAutocomplete-endAdornment': {
          right: '15px !important',
        },
        // Match the closed-state IconButton footprint (30×30 wrapper, 20 px
        // glyph) so the chevron + × buttons feel identical in size to the
        // closed state. Without this MUI's defaults are ~24×24/22 px.
        '&.MuiAutocomplete-root .MuiAutocomplete-popupIndicator, &.MuiAutocomplete-root .MuiAutocomplete-clearIndicator': {
          width: 30, height: 30, padding: '5px', marginRight: 0,
          '& svg': { fontSize: 20 },
        },
      }}
    />
  );
});
DropdownEditor.displayName = 'DropdownEditor';

/** @deprecated Use `DropdownEditor`. Kept for back-compat — same component. */
export const SearchableDropdownEditor = DropdownEditor;

// ── Date editor — MUI calendar popup (one calendar UI for every editable grid) ──
// AG Grid reads getValue() synchronously on stopEditing, so the chosen date is
// mirrored into a ref. A native <input type="date"> was replaced by MUI's
// DateCalendar so the date UX matches the rest of the app (DatePicker dialogs).

/** Wraps a disabled calendar day in a Tooltip explaining why it's disabled.
 *  Disabled buttons don't fire pointer events, so the Tooltip's child needs
 *  a plain wrapping element (the `Box`) to actually receive the hover.
 *  `disabledTooltip` may be a plain string or a function of the specific day
 *  being rendered, since the message can need to name that exact date.
 *
 *  A disabled MuiPickersDay has no hover feedback of its own — the wrapper's
 *  `:hover` forces a soft circle onto the (still-round) day underneath, the
 *  same "something is here" affordance an enabled day's hover already gives,
 *  in the app's error tint (not the neutral grey an enabled day uses) so a
 *  disabled day never reads as clickable. Text darkens a step on hover too
 *  (`text.disabled` alone is too low-contrast against the tinted circle). */
function TooltipDay(props: PickersDayProps<Date> & { disabledTooltip?: string | ((day: Date) => string) }) {
  const { disabledTooltip, ...dayProps } = props;
  const day = <PickersDay {...dayProps} />;
  if (!dayProps.disabled || !disabledTooltip) return day;
  const title = typeof disabledTooltip === 'function' ? disabledTooltip(dayProps.day) : disabledTooltip;
  return (
    <Tooltip title={title} arrow placement="top" enterDelay={200}>
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          borderRadius: '50%',
          // !important + resolved-value strings (not sx's 'primary.softBg'
          // token-path shorthand): MUI's own disabled-day rule has the same
          // 2-class specificity and Emotion's injection order isn't
          // guaranteed to land after ours, and appending ' !important' to an
          // unresolved token-path string breaks sx's token lookup entirely
          // (it stops matching a real theme path, so the whole declaration
          // is dropped as an invalid CSS value instead of just losing the
          // specificity fight).
          '&:hover .MuiPickersDay-root.MuiPickersDay-disabled': {
            backgroundColor: `${theme.palette.primary.softBg} !important`,
            color: `${theme.palette.text.secondary} !important`,
          },
        }}
      >
        {day}
      </Box>
    </Tooltip>
  );
}

export const DateEditor = forwardRef<any, any>(({ value, stopEditing, onValueChange, shouldDisableDate, disabledDateTooltip }, ref) => {
  const toDate = (v: unknown): Date | null => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
  };
  const valueRef = useRef<Date | null>(toDate(value));
  const [date, setDate] = useState<Date | null>(toDate(value));

  React.useImperativeHandle(ref, () => ({
    getValue: () => valueRef.current,
  }));

  return (
    <Paper elevation={8} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
      <DateCalendar
        value={date}
        onChange={(nv) => {
          valueRef.current = nv;
          setDate(nv);
          onValueChange?.(nv);
          stopEditing();
        }}
        shouldDisableDate={shouldDisableDate}
        slots={disabledDateTooltip ? {
          day: (p: PickersDayProps<Date>) => <TooltipDay {...p} disabledTooltip={disabledDateTooltip} />,
        } : undefined}
      />
    </Paper>
  );
});
DateEditor.displayName = 'DateEditor';

/** SSOT date formatter for every editable-grid date cell ("MMM d, yyyy", e.g.
 *  "Aug 10, 2026"). Use this anywhere a date needs to read consistently with
 *  the grid's own Application-date column — e.g. in validation copy. */
export function formatGridDate(v: unknown): string {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v as string);
  return isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

/**
 * Shared date column — the SSOT for any editable date cell. MUI calendar popup
 * editor + consistent "MMM d, yyyy" formatting. Use it instead of hand-rolling a
 * date colDef: `dateColumn('date', 'Date', { flex: 1.3 })`.
 */
export function dateColumn(field: string, headerName: string, extra: Partial<ColDef> = {}): ColDef {
  return {
    field,
    headerName,
    editable: true,
    cellEditor: DateEditor,
    cellEditorPopup: true,
    cellEditorPopupPosition: 'under',
    valueFormatter: (p: any) => formatGridDate(p.value),
    ...extra,
  };
}

// ── MUI column header — replaces AG Grid's sort icon with MUI TableSortLabel ──
// Renders exactly like PlotsTable's header cells: bold 12px text.secondary,
// with MUI's rotating arrow on sorted columns.

export function GridColumnHeader({ displayName, column, enableSorting, progressSort }: IHeaderParams) {
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(
    () => (column.getSort() as 'asc' | 'desc' | null) ?? null
  );
  useEffect(() => {
    const listener = () => setSortDir((column.getSort() as 'asc' | 'desc' | null) ?? null);
    column.addEventListener('sortChanged', listener);
    return () => column.removeEventListener('sortChanged', listener);
  }, [column]);

  if (!enableSorting || !displayName) {
    return (
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5 }}>
        {displayName}
      </Typography>
    );
  }
  return (
    <TableSortLabel
      active={sortDir != null}
      direction={sortDir ?? 'asc'}
      onClick={() => progressSort(false)}
      sx={{
        fontSize: '0.75rem',
        fontWeight: 700,
        color: 'text.secondary',
        lineHeight: 1.5,
        '&.Mui-active': { color: 'text.secondary' },
        '&.Mui-active .MuiTableSortLabel-icon': { color: 'text.secondary' },
        '& .MuiTableSortLabel-icon': { fontSize: 16, ml: 0.25 },
      }}
    >
      {displayName}
    </TableSortLabel>
  );
}

// ── Locked / auto-generated column header — SSOT for non-editable columns ─────
// Mirrors the existing SampleSheetHeader / AttachmentHeader pattern in
// SamplesGrid / ReportsGrid (which this replaces). Renders the column
// displayName in the standard header styling (bold 12 px, text.secondary,
// uppercase via header text-transform) and appends an InfoOutlined glyph with
// a wrapping MUI Tooltip whose text comes from
// `colDef.headerComponentParams.tooltip`.

export interface LockedHeaderParams extends IHeaderParams {
  tooltip?: string;
}

export function LockedHeader({ displayName, tooltip }: LockedHeaderParams) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5, textTransform: 'uppercase' }}>
        {displayName}
      </Typography>
      {tooltip ? (
        <Tooltip arrow placement="top" enterDelay={150} title={tooltip}>
          <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      ) : (
        <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
      )}
    </Box>
  );
}

/**
 * Shared column-def factory for auto-generated, non-editable columns. Use it
 * instead of hand-rolling a locked colDef:
 *   lockedColumn('sampleCode', 'Sample code', 'Generated when the sample is created.')
 *
 * - editable: false, sortable: true, filter: true (matches default grid behaviour)
 * - LockedHeader is wired via headerComponent + headerComponentParams.tooltip
 * - cellStyle mutes the value (theme.palette.text.disabled) and shows a not-allowed cursor
 * - cellClass 'cell-locked' lets GridStyles enforce the same muted look and
 *   suppress the blue cell-selection range highlight (see CSS in GridStyles).
 * - suppressNavigable + suppressKeyboardEvent stop keyboard focus from landing
 *   inside the cell so the AG-Grid range-edit tint can't be triggered.
 * - `extra` is spread last so callers can override flex / width / valueFormatter.
 */
export function lockedColumn(
  field: string,
  headerName: string,
  tooltip: string,
  extra: Partial<ColDef> = {},
): ColDef {
  return {
    field,
    headerName,
    editable: false,
    sortable: true,
    filter: true,
    headerComponent: LockedHeader,
    headerComponentParams: { tooltip },
    cellClass: 'cell-locked',
    // AG-Grid's cellStyle isn't run through MUI's sx/theme resolution, so this
    // needs the theme's resolved value directly, not the 'text.disabled'
    // token string — imported from theme.ts rather than a hardcoded literal,
    // so this can never drift from what the rest of the app calls "disabled".
    cellStyle: { color: theme.palette.text.disabled, cursor: 'not-allowed' },
    suppressNavigable: true,
    suppressKeyboardEvent: () => true,
    ...extra,
  };
}

// ── MUI select-all checkbox header ─────────────────────────────────────────────

export function SelectAllHeader({ api }: IHeaderParams) {
  const [checked, setChecked] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);
  useEffect(() => {
    const update = () => {
      const total = api.getDisplayedRowCount();
      const n = api.getSelectedNodes().length;
      setChecked(total > 0 && n === total);
      setIndeterminate(n > 0 && n < total);
    };
    api.addEventListener('selectionChanged', update);
    api.addEventListener('rowDataUpdated', update);
    return () => {
      api.removeEventListener('selectionChanged', update);
      api.removeEventListener('rowDataUpdated', update);
    };
  }, [api]);
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      onChange={(e) => { if (e.target.checked) api.selectAll(); else api.deselectAll(); }}
      sx={{ p: 0.5 }}
    />
  );
}

// ── MUI row checkbox cell ───────────────────────────────────────────────────────

export function RowCheckbox({ node }: CustomCellRendererProps) {
  const [selected, setSelected] = useState(() => node.isSelected() ?? false);
  useEffect(() => {
    const listener = () => setSelected(node.isSelected() ?? false);
    node.addEventListener('rowSelected', listener);
    return () => node.removeEventListener('rowSelected', listener);
  }, [node]);
  return (
    <Checkbox
      checked={selected}
      onChange={() => node.setSelected(!node.isSelected())}
      onClick={(e) => e.stopPropagation()}
      sx={{ p: 0.5 }}
    />
  );
}

// ── Dropdown cell renderer — value + chevron icon ─────────────────────────────
// Clicking the chevron toggles edit mode. The editing check happens at mousedown
// time, before focus-loss events fire, so the toggle is reliable.

export function DropdownCellRenderer({
  value, api, node, column, nameAdornment,
}: CustomCellRendererProps & {
  /** Rendered immediately after the (truncated) value, before the clear/chevron
   *  controls — e.g. a warning tag. Keeps it next to the name it describes
   *  instead of trailing past the cell's own controls. */
  nameAdornment?: React.ReactNode;
}) {
  const toggleEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (node.rowIndex == null) return;

    const isEditing = api.getEditingCells().some(
      (c) => c.rowIndex === node.rowIndex && c.column.getColId() === column.getColId()
    );

    if (isEditing) {
      api.stopEditing();
    } else {
      api.startEditingCell({ rowIndex: node.rowIndex, colKey: column.getColId() });
    }
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    node.setDataValue(column.getColId(), '');
  };

  // Single shared style for every cell-selector icon button — closed and open,
  // chevron and clear. 30×30 wrapper, 20 px glyph, action.active color, MUI's
  // default hover background. Identical treatment, no special-case red hovers.
  const iconBtnSx = {
    width: 30, height: 30, padding: '5px', flexShrink: 0,
    color: 'action.active',
  } as const;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
      {/* No gap here — nameAdornment (DraftChip/ManagedTag/WarningTag) already
          carries its own ml:1, same as every other name-cell usage. Adding a
          flex gap on top would double the spacing to the value. */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, color: value ? 'text.primary' : 'text.disabled' }}>
          {value || '—'}
        </Box>
        {nameAdornment}
      </Box>
      {value && (
        <IconButton
          size="small"
          tabIndex={-1}
          onMouseDown={clearValue}
          sx={iconBtnSx}
          aria-label="Clear"
          className="cell-clear-btn"
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      )}
      <IconButton
        size="small"
        tabIndex={-1}
        onMouseDown={toggleEditor}
        sx={iconBtnSx}
      >
        <KeyboardArrowDown sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  );
}

// ── Grid chrome CSS — scoped to .resi-grid; identical look for every grid ──────

export function GridStyles() {
  return (
    <style>{`
      /* HEADER — all text rendered by GridColumnHeader (MUI); zero out AG chrome */
      .resi-grid .ag-header-cell-resize { display: none !important; }
      .resi-grid .ag-header-cell { padding: 0 16px !important; }
      .resi-grid .ag-header-cell-comp-wrapper { padding: 0 !important; height: 100%; display: flex; align-items: center; }
      .resi-grid [col-id="resi-select"] .ag-header-cell-comp-wrapper { justify-content: center; }
      .resi-grid .ag-cell-label-container { padding: 0 !important; }
      .resi-grid .ag-header-cell-label { overflow: visible; }
      .resi-grid .ag-header-cell-text { display: none !important; }
      .resi-grid .ag-sort-indicator-container { display: none !important; }
      .resi-grid .ag-sort-order { display: none !important; }

      /* BODY CELLS */
      .resi-grid .ag-cell {
        display: flex !important;
        align-items: center !important;
        font-size: 14px !important;
        font-family: "Inter","Roboto","Helvetica","Arial",sans-serif !important;
        color: rgba(0,0,0,0.87) !important;
        line-height: 1.43 !important;
        letter-spacing: 0.00938em !important;
      }

      /* HOVER + SELECTED ROW BACKGROUNDS — exact MUI TableRow values */
      .resi-grid .ag-row-hover:not(.ag-row-selected) .ag-cell { background-color: rgba(0,0,0,0.04) !important; }
      .resi-grid .ag-row-selected .ag-cell { background-color: rgba(25,118,210,0.08) !important; }
      .resi-grid .ag-row-selected.ag-row-hover .ag-cell { background-color: rgba(25,118,210,0.12) !important; }

      /* CLEAR BUTTON — only show on row hover, matching MUI Autocomplete behaviour */
      .resi-grid .cell-clear-btn { visibility: hidden; }
      .resi-grid .ag-row-hover .cell-clear-btn { visibility: visible; }

      /* CELL FOCUS — primary border, no spreadsheet ring */
      .resi-grid .ag-cell.ag-cell-focus:not(.ag-cell-inline-editing) {
        border-color: rgba(25,118,210,0.7) !important;
        outline: none !important;
      }

      /* INLINE INPUT EDITORS (text + number) — style like a MUI inline text field */
      .resi-grid .ag-cell-inline-editing .ag-input-field-input,
      .resi-grid .ag-cell-inline-editing .ag-number-field-input,
      .resi-grid .ag-cell-inline-editing input[type="text"],
      .resi-grid .ag-cell-inline-editing input[type="number"] {
        font-size: 14px !important;
        font-family: "Inter","Roboto","Helvetica","Arial",sans-serif !important;
        color: rgba(0,0,0,0.87) !important;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        padding: 0 16px !important;
        width: 100% !important;
        height: 100% !important;
        box-sizing: border-box !important;
        -moz-appearance: textfield !important;
      }
      .resi-grid .ag-cell-inline-editing input[type="number"]::-webkit-inner-spin-button,
      .resi-grid .ag-cell-inline-editing input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }

      /* POPUP EDITOR — MUI Paper provides all chrome.
         Selectors are NOT scoped under .resi-grid because popups are rendered
         under document.body (via popupParent) so they escape any container
         clipping. */
      .ag-popup-editor {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        overflow: visible;
      }
      .ag-popup, .ag-popup-editor { z-index: 1300; }

      /* INLINE EDITING CELL — light blue tint + primary border */
      .resi-grid .ag-cell.ag-cell-inline-editing {
        background-color: rgba(25,118,210,0.06) !important;
        border: 1px solid rgba(25,118,210,0.45) !important;
        padding: 0 !important;
      }

      /* LOCKED CELL — auto-generated, non-editable. The class is set by
         lockedColumn() and the CSS beats AG-Grid's default cell-selection
         (range-edit blue tint) + clickable text cursor that would otherwise
         imply the value is editable. */
      .resi-grid .ag-cell.cell-locked {
        cursor: not-allowed !important;
        color: ${theme.palette.text.disabled} !important;
      }
      .resi-grid .ag-cell.cell-locked.ag-cell-focus,
      .resi-grid .ag-cell.cell-locked.ag-cell-range-selected {
        background-color: transparent !important;
        border-color: transparent !important;
        outline: none !important;
      }

      /* PENDING ROW INDICATOR — 4 px brand-red left edge on new + modified
         rows. Stays until Save changes (or Save as draft) clears the dirty
         set. The first cell carries it via inset box-shadow so it works
         regardless of which column owns the left edge. */
      .resi-grid .row-pending .ag-cell:first-child { box-shadow: inset 4px 0 0 #d4183d; }

      /* ERRORED CELL — same chrome as the blue inline-editing tint but in
         brand-error red. Touches color/border only; cell layout is unchanged. */
      .resi-grid .ag-cell.cell-errored {
        background-color: rgba(211,47,47,0.06) !important;
        border: 1px solid rgba(211,47,47,0.45) !important;
      }

      /* UNTOUCHED ROW — 50% opacity when the grid is in dirty mode (some
         other row has unsaved edits). Save changes / Save as draft only act
         on dirty rows, so untouched ones recede to keep focus on what gets saved. */
      .resi-grid .row-untouched .ag-cell { opacity: 0.5; }
      /* MODIFIED / NEW ROW — full opacity beats the untouched fade, paired
         with the 4 px red left marker from .row-pending above. */
      .resi-grid .row-pending .ag-cell { opacity: 1; }

      /* MANAGED ROW — pushed in by an external system; rendered with muted
         text so it reads as read-only. We swap text colour rather than
         applying a CSS opacity so the ManagedTag pill's red icon + label stay
         at full saturation (same trick MutedTd uses in table-actions-v1's
         tags demo). !important beats per-cell inline colors. The tag's own
         bg/fg are not set via color, so they stay full.
         Uses theme.palette.text.disabled (imported), not a hardcoded literal —
         this used to be its own rgba(0,0,0,0.45), a different value from the
         plain read-only tables' locked rows (theme's real text.disabled,
         rgba(0,0,0,0.38)), so the same "system-managed" concept rendered two
         different mutes depending on which table you were looking at. */
      .resi-grid .row-managed .ag-cell,
      .resi-grid .row-managed .ag-cell * { color: ${theme.palette.text.disabled} !important; }
      /* Tags carry their own bg + fg as the indicator — preserve them and
         everything inside the tag wrapper at full saturation. Color matches
         the ManagedTag pill's fg (theme error.main). */
      .resi-grid .row-managed .ag-cell [data-tag-glyph],
      .resi-grid .row-managed .ag-cell [data-tag-glyph] * { color: inherit !important; }
      .resi-grid .row-managed .ag-cell [data-tag-glyph] { color: #d32f2f !important; }
    `}</style>
  );
}

// ── Shared row-action soft button (AC-6.2, AC-11.4) ───────────────────────────
// Single source of truth for the four soft-grey row CTAs (Open PDF, Upload,
// Add lab report, Copy to plots, Send to lab). All shared styling lives here
// so the grids never re-declare the sx blob inline.
export type RowActionButtonProps = Omit<ButtonProps, 'variant' | 'size'>;

export function RowActionButton({ sx, ...rest }: RowActionButtonProps) {
  return (
    <Button
      variant="soft"
      size="small"
      sx={{
        textTransform: 'none',
        borderRadius: '8px',
        height: 30,
        bgcolor: 'grey.100',
        color: 'text.secondary',
        '&:hover': { bgcolor: 'grey.200' },
        ...sx,
      }}
      {...rest}
    />
  );
}

// ── Shared row-action icon button (Duplicate, Delete, Edit, etc.) ─────────────
// Single source of truth for the small tooltip+icon row actions used across
// every table/grid — plain default IconButton color, no per-icon overrides,
// so two icons sitting side by side never render at different weights.
export interface RowIconButtonProps {
  /** Tooltip title, also used as the aria-label. */
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

export function RowIconButton({ label, onClick, children }: RowIconButtonProps) {
  return (
    <Tooltip title={label} arrow placement="top" enterDelay={150}>
      <IconButton size="small" aria-label={label} onClick={onClick}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

// ── Row action menu — shared across every editable grid (SSOT) ────────────────
// One styled "Action" button + ActionMenu. Each grid wires the actions via
// `context.rowActions(data) → ActionItem[]` — actions can vary per row.

export function GridRowActionRenderer({ data, context }: CustomCellRendererProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { rowActions } = (context ?? {}) as { rowActions?: (rowData: any) => ActionItem[] };
  const actions = rowActions?.(data) ?? [];
  if (actions.length === 0) return null;
  return (
    <>
      <Button
        size="small"
        color="primary"
        endIcon={<KeyboardArrowDown sx={{ fontSize: 16 }} />}
        onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
        sx={{ fontWeight: 600, fontSize: '0.8125rem', textTransform: 'none', height: 30, px: 1 }}
      >
        Action
      </Button>
      <ActionMenu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} actions={actions} />
    </>
  );
}

/** Spread into any grid's columnDefs to get the trailing Action column.
 *  AC-7.3: both `width` and `minWidth` must be declared so the 140 default
 *  doesn't stretch this fixed-size column. */
export const rowActionColumn = {
  headerName: '',
  width: 108,
  minWidth: 108,
  editable: false,
  sortable: false,
  filter: false,
  suppressNavigable: true,
  suppressKeyboardEvent: () => true,
  cellRenderer: GridRowActionRenderer,
  cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' },
} as const;

// ── Grid chrome — toolbar + count bar (matches Treatments SSOT layout) ────────

/** Top-of-grid toolbar row. Edge-to-edge with a divider below. */
export function GridToolbar({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
      {children}
    </Box>
  );
}

/** Search input for the toolbar (matches the Treatments-pattern styling). */
export function GridSearchField({ placeholder, value, onChange, width = 240 }: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  width?: number;
}) {
  return (
    <TextField
      size="small" placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
        sx: { borderRadius: '8px' },
      }}
      sx={{ width, '& .MuiOutlinedInput-root': { height: 36, bgcolor: 'white' } }}
    />
  );
}

/** "N TOTAL <THING>" uppercase count bar, rendered just under the toolbar. */
export function GridCountBar({ count, label }: { count: number; label: string }) {
  return (
    <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
        {count} total {label}{count !== 1 ? 's' : ''}
      </Typography>
    </Box>
  );
}

/** Shared checkbox column def — MUI Checkbox in body + header. Spread into any grid's columnDefs. */
export const selectColumn = {
  colId: 'resi-select',
  headerComponent: SelectAllHeader,
  cellRenderer: RowCheckbox,
  width: 52,
  minWidth: 52,
  maxWidth: 52,
  sortable: false,
  filter: false,
  editable: false,
  resizable: false,
  suppressNavigable: true,
  suppressKeyboardEvent: () => true,
  cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
} as const;
