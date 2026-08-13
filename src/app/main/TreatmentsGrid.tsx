import React, { forwardRef, useCallback, useMemo, useRef, useImperativeHandle } from 'react';
import { ColDef, CustomCellRendererProps } from 'ag-grid-community';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { ContentCopy, DeleteOutline, MoveDown } from '@mui/icons-material';
import { TreatmentData, isTreatmentDraft } from '../data/plots-data';
import { EditableDataGrid, EditableDataGridHandle } from '../design-system/grid/EditableDataGrid';
import { DropdownEditor, DropdownCellRenderer, RowActionButton, selectColumn, dateColumn } from '../design-system/grid/grid-shared';
import { Validators } from '../design-system/grid/validation';
import { nameCellWithDraft } from '../design-system/grid/draft-state';

// ── Domain options ─────────────────────────────────────────────────────────────

const METHOD_OPTIONS = ['Foliar spray', 'Broadcast', 'Soil drench', 'Seed treatment', 'Drip irrigation'];
export const PRODUCT_OPTIONS = ['DECIS FLUX®', 'Roundup', 'Bumper 25 EC', 'Confidor', 'Karate Zeon', 'Copper oxychloride'];
const DOSE_UNIT_OPTIONS = ['L/ha', 'kg/ha', 'ml/ha', 'g/ha'];
const VOLUME_UNIT_OPTIONS = ['L/ha', 'ml/ha', 'gal/ac'];

// ── Public interface (unchanged — PlotDetailPage depends on this) ──────────────

export interface TreatmentsGridHandle {
  addRow: (plotId: string) => void;
  deleteRow: (id: string) => void;
  duplicateRow: (id: string) => void;
  save: () => void;
  setFilter: (text: string) => void;
  getSelectedRows: () => TreatmentData[];
  getRow: (id: string) => TreatmentData | undefined;
  getAllRows: () => TreatmentData[];
  getDirtyIds: () => string[];
  getDirtyRows: () => TreatmentData[];
  triggerValidation: (mode?: 'full' | 'name-only') => boolean;
  clearValidation: () => void;
  /** AC-2.8: mark an existing row id as dirty (e.g. provisioned by parent
   *  empty-state CTA while the grid was unmounted). */
  markPending: (id: string) => void;
}

export interface TreatmentsGridProps {
  initialData: TreatmentData[];
  onDirtyStateChange: (isDirty: boolean) => void;
  onSelectionChange: (ids: string[]) => void;
  onRowCountChange?: (count: number) => void;
  onAssign?: (id: string) => void;
  /** Extra column defs prepended after the select column (before the data cols). */
  prependColumns?: ColDef<TreatmentData>[];
  /** Extra column defs appended after the data cols (before the row action col).
   *  Used by spray-plans-v5 for the trailing Status column. */
  appendColumns?: ColDef<TreatmentData>[];
  /** Merged over the default Product colDef — lets a variant swap e.g.
   *  cellEditorParams (to filter options by another field) without forking
   *  the whole grid. */
  productColumn?: Partial<ColDef<TreatmentData>>;
  /** Merged over the default Application-date colDef — same purpose as
   *  `productColumn`, for the date column. */
  dateColumnOverride?: Partial<ColDef<TreatmentData>>;
}

function newTreatment(plotId: string): TreatmentData {
  // AC-8.2: a brand-new row is NOT a draft — it has never been saved yet.
  // The 4 px red row marker already communicates "this is new/unsaved";
  // `isDraft` only flips to true when the user explicitly commits an
  // incomplete row via "Save as draft".
  return {
    id: `new-${Date.now()}`,
    plotId,
    date: new Date(),
    method: METHOD_OPTIONS[0],
    product: '',
    productDoseValue: '',
    productDoseUnit: DOSE_UNIT_OPTIONS[0],
    waterVolumeValue: '',
    waterVolumeUnit: VOLUME_UNIT_OPTIONS[0],
    type: 'Real',
  } as TreatmentData;
}


// ── Grid — thin wrapper over the shared EditableDataGrid ───────────────────────

export const TreatmentsGrid = forwardRef<TreatmentsGridHandle, TreatmentsGridProps>(
  ({ initialData, onDirtyStateChange, onSelectionChange, onRowCountChange, onAssign, prependColumns, appendColumns, productColumn, dateColumnOverride }, ref) => {
    const coreRef = useRef<EditableDataGridHandle>(null);

    const duplicateRow = useCallback((id: string) => {
      const row = coreRef.current?.getRow(id);
      if (!row) return;
      // AC-8.2 + AC-12.5: a duplicate is a brand-new row → not a draft until
      // the user explicitly saves it as one. Strip any inherited `isDraft`
      // from the source so the chip does not carry over.
      coreRef.current?.addRow({ ...(row as TreatmentData), id: `dup-${Date.now()}`, isDraft: false }, 'product');
    }, []);

    useImperativeHandle(ref, () => ({
      addRow: (plotId: string) => coreRef.current?.addRow(newTreatment(plotId), 'product'),
      duplicateRow,
      deleteRow: (id: string) => coreRef.current?.deleteRow(id),
      save: () => {
        // isDraft mutations belong to the parent's handler scoped to dirty rows
        // (AC-9.5). Save here just commits via the core handle.
        coreRef.current?.save();
      },
      setFilter: (text: string) => coreRef.current?.setFilter(text),
      getSelectedRows: () => (coreRef.current?.getSelectedRows() as TreatmentData[]) ?? [],
      getRow: (id: string) => coreRef.current?.getRow(id) as TreatmentData | undefined,
      getAllRows: () => (coreRef.current?.getAllRows() as TreatmentData[]) ?? [],
      getDirtyIds: () => coreRef.current?.getDirtyIds() ?? [],
      getDirtyRows: () => (coreRef.current?.getDirtyRows() as TreatmentData[]) ?? [],
      triggerValidation: (mode) => coreRef.current?.triggerValidation(mode) ?? false,
      clearValidation: () => coreRef.current?.clearValidation(),
      markPending: (id: string) => coreRef.current?.markPending(id),
    }));

    const context = useMemo(() => ({
      onDuplicate: (data: TreatmentData) => duplicateRow(data.id),
      onDelete: (data: TreatmentData) => coreRef.current?.deleteRow(data.id),
      onAssign: onAssign ? (data: TreatmentData) => onAssign(data.id) : undefined,
    }), [duplicateRow, onAssign]);

    /* Pattern 2/3 — Duplicate + Delete icons; "Copy to plots" appears as a soft
       secondary CTA when the host wires up the onAssign callback. */
    const TreatmentActionsCell = ({ data, context }: CustomCellRendererProps) => {
      const { onDuplicate, onDelete, onAssign } = (context ?? {}) as {
        onDuplicate: (row: TreatmentData) => void;
        onDelete: (row: TreatmentData) => void;
        onAssign?: (row: TreatmentData) => void;
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
          {onAssign && (
            <RowActionButton
              startIcon={<MoveDown sx={{ fontSize: 16 }} />}
              onClick={(e) => { e.stopPropagation(); onAssign(data); }}
              sx={{ ml: 0.5 }}
            >
              Copy to plots
            </RowActionButton>
          )}
        </Stack>
      );
    };

    const colDefs: ColDef<TreatmentData>[] = useMemo(() => [
      selectColumn as ColDef<TreatmentData>,
      ...(prependColumns ?? []),
      dateColumn('date', 'Application date', {
        flex: 1.3,
        ...dateColumnOverride,
      }),
      { field: 'product', headerName: 'Product', flex: 1.7, editable: true, cellRenderer: nameCellWithDraft(isTreatmentDraft), cellEditor: DropdownEditor, cellEditorParams: { values: PRODUCT_OPTIONS, searchPlaceholder: 'Search product…' }, ...productColumn },
      { field: 'method', headerName: 'Method', flex: 1.5, editable: true, cellRenderer: DropdownCellRenderer, cellEditor: DropdownEditor, cellEditorParams: { values: METHOD_OPTIONS, searchPlaceholder: 'Search method…' } },
      { field: 'productDoseValue', headerName: 'Product dose', flex: 0.8, editable: true, type: 'numericColumn', cellDataType: false, cellEditor: 'agNumberCellEditor' },
      { field: 'productDoseUnit', headerName: 'Dose unit', flex: 0.8, editable: true, cellRenderer: DropdownCellRenderer, cellEditor: DropdownEditor, cellEditorParams: { values: DOSE_UNIT_OPTIONS, searchPlaceholder: 'Search unit…' } },
      { field: 'waterVolumeValue', headerName: 'Water volume', flex: 0.8, editable: true, type: 'numericColumn', cellDataType: false, cellEditor: 'agNumberCellEditor' },
      { field: 'waterVolumeUnit', headerName: 'Water unit', flex: 0.8, editable: true, cellRenderer: DropdownCellRenderer, cellEditor: DropdownEditor, cellEditorParams: { values: VOLUME_UNIT_OPTIONS, searchPlaceholder: 'Search unit…' } },
      ...(appendColumns ?? []),
      {
        headerName: '', colId: 'resi-actions',
        width: onAssign ? 240 : 108,
        minWidth: onAssign ? 240 : 108,
        editable: false, sortable: false, filter: false, resizable: false,
        suppressNavigable: true, suppressKeyboardEvent: () => true,
        cellRenderer: TreatmentActionsCell,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' },
      } as ColDef<TreatmentData>,
    ], [prependColumns, appendColumns, onAssign, productColumn, dateColumnOverride]);

    /** Two-tier validators per field.
     *  • `format` — runs live as the user types.
     *  • `required` — runs on Save changes. (`product` is the entity's
     *    nameField, so it's also the only one that fires on Save as draft.) */
    const isPositiveNum = (v: unknown) => {
      if (v == null || v === '') return true;
      const n = Number(v);
      return !isNaN(n) && n >= 0;
    };
    const validators: Validators<TreatmentData> = useMemo(() => ({
      date: {
        format: (v) => (v == null || (v instanceof Date && !isNaN(v.getTime()))) ? null : 'Invalid date',
        required: (v) => (v instanceof Date && !isNaN(v.getTime())) ? null : 'Date is required',
      },
      product: {
        required: (v) => (typeof v === 'string' && v.trim()) ? null : 'Product is required',
      },
      method: {
        required: (v) => (typeof v === 'string' && v.trim()) ? null : 'Method is required',
      },
      productDoseValue: {
        format: (v) => isPositiveNum(v) ? null : 'Dose must be a positive number',
        required: (v) => (v != null && String(v).trim() !== '') ? null : 'Dose is required',
      },
      waterVolumeValue: {
        format: (v) => isPositiveNum(v) ? null : 'Volume must be a positive number',
      },
    }), []);

    return (
      <EditableDataGrid
        ref={coreRef}
        initialData={initialData}
        columnDefs={colDefs as ColDef[]}
        validators={validators as Validators}
        nameField="product"
        dateField="date"
        context={context}
        onDirtyStateChange={onDirtyStateChange}
        onSelectionChange={onSelectionChange}
        onRowCountChange={onRowCountChange}
      />
    );
  }
);
TreatmentsGrid.displayName = 'TreatmentsGrid';
