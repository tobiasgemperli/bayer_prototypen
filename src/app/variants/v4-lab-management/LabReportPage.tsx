import React, { useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import {
  Box, Typography, Button, TextField, Breadcrumbs, Link, Paper, Stack,
  Autocomplete, IconButton, Tooltip,
} from '@mui/material';
import {
  NavigateNext, Add, AttachFile, InsertDriveFile, Close as CloseIcon,
  DeleteOutline,
} from '@mui/icons-material';
import { ColDef, CustomCellRendererProps } from 'ag-grid-community';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { usePlots } from '../../data/plots-data';
import { EditableDataGrid, EditableDataGridHandle, GridRow } from '../../design-system/grid/EditableDataGrid';
import { DropdownCellRenderer, DropdownEditor } from '../../design-system/grid/grid-shared';
import {
  LabAttachment, LabReport, LabResidue, RESIDUE_LEVEL_OPTIONS, ResidueLevel,
  newReportId, newResidueId, useLabSamples,
  addLabReport, updateLabReport, deleteLabReport, findLabReport,
} from '../../data/lab-results-data';
import { fieldSx, FieldLabel, SectionLabel } from '../../design-system/FormField';

const SEED_LABORATORIES = [
  'Eurofins', 'SGS', 'ALS Czech Republic', 'Bureau Veritas', 'Intertek', 'Mérieux NutriSciences',
];

function ResultDeleteCell({ data, context }: CustomCellRendererProps) {
  return (
    <Tooltip title="Delete result" placement="left">
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

function newResidue(): LabResidue {
  return { id: newResidueId(), analyte: '', residueLevel: null, residueValue: '', methodLoq: '', methodLod: '', fromTreatment: false };
}

/**
 * v5 — full-page lab report creation/edit (AddPlotPage shell). Combines the lab
 * report metadata with its results, which are managed in the shared editable grid.
 * A report always belongs to one sample (passed as ?sample= on create).
 */
export function LabReportPage() {
  const { id, reportId } = useParams<{ id: string; reportId?: string }>();
  const [searchParams] = useSearchParams();
  const sampleIdParam = searchParams.get('sample');
  const navigate = useNavigate();
  const plots = usePlots();
  const plot = useMemo(() => plots.find(p => p.id === id), [plots, id]);
  const allSamples = useLabSamples();

  const found = useMemo(() => (reportId ? findLabReport(reportId) : undefined), [reportId, allSamples]);
  const sample = useMemo(() => {
    if (found) return found.sample;
    return sampleIdParam ? allSamples.find(s => s.id === sampleIdParam) : undefined;
  }, [found, sampleIdParam, allSamples]);

  const isNew = !reportId;
  const draftReportId = useState(() => reportId ?? newReportId())[0];

  const [laboratory, setLaboratory] = useState(found?.report.laboratory ?? '');
  const [labReportId, setLabReportId] = useState(found?.report.labReportId ?? '');
  const [attachments, setAttachments] = useState<LabAttachment[]>(found?.report.attachments ?? []);
  const [results, setResults] = useState<LabResidue[]>(found?.report.residues ?? []);

  const gridRef = useRef<EditableDataGridHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialResults = useMemo(() => results.map(r => ({ ...r })) as GridRow[], []); // eslint-disable-line react-hooks/exhaustive-deps

  const backToList = () => navigate(`/plot/${id}`, { state: { activeTab: 2 } });

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const added: LabAttachment[] = files.map((f, i) => ({ id: `att-${Date.now()}-${i}`, name: f.name, size: f.size }));
    setAttachments(prev => [...prev, ...added]);
    toast.success('File uploaded successfully');
    e.target.value = '';
  };

  const handleAddResult = () => {
    const r = newResidue();
    setResults(prev => [...prev, r]);
    gridRef.current?.addRow({ ...r } as GridRow, 'analyte');
  };

  const gridContext = useMemo(() => ({
    onDelete: (rid: string) => {
      setResults(prev => prev.filter(r => r.id !== rid));
      gridRef.current?.deleteRow(rid);
    },
  }), []);

  const colDefs: ColDef[] = useMemo(() => [
    { field: 'analyte', headerName: 'Analyte', flex: 1.4, editable: true, valueFormatter: p => p.value || '—' },
    {
      field: 'residueLevel', headerName: 'Residue level', flex: 1.1, editable: true,
      cellRenderer: DropdownCellRenderer, cellEditor: DropdownEditor,
      cellEditorParams: { values: RESIDUE_LEVEL_OPTIONS, searchPlaceholder: 'Search residue level…' },
    },
    { field: 'residueValue', headerName: 'Residue (mg/kg)', flex: 1, editable: true, valueFormatter: p => p.value || '—' },
    { field: 'methodLoq', headerName: 'Method LOQ (mg/kg)', flex: 1, editable: true, valueFormatter: p => p.value || '—' },
    {
      colId: 'delete', headerName: '', width: 56, editable: false, sortable: false, filter: false,
      suppressNavigable: true, suppressKeyboardEvent: () => true,
      cellRenderer: ResultDeleteCell, cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    },
  ], []);

  const handleSave = () => {
    if (!sample) { toast.error('No sample linked to this report'); return; }
    if (!labReportId.trim() && !laboratory.trim()) {
      toast.error('Add a laboratory or a lab report ID before saving');
      return;
    }
    const payload: LabReport = {
      id: draftReportId, laboratory: laboratory.trim(), labReportId: labReportId.trim(), attachments, residues: results,
    };
    if (reportId) updateLabReport(reportId, payload);
    else addLabReport(sample.id, payload);
    toast.success('Lab report saved');
    backToList();
  };

  const handleDelete = () => {
    if (reportId) deleteLabReport(reportId);
    toast.success('Lab report deleted');
    backToList();
  };

  if (!plot || !sample) return <Box p={3}>Loading…</Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'background.default', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ flexShrink: 0, px: 3, pt: 3, pb: 2 }}>
        <Breadcrumbs separator={<NavigateNext fontSize="small" color="disabled" />}>
          <Link underline="hover" color="text.secondary" onClick={() => navigate('/')}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Plots</Link>
          <Link underline="hover" color="text.secondary" onClick={() => navigate(`/plot/${id}`)}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            {plot.plotName} ({plot.crop})
          </Link>
          <Link underline="hover" color="text.secondary" onClick={backToList}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Lab management
          </Link>
        </Breadcrumbs>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {isNew ? 'New lab report' : (labReportId || 'Lab report')}
          </Typography>
          {!isNew && (
            <Button startIcon={<DeleteOutline />} color="inherit" onClick={handleDelete}
              sx={{ fontWeight: 600, textTransform: 'none', color: 'text.secondary' }}>
              Delete
            </Button>
          )}
        </Stack>
      </Box>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 3 }}>
        <Box sx={{ maxWidth: 920, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Report details */}
          <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', p: 3 }}>
            <SectionLabel>Lab report details</SectionLabel>
            <Stack spacing={2.5}>
              <Box>
                <FieldLabel>Sample</FieldLabel>
                <Box sx={{ px: 1.5, py: 1, borderRadius: '8px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{sample.sampleName || sample.sampleCode}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{sample.commodity ?? ''}</Typography>
                </Box>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                <Box sx={{ flex: 1 }}>
                  <FieldLabel required>Laboratory</FieldLabel>
                  <Autocomplete
                    freeSolo size="small" options={SEED_LABORATORIES}
                    value={laboratory}
                    onInputChange={(_, v) => setLaboratory(v)}
                    renderInput={(params) => <TextField {...params} placeholder="Choose or type a laboratory" sx={fieldSx} />}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <FieldLabel required>Lab report ID</FieldLabel>
                  <TextField fullWidth size="small" placeholder="e.g. RPT-2024-001"
                    value={labReportId} onChange={(e) => setLabReportId(e.target.value)} sx={fieldSx} />
                </Box>
              </Stack>

              <Box>
                <FieldLabel>Attachments</FieldLabel>
                <Stack spacing={0.75} alignItems="flex-start">
                  <Button variant="soft" color="primary" size="small" startIcon={<AttachFile />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px' }}>
                    {attachments.length === 0 ? 'Attach files' : `${attachments.length} file${attachments.length !== 1 ? 's' : ''} attached`}
                  </Button>
                  <input ref={fileInputRef} type="file" multiple hidden accept=".pdf,.csv,.xlsx,.docx" onChange={handleFiles} />
                  {attachments.map(a => (
                    <Stack key={a.id} direction="row" spacing={0.5} alignItems="center" sx={{ pl: 0.5 }}>
                      <InsertDriveFile sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Link component="button" sx={{ fontSize: '0.75rem', color: 'primary.main', fontWeight: 600 }}
                        onClick={() => toast.info(`Open ${a.name}`)}>{a.name}</Link>
                      <IconButton size="small" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}>
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Paper>

          {/* Report results */}
          <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 3, pt: 3, pb: 2 }}>
              <SectionLabel>Report results</SectionLabel>
              <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleAddResult}
                sx={{ px: 2, height: 36, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}>
                Add result
              </Button>
            </Stack>
            <Box sx={{ height: 360, borderTop: '1px solid', borderColor: 'divider' }}>
              <EditableDataGrid
                ref={gridRef}
                initialData={initialResults}
                columnDefs={colDefs}
                context={gridContext}
                onCellChange={(rid, field, value) =>
                  setResults(prev => prev.map(r => (r.id === rid ? { ...r, [field]: (value ?? '') as never } : r)))
                }
              />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Pinned action bar */}
      <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', px: 3, py: 1.5, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 920, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="text" color="inherit" onClick={backToList}
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 3 }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSave}
            sx={{ fontWeight: 600, textTransform: 'none', px: 4 }}>
            Save lab report
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
