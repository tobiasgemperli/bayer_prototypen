import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { ColDef, CustomCellRendererProps, IHeaderParams } from 'ag-grid-community';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { ContentCopy, DeleteOutline, InfoOutlined } from '@mui/icons-material';
import { toast } from 'sonner';
import { EditableDataGrid, EditableDataGridHandle, GridRow } from '../../design-system/grid/EditableDataGrid';
import {
  DropdownCellRenderer, DropdownEditor, selectColumn,
} from '../../design-system/grid/grid-shared';
import { Validators } from '../../design-system/grid/validation';
import {
  ANALYTE_OPTIONS, RESIDUE_LEVEL_OPTIONS,
  LabReport, LabResidue, LabSampleData, newResidueId, updateLabSample,
} from '../../data/lab-results-data';
import { AnalyteCell, isResidueDraft, SourceCell } from './draft-state';
import { DraftChip, ManagedTag } from '../../design-system/grid/draft-state';
import { Close as CloseIcon, KeyboardArrowDown } from '@mui/icons-material';

// A flat residue row carries its parent sample id + a synthetic "Lab report"
// label that pairs the lab name and report ID (the format the Lab report
// dropdown shows). Both fields exist on the row only to feed AG-Grid — the
// real source of truth is sample.residues[].labReportId.
interface ResidueRow extends LabResidue {
  /** Owning sample id — used to route updates back to the right sample. */
  _sampleId: string;
  /** Formatted "Laboratory — Lab report ID" label for the Lab report column. */
  reportLabel: string;
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface ResultsGridHandle {
  addRow: () => void;
  setFilter: (text: string) => void;
  deleteRows: (ids: string[]) => void;
  /** Flush deferred field edits to the store. Report re-assignment persists immediately. */
  save: () => void;
  getDirtyIds: () => string[];
  getDirtyRows: () => GridRow[];
  /** AC-10.1: uniform shape across all four grid wrappers. */
  getSelectedRows: () => GridRow[];
  getRow: (id: string) => GridRow | undefined;
  getAllRows: () => GridRow[];
  triggerValidation: (mode?: 'full' | 'name-only') => boolean;
  clearValidation: () => void;
  /** AC-2.8: mark an existing row id as dirty (e.g. provisioned by parent
   *  empty-state CTA while the grid was unmounted). */
  markPending: (id: string) => void;
}

export interface ResultsGridProps {
  rows: ResidueRow[];
  samples: LabSampleData[];
  /** Only complete (non-draft) reports are eligible targets — drafts can't host results. */
  completeReports: { sample: LabSampleData; report: LabReport }[];
  onSelectionChange?: (ids: string[]) => void;
  onDirtyStateChange?: (dirty: boolean) => void;
}

function newManualResidue(labReportId: string): LabResidue {
  // AC-8.2: brand-new row is not a draft until explicitly saved as one.
  return {
    id: newResidueId(),
    analyte: '',
    residueLevel: null,
    residueValue: '',
    methodLoq: '',
    methodLod: '',
    fromTreatment: false,
    labReportId,
  };
}

function reportLabel(_sample: LabSampleData, report: LabReport): string {
  // Lab report identifier in the Results-tab Sample-picker dropdown reads
  // "Laboratory · Lab report ID". The sample name is omitted on purpose —
  // the sample is implied by the row's parent context and including it here
  // makes the label crowd the cell. Two reports with the same lab + ID would
  // collide, but that combo is unique by definition (the lab assigns it).
  const lab = report.laboratory?.trim() || 'No lab';
  const id = report.labReportId?.trim() || 'No ID';
  return `${lab} · ${id}`;
}

// ── Update helpers (operate on the residue's owning sample) ───────────────────

function addResidueToSample(samples: LabSampleData[], sampleId: string, residue: LabResidue) {
  const s = samples.find(x => x.id === sampleId);
  if (!s) return;
  updateLabSample(sampleId, { residues: [...s.residues, residue] });
}

function updateResidueOnSample(
  samples: LabSampleData[], sampleId: string, residueId: string, patch: Partial<LabResidue>
) {
  const s = samples.find(x => x.id === sampleId);
  if (!s) return;
  updateLabSample(sampleId, {
    residues: s.residues.map(r => r.id === residueId ? { ...r, ...patch } : r),
  });
}

function deleteResidueFromSample(samples: LabSampleData[], sampleId: string, residueId: string) {
  const s = samples.find(x => x.id === sampleId);
  if (!s) return;
  updateLabSample(sampleId, { residues: s.residues.filter(r => r.id !== residueId) });
}

function moveResidueBetweenSamples(
  samples: LabSampleData[],
  fromSampleId: string,
  toSampleId: string,
  residue: LabResidue,
) {
  deleteResidueFromSample(samples, fromSampleId, residue.id);
  addResidueToSample(samples, toSampleId, residue);
}

export const ResultsGrid = forwardRef<ResultsGridHandle, ResultsGridProps>(
  ({ rows, samples, completeReports, onSelectionChange, onDirtyStateChange }, ref) => {
    const coreRef = useRef<EditableDataGridHandle>(null);
    const pendingRef = useRef<Map<string, Partial<LabResidue>>>(new Map());

    // Lab report dropdown — formatted label maps back to {sampleId, reportId}.
    const reportByLabel = useMemo(() => {
      const m = new Map<string, { sampleId: string; reportId: string }>();
      completeReports.forEach(({ sample, report }) => {
        m.set(reportLabel(sample, report), { sampleId: sample.id, reportId: report.id });
      });
      return m;
    }, [completeReports]);
    const reportOptions = useMemo(() => Array.from(reportByLabel.keys()), [reportByLabel]);

    useImperativeHandle(ref, () => ({
      addRow: () => {
        if (completeReports.length === 0) {
          toast.error('Complete a lab report first');
          return;
        }
        const target = completeReports[0];
        const r = newManualResidue(target.report.id);
        addResidueToSample(samples, target.sample.id, r);
        const row: ResidueRow = {
          ...r,
          _sampleId: target.sample.id,
          reportLabel: reportLabel(target.sample, target.report),
        };
        coreRef.current?.addRow(row as unknown as GridRow, 'analyte');
      },
      setFilter: (text) => coreRef.current?.setFilter(text),
      deleteRows: (ids) => {
        ids.forEach(id => {
          const row = coreRef.current?.getRow(id) as ResidueRow | undefined;
          if (row) deleteResidueFromSample(samples, row._sampleId, id);
          coreRef.current?.deleteRow(id);
        });
      },
      save: () => {
        for (const [id, patch] of pendingRef.current) {
          const row = coreRef.current?.getRow(id) as ResidueRow | undefined;
          if (row) updateResidueOnSample(samples, row._sampleId, id, patch);
        }
        pendingRef.current.clear();
        // AC‑9.5: Save handlers act on dirty rows only — never flip `isDraft`
        // on untouched rows. The parent's handleCreateResult /
        // handleSaveResultDraft promotes `isDraft` scoped to the dirty set.
        coreRef.current?.save();
      },
      getDirtyIds: () => coreRef.current?.getDirtyIds() ?? [],
      getDirtyRows: () => coreRef.current?.getDirtyRows() ?? [],
      getSelectedRows: () => coreRef.current?.getSelectedRows() ?? [],
      getRow: (id: string) => coreRef.current?.getRow(id),
      getAllRows: () => coreRef.current?.getAllRows() ?? [],
      triggerValidation: (mode) => coreRef.current?.triggerValidation(mode) ?? false,
      clearValidation: () => coreRef.current?.clearValidation(),
      markPending: (id: string) => coreRef.current?.markPending(id),
    }));

    const context = useMemo(() => ({
      onDuplicate: (data: ResidueRow) => {
        // AC-8.2 + AC-12.5: a duplicate is a brand-new row → not a draft
        // until explicitly saved as one. Strip any inherited `isDraft`
        // from the source so the chip does not carry over.
        const dup: LabResidue = { ...data, id: newResidueId(), fromTreatment: false, isDraft: false };
        addResidueToSample(samples, data._sampleId, dup);
        const row: ResidueRow = { ...dup, _sampleId: data._sampleId, reportLabel: data.reportLabel };
        coreRef.current?.addRow(row as unknown as GridRow, 'analyte');
      },
      onDelete: (data: ResidueRow) => {
        deleteResidueFromSample(samples, data._sampleId, data.id);
        coreRef.current?.deleteRow(data.id);
        toast.success('Result deleted');
      },
    }), [samples]);

    /* Pattern 2 — common actions as inline icon buttons; Duplicate hidden on
       rows that came from a treatment (residue is not user-owned). */
    const ResultActionsCell = ({ data, context }: CustomCellRendererProps) => {
      const { onDuplicate, onDelete } = (context ?? {}) as {
        onDuplicate: (row: ResidueRow) => void;
        onDelete: (row: ResidueRow) => void;
      };
      return (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: '100%', justifyContent: 'flex-end' }}>
          {!data.fromTreatment && (
            <Tooltip arrow placement="top" enterDelay={150} title="Duplicate">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDuplicate(data); }}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip arrow placement="top" enterDelay={150} title="Delete">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(data); }}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    };

    /** Empty-state em-dash for any plain text cell. Same grey + same glyph
     *  as ReportsGrid's TextOrDashCell so every "empty" cell in the app
     *  reads identically. */
    const DashCell = ({ value }: CustomCellRendererProps) => (
      value !== '' && value != null
        ? <Box component="span" sx={{ fontSize: '0.875rem' }}>{value}</Box>
        : <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.disabled' }}>—</Box>
    );

    /**
     * Lab report cell — `DropdownCellRenderer` chrome (value + clear +
     * chevron) plus the row's status chip on the right. The Lab report
     * column is the row's primary identifier in this grid (same role the
     * Sample column plays in ReportsGrid), so this is where the chip lives.
     * Managed > Draft precedence: if the residue is mirrored in from an
     * external system, that wins; otherwise an incomplete row wears Draft.
     */
    const LabReportCell = (params: CustomCellRendererProps) => {
      const { value, api, node, column, data } = params;
      const residue = data as LabResidue;
      const draft = isResidueDraft(residue);
      const managed = residue?.managedBy;
      const toggleEditor = (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        if (node.rowIndex == null) return;
        const isEditing = api.getEditingCells().some(
          (c) => c.rowIndex === node.rowIndex && c.column.getColId() === column.getColId()
        );
        if (isEditing) api.stopEditing();
        else api.startEditingCell({ rowIndex: node.rowIndex, colKey: column.getColId() });
      };
      const clearValue = (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        node.setDataValue(column.getColId(), '');
      };
      const iconBtnSx = { width: 30, height: 30, padding: '5px', flexShrink: 0, color: 'action.active' } as const;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%', minWidth: 0 }}>
          <Box sx={{
            flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontSize: '0.875rem',
            color: value ? 'text.primary' : 'text.disabled',
          }}>
            {value || '—'}
          </Box>
          {managed
            ? <ManagedTag system={managed} />
            : draft && <DraftChip />}
          {value && (
            <IconButton size="small" tabIndex={-1} onMouseDown={clearValue} sx={iconBtnSx} aria-label="Clear">
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}
          <IconButton size="small" tabIndex={-1} onMouseDown={toggleEditor} sx={iconBtnSx}>
            <KeyboardArrowDown sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      );
    };

    /** Source column header — "Source" + small info icon explaining the
     *  From treatment / Manually added distinction. Pulled in from
     *  `lab-shared/LabResiduesGrid.tsx`'s pattern so v8 / v9 / v10 share the
     *  same affordance. */
    const SourceHeader = ({ displayName }: IHeaderParams) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5 }}>
          {displayName}
        </Typography>
        <Tooltip arrow placement="top" enterDelay={150} title="From treatment: matches a reported treatment, expected. Manually added: no matching treatment, worth a second look.">
          <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>
    );

    const colDefs: ColDef[] = useMemo(() => [
      selectColumn as ColDef,
      {
        field: 'reportLabel', headerName: 'Lab report', flex: 1.6, editable: true,
        cellRenderer: LabReportCell, cellEditor: DropdownEditor,
        cellEditorParams: { values: reportOptions, searchPlaceholder: 'Search lab report…' },
      },
      {
        field: 'analyte', headerName: 'Analyte', flex: 1.4,
        editable: (p) => !p.data.fromTreatment,
        cellRenderer: AnalyteCell, cellEditor: DropdownEditor,
        cellEditorParams: { values: ANALYTE_OPTIONS, searchPlaceholder: 'Search analyte…' },
      },
      {
        field: 'source', headerName: 'Source', flex: 1,
        editable: false, sortable: false, filter: false,
        suppressNavigable: true, suppressKeyboardEvent: () => true,
        headerComponent: SourceHeader,
        cellRenderer: SourceCell,
        cellStyle: { display: 'flex', alignItems: 'center' },
      },
      {
        field: 'residueLevel', headerName: 'Residue level', flex: 1.1, editable: true,
        cellRenderer: DropdownCellRenderer,
        cellEditor: DropdownEditor,
        cellEditorParams: { values: RESIDUE_LEVEL_OPTIONS, searchPlaceholder: 'Search residue level…' },
      },
      {
        // Residue value only carries a number when residueLevel === 'Residue'.
        // Every other state (Trace / Below LOQ / Not analyzed / unset) reads
        // as an empty cell — surfaced with the SSOT grey em-dash.
        field: 'residueValue', headerName: 'Residue (mg/kg)', flex: 1,
        editable: (p) => p.data.residueLevel === 'Residue',
        cellRenderer: (p: CustomCellRendererProps) =>
          (p.data?.residueLevel === 'Residue' && p.value)
            ? <Box component="span" sx={{ fontSize: '0.875rem' }}>{p.value}</Box>
            : <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.disabled' }}>—</Box>,
      },
      {
        field: 'methodLoq', headerName: 'Method LOQ (mg/kg)', flex: 1, editable: true,
        cellRenderer: DashCell,
      },
      {
        field: 'methodLod', headerName: 'Method LOD (mg/kg)', flex: 1, editable: true,
        cellRenderer: DashCell,
      },
      {
        headerName: '', colId: 'resi-actions', width: 108, minWidth: 108,
        editable: false, sortable: false, filter: false, resizable: false,
        suppressNavigable: true, suppressKeyboardEvent: () => true,
        cellRenderer: ResultActionsCell,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' },
      },
    ], [reportOptions]);

    const handleCellChange = (id: string, field: string, value: unknown) => {
      const row = coreRef.current?.getRow(id) as ResidueRow | undefined;
      if (!row) return;
      // Re-assigning the lab report moves the residue between samples — persist
      // immediately (matches add/delete semantics). Other edits buffer until Save.
      if (field === 'reportLabel') {
        const target = reportByLabel.get(String(value));
        if (!target) return;
        if (target.sampleId === row._sampleId) {
          // Same sample, different report: just update the labReportId field.
          updateResidueOnSample(samples, row._sampleId, id, { labReportId: target.reportId });
          // Reflect on the row so view + store agree.
          row.labReportId = target.reportId;
          row.reportLabel = String(value);
          return;
        }
        // AC‑9.4: Different sample — flush any buffered pending edits for this
        // row to the *current* owner first, so they aren't lost when we move.
        const pending = pendingRef.current.get(id);
        if (pending) {
          updateResidueOnSample(samples, row._sampleId, id, pending);
          pendingRef.current.delete(id);
        }
        // Move the residue between samples in the store.
        const { _sampleId: _i, reportLabel: _l, ...residue } = row;
        const movedResidue: LabResidue = {
          ...(residue as LabResidue), ...(pending ?? {}), labReportId: target.reportId,
        };
        moveResidueBetweenSamples(samples, row._sampleId, target.sampleId, movedResidue);
        // Mirror the new ownership onto the grid row so AG‑Grid's view matches
        // the store (hidden _sampleId + the formatted reportLabel).
        Object.assign(row, movedResidue, {
          _sampleId: target.sampleId,
          reportLabel: String(value),
        });
        return;
      }
      const patch = pendingRef.current.get(id) ?? {};
      (patch as Record<string, unknown>)[field] = value;
      pendingRef.current.set(id, patch);
    };

    const isPositiveNum = (v: unknown) => {
      if (v == null || v === '') return true;
      const n = Number(v);
      return !isNaN(n) && n >= 0;
    };
    const validators: Validators<ResidueRow> = useMemo(() => ({
      analyte: {
        required: (v, row) => row.fromTreatment ? null
          : (String(v ?? '').trim() ? null : 'Analyte is required'),
      },
      residueLevel: {
        required: (v, row) => row.fromTreatment ? null
          : (v ? null : 'Residue level is required'),
      },
      residueValue: {
        format: (v) => isPositiveNum(v) ? null : 'Value must be a positive number',
        required: (v, row) => row.fromTreatment ? null
          : (row.residueLevel === 'Residue' && !String(v ?? '').trim()
            ? 'Residue value is required when level is Residue'
            : null),
        // AC-2.6: re-evaluate this validator live whenever residueLevel
        // changes — stale "required when level is Residue" errors clear
        // immediately if the user flips the level away from 'Residue'.
        dependsOn: ['residueLevel'],
      },
      methodLoq: {
        format: (v) => isPositiveNum(v) ? null : 'LOQ must be a positive number',
        required: (v, row) => row.fromTreatment ? null
          : (String(v ?? '').trim() ? null : 'Method LOQ is required'),
      },
      methodLod: {
        format: (v) => isPositiveNum(v) ? null : 'LOD must be a positive number',
      },
    }), []);

    return (
      <EditableDataGrid
        ref={coreRef}
        initialData={rows as unknown as GridRow[]}
        columnDefs={colDefs}
        context={context}
        onSelectionChange={onSelectionChange}
        onDirtyStateChange={onDirtyStateChange}
        onCellChange={handleCellChange}
        validators={validators as Validators}
        nameField="analyte"
      />
    );
  }
);
ResultsGrid.displayName = 'ResultsGrid';

export type { ResidueRow };
export { reportLabel };
