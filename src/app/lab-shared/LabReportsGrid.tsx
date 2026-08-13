import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ColDef, CustomCellRendererProps } from 'ag-grid-community';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { AttachFile, DeleteOutline } from '@mui/icons-material';
import { toast } from 'sonner';
import { EditableDataGrid, EditableDataGridHandle } from '../design-system/grid/EditableDataGrid';
import { selectColumn } from '../design-system/grid/grid-shared';
import { AttachmentChip } from '../design-system/AttachmentChip';
import { EmDash } from '../design-system/TableCard';
import { LabReport, LabAttachment } from '../data/lab-results-data';

function LabReportIdCell({ value }: CustomCellRendererProps) {
  return value
    ? <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.primary' }}>{value}</Box>
    : <EmDash />;
}

function AttachmentCell(props: CustomCellRendererProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { onAttachmentChange } = (props.context ?? {}) as {
    onAttachmentChange?: (id: string, att: LabAttachment | null) => void;
  };

  const [attachment, setAttachment] = useState<LabAttachment | null>(
    props.data?.attachments?.[0] ?? null
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const att: LabAttachment = { id: `att-${Date.now()}`, name: file.name, size: file.size };
    // Update ag-Grid's row data directly so state persists if the cell is recycled.
    props.api.applyTransaction({ update: [{ ...props.data, attachments: [att] }] });
    setAttachment(att);
    onAttachmentChange?.(props.data.id, att);
    toast.success('File attached');
    e.target.value = '';
  };

  const handleRemove = () => {
    props.api.applyTransaction({ update: [{ ...props.data, attachments: [] }] });
    setAttachment(null);
    onAttachmentChange?.(props.data.id, null);
  };

  if (attachment) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <AttachmentChip name={attachment.name} onClick={() => {}} onRemove={handleRemove} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
      <Button
        variant="soft"
        size="small"
        startIcon={<AttachFile sx={{ fontSize: 14 }} />}
        onClick={() => fileInputRef.current?.click()}
        sx={{ fontWeight: 600, borderRadius: '6px', height: 28, fontSize: '0.75rem', textTransform: 'none', px: 1.5 }}
      >
        Upload PDF
      </Button>
      <input ref={fileInputRef} type="file" hidden accept=".pdf,.csv,.xlsx,.docx" onChange={handleFile} />
    </Box>
  );
}

function InlineDeleteCell({ data, context }: CustomCellRendererProps) {
  const { onRowDelete } = (context ?? {}) as { onRowDelete?: (id: string) => void };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', width: '100%', pr: '8px' }}>
      <Tooltip title="Delete" arrow placement="top" enterDelay={150}>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRowDelete?.(data.id); }}>
          <DeleteOutline sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export interface LabReportsGridHandle {
  addRow: () => void;
  deleteRows: (ids: string[]) => void;
  setFilter: (text: string) => void;
}

export interface LabReportsGridProps {
  reports: LabReport[];
  onAdd: (report: LabReport) => void;
  onUpdate: (id: string, patch: Partial<LabReport>) => void;
  onDelete: (id: string) => void;
  onSelectionChange?: (ids: string[]) => void;
}

export function newReportRow(): LabReport {
  return {
    id: `lr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    laboratory: '',
    labReportId: '',
    attachments: [],
  };
}

export const LabReportsGrid = forwardRef<LabReportsGridHandle, LabReportsGridProps>(
  ({ reports, onAdd, onUpdate, onDelete, onSelectionChange }, ref) => {
    const coreRef = useRef<EditableDataGridHandle>(null);

    useImperativeHandle(ref, () => ({
      addRow: () => {
        const r = newReportRow();
        onAdd(r);
        coreRef.current?.addRow(r as any, 'labReportId');
      },
      deleteRows: (ids) => {
        ids.forEach(id => {
          onDelete(id);
          coreRef.current?.deleteRow(id);
        });
      },
      setFilter: (text) => coreRef.current?.setFilter(text),
    }));

    const context = useMemo(() => ({
      onAttachmentChange: (id: string, att: LabAttachment | null) => {
        onUpdate(id, { attachments: att ? [att] : [] });
      },
      onRowDelete: (id: string) => {
        onDelete(id);
        coreRef.current?.deleteRow(id);
      },
    }), [onUpdate, onDelete]);

    const colDefs: ColDef[] = useMemo(() => [
      selectColumn as ColDef,
      {
        field: 'labReportId',
        headerName: 'Lab report ID',
        flex: 1,
        editable: true,
        cellRenderer: LabReportIdCell,
      },
      {
        headerName: 'Attachment',
        colId: 'attachment',
        flex: 1.5,
        editable: false,
        sortable: false,
        filter: false,
        suppressNavigable: true,
        suppressKeyboardEvent: () => true,
        cellRenderer: AttachmentCell,
        cellStyle: { display: 'flex', alignItems: 'center', padding: '0 8px' },
      },
      {
        headerName: '',
        colId: 'report-actions',
        width: 56,
        minWidth: 56,
        editable: false,
        sortable: false,
        filter: false,
        resizable: false,
        suppressNavigable: true,
        suppressKeyboardEvent: () => true,
        cellRenderer: InlineDeleteCell,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
      },
    ], []);

    const handleCellChange = (id: string, field: string, value: unknown) => {
      onUpdate(id, { [field]: value } as Partial<LabReport>);
    };

    return (
      <EditableDataGrid
        ref={coreRef}
        initialData={reports as any}
        columnDefs={colDefs}
        context={context}
        onSelectionChange={onSelectionChange}
        onCellChange={handleCellChange}
      />
    );
  }
);
LabReportsGrid.displayName = 'LabReportsGrid';
