import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  GetRowIdParams,
  CellValueChangedEvent,
  SelectionChangedEvent,
} from 'ag-grid-community';
import { Box, Typography } from '@mui/material';
import { gridTheme, GridColumnHeader, GridStyles } from './grid-shared';
import {
  Validators, ValidationContext, ValidationMode,
  ERROR_ROW_PREFIX, isErrorRowId,
  ERROR_ROW_HEIGHT_BASE, ERROR_ROW_LINE_HEIGHT, ERROR_ROW_V_PAD,
  ERROR_ROW_H_PAD, ERROR_ROW_AVG_CHAR, ERROR_ROW_MAX_LINES,
  ROW_HEIGHT, ROW_MIN_COL_WIDTH,
} from './validation';
import { ErrorRowRenderer } from './ErrorRowRenderer';

/** Any row with a stable string id. */
export interface GridRow {
  id: string;
  [key: string]: any;
}

/** Empty-state overlay — plain, muted text matching the rest of the app's
 *  typography instead of AG-Grid's bold default "No Rows To Show". */
function NoRowsOverlay({ message }: { message: string }) {
  return (
    <Typography sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>
      {message}
    </Typography>
  );
}

export interface EditableDataGridHandle {
  /** Add a row (caller supplies the full row object) and start editing `editColKey`. */
  addRow: (row: GridRow, editColKey?: string) => void;
  deleteRow: (id: string) => void;
  /** Clear the dirty state (call after persisting). Edited values in the grid stay. */
  save: () => void;
  getAllRows: () => GridRow[];
  /** Ids of new + modified rows (Save changes / Save as draft target these only). */
  getDirtyIds: () => string[];
  /** Dirty rows only — the canonical input for any persistence action. */
  getDirtyRows: () => GridRow[];
  setFilter: (text: string) => void;
  getSelectedRows: () => GridRow[];
  getRow: (id: string) => GridRow | undefined;
  /** Run validators on the dirty rows only.
   *    mode='full'       → format + required on every field (Save changes)
   *    mode='name-only'  → format on every field + required on `nameField` (Save as draft)
   *  Returns true when there are no errors. */
  triggerValidation: (mode?: ValidationMode) => boolean;
  /** Drop the validation state so cells go back to neutral (used on Cancel). */
  clearValidation: () => void;
  /** AC-2.8 / AC-9.1: mark an already-existing row id as dirty (used by parent
   *  empty-state CTAs that persist a row while the grid is unmounted — once
   *  the grid mounts, the parent calls this so the row is Modified, not a
   *  phantom unmarked row). Equivalent to `markDirty(id)` internally. */
  markPending: (id: string) => void;
}

export interface EditableDataGridProps {
  initialData: GridRow[];
  columnDefs: ColDef[];
  /** Field whose value is a Date — special-cased for clipboard round-tripping. */
  dateField?: string;
  context?: Record<string, unknown>;
  onDirtyStateChange?: (isDirty: boolean) => void;
  onSelectionChange?: (ids: string[]) => void;
  /** Fired after an inline edit commits — use to persist the change to a store. */
  onCellChange?: (id: string, field: string, value: unknown) => void;
  /** Fired whenever the (unfiltered) row count changes — use to drive an empty state. */
  onRowCountChange?: (count: number) => void;
  /** Per-field validation rules. Each field declares optional `format`
   *  (live, malformed-input only) and `required` (on Save). */
  validators?: Validators;
  /** Field name that's required to Save as draft (every entity's "name").
   *  Empty `nameField` blocks Save as draft; other empty fields are fine. */
  nameField?: string;
  /** Message shown when there are no rows. Defaults to a generic fallback —
   *  pass something specific to the entity (e.g. "No analytes added yet."). */
  noRowsMessage?: string;
  /** Fires once AG-Grid's own internal api is actually ready. Callers that
   *  need to call the imperative handle's addRow() immediately on mount
   *  (e.g. pre-populating a blank row when a dialog opens) should wait for
   *  this instead of guessing a timeout — the grid's DOM/ref exists a tick
   *  before AG-Grid's api does, so addRow() silently no-ops until then. */
  onGridReady?: () => void;
}

/**
 * Generic editable AG Grid. The visual chrome (theme, CSS, header, focus, dirty
 * indicator) and editor components are shared via grid-shared, so every grid in
 * the app — Treatments, lab samples, lab results — looks and behaves identically.
 * Callers supply only columnDefs + row factory.
 */
export const EditableDataGrid = forwardRef<EditableDataGridHandle, EditableDataGridProps>(
  ({ initialData, columnDefs, dateField, context, onDirtyStateChange, onSelectionChange, onCellChange, onRowCountChange, validators, nameField, noRowsMessage, onGridReady }, ref) => {
    const gridRef = useRef<AgGridReact<GridRow>>(null);
    const dirtyIds = useRef<Set<string>>(new Set());
    // Capture initialData once. When rowData changes identity, AG Grid reconciles
    // against the source and reverts in-grid edits — a stable ref prevents that.
    const rowDataRef = useRef<GridRow[]>(initialData.map(r => ({ ...r })));

    // ── Validation state ────────────────────────────────────────────────────
    // Both refs because mutating them shouldn't re-render the whole grid; instead
    // we surgically redraw the affected row when an error changes.
    const errorsRef = useRef<Map<string, Map<string, string>>>(new Map());
    const triggeredRef = useRef(false);

    const setRowError = useCallback((id: string, field: string, message: string | null) => {
      let perRow = errorsRef.current.get(id);
      if (!message) {
        if (!perRow) return;
        perRow.delete(field);
        if (perRow.size === 0) errorsRef.current.delete(id);
      } else {
        if (!perRow) { perRow = new Map(); errorsRef.current.set(id, perRow); }
        perRow.set(field, message);
      }
    }, []);

    const redrawRow = useCallback((id: string) => {
      const api = gridRef.current?.api;
      const node = api?.getRowNode(id);
      if (api && node) api.redrawRows({ rowNodes: [node] });
    }, []);

    const notifyDirty = useCallback(
      () => onDirtyStateChange?.(dirtyIds.current.size > 0),
      [onDirtyStateChange]
    );
    const markDirty = useCallback(
      (id: string) => {
        const wasAlreadyDirty = dirtyIds.current.has(id);
        dirtyIds.current.add(id);
        notifyDirty();
        // Always do a full redraw when a row's dirty status changes — targeted
        // single-row redraw doesn't reliably re-evaluate `rowClassRules`
        // across AG-Grid versions. Cost is negligible at our row counts.
        if (!wasAlreadyDirty) gridRef.current?.api?.redrawRows();
      },
      [notifyDirty]
    );

    const handleDelete = useCallback((id: string) => {
      const api = gridRef.current?.api;
      if (!api) return;
      const node = api.getRowNode(id);
      if (node?.data) api.applyTransaction({ remove: [node.data] });
      const wasDirty = dirtyIds.current.delete(id);
      // Also drop any validation state for the deleted row.
      errorsRef.current.delete(id);
      notifyDirty();
      // AC‑12.1: reconcile synthetic error rows so the deleted row's error
      // row (if any) is removed before we redraw.
      syncErrorRows();
      // If the grid just exited dirty mode (last dirty row deleted) all
      // untouched rows need to lose the fade.
      if (wasDirty) api.redrawRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notifyDirty]);

    useImperativeHandle(ref, () => ({
      deleteRow: handleDelete,
      addRow: (row, editColKey) => {
        const api = gridRef.current?.api;
        if (!api) return;
        api.applyTransaction({ add: [row] });
        markDirty(row.id);
        setTimeout(() => {
          const n = api.getRowNode(row.id);
          if (n?.rowIndex != null) {
            api.ensureIndexVisible(n.rowIndex, 'bottom');
            if (editColKey) api.startEditingCell({ rowIndex: n.rowIndex, colKey: editColKey });
          }
        }, 80);
      },
      save: () => {
        dirtyIds.current.clear();
        // Successful save → any leftover validation chrome is now stale.
        errorsRef.current.clear();
        triggeredRef.current = false;
        syncErrorRows();
        onDirtyStateChange?.(false);
        // refreshCells only re-evaluates cell content; rowClassRules need a
        // redraw to drop .row-pending / .row-untouched on previously-dirty rows.
        gridRef.current?.api?.redrawRows();
      },
      setFilter: (text) => { gridRef.current?.api?.setGridOption('quickFilterText', text); },
      getSelectedRows: () =>
        (gridRef.current?.api?.getSelectedNodes() ?? []).map(n => n.data as GridRow),
      getRow: (id) => gridRef.current?.api?.getRowNode(id)?.data,
      getAllRows: () => {
        const rows: GridRow[] = [];
        gridRef.current?.api?.forEachNode(n => {
          if (n.data && !isErrorRowId(n.data.id)) rows.push(n.data);
        });
        return rows;
      },
      getDirtyIds: () => Array.from(dirtyIds.current),
      getDirtyRows: () => {
        const rows: GridRow[] = [];
        gridRef.current?.api?.forEachNode(n => {
          if (n.data && dirtyIds.current.has(n.data.id)) rows.push(n.data);
        });
        return rows;
      },
      triggerValidation: (mode: ValidationMode = 'full') => {
        const api = gridRef.current?.api;
        // AC‑10.2: fail closed when the api is unavailable — we can't prove
        // there are no errors, so block the save.
        if (!api) return false;
        const fields = validators ? Object.keys(validators) : [];
        if (fields.length === 0) {
          // No validators wired → nothing to check, save proceeds.
          return true;
        }
        errorsRef.current.clear();

        // Collect dirty data rows (skip synthetic error rows + untouched rows).
        const dirtyRows: GridRow[] = [];
        api.forEachNode((node: any) => {
          const row = node.data as GridRow | undefined;
          if (!row || typeof row.id !== 'string') return;
          if (isErrorRowId(row.id)) return;
          if (!dirtyIds.current.has(row.id)) return;
          dirtyRows.push(row);
        });

        for (const row of dirtyRows) {
          for (const [field, rules] of Object.entries(validators)) {
            const v = (row as any)[field];
            // 1) Format always runs (malformed input is malformed regardless of mode).
            const formatMsg = rules.format?.(v, row) ?? null;
            if (formatMsg) { setRowError(row.id, field, formatMsg); continue; }
            // 2) Required runs in full mode for all fields; in name-only mode
            //    only on the nameField.
            const shouldRunRequired = mode === 'full' || (mode === 'name-only' && field === nameField);
            if (shouldRunRequired) {
              const reqMsg = rules.required?.(v, row) ?? null;
              if (reqMsg) setRowError(row.id, field, reqMsg);
            }
          }
        }

        triggeredRef.current = true;
        syncErrorRows();
        api.refreshCells({ force: true });
        return errorsRef.current.size === 0;
      },
      clearValidation: () => {
        if (!triggeredRef.current && errorsRef.current.size === 0) return;
        errorsRef.current.clear();
        triggeredRef.current = false;
        syncErrorRows();
        gridRef.current?.api?.refreshCells({ force: true });
      },
      markPending: (id: string) => markDirty(id),
    }));

    /** Reconcile synthetic error rows with `errorsRef`. Uses applyTransaction
     *  with addIndex so each error row lands immediately below its owner —
     *  no setGridOption, no full-rowData swap (which previously decoupled
     *  AG-Grid's internal model from `rowDataRef`, silently breaking dirty
     *  tracking and full-width-row recognition). */
    const syncErrorRows = useCallback(() => {
      const api = gridRef.current?.api;
      if (!api) return;

      // What error rows do we want, given the current errors map?
      const wanted = new Set<string>();
      errorsRef.current.forEach((_, ownerId) => wanted.add(ERROR_ROW_PREFIX + ownerId));

      // What error rows are currently in the grid?
      const presentDatas = new Map<string, any>();
      api.forEachNode((n: any) => {
        const id = n.data?.id;
        if (typeof id === 'string' && isErrorRowId(id)) presentDatas.set(id, n.data);
      });

      // 1) Remove any orphans first so the index math for adds is correct.
      const toRemove: any[] = [];
      presentDatas.forEach((data, id) => { if (!wanted.has(id)) toRemove.push(data); });
      if (toRemove.length > 0) api.applyTransaction({ remove: toRemove });

      // 2) Add any missing error rows at exactly `ownerIndex + 1`. AG-Grid's
      //    addIndex is global, so re-resolve the owner's index after every
      //    insert (each insert shifts subsequent rows).
      wanted.forEach((errId) => {
        if (presentDatas.has(errId)) return;
        const ownerId = errId.slice(ERROR_ROW_PREFIX.length);
        const ownerNode = api.getRowNode(ownerId);
        const ownerIndex = ownerNode?.rowIndex;
        const errorData = { id: errId, _errorOwnerId: ownerId };
        if (ownerIndex == null) {
          api.applyTransaction({ add: [errorData] });
        } else {
          api.applyTransaction({ add: [errorData], addIndex: ownerIndex + 1 });
        }
      });

      // Re-measure all row heights — the error row's height depends on the
      // wrapped message length, which can change as the user edits cells.
      api.resetRowHeights();
    }, []);

    const handleCellValueChanged = useCallback((e: CellValueChangedEvent<GridRow>) => {
      markDirty(e.data.id);
      const field = e.colDef.field;
      if (field) onCellChange?.(e.data.id, field, e.newValue);

      if (!field || !validators) return;

      /** Re-run one field's validators against the row's CURRENT data.
       *  Returns true when the error presence flipped. */
      const reEvalField = (f: string): boolean => {
        const r = validators[f];
        if (!r) return false;
        const hadBefore = !!errorsRef.current.get(e.data.id)?.get(f);
        const v = (e.data as any)[f];
        let m: string | null = r.format?.(v, e.data) ?? null;
        if (!m && triggeredRef.current && r.required) m = r.required(v, e.data);
        setRowError(e.data.id, f, m);
        return hadBefore !== !!m;
      };

      // 1) Re-evaluate the field that just changed (format + required-if-triggered).
      let presenceFlipped = reEvalField(field);

      // 2) AC-2.6: also re-evaluate any other validator whose `dependsOn`
      //    includes the changed field, so cross-field stale errors clear
      //    live (e.g. residueValue's "required when residueLevel==='Residue'"
      //    clears the instant residueLevel flips off 'Residue').
      for (const [otherField, rules] of Object.entries(validators)) {
        if (otherField === field) continue;
        if (rules.dependsOn?.includes(field)) {
          if (reEvalField(otherField)) presenceFlipped = true;
        }
      }

      // Always sync error rows — message text can change without had/has flipping.
      syncErrorRows();
      if (presenceFlipped) {
        // Re-evaluate cellClassRules so the red tint comes/goes.
        gridRef.current?.api?.refreshCells({ force: true, rowNodes: [e.node!] });
      }
    }, [markDirty, onCellChange, validators, setRowError, syncErrorRows]);

    const handleSelectionChanged = useCallback((e: SelectionChangedEvent) => {
      onSelectionChange?.(e.api.getSelectedNodes().map(n => (n.data as GridRow).id));
    }, [onSelectionChange]);

    const getRowId = useCallback((p: GetRowIdParams<GridRow>) => p.data.id, []);

    // Report total (unfiltered) row count so callers can show an empty state.
    // AC‑12.2: filter synthetic error rows out before counting — they are
    // grid-internal scaffolding, not user-visible data.
    const handleModelUpdated = useCallback(() => {
      const api = gridRef.current?.api;
      if (!api) return;
      let n = 0;
      api.forEachNode((node: any) => {
        const id = node.data?.id;
        if (typeof id === 'string' && isErrorRowId(id)) return;
        n++;
      });
      onRowCountChange?.(n);
    }, [onRowCountChange]);

    // valueSetter writes directly to node.data, bypassing AG Grid's type gate
    // (which silently discards e.g. number values for string-typed fields).
    // cellClassRules add `.cell-errored` to any cell whose row has an active
    // validation error for that field — the styling matches the blue inline
    // editing tint but in brand red.
    const defaultColDef = useMemo<ColDef<GridRow>>(() => ({
      resizable: false,
      // Every data column gets at least ROW_MIN_COL_WIDTH px so error messages
      // have room to breathe. Action / select / sheet columns override with
      // their own explicit `minWidth` and `width`.
      minWidth: ROW_MIN_COL_WIDTH,
      headerComponent: GridColumnHeader,
      valueSetter: (params: any) => {
        const field = params.colDef.field;
        if (!field) return false;
        params.data[field] = params.newValue;
        return true;
      },
      cellClassRules: {
        // Source of truth is errorsRef. Format errors are added live as the
        // user types malformed input; required errors are added on Save click.
        // Either way → the cell goes red.
        'cell-errored': (p: any) => {
          const id = p.data?.id;
          if (!id || isErrorRowId(id)) return false;
          const field = p.colDef?.field;
          return !!field && !!errorsRef.current.get(id)?.has(field);
        },
      },
    }), []);

    const rowClassRules = useMemo(() => ({
      // Highlights new + modified rows with the 4 px brand-red left edge
      // (CSS lives in grid-shared.tsx under .row-pending). Cleared by save().
      'row-pending': (p: any) =>
        !!p.data?.id && !isErrorRowId(p.data.id) && dirtyIds.current.has(p.data.id),
      // Fades untouched rows when ANY row is dirty so focus lands on the rows
      // this commit will actually touch. Error rows and dirty rows stay opaque.
      'row-untouched': (p: any) =>
        !!p.data?.id &&
        !isErrorRowId(p.data.id) &&
        dirtyIds.current.size > 0 &&
        !dirtyIds.current.has(p.data.id),
      // Rows whose source of truth lives in an external system render with
      // muted text (rgba 45%) so they read as read-only. The ManagedTag
      // itself keeps its full bg/fg — it's the indicator, not part of the
      // muting. CSS lives in grid-shared.tsx under .row-managed. Same
      // pattern as table-actions-v1's tags demo (MutedTd / MutedNameTd).
      'row-managed': (p: any) =>
        !!p.data?.id && !isErrorRowId(p.data.id) && !!p.data?.managedBy,
    }), []);

    /** Validation context exposed to the synthetic error row via AG-Grid's `context`. */
    const mergedContext = useMemo(() => ({
      ...(context ?? {}),
      validation: {
        errors: errorsRef.current,
        get triggered() { return triggeredRef.current; },
      } as ValidationContext,
    }), [context]);

    /** Height the synthetic error row needs to fit its longest wrapped message
     *  in any column at the current column widths. Hugs content vertically.
     *  All magic numbers come from validation.tsx (AC‑11.3). */
    const computeErrorRowHeight = (ownerId: string): number => {
      const api = gridRef.current?.api;
      const errors = errorsRef.current.get(ownerId);
      if (!api || !errors) return ERROR_ROW_HEIGHT_BASE;
      let maxLines = 1;
      const cols: any[] = api.getAllDisplayedColumns?.() ?? [];
      for (const col of cols) {
        const field = col.getColDef().field ?? col.getColId();
        const msg = errors.get(field);
        if (!msg) continue;
        const usable = Math.max(40, col.getActualWidth() - ERROR_ROW_H_PAD);
        const charsPerLine = Math.max(6, Math.floor(usable / ERROR_ROW_AVG_CHAR));
        // Cap at MAX_LINES — anything longer gets "…" + a tooltip card.
        const lines = Math.max(1, Math.min(ERROR_ROW_MAX_LINES, Math.ceil(msg.length / charsPerLine)));
        if (lines > maxLines) maxLines = lines;
      }
      return Math.max(ERROR_ROW_HEIGHT_BASE, maxLines * ERROR_ROW_LINE_HEIGHT + ERROR_ROW_V_PAD);
    };

    const getRowHeight = useCallback((p: any) => {
      const id = p.data?.id;
      if (typeof id === 'string' && isErrorRowId(id)) {
        return computeErrorRowHeight(p.data._errorOwnerId);
      }
      return ROW_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isFullWidthRow = useCallback(
      (p: any) => !!p.rowNode?.data?.id && isErrorRowId(p.rowNode.data.id),
      []
    );

    return (
      <Box sx={{ height: '100%', width: '100%', position: 'relative', outline: 'none' }}>
        <GridStyles />
        <AgGridReact<GridRow>
          ref={gridRef}
          theme={gridTheme}
          className="resi-grid"
          rowData={rowDataRef.current}
          defaultColDef={defaultColDef}
          columnDefs={columnDefs}
          getRowId={getRowId}
          rowClassRules={rowClassRules}
          context={mergedContext}
          getRowHeight={getRowHeight}
          isFullWidthRow={isFullWidthRow}
          fullWidthCellRenderer={ErrorRowRenderer}
          rowHeight={ROW_HEIGHT}
          headerHeight={ROW_HEIGHT}
          noRowsOverlayComponent={NoRowsOverlay}
          noRowsOverlayComponentParams={{ message: noRowsMessage ?? 'No rows to show' }}
          popupParent={typeof document !== 'undefined' ? document.body : undefined}
          onCellValueChanged={handleCellValueChanged}
          onSelectionChanged={handleSelectionChanged}
          onModelUpdated={handleModelUpdated}
          onGridReady={() => onGridReady?.()}
          rowSelection={{ mode: 'multiRow', checkboxes: false, headerCheckbox: false, enableClickSelection: false }}
          cellSelection
          processCellForClipboard={(params) => {
            const field = params.column.getColDef().field;
            if (dateField && field === dateField && params.value instanceof Date) {
              return params.value.toISOString().split('T')[0];
            }
            return params.value ?? '';
          }}
          processCellFromClipboard={(params) => {
            const field = params.column.getColDef().field;
            if (dateField && field === dateField && typeof params.value === 'string' && params.value) {
              const d = new Date(params.value + 'T12:00:00');
              return isNaN(d.getTime()) ? params.value : d;
            }
            return params.value;
          }}
          stopEditingWhenCellsLoseFocus
          enterNavigatesVertically
          suppressMovableColumns
        />
      </Box>
    );
  }
);
EditableDataGrid.displayName = 'EditableDataGrid';
