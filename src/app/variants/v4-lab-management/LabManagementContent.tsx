import React, { useMemo, useRef, useState } from 'react';
import {
  Box, Button, Stack, Tabs, Tab, TextField, InputAdornment, Typography, Link,
  Tooltip, IconButton,
} from '@mui/material';
import {
  Add, Save, Search, InfoOutlined, Print, DeleteOutline,
} from '@mui/icons-material';
import { ColDef, CustomCellRendererProps } from 'ag-grid-community';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { EmptyState } from '../../design-system/EmptyState';
import { SaveBar } from '../../design-system/SaveBar';
import { EditableDataGrid, EditableDataGridHandle, GridRow } from '../../design-system/grid/EditableDataGrid';
import { selectColumn, DropdownCellRenderer, DropdownEditor, dateColumn } from '../../design-system/grid/grid-shared';
import { LabReportsTable } from '../../lab-shared/LabReportsTable';
import {
  useLabSamples, createLabSample, updateLabSample, deleteLabSample,
  getLabReportsForPlot, COMMODITY_OPTIONS, LabSampleData,
} from '../../data/lab-results-data';
import noLabResultsImg from '../../assets/empty-states/no-lab-results-v01.jpg';

// ── Custom cells for the Sample reports grid ───────────────────────────────────

/** Header for the Print column — carries the explanatory info tooltip. */
function PrintHeader() {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5 }}>
        Print sample report
      </Typography>
      <Tooltip
        arrow placement="top"
        title="Attach this printable PDF to the samples you send to the laboratory, so you can keep track of which samples belong to which lab reports."
      >
        <InfoOutlined sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
      </Tooltip>
    </Stack>
  );
}

function PrintReportCell({ context }: CustomCellRendererProps) {
  return (
    <Link
      component="button"
      onClick={(e) => { e.stopPropagation(); (context as any).onPrint(); }}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600, fontSize: '0.8125rem', color: 'primary.main', textDecorationColor: 'currentColor' }}
    >
      <Print sx={{ fontSize: 16 }} /> Print
    </Link>
  );
}

function AddReportCell({ data, context }: CustomCellRendererProps) {
  const count = (data as LabSampleData).reports?.length ?? 0;
  return (
    <Button
      size="small" color="primary" startIcon={<Add sx={{ fontSize: 16 }} />}
      onClick={(e) => { e.stopPropagation(); (context as any).onAddReport(data.id); }}
      sx={{ fontWeight: 600, fontSize: '0.8125rem', textTransform: 'none', height: 30, px: 1 }}
    >
      Add lab report{count > 0 ? ` (${count})` : ''}
    </Button>
  );
}

function SampleDeleteCell({ data, context }: CustomCellRendererProps) {
  return (
    <Tooltip title="Delete sample report" placement="left">
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); (context as any).onDelete(data.id); }}
        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
      >
        <DeleteOutline fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

// ── Lab management content — replaces the Sampling tab body in v5 ──────────────

export function LabManagementContent({ plotId }: { plotId: string }) {
  const navigate = useNavigate();
  const allSamples = useLabSamples();
  const samples = useMemo(() => allSamples.filter(s => s.plotId === plotId), [allSamples, plotId]);

  const [subTab, setSubTab] = useState(0); // 0 = Sample reports, 1 = Lab reports
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const gridRef = useRef<EditableDataGridHandle>(null);
  const [gridKey, setGridKey] = useState(0);

  const handleCancelChanges = () => {
    setGridKey(k => k + 1);
    setDirty(false);
    toast.info('Changes discarded');
  };

  const handleAddSample = () => {
    const s = createLabSample(plotId);
    gridRef.current?.addRow({ ...s } as GridRow, 'sampleName');
  };

  const handleSaveChanges = () => {
    gridRef.current?.save();
    setDirty(false);
    toast.success('Changes saved');
  };

  const handleBulkDelete = () => {
    selected.forEach(id => { deleteLabSample(id); gridRef.current?.deleteRow(id); });
    toast.success(`${selected.length} sample report${selected.length !== 1 ? 's' : ''} deleted`);
    setSelected([]);
    setAnchorEl(null);
  };

  const gridContext = useMemo(() => ({
    onPrint: () => toast.success('Sample report PDF ready to print'),
    onAddReport: (sampleId: string) => navigate(`/plot/${plotId}/lab-report/new?sample=${sampleId}`),
    onDelete: (id: string) => {
      deleteLabSample(id);
      gridRef.current?.deleteRow(id);
      toast.success('Sample report removed');
    },
  }), [navigate, plotId]);

  const colDefs: ColDef[] = useMemo(() => [
    selectColumn as ColDef,
    { field: 'sampleName', headerName: 'Sample name', flex: 1.4, editable: true, valueFormatter: p => p.value || '—' },
    {
      field: 'commodity', headerName: 'Sample type', flex: 1, editable: true,
      cellRenderer: DropdownCellRenderer, cellEditor: DropdownEditor,
      cellEditorParams: { values: COMMODITY_OPTIONS, searchPlaceholder: 'Search sample type…' },
    },
    dateColumn('dateOfSample', 'Sample date', { flex: 1 }),
    { field: 'comments', headerName: 'Notes', flex: 1.6, editable: true, valueFormatter: p => p.value || '—' },
    {
      colId: 'print', headerName: 'Print sample report', flex: 1.2, editable: false, sortable: false, filter: false,
      suppressNavigable: true, suppressKeyboardEvent: () => true,
      headerComponent: PrintHeader, cellRenderer: PrintReportCell,
    },
    {
      colId: 'addReport', headerName: '', width: 170, editable: false, sortable: false, filter: false,
      suppressNavigable: true, suppressKeyboardEvent: () => true,
      cellRenderer: AddReportCell, cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      colId: 'delete', headerName: '', width: 56, editable: false, sortable: false, filter: false,
      suppressNavigable: true, suppressKeyboardEvent: () => true,
      cellRenderer: SampleDeleteCell, cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    },
  ], []);

  // Lab reports list (read-only, click to open the report page)
  const reports = useMemo(() => getLabReportsForPlot(plotId), [allSamples, plotId]); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (subTab !== 1 || !q) return reports;
    return reports.filter(({ sample, report }) =>
      report.labReportId.toLowerCase().includes(q) ||
      report.laboratory.toLowerCase().includes(q) ||
      sample.sampleName.toLowerCase().includes(q)
    );
  }, [reports, search, subTab]);

  const menuActions: ActionItem[] = useMemo(() => ([
    {
      label: selected.length === 1 ? 'Delete sample report' : 'Delete sample reports',
      icon: <DeleteOutline fontSize="small" />, key: 'delete', color: 'error.main', onClick: handleBulkDelete,
    },
  ]), [selected.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // While the active tab's list is empty, the empty state carries the only CTA —
  // so the toolbar (Add / search / options) and the count bar are hidden.
  const currentEmpty = subTab === 0 ? samples.length === 0 : reports.length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sub-tab strip + toolbar */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Tabs
            value={subTab}
            onChange={(_, v) => { setSubTab(v); setSearch(''); gridRef.current?.setFilter(''); }}
            indicatorColor="primary" textColor="primary"
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, color: 'text.secondary', px: 1, mr: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&.Mui-selected': { color: 'primary.main' } } }}
          >
            <Tab label="Sample reports" />
            <Tab label="Lab reports" />
          </Tabs>

          {!currentEmpty && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {subTab === 0 && (
              <Button
                variant="soft" color="primary" startIcon={<Add />} onClick={handleAddSample}
                sx={{ px: 2, height: 36, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
              >Add sample report</Button>
            )}
            <TextField
              size="small"
              placeholder={subTab === 0 ? 'Search sample reports…' : 'Search lab reports…'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (subTab === 0) gridRef.current?.setFilter(e.target.value); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>, sx: { borderRadius: '8px' } }}
              sx={{ width: 240, '& .MuiOutlinedInput-root': { height: 36, bgcolor: 'white' } }}
            />
            {subTab === 0 && (
              <>
                <OptionsTrigger onClick={(e) => setAnchorEl(e.currentTarget)} disabled={selected.length === 0} />
                <ActionMenu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} actions={menuActions} />
              </>
            )}
          </Box>
          )}
        </Stack>
      </Box>

      {/* Count bar / save bar — hidden while the active tab is empty */}
      {!currentEmpty && (subTab === 0 && dirty ? (
        <SaveBar onSave={handleSaveChanges} onCancel={handleCancelChanges} />
      ) : (
        <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
            {subTab === 0
              ? `${samples.length} total sample report${samples.length !== 1 ? 's' : ''}`
              : `${reports.length} lab report${reports.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
      ))}

      {/* Content */}
      {subTab === 0 ? (
        samples.length === 0 ? (
          <EmptyState
            illustration={noLabResultsImg}
            title="Complete your residue forecast with lab results"
            body="Add lab results to keep residue forecasts and lab data aligned in one place."
            ctaLabel="Add sample report"
            ctaVariant="contained"
            onCta={handleAddSample}
          />
        ) : (
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <EditableDataGrid
              key={gridKey}
              ref={gridRef}
              initialData={samples.map(s => ({ ...s })) as GridRow[]}
              columnDefs={colDefs}
              dateField="dateOfSample"
              context={gridContext}
              onDirtyStateChange={setDirty}
              onSelectionChange={setSelected}
              onCellChange={(id, field, value) => updateLabSample(id, { [field]: value } as Partial<LabSampleData>)}
            />
          </Box>
        )
      ) : (
        <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {reports.length === 0 ? (
            <EmptyState
              illustration={noLabResultsImg}
              title="No lab reports yet"
              body="Add a lab report from any sample in the Sample reports tab — print the sample report, send it to the lab, then capture the results here."
              ctaLabel="Go to Sample reports"
              ctaVariant="contained"
              onCta={() => setSubTab(0)}
            />
          ) : (
            <LabReportsTable reports={filteredReports} onOpen={(rid) => navigate(`/plot/${plotId}/lab-report/${rid}`)} />
          )}
        </Box>
      )}
    </Box>
  );
}
