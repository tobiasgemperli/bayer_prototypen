import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ColDef, CustomCellRendererProps, IHeaderParams } from 'ag-grid-community';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  AttachFile, Close as CloseIcon, ContentCopy, DeleteOutline, InfoOutlined,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { AttachmentChip } from '../../design-system/AttachmentChip';
import { EditableDataGrid, EditableDataGridHandle, GridRow } from '../../design-system/grid/EditableDataGrid';
import {
  DropdownCellRenderer, DropdownEditor, RowActionButton, selectColumn,
} from '../../design-system/grid/grid-shared';
import { Validators } from '../../design-system/grid/validation';
import {
  LabAttachment, LabReport, LabSampleData,
  addLabReport, deleteLabReport, newReportId, updateLabReport,
} from '../../data/lab-results-data';
import { isReportDraft } from './draft-state';
import { DraftChip, ManagedTag } from '../../design-system/grid/draft-state';

// Each row is a report with its owning sample id injected so we know where it lives.
interface ReportRow extends LabReport {
  /** Sample-display string (read by AG-Grid dropdown). */
  sampleName: string;
  /** Owning sample id — used to route updates to the correct sample. */
  _sampleId: string;
}

// ── Attachment header — info icon with one-file-per-report tooltip ───────────

function AttachmentHeader({ displayName }: IHeaderParams) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5 }}>
        {displayName}
      </Typography>
      <Tooltip arrow placement="top" enterDelay={150} title="Attach one file per report.">
        <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
      </Tooltip>
    </Box>
  );
}

// ── Attachment cell — one file per row (same UX as v1) ───────────────────────
// Both the AG-Grid row data (via node.setData) and the external store are kept
// in sync, so removing an attachment immediately reveals the Upload button and
// uploading a new file immediately renders the chip.

function AttachmentsCell({ data, node, context }: CustomCellRendererProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { onAttach, onRemoveAttachment } = context as {
    onAttach: (reportId: string, file: File) => void;
    onRemoveAttachment: (reportId: string, attachmentId: string) => void;
  };
  const attachment: LabAttachment | undefined = (data.attachments ?? [])[0];

  const setRowAttachments = (next: LabAttachment[]) => {
    node.setData({ ...data, attachments: next });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const next: LabAttachment[] = [{ id: `att-${Date.now()}`, name: file.name, size: file.size }];
      setRowAttachments(next);
      onAttach(data.id, file);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    if (!attachment) return;
    setRowAttachments([]);
    onRemoveAttachment(data.id, attachment.id);
  };

  if (attachment) {
    return (
      <AttachmentChip
        name={attachment.name}
        onClick={() => window.open('about:blank', '_blank', 'noopener,noreferrer')}
        onRemove={handleRemove}
      />
    );
  }

  return (
    <>
      <RowActionButton
        startIcon={<AttachFile sx={{ fontSize: 16 }} />}
        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
      >Upload</RowActionButton>
      <input
        ref={fileInputRef} type="file" hidden
        accept=".pdf,.csv,.xlsx,.docx"
        onChange={handleFile}
      />
    </>
  );
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface ReportsGridHandle {
  addRow: () => void;
  setFilter: (text: string) => void;
  deleteRows: (ids: string[]) => void;
  /** Flush deferred field edits to the store. Sample moves persist immediately. */
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

export interface ReportsGridProps {
  /** All reports across the plot's samples, flattened. */
  rows: ReportRow[];
  /** Samples on this plot (for the Sample dropdown). */
  samples: LabSampleData[];
  /** Known laboratories on this plot (for the Laboratory dropdown). */
  laboratoryOptions: string[];
  onSelectionChange?: (ids: string[]) => void;
  onDirtyStateChange?: (dirty: boolean) => void;
}

function newReport(): LabReport {
  // AC-8.2: brand-new row is not a draft until explicitly saved as one.
  return { id: newReportId(), laboratory: '', labReportId: '', attachments: [] };
}

export const ReportsGrid = forwardRef<ReportsGridHandle, ReportsGridProps>(
  ({ rows, samples, laboratoryOptions, onSelectionChange, onDirtyStateChange }, ref) => {
    const coreRef = useRef<EditableDataGridHandle>(null);
    const pendingRef = useRef<Map<string, Partial<LabReport>>>(new Map());
    const createForRowRef = useRef<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [newLabName, setNewLabName] = useState('');

    const sampleNameById = useMemo(() => {
      const m = new Map<string, string>();
      samples.forEach(s => m.set(s.id, s.sampleName || s.sampleCode));
      return m;
    }, [samples]);
    const sampleIdByName = useMemo(() => {
      const m = new Map<string, string>();
      samples.forEach(s => m.set(s.sampleName || s.sampleCode, s.id));
      return m;
    }, [samples]);
    const sampleOptions = useMemo(() => samples.map(s => s.sampleName || s.sampleCode), [samples]);
    // Grey suffix shown next to each option in the dropdown — the sample code
    // for samples that have a name (so the code disambiguates same-named
    // samples). When the option already IS the sampleCode (no sampleName),
    // skip the suffix to avoid "abc-def-ghi  abc-def-ghi" duplication.
    const sampleSecondaryByValue = useMemo(() => {
      const m: Record<string, string> = {};
      for (const s of samples) {
        if (s.sampleName?.trim()) m[s.sampleName] = s.sampleCode;
      }
      return m;
    }, [samples]);

    useImperativeHandle(ref, () => ({
      addRow: () => {
        if (samples.length === 0) {
          toast.error('Add a sample first');
          return;
        }
        const target = samples[0];
        const r = newReport();
        addLabReport(target.id, r);
        const row: ReportRow = {
          ...r,
          _sampleId: target.id,
          sampleName: target.sampleName || target.sampleCode,
        };
        // AC-12.4: focus the nameField (`labReportId`), not Laboratory.
        coreRef.current?.addRow(row as unknown as GridRow, 'labReportId');
      },
      setFilter: (text) => coreRef.current?.setFilter(text),
      deleteRows: (ids) => {
        ids.forEach(id => { deleteLabReport(id); coreRef.current?.deleteRow(id); });
      },
      save: () => {
        for (const [id, patch] of pendingRef.current) updateLabReport(id, patch);
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

    const handleCreateSave = () => {
      const name = newLabName.trim();
      const reportId = createForRowRef.current;
      // Empty-name click is a no-op + toast (button stays active per design
      // system — we never grey out primary CTAs; the toast surfaces the
      // missing requirement).
      if (!name) {
        toast.error('Enter a laboratory name');
        return;
      }
      if (!reportId) { setCreateOpen(false); return; }
      updateLabReport(reportId, { laboratory: name });
      setCreateOpen(false);
      createForRowRef.current = null;
      toast.success(`Laboratory "${name}" created`);
    };

    const context = useMemo(() => ({
      onAttach: (reportId: string, file: File) => {
        // AC-9.3: persist directly, never call coreRef.save() from a renderer.
        // The AttachmentsCell already updated the row via node.setData; we only persist.
        const next: LabAttachment[] = [{ id: `att-${Date.now()}`, name: file.name, size: file.size }];
        updateLabReport(reportId, { attachments: next });
        toast.success('File uploaded');
      },
      onRemoveAttachment: (reportId: string, _attachmentId: string) => {
        // AC-9.3: persist directly, never call coreRef.save() from a renderer.
        updateLabReport(reportId, { attachments: [] });
      },
      onDuplicate: (data: ReportRow) => {
        // AC-8.2 + AC-12.5: a duplicate is a brand-new row → not a draft
        // until explicitly saved as one. Strip any inherited `isDraft`
        // from the source so the chip does not carry over.
        const dup: LabReport = {
          ...data,
          id: newReportId(),
          isDraft: false,
          attachments: data.attachments.map(a => ({ ...a, id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
        };
        addLabReport(data._sampleId, dup);
        const row: ReportRow = { ...dup, _sampleId: data._sampleId, sampleName: data.sampleName };
        // AC-12.4: focus the nameField (`labReportId`).
        coreRef.current?.addRow(row as unknown as GridRow, 'labReportId');
      },
      onDelete: (data: ReportRow) => {
        deleteLabReport(data.id);
        coreRef.current?.deleteRow(data.id);
        toast.success('Lab report deleted');
      },
    }), []);

    /* Pattern 2 — two common actions as inline icon buttons with tooltips. */
    const ReportActionsCell = ({ data, context }: CustomCellRendererProps) => {
      const { onDuplicate, onDelete } = (context ?? {}) as {
        onDuplicate: (row: ReportRow) => void;
        onDelete: (row: ReportRow) => void;
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
        </Stack>
      );
    };

    /**
     * Sample cell — mirrors `DropdownCellRenderer` chrome (value + clear +
     * chevron) but inlines the Draft chip directly after the sample name AND
     * surfaces the sample code in grey next to the name. The id is always
     * visible (closed state + dropdown listbox) so the user can identify a
     * sample even when names collide.
     */
    const SampleCell = (params: CustomCellRendererProps & { secondaryByValue?: Record<string, string> }) => {
      const { value, api, node, column, data, secondaryByValue } = params;
      const report = data as LabReport;
      const draft = isReportDraft(report);
      const managed = report?.managedBy;
      const secondary = value ? secondaryByValue?.[value as string] : undefined;
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
          {/* Name + code share one ellipsis run — both spans live inside the
              same overflow:hidden container so "Sample Name dab-huw-gxq"
              truncates as a unit when the column is narrow. The Draft /
              Managed chip sits OUTSIDE this container as a separate flex
              child so it never gets eaten by the ellipsis. */}
          <Box sx={{
            flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontSize: '0.875rem',
            color: value ? 'text.primary' : 'text.disabled',
          }}>
            <Box component="span">{value || '—'}</Box>
            {secondary && (
              <Box component="span" sx={{ ml: 1, color: 'rgba(0,0,0,0.6)' }}>
                {secondary}
              </Box>
            )}
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

    /** Empty-state placeholder used by Lab report ID + other free-text cells —
     *  renders a grey em-dash when the value is blank. */
    const TextOrDashCell = ({ value }: CustomCellRendererProps) => (
      value
        ? <Box component="span" sx={{ fontSize: '0.875rem' }}>{value}</Box>
        : <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.disabled' }}>—</Box>
    );

    const colDefs: ColDef[] = useMemo(() => [
      selectColumn as ColDef,
      {
        field: 'sampleName', headerName: 'Sample', flex: 1.2, editable: true,
        cellRenderer: SampleCell,
        cellRendererParams: { secondaryByValue: sampleSecondaryByValue },
        cellEditor: DropdownEditor,
        cellEditorParams: {
          values: sampleOptions,
          searchPlaceholder: 'Search sample…',
          secondaryByValue: sampleSecondaryByValue,
        },
      },
      {
        field: 'laboratory', headerName: 'Laboratory', flex: 1.4, editable: true,
        cellRenderer: DropdownCellRenderer,
        cellEditor: DropdownEditor,
        cellEditorParams: (params: any) => ({
          values: laboratoryOptions,
          searchPlaceholder: 'Search or create…',
          createLabel: 'Create new laboratory',
          onCreate: () => {
            createForRowRef.current = params.data?.id ?? null;
            setNewLabName('');
            setCreateOpen(true);
          },
        }),
      },
      // Draft chip moved to the Sample column (the row's primary identifier);
      // Lab report ID renders as a plain editable text cell, with a grey em-dash
      // placeholder when empty so the empty state matches every other cell.
      {
        field: 'labReportId', headerName: 'Lab report ID', flex: 1, editable: true,
        cellRenderer: TextOrDashCell,
      },
      {
        field: 'attachments', headerName: 'Attachment', flex: 2, editable: false, sortable: false, filter: false,
        headerComponent: AttachmentHeader,
        cellRenderer: AttachmentsCell,
        cellStyle: { display: 'flex', alignItems: 'center' },
      },
      {
        headerName: '', colId: 'resi-actions', width: 108, minWidth: 108,
        editable: false, sortable: false, filter: false, resizable: false,
        suppressNavigable: true, suppressKeyboardEvent: () => true,
        cellRenderer: ReportActionsCell,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' },
      },
    ], [sampleOptions, sampleSecondaryByValue, laboratoryOptions]);

    const handleCellChange = (id: string, field: string, value: unknown) => {
      // Sample re-assignment moves a report between samples — keep this immediate
      // (matches add/delete semantics; the SaveBar only buffers field edits).
      if (field === 'sampleName') {
        const newSampleId = sampleIdByName.get(String(value));
        if (!newSampleId) return;
        const row = coreRef.current?.getRow(id) as ReportRow | undefined;
        if (!row || row._sampleId === newSampleId) return;
        const newSampleName = sampleNameById.get(newSampleId) ?? String(value);
        const { sampleName: _s, _sampleId: _i, ...report } = row;
        deleteLabReport(id);
        addLabReport(newSampleId, report as LabReport);
        // AC-9.4: keep AG-Grid's row in sync with the store after a cross-sample
        // move. `getRow` returns the node.data reference, so mutating it in place
        // is equivalent to `node.setData({ ...row, _sampleId, sampleName })` for
        // the fields AG-Grid will read on next paint.
        row._sampleId = newSampleId;
        row.sampleName = newSampleName;
        return;
      }
      const patch = pendingRef.current.get(id) ?? {};
      (patch as Record<string, unknown>)[field] = value;
      pendingRef.current.set(id, patch);
    };

    const validators: Validators<ReportRow> = useMemo(() => ({
      laboratory: {
        required: (v) => String(v ?? '').trim() ? null : 'Laboratory is required',
      },
      labReportId: {
        required: (v) => String(v ?? '').trim() ? null : 'Lab report ID is required',
      },
      attachments: {
        required: (v) => (Array.isArray(v) && v.length > 0) ? null : 'Attach one file',
      },
    }), []);

    return (
      <>
        <EditableDataGrid
          ref={coreRef}
          initialData={rows as unknown as GridRow[]}
          columnDefs={colDefs}
          context={context}
          onSelectionChange={onSelectionChange}
          onDirtyStateChange={onDirtyStateChange}
          onCellChange={handleCellChange}
          validators={validators as Validators}
          nameField="labReportId"
        />

        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: '12px' } }}>
          <DialogTitle sx={{ px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Create new laboratory</Typography>
            <IconButton onClick={() => setCreateOpen(false)} sx={{ color: 'text.secondary', p: 0.5 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the name of the new laboratory.
            </Typography>
            <TextField fullWidth size="small" autoFocus
              placeholder="e.g. Bayer Crop Sciences Lab"
              value={newLabName}
              onChange={(e) => setNewLabName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newLabName.trim()) handleCreateSave(); }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
            <Button variant="text" color="inherit" onClick={() => setCreateOpen(false)}
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>Cancel</Button>
            {/* Always-active contained-red primary, per design system —
                empty-name clicks are caught inside handleCreateSave with an
                error toast instead of greying the button out. */}
            <Button variant="contained" color="primary"
              onClick={handleCreateSave}
              sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>Save</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
);
ReportsGrid.displayName = 'ReportsGrid';

export type { ReportRow };
