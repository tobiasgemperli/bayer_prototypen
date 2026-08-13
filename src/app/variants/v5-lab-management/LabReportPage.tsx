import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import {
  Box, Typography, Button, TextField, Breadcrumbs, Link, Paper, Stack,
  Autocomplete,
} from '@mui/material';
import {
  NavigateNext, Add, AttachFile,
  DeleteOutline,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { usePlots } from '../../data/plots-data';
import { CreateSampleDialog, CreateLaboratoryDialog, NewSampleInput } from './SampleDialogs';
import { LabResiduesGrid, LabResiduesGridHandle } from '../../lab-shared/LabResiduesGrid';
import {
  LabAttachment, LabReport, LabResidue,
  getAnalytesForPlot, newReportId, newResidueId, useLabSamples,
  createLabSample, updateLabSample,
  addLabReport, updateLabReport, deleteLabReport, findLabReport,
} from '../../data/lab-results-data';
import { fieldSx, FieldLabel, SectionLabel } from '../../design-system/FormField';
import { AttachmentChip } from '../../design-system/AttachmentChip';

const SEED_LABORATORIES = [
  'Eurofins', 'SGS', 'ALS Czech Republic', 'Bureau Veritas', 'Intertek', 'Mérieux NutriSciences',
];
const CREATE_SAMPLE_ACTION = '__create_sample__';
const CREATE_LABORATORY_ACTION = '__create_laboratory__';

/**
 * v6 — lab report creation/edit. Report-first friendly: the Sample is a selector
 * (choose an existing sample or create one inline via popup) instead of a fixed
 * pre-pick. A report still always belongs to exactly one sample (traceability).
 */
export function LabReportPage() {
  const { id, reportId } = useParams<{ id: string; reportId?: string }>();
  const [searchParams] = useSearchParams();
  const sampleIdParam = searchParams.get('sample');
  const navigate = useNavigate();
  const plots = usePlots();
  const plot = useMemo(() => plots.find(p => p.id === id), [plots, id]);
  const allSamples = useLabSamples();
  const plotSamples = useMemo(() => allSamples.filter(s => s.plotId === id), [allSamples, id]);

  const found = useMemo(() => (reportId ? findLabReport(reportId) : undefined), [reportId, allSamples]);
  const isNew = !reportId;

  const draftReportId = useState(() => reportId ?? newReportId())[0];
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    () => (reportId ? findLabReport(reportId)?.sample.id : sampleIdParam) ?? ''
  );
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [labDialogOpen, setLabDialogOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');

  const [laboratory, setLaboratory] = useState(found?.report.laboratory ?? '');
  const [labReportId, setLabReportId] = useState(found?.report.labReportId ?? '');
  const [attachments, setAttachments] = useState<LabAttachment[]>(found?.report.attachments ?? []);
  const [results, setResults] = useState<LabResidue[]>(found?.report.residues ?? []);

  const gridRef = useRef<LabResiduesGridHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-seed results from the plot's treatments on first mount of a new report —
  // matches V1's Lab Results behavior. Existing reports keep their saved residues.
  const plotAnalytes = useMemo(() => getAnalytesForPlot(id!), [id]);
  useEffect(() => {
    if (!isNew) return;
    if (results.length > 0) return;
    const seeded: LabResidue[] = plotAnalytes.length > 0
      ? plotAnalytes.map(a => ({
          id: newResidueId(), analyte: a, residueLevel: null,
          residueValue: '', methodLoq: '0.01', methodLod: '', fromTreatment: true,
        }))
      : [{
          id: newResidueId(), analyte: '', residueLevel: null,
          residueValue: '', methodLoq: '', methodLod: '', fromTreatment: false,
        }];
    setResults(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSample = useMemo(() => allSamples.find(s => s.id === selectedSampleId), [allSamples, selectedSampleId]);

  const backToList = () => navigate(`/plot/${id}`, { state: { activeTab: 2 } });

  const labelForSample = (sid: string) => {
    const s = plotSamples.find(x => x.id === sid);
    if (!s) return sid;
    return `${s.sampleName || 'Unnamed'} · ${s.sampleCode}`;
  };

  const handleCreateSample = ({ name, type, date }: NewSampleInput) => {
    const s = createLabSample(id!);
    updateLabSample(s.id, { sampleName: name.trim(), commodity: type, dateOfSample: date });
    setSelectedSampleId(s.id);
    setSampleDialogOpen(false);
    toast.success('Sample created');
  };

  const allLabs = useMemo(() => [...new Set([...SEED_LABORATORIES, ...customLabs])].sort(), [customLabs]);
  const handleCreateLab = () => {
    const n = newLabName.trim();
    if (!n) return;
    setCustomLabs(prev => prev.includes(n) ? prev : [...prev, n]);
    setLaboratory(n);
    setLabDialogOpen(false);
    setNewLabName('');
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const added: LabAttachment[] = files.map((f, i) => ({ id: `att-${Date.now()}-${i}`, name: f.name, size: f.size }));
    setAttachments(prev => [...prev, ...added]);
    toast.success('File uploaded successfully');
    e.target.value = '';
  };

  const handleAddResult = () => gridRef.current?.addRow();
  const handleResidueAdd = (r: LabResidue) => setResults(prev => [...prev, r]);
  const handleResidueUpdate = (rid: string, patch: Partial<LabResidue>) =>
    setResults(prev => prev.map(x => (x.id === rid ? { ...x, ...patch } : x)));
  const handleResidueDelete = (rid: string) =>
    setResults(prev => prev.filter(x => x.id !== rid));

  const handleSave = () => {
    if (!selectedSampleId) { toast.error('Choose or create a sample for this report'); return; }
    if (!labReportId.trim() && !laboratory.trim()) {
      toast.error('Add a laboratory or a lab report ID before saving');
      return;
    }
    const payload: LabReport = {
      id: draftReportId, laboratory: laboratory.trim(), labReportId: labReportId.trim(), attachments, residues: results,
    };
    if (reportId) updateLabReport(reportId, payload);
    else addLabReport(selectedSampleId, payload);
    toast.success('Lab report saved');
    backToList();
  };

  const handleDelete = () => {
    if (reportId) deleteLabReport(reportId);
    toast.success('Lab report deleted');
    backToList();
  };

  if (!plot) return <Box p={3}>Loading…</Box>;

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Report details */}
          <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', p: 3 }}>
            <SectionLabel>Lab report details</SectionLabel>
            <Stack spacing={2.5} sx={{ width: { xs: '100%', md: '50%' }, minWidth: 320 }}>
              <Box>
                <FieldLabel required>Sample</FieldLabel>
                <Autocomplete
                  size="small"
                  disabled={!isNew}
                  options={[...plotSamples.map(s => s.id), CREATE_SAMPLE_ACTION]}
                  value={selectedSampleId || null}
                  getOptionLabel={(opt) => opt === CREATE_SAMPLE_ACTION ? 'Create new sample' : labelForSample(opt)}
                  filterOptions={(options, state) => {
                    const filtered = options.filter(o => o !== CREATE_SAMPLE_ACTION && labelForSample(o).toLowerCase().includes(state.inputValue.toLowerCase()));
                    filtered.push(CREATE_SAMPLE_ACTION);
                    return filtered;
                  }}
                  onChange={(_, v) => {
                    if (v === CREATE_SAMPLE_ACTION) setSampleDialogOpen(true);
                    else setSelectedSampleId(v ?? '');
                  }}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props;
                    if (option === CREATE_SAMPLE_ACTION) {
                      return (
                        <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Add sx={{ fontSize: 20, color: 'primary.main' }} />
                          <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>Create new sample</Typography>
                        </li>
                      );
                    }
                    return <li key={key} {...rest}>{labelForSample(option)}</li>;
                  }}
                  renderInput={(params) => <TextField {...params} placeholder="Choose a sample or create one" sx={fieldSx} />}
                />
                {selectedSample?.commodity && (
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                    {selectedSample.commodity}
                  </Typography>
                )}
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                <Box sx={{ flex: 1 }}>
                  <FieldLabel required>Laboratory</FieldLabel>
                  <Autocomplete
                    size="small"
                    options={[...allLabs, CREATE_LABORATORY_ACTION]}
                    value={laboratory || null}
                    getOptionLabel={(opt) => opt === CREATE_LABORATORY_ACTION ? 'Create new laboratory' : opt}
                    filterOptions={(options, state) => {
                      const filtered = options.filter(o => o !== CREATE_LABORATORY_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase()));
                      filtered.push(CREATE_LABORATORY_ACTION);
                      return filtered;
                    }}
                    onChange={(_, v) => {
                      if (v === CREATE_LABORATORY_ACTION) { setNewLabName(''); setLabDialogOpen(true); }
                      else setLaboratory(v ?? '');
                    }}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;
                      if (option === CREATE_LABORATORY_ACTION) {
                        return (
                          <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Add sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>Create new laboratory</Typography>
                          </li>
                        );
                      }
                      return <li key={key} {...rest}>{option}</li>;
                    }}
                    renderInput={(params) => <TextField {...params} placeholder="Choose a laboratory" sx={fieldSx} />}
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
                <Stack spacing={1.25} alignItems="flex-start">
                  <Button variant="soft" color="primary" size="small" startIcon={<AttachFile sx={{ fontSize: 18 }} />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px' }}>
                    Attach files
                  </Button>
                  <input ref={fileInputRef} type="file" multiple hidden accept=".pdf,.csv,.xlsx,.docx" onChange={handleFiles} />
                  {attachments.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {attachments.map(a => (
                        <AttachmentChip
                          key={a.id}
                          name={a.name}
                          onClick={() => window.open('about:blank', '_blank', 'noopener,noreferrer')}
                          onRemove={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>

          {/* Report results */}
          <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 3, pt: 3, pb: 2 }}>
              <SectionLabel>Report results</SectionLabel>
              <Button variant="soft" color="primary" startIcon={<Add />} onClick={handleAddResult}
                sx={{ px: 2, height: 36, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}>
                Add result
              </Button>
            </Stack>
            {results.length > 0 && (
              <Box sx={{ height: results.length * 52 + 56 + 4, borderTop: '1px solid', borderColor: 'divider' }}>
                <LabResiduesGrid
                  ref={gridRef}
                  residues={results}
                  reports={[]}
                  hideLabReport
                  onAdd={handleResidueAdd}
                  onUpdate={handleResidueUpdate}
                  onDelete={handleResidueDelete}
                />
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Pinned action bar */}
      <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', px: 3, py: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="text" color="inherit" onClick={backToList}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 3 }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave}
          sx={{ fontWeight: 600, textTransform: 'none', px: 4 }}>
          Save lab report
        </Button>
      </Box>

      <CreateSampleDialog open={sampleDialogOpen} onClose={() => setSampleDialogOpen(false)} onCreate={handleCreateSample} />
      <CreateLaboratoryDialog open={labDialogOpen} name={newLabName} onNameChange={setNewLabName}
        onCancel={() => setLabDialogOpen(false)} onSave={handleCreateLab} />
    </Box>
  );
}
