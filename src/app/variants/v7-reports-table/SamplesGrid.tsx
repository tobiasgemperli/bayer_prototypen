import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { ColDef, CustomCellRendererProps, IHeaderParams } from 'ag-grid-community';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Add, ContentCopy, DeleteOutline, InfoOutlined, OpenInNew } from '@mui/icons-material';
import { toast } from 'sonner';
import { EditableDataGrid, EditableDataGridHandle, GridRow } from '../../design-system/grid/EditableDataGrid';
import {
  DropdownCellRenderer, DropdownEditor, RowActionButton, dateColumn, lockedColumn, selectColumn,
} from '../../design-system/grid/grid-shared';
import { Validators } from '../../design-system/grid/validation';
import {
  COMMODITY_OPTIONS, LabSampleData, createLabSample, deleteLabSample, updateLabSample,
} from '../../data/lab-results-data';
import { isSampleDraft, nameCellWithDraft } from './draft-state';

// ── Custom cells ──────────────────────────────────────────────────────────────

function SampleSheetHeader({ displayName }: IHeaderParams) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5 }}>
        {displayName}
      </Typography>
      <Tooltip arrow placement="top" enterDelay={150} title="Send this sheet with the sample to the laboratory. It includes the sample details and the ResiYou ID for later.">
        <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
      </Tooltip>
    </Box>
  );
}

function SampleLabelCell() {
  return (
    <RowActionButton
      startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
      onClick={(e) => {
        e.stopPropagation();
        window.open('about:blank', '_blank', 'noopener,noreferrer');
      }}
    >
      Open PDF
    </RowActionButton>
  );
}

/* Pattern 3 — common actions (Duplicate, Delete) as icon buttons, the
   special action (+ Add lab report) as a soft secondary CTA. */
function SampleActionsCell({ data, context }: CustomCellRendererProps) {
  const { onDuplicate, onDelete, onAddReport } = (context ?? {}) as {
    onDuplicate: (row: LabSampleData) => void;
    onDelete: (row: LabSampleData) => void;
    onAddReport: (row: LabSampleData) => void;
  };
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: '100%', justifyContent: 'flex-end' }}>
      <Tooltip arrow placement="top" enterDelay={150} title="Duplicate">
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDuplicate(data); }}>
          <ContentCopy fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip arrow placement="top" enterDelay={150} title="Delete">
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(data); }}>
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Tooltip>
      <RowActionButton
        startIcon={<Add sx={{ fontSize: 16 }} />}
        onClick={(e) => { e.stopPropagation(); onAddReport(data); }}
        sx={{ ml: 0.5 }}
      >
        Add lab report
      </RowActionButton>
    </Stack>
  );
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface SamplesGridHandle {
  addRow: (plotId: string) => void;
  setFilter: (text: string) => void;
  deleteRows: (ids: string[]) => void;
  /** Flush deferred field edits to the store. */
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

export interface SamplesGridProps {
  samples: LabSampleData[];
  onSelectionChange?: (ids: string[]) => void;
  onDirtyStateChange?: (dirty: boolean) => void;
  /** Invoked by the row's "+ Add lab report" CTA. Owner provisions the draft
   *  report and switches to the Lab reports tab. */
  onAddReport?: (sample: LabSampleData) => void;
}

export const SamplesGrid = forwardRef<SamplesGridHandle, SamplesGridProps>(
  ({ samples, onSelectionChange, onDirtyStateChange, onAddReport }, ref) => {
    const coreRef = useRef<EditableDataGridHandle>(null);
    const pendingRef = useRef<Map<string, Partial<LabSampleData>>>(new Map());

    useImperativeHandle(ref, () => ({
      addRow: (plotId: string) => {
        const s = createLabSample(plotId);
        coreRef.current?.addRow({ ...s } as GridRow, 'sampleName');
      },
      setFilter: (text) => coreRef.current?.setFilter(text),
      deleteRows: (ids) => {
        ids.forEach(id => { deleteLabSample(id); coreRef.current?.deleteRow(id); });
      },
      save: () => {
        for (const [id, patch] of pendingRef.current) updateLabSample(id, patch);
        pendingRef.current.clear();
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
      onDuplicate: (data: LabSampleData) => {
        const dup = createLabSample(data.plotId);
        updateLabSample(dup.id, {
          sampleName: data.sampleName,
          dateOfSample: data.dateOfSample,
          commodity: data.commodity,
          comments: data.comments,
        });
        coreRef.current?.addRow({ ...dup, sampleName: data.sampleName, dateOfSample: data.dateOfSample, commodity: data.commodity } as GridRow, 'sampleName');
      },
      onDelete: (data: LabSampleData) => {
        deleteLabSample(data.id);
        coreRef.current?.deleteRow(data.id);
        toast.success('Sample deleted');
      },
      onAddReport: (data: LabSampleData) => {
        onAddReport?.(data);
      },
    }), [onAddReport]);

    const colDefs: ColDef[] = useMemo(() => [
      selectColumn as ColDef,
      { field: 'sampleName', headerName: 'Sample name', flex: 1.4, editable: true,
        cellRenderer: nameCellWithDraft(isSampleDraft) },
      lockedColumn('sampleCode', 'Sample code',
        'Generated automatically when the sample is created. Cannot be edited. It helps you identify the sample across reports and systems.',
        { flex: 1 }),
      dateColumn('dateOfSample', 'Sample date', { flex: 1 }),
      {
        field: 'commodity', headerName: 'Commodity', flex: 1, editable: true,
        cellRenderer: DropdownCellRenderer,
        cellEditor: DropdownEditor,
        cellEditorParams: { values: COMMODITY_OPTIONS, searchPlaceholder: 'Search commodity…' },
      },
      {
        colId: 'sampleLabel', headerName: 'Sample sheet', width: 160, minWidth: 160, editable: false, sortable: false, filter: false,
        suppressNavigable: true, suppressKeyboardEvent: () => true,
        headerComponent: SampleSheetHeader,
        cellRenderer: SampleLabelCell,
        cellStyle: { display: 'flex', alignItems: 'center' },
      },
      {
        headerName: '', colId: 'resi-actions', width: 260, minWidth: 260,
        editable: false, sortable: false, filter: false, resizable: false,
        suppressNavigable: true, suppressKeyboardEvent: () => true,
        cellRenderer: SampleActionsCell,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' },
      },
    ], []);

    const handleCellChange = (id: string, field: string, value: unknown) => {
      const patch = pendingRef.current.get(id) ?? {};
      (patch as Record<string, unknown>)[field] = value;
      pendingRef.current.set(id, patch);
    };

    const validators: Validators<LabSampleData> = useMemo(() => ({
      sampleName: {
        required: (v) => String(v ?? '').trim() ? null : 'Sample name is required',
      },
      dateOfSample: {
        format: (v) => (v == null || (v instanceof Date && !isNaN(v.getTime()))) ? null : 'Invalid date',
        required: (v) => v ? null : 'Sample date is required',
      },
      commodity: {
        required: (v) => v ? null : 'Commodity is required',
      },
    }), []);

    return (
      <EditableDataGrid
        ref={coreRef}
        initialData={samples as any}
        columnDefs={colDefs}
        dateField="dateOfSample"
        context={context}
        onSelectionChange={onSelectionChange}
        onDirtyStateChange={onDirtyStateChange}
        onCellChange={handleCellChange}
        validators={validators as Validators}
        nameField="sampleName"
      />
    );
  }
);
SamplesGrid.displayName = 'SamplesGrid';
