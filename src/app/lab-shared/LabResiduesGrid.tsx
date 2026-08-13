import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { ColDef, CustomCellRendererProps, IHeaderParams } from 'ag-grid-community';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { ContentCopy, DeleteOutline, InfoOutlined } from '@mui/icons-material';
import { EditableDataGrid, EditableDataGridHandle } from '../design-system/grid/EditableDataGrid';
import { DropdownCellRenderer, DropdownEditor, rowActionColumn, selectColumn } from '../design-system/grid/grid-shared';
import { WarningTag } from '../design-system/grid/draft-state';
import { Validators, ValidationMode } from '../design-system/grid/validation';
import { ActionItem } from '../design-system/ActionMenu';
import { EmDash } from '../design-system/TableCard';
import { ANALYTE_OPTIONS, LabReport, LabResidue, RESIDUE_LEVEL_OPTIONS } from '../data/lab-results-data';

// Analyte cell — dropdown for manual rows, plain text for treatment-derived rows.
// When hideSource is true all rows are editable, so always use the dropdown renderer.
// Shows a warning icon when the analyte is not in the plot's treatment-derived recommended set.
function AnalyteCell(props: CustomCellRendererProps) {
  const { recommendedSet, hideSource } = (props.context ?? {}) as { recommendedSet?: Set<string>; hideSource?: boolean };
  const analyte: string = props.value;
  const isFromTreatment = props.data?.fromTreatment;
  const showWarning = !!analyte && !!recommendedSet && !recommendedSet.has(analyte);
  const warningTag = showWarning ? (
    <WarningTag
      condensed
      tooltip="This is an analyte we have not detected in any of the applied treatments in our system"
    />
  ) : undefined;

  if (isFromTreatment && !hideSource) {
    // No flex gap — warningTag already carries its own ml:1 (same as every
    // other name-cell usage), so a gap here would double the spacing.
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', overflow: 'hidden' }}>
        <Typography sx={{
          fontSize: '0.875rem', color: 'text.primary',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {analyte || '—'}
        </Typography>
        {warningTag}
      </Box>
    );
  }

  return <DropdownCellRenderer {...props} nameAdornment={warningTag} />;
}

// Lab report cell — same shape as AnalyteCell's warning: flags a labReportId
// that doesn't match any currently-valid report (e.g. the report row was
// deleted elsewhere on the page after this result was assigned to it).
// A plain per-render check against `context.validReportIds`, not the grid's
// format/required validator system — that only re-checks dirty rows on
// triggerValidation(), which would miss a row that was valid until its
// report was deleted in the same session.
function LabReportCell(props: CustomCellRendererProps) {
  const { validReportIds } = (props.context ?? {}) as { validReportIds?: Set<string> };
  const value: string = props.value;
  const showWarning = !!value && !!validReportIds && !validReportIds.has(value);
  const warningTag = showWarning ? (
    <WarningTag tooltip="This lab report no longer exists. Pick a different report or remove this result." />
  ) : undefined;

  return <DropdownCellRenderer {...props} nameAdornment={warningTag} />;
}

// ── Managed-row lock — wraps any cell renderer so a residue pushed in via
// the lab's direct API connection (managedBy set) renders muted, non-
// interactive, with a lock tooltip, instead of its normal editable form.

const MANAGED_RESIDUE_TOOLTIP = "This result was submitted automatically via the lab's direct connection to ResiYou.";

function withManagedLock(CellComponent: (props: CustomCellRendererProps) => React.ReactElement) {
  return function ManagedLockCell(props: CustomCellRendererProps) {
    if (!props.data?.managedBy) return <CellComponent {...props} />;
    return (
      <Tooltip title={MANAGED_RESIDUE_TOOLTIP} arrow placement="top" enterDelay={200}>
        <Box sx={{
          display: 'flex', alignItems: 'center', width: '100%', height: '100%',
          overflow: 'hidden', color: 'text.disabled', cursor: 'not-allowed',
        }}>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {props.value || '—'}
          </Box>
        </Box>
      </Tooltip>
    );
  };
}

// ── Source cell — plain wording, manual entries highlighted ───────────────────

function SourceCell({ data }: CustomCellRendererProps) {
  return (
    <Typography sx={{
      fontSize: '0.875rem',
      color: data.fromTreatment ? 'text.secondary' : 'primary.main',
    }}>
      {data.fromTreatment ? 'From treatment' : 'Manually added'}
    </Typography>
  );
}

function DashCell({ value }: CustomCellRendererProps) {
  return value !== '' && value != null
    ? <Box component="span" sx={{ fontSize: '0.875rem' }}>{value}</Box>
    : <EmDash />;
}

function InlineActionsCell({ data, context }: CustomCellRendererProps) {
  const { rowActions } = (context ?? {}) as { rowActions?: (d: any) => Array<{ key: string; onClick: () => void }> };
  const actions = rowActions?.(data) ?? [];
  const dupAction = actions.find((a) => a.key === 'dup');
  const delAction = actions.find((a) => a.key === 'delete');
  return (
    <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ width: '100%' }}>
      {dupAction && (
        <Tooltip title="Duplicate" arrow placement="top" enterDelay={150}>
          {/* fontSize="small" (20px) — matches RowIconButton's icon size in
              the read-only tables (e.g. ReportRow's Edit/Delete), not an
              arbitrary smaller size unique to the grid. */}
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); dupAction.onClick(); }}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {delAction && (
        <Tooltip title="Delete" arrow placement="top" enterDelay={150}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); delAction.onClick(); }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

function SourceHeader({ displayName }: IHeaderParams) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5 }}>
        {displayName}
      </Typography>
      <Tooltip arrow placement="top" enterDelay={150} title="From treatment: matches a reported treatment, expected. Manually added: no matching treatment, worth a second look.">
        <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
      </Tooltip>
    </Box>
  );
}

function LoqHeader({ displayName }: IHeaderParams) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5 }}>
        {displayName}
      </Typography>
      <Tooltip arrow placement="top" enterDelay={150} title="Limit of Quantification">
        <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
      </Tooltip>
    </Box>
  );
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface LabResiduesGridHandle {
  /** Returns the created row so callers can track it (e.g. to support Undo).
   *  `focus` opens the next relevant cell for editing — on by default for a
   *  single deliberate add. Pass `false` for programmatic/bulk adds (e.g.
   *  importing several rows at once), where stealing focus into whichever
   *  row happens to be added last is never wanted. */
  addRow: (analyte?: string, focus?: boolean) => LabResidue;
  deleteRows: (ids: string[]) => void;
  setFilter: (text: string) => void;
  /** Clears dirty-row tracking after the caller has persisted the data. */
  save: () => void;
  /** Same contract as TreatmentsGridHandle — run validators on dirty rows.
   *  Returns true when there are no errors. No-ops (returns true) when the
   *  caller didn't pass `validators`. */
  triggerValidation: (mode?: ValidationMode) => boolean;
  /** Drop validation state so cells go back to neutral (used on Cancel). */
  clearValidation: () => void;
}

export interface LabResiduesGridProps {
  residues: LabResidue[];
  /** Lab reports for the parent sample — feed the Lab report dropdown. */
  reports: LabReport[];
  /** Hide the Lab report column (when editing a single report — column is redundant). */
  hideLabReport?: boolean;
  /** Hide the Source column and make all rows fully editable (no fromTreatment lock). */
  hideSource?: boolean;
  /** Analytes from applied treatments. Any manually-added analyte outside this set gets a warning icon. */
  recommendedAnalytes?: string[];
  onAdd: (residue: LabResidue) => void;
  onUpdate: (id: string, patch: Partial<LabResidue>) => void;
  onDelete: (id: string) => void;
  onSelectionChange?: (ids: string[]) => void;
  /** Message shown when there are no results yet. */
  noRowsMessage?: string;
  /** Override the LOQ column's header text. Defaults to the abbreviation only. */
  loqHeaderName?: string;
  /** Fires whenever the grid's dirty-row set toggles empty/non-empty. */
  onDirtyStateChange?: (isDirty: boolean) => void;
  /** Fires once AG-Grid's internal api is actually ready — see EditableDataGrid. */
  onGridReady?: () => void;
  /** Per-field validation rules — same two-tier format/required contract as
   *  TreatmentsGrid. Omit to keep the grid unvalidated (existing behavior). */
  validators?: Validators<LabResidue>;
  /** Field required to identify a row (TreatmentsGrid's `nameField` equivalent). */
  nameField?: string;
}

// Most labs report at this LOQ by default, so a fresh row starts here
// instead of blank — still fully editable per row.
const STANDARD_LOQ = '0.01';

export function newResidueRow(): LabResidue {
  return {
    id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    analyte: '',
    residueLevel: null,
    residueValue: '',
    methodLoq: STANDARD_LOQ,
    methodLod: '',
    fromTreatment: false,
  };
}

// Reports are identified by their ID alone — simplest, and IDs are unique
// per report, so no need to also spell out the lab name.
function reportLabel(r: LabReport): string {
  return r.labReportId?.trim() || r.laboratory?.trim() || r.id;
}

export const LabResiduesGrid = forwardRef<LabResiduesGridHandle, LabResiduesGridProps>(
  ({ residues, reports, hideLabReport = false, hideSource = false, recommendedAnalytes, onAdd, onUpdate, onDelete, onSelectionChange, noRowsMessage, loqHeaderName = 'LOQ (mg/kg)', onDirtyStateChange, onGridReady, validators, nameField }, ref) => {
    const coreRef = useRef<EditableDataGridHandle>(null);

    const reportOptions = useMemo(() => reports.map(reportLabel), [reports]);

    useImperativeHandle(ref, () => ({
      addRow: (analyte?: string, focus = true) => {
        const r = { ...newResidueRow(), analyte: analyte ?? '' };
        onAdd(r);
        coreRef.current?.addRow(r as any, focus ? (analyte ? 'residueLevel' : 'analyte') : undefined);
        return r;
      },
      deleteRows: (ids) => {
        ids.forEach(id => {
          onDelete(id);
          coreRef.current?.deleteRow(id);
        });
      },
      setFilter: (text) => coreRef.current?.setFilter(text),
      save: () => coreRef.current?.save(),
      triggerValidation: (mode) => coreRef.current?.triggerValidation(mode) ?? true,
      clearValidation: () => coreRef.current?.clearValidation(),
    }));

    const context = useMemo(() => ({
      rowActions: (data: LabResidue): ActionItem[] => (data.managedBy ? [] : [
        { label: 'Duplicate', icon: <ContentCopy fontSize="small" />, key: 'dup', onClick: () => {
          const dup: LabResidue = {
            ...data,
            id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            fromTreatment: false,
          };
          onAdd(dup);
          coreRef.current?.addRow(dup as any, 'analyte');
        } },
        { divider: true, key: 'd1', onClick: () => {} },
        { label: 'Delete', icon: <DeleteOutline fontSize="small" />, key: 'delete', color: 'error.main', onClick: () => {
          onDelete(data.id);
          coreRef.current?.deleteRow(data.id);
        } },
      ]),
      recommendedSet: recommendedAnalytes ? new Set(recommendedAnalytes) : undefined,
      hideSource,
      validReportIds: new Set(reports.map((r) => r.labReportId).filter(Boolean)),
    }), [onDelete, onAdd, recommendedAnalytes, hideSource, reports]);

    const colDefs: ColDef[] = useMemo(() => [
      selectColumn as ColDef,
      ...(hideLabReport ? [] : [{
        field: 'labReportId', headerName: 'Lab report', flex: 1.4,
        editable: (params: any) => !params.data.managedBy,
        cellRenderer: withManagedLock(LabReportCell), cellEditor: DropdownEditor,
        cellEditorParams: { values: reportOptions, searchPlaceholder: 'Search lab report…' },
      } as ColDef]),
      {
        field: 'analyte', headerName: 'Analyte', flex: 2,
        editable: (params: any) => !params.data.managedBy && (hideSource ? true : !params.data.fromTreatment),
        cellRenderer: withManagedLock(AnalyteCell),
        cellEditor: DropdownEditor,
        cellEditorParams: { values: ANALYTE_OPTIONS, searchPlaceholder: 'Search analyte…' },
      },
      {
        field: 'residueLevel', headerName: 'Residue level', flex: 1.1,
        editable: (params: any) => !params.data.managedBy,
        cellRenderer: withManagedLock(DropdownCellRenderer), cellEditor: DropdownEditor,
        cellEditorParams: { values: RESIDUE_LEVEL_OPTIONS, searchPlaceholder: 'Search residue level…' },
      },
      {
        field: 'residueValue', headerName: 'Residue (mg/kg)',
        ...(hideSource ? { width: 110, minWidth: 90 } : { flex: 1 }),
        editable: (params: any) => !params.data.managedBy && (hideSource ? true : params.data.residueLevel === 'Residue'),
        cellRenderer: withManagedLock(DashCell),
      },
      {
        field: 'methodLoq', headerName: loqHeaderName,
        headerComponent: LoqHeader,
        ...(hideSource ? { width: 115, minWidth: 105 } : { flex: 1, minWidth: 115 }),
        editable: (params: any) => !params.data.managedBy,
        cellRenderer: withManagedLock(DashCell),
      },
      ...(hideSource ? [] : [{
        headerName: 'Source', flex: 1, editable: false, sortable: false, filter: false,
        cellRenderer: SourceCell,
        headerComponent: SourceHeader,
        cellStyle: { display: 'flex', alignItems: 'center' },
      } as ColDef]),
      ...(hideSource
        ? [{ headerName: '', colId: 'resi-inline-actions', width: 88, minWidth: 88, editable: false, sortable: false, filter: false, resizable: false, suppressNavigable: true, suppressKeyboardEvent: () => true, cellRenderer: InlineActionsCell, cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' } } as ColDef]
        : [rowActionColumn as ColDef]
      ),
    ], [reportOptions, hideLabReport, hideSource, loqHeaderName]);

    const handleCellChange = (id: string, field: string, value: unknown) => {
      onUpdate(id, { [field]: value } as Partial<LabResidue>);
    };

    return (
      <EditableDataGrid
        ref={coreRef}
        initialData={residues as any}
        columnDefs={colDefs}
        context={context}
        onSelectionChange={onSelectionChange}
        onCellChange={handleCellChange}
        onDirtyStateChange={onDirtyStateChange}
        onGridReady={onGridReady}
        noRowsMessage={noRowsMessage}
        validators={validators as Validators}
        nameField={nameField}
      />
    );
  }
);
LabResiduesGrid.displayName = 'LabResiduesGrid';
