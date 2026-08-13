import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ColDef, CustomCellRendererProps } from 'ag-grid-community';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import { AttachFile, Close as CloseIcon, ContentCopy, DeleteOutline } from '@mui/icons-material';
import { AttachmentChip } from '../../design-system/AttachmentChip';
import { toast } from 'sonner';
import { EditableDataGrid, EditableDataGridHandle } from '../../design-system/grid/EditableDataGrid';
import { DropdownCellRenderer, DropdownEditor, rowActionColumn, selectColumn } from '../../design-system/grid/grid-shared';
import { ActionItem } from '../../design-system/ActionMenu';
import { LabAttachment, LabReport } from '../../data/lab-results-data';

// ── Attachments cell — one file per row (MUI Chip + Upload Button) ────────────

function AttachmentsCell({ data, context }: CustomCellRendererProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { onAttach, onRemoveAttachment } = context as {
    onAttach: (reportId: string, file: File) => void;
    onRemoveAttachment: (reportId: string, attachmentId: string) => void;
  };
  const attachment: LabAttachment | undefined = (data.attachments ?? [])[0];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAttach(data.id, file);
    e.target.value = '';
  };

  if (attachment) {
    return (
      <AttachmentChip
        name={attachment.name}
        onClick={() => window.open('about:blank', '_blank', 'noopener,noreferrer')}
        onRemove={() => onRemoveAttachment(data.id, attachment.id)}
      />
    );
  }

  return (
    <>
      <Button
        variant="soft" color="primary" size="small"
        startIcon={<AttachFile sx={{ fontSize: 16 }} />}
        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
      >
        Upload
      </Button>
      <input
        ref={fileInputRef} type="file" hidden
        accept=".pdf,.csv,.xlsx,.docx"
        onChange={handleFile}
      />
    </>
  );
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface LabReportsGridHandle {
  addRow: () => void;
  setFilter: (text: string) => void;
  /** Remove the given rows from both the parent store and the grid view. */
  deleteRows: (ids: string[]) => void;
}

export interface LabReportsGridProps {
  reports: LabReport[];
  /** Known laboratories already used on this plot's reports (for the dropdown). */
  laboratoryOptions?: string[];
  /** Hide the Laboratory column (when the laboratory is already known from context). */
  hideLaboratory?: boolean;
  onAdd: (report: LabReport) => void;
  onUpdate: (id: string, patch: Partial<LabReport>) => void;
  onDelete: (id: string) => void;
  onSelectionChange?: (ids: string[]) => void;
}

function newReport(): LabReport {
  return {
    id: `lr-${Date.now()}`,
    laboratory: '',
    labReportId: '',
    attachments: [],
  };
}

export const LabReportsGrid = forwardRef<LabReportsGridHandle, LabReportsGridProps>(
  ({ reports, laboratoryOptions = [], hideLaboratory = false, onAdd, onUpdate, onDelete, onSelectionChange }, ref) => {
    const coreRef = useRef<EditableDataGridHandle>(null);
    // Tracks which row triggered the "Create new laboratory" modal.
    const createForRowRef = useRef<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [newLabName, setNewLabName] = useState('');

    useImperativeHandle(ref, () => ({
      addRow: () => {
        const r = newReport();
        onAdd(r);
        coreRef.current?.addRow(r as any, hideLaboratory ? 'labReportId' : 'laboratory');
      },
      setFilter: (text) => coreRef.current?.setFilter(text),
      deleteRows: (ids) => {
        ids.forEach(id => {
          onDelete(id);
          coreRef.current?.deleteRow(id);
        });
      },
    }));

    const handleCreateLab = () => {
      const editing = coreRef.current?.getSelectedRows?.();
      // Track the row currently being edited so we can patch it on save.
      // (Fallback: when nothing is selected, AG-Grid still has the "editing" row
      // tracked internally via the cell that triggered the action; we use the
      // row whose Laboratory was just being edited — captured via a context handler.)
      // For prototype simplicity, the host passes the active row id via context.
      setNewLabName('');
      setCreateOpen(true);
    };

    const handleCreateSave = () => {
      const name = newLabName.trim();
      const reportId = createForRowRef.current;
      if (!name || !reportId) { setCreateOpen(false); return; }
      onUpdate(reportId, { laboratory: name });
      setCreateOpen(false);
      createForRowRef.current = null;
      toast.success(`Laboratory "${name}" created`);
    };

    const context = useMemo(() => ({
      onAttach: (reportId: string, file: File) => {
        const next: LabAttachment[] = [{ id: `att-${Date.now()}`, name: file.name, size: file.size }];
        onUpdate(reportId, { attachments: next });
        coreRef.current?.save();
        toast.success('File uploaded');
      },
      onRemoveAttachment: (reportId: string, _attachmentId: string) => {
        onUpdate(reportId, { attachments: [] });
        coreRef.current?.save();
      },
      rowActions: (data: LabReport): ActionItem[] => ([
        { label: 'Duplicate', icon: <ContentCopy fontSize="small" />, key: 'dup', onClick: () => {
          const dup: LabReport = {
            ...data,
            id: `lr-${Date.now()}`,
            attachments: data.attachments.map(a => ({ ...a, id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
          };
          onAdd(dup);
          coreRef.current?.addRow(dup as any, hideLaboratory ? 'labReportId' : 'laboratory');
        } },
        { divider: true, key: 'd1', onClick: () => {} },
        { label: 'Delete', icon: <DeleteOutline fontSize="small" />, key: 'delete', color: 'error.main', onClick: () => {
          onDelete(data.id);
          coreRef.current?.deleteRow(data.id);
        } },
      ]),
    }), [reports, onUpdate, onDelete, onAdd]);

    const colDefs: ColDef[] = useMemo(() => [
      selectColumn as ColDef,
      ...(hideLaboratory ? [] : [{
        field: 'laboratory', headerName: 'Laboratory', flex: 1.4, editable: true,
        cellRenderer: DropdownCellRenderer, cellEditor: DropdownEditor,
        cellEditorParams: (params: any) => ({
          values: laboratoryOptions,
          searchPlaceholder: 'Search or create…',
          createLabel: 'Create new laboratory',
          onCreate: () => {
            createForRowRef.current = params.data?.id ?? null;
            handleCreateLab();
          },
        }),
      } as ColDef]),
      {
        field: 'labReportId', headerName: 'Lab report ID', flex: 1.5, editable: true,
      },
      {
        headerName: 'Attachments', flex: 2, editable: false, sortable: false, filter: false,
        cellRenderer: AttachmentsCell,
        cellStyle: { display: 'flex', alignItems: 'center' },
      },
      rowActionColumn as ColDef,
    ], [laboratoryOptions, hideLaboratory]);

    const handleCellChange = (id: string, field: string, value: unknown) => {
      onUpdate(id, { [field]: value } as Partial<LabReport>);
    };

    return (
      <>
        <EditableDataGrid
          ref={coreRef}
          initialData={reports as any}
          columnDefs={colDefs}
          context={context}
          onSelectionChange={onSelectionChange}
          onCellChange={handleCellChange}
        />

        {/* Create-new-laboratory dialog (Season-pattern handoff) */}
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
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" disabled={!newLabName.trim()}
              onClick={handleCreateSave}
              sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
);
LabReportsGrid.displayName = 'LabReportsGrid';
