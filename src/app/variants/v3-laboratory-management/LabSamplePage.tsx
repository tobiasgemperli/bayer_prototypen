import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import {
  Box, Typography, Tabs, Tab, Button, TextField, Stack, Breadcrumbs, Link, Paper,
  Autocomplete, MenuItem, Select, IconButton, InputAdornment,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  NavigateNext, DeleteOutline, Add as AddIcon, AttachFile, InsertDriveFile,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { usePlots } from '../../data/plots-data';
import {
  Commodity, LabAttachment, LabReport, LabResidue, LabSampleData, ResidueLevel,
  RESIDUE_LEVEL_OPTIONS, COMMODITY_OPTIONS,
  createLabSample, emptyReport, newReportId,
  newResidueId, updateLabSample, useLabSamples,
} from '../../data/lab-results-data';
import { TableCard } from '../../design-system/TableCard';
import { fieldSx, FieldLabel, SectionLabel } from '../../design-system/FormField';

// ── Constants ─────────────────────────────────────────────────────────────────

const SEED_LABORATORIES = [
  'Eurofins',
  'SGS',
  'ALS Czech Republic',
  'Bureau Veritas',
  'Intertek',
  'Mérieux NutriSciences',
];

const SAMPLE_TYPES: Commodity[] = COMMODITY_OPTIONS;
const RESIDUE_LEVELS: ResidueLevel[] = RESIDUE_LEVEL_OPTIONS;

const CREATE_LABORATORY_ACTION = '__create_laboratory__';

// ── Samples tab — AddPlotPage-style centered form ─────────────────────────────

function SamplesTab({
  sample, onChange, onSaveAndContinue, onCancel,
}: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
  onSaveAndContinue: () => void;
  onCancel: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const errors = {
    sampleName: sample.sampleName.trim() ? undefined : 'Sample name is required',
    dateOfSample: sample.dateOfSample ? undefined : 'Date of sample is required',
    commodity: sample.commodity ? undefined : 'Sample type is required',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const err = (field: keyof typeof errors) => submitted ? errors[field] : undefined;

  const handleSave = () => {
    setSubmitted(true);
    if (hasErrors) {
      const count = Object.values(errors).filter(Boolean).length;
      toast.error(`Please fix ${count} required field${count > 1 ? 's' : ''} before saving`);
      return;
    }
    onSaveAndContinue();
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', p: 3, pb: 4 }}>
        <Paper elevation={0} sx={{
          width: '100%', maxWidth: 680, height: 'fit-content',
          borderRadius: '12px', border: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper', px: { xs: 3, sm: 4 }, pt: 3, pb: 3,
        }}>
          <SectionLabel>Sample details</SectionLabel>

          <Stack spacing={2.5}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <FieldLabel required>Sample name</FieldLabel>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{sample.sampleName.length}/40</Typography>
              </Box>
              <TextField fullWidth size="small" placeholder="Type here"
                value={sample.sampleName}
                onChange={(e) => { if (e.target.value.length <= 40) onChange({ sampleName: e.target.value }); }}
                error={!!err('sampleName')} helperText={err('sampleName')}
                sx={fieldSx} />
            </Box>

            <Box>
              <FieldLabel required>Date of sample</FieldLabel>
              <DatePicker
                value={sample.dateOfSample}
                onChange={(v) => onChange({ dateOfSample: v })}
                format="dd/MM/yyyy"
                slotProps={{ textField: {
                  size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY',
                  error: !!err('dateOfSample'), helperText: err('dateOfSample'), sx: fieldSx,
                } }}
              />
            </Box>

            <Box>
              <FieldLabel required>Sample type</FieldLabel>
              <Autocomplete size="small" options={SAMPLE_TYPES}
                value={sample.commodity} onChange={(_, v) => onChange({ commodity: v })}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Choose a sample type"
                    error={!!err('commodity')} helperText={err('commodity')} />
                )} sx={fieldSx} />
            </Box>

            <Box>
              <FieldLabel optional>Notes</FieldLabel>
              <TextField fullWidth size="small" multiline minRows={3}
                placeholder="Anything we should know about the sample…"
                value={sample.comments}
                onChange={(e) => onChange({ comments: e.target.value })}
                sx={fieldSx} />
            </Box>
          </Stack>
        </Paper>
      </Box>

      <ActionBar
        primary={{ label: 'Save and continue', onClick: handleSave }}
        onCancel={onCancel}
      />
    </Box>
  );
}

// ── Laboratory reports tab — editable rows ────────────────────────────────────

function LaboratoryReportsTab({
  sample, onChange, knownLaboratories, onAddLaboratory,
  onSaveAndContinue, onCancel,
}: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
  knownLaboratories: string[];
  onAddLaboratory: (name: string) => void;
  onSaveAndContinue: () => void;
  onCancel: () => void;
}) {
  const [newLabModalOpen, setNewLabModalOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);

  const reports = sample.reports ?? [];

  const setReports = (next: LabReport[]) => onChange({ reports: next });
  const patchRow = (id: string, patch: Partial<LabReport>) => {
    setReports(reports.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  const addRow = () => {
    const r = emptyReport();
    setReports([...reports, r]);
  };
  const removeRow = (id: string) => {
    setReports(reports.filter(r => r.id !== id));
    toast.success('Laboratory report removed');
  };

  const handleSave = () => {
    if (reports.length === 0) {
      toast.error('Add at least one laboratory report');
      return;
    }
    const incomplete = reports.filter(r => !r.laboratory.trim() || !r.labReportId.trim());
    if (incomplete.length > 0) {
      toast.error(`${incomplete.length} report${incomplete.length > 1 ? 's' : ''} missing Laboratory or Lab report ID`);
      return;
    }
    onSaveAndContinue();
  };

  const handleCommitNewLab = () => {
    const name = newLabName.trim();
    if (!name) return;
    onAddLaboratory(name);
    if (pendingRowId) patchRow(pendingRowId, { laboratory: name });
    setNewLabModalOpen(false);
    setNewLabName('');
    setPendingRowId(null);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {reports.length} laboratory report{reports.length !== 1 ? 's' : ''}
          </Typography>
          <Button
            variant="contained" color="primary" startIcon={<AddIcon />} onClick={addRow}
            sx={{ px: 2, height: 40, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >Add row</Button>
        </Stack>

        <TableCard>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', width: '40%' }}>Laboratory</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Lab report ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Attachments</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No laboratory reports yet — click <strong>Add row</strong> to start.
                    </TableCell>
                  </TableRow>
                ) : reports.map(r => (
                  <LaboratoryReportRow
                    key={r.id}
                    report={r}
                    knownLaboratories={knownLaboratories}
                    onPatch={(p) => patchRow(r.id, p)}
                    onCreateLaboratory={() => { setPendingRowId(r.id); setNewLabName(''); setNewLabModalOpen(true); }}
                    onRemove={() => removeRow(r.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableCard>
      </Box>

      <ActionBar
        primary={{ label: 'Save and continue', onClick: handleSave }}
        onCancel={onCancel}
      />

      <CreateLaboratoryDialog
        open={newLabModalOpen}
        name={newLabName}
        onNameChange={setNewLabName}
        onCancel={() => setNewLabModalOpen(false)}
        onSave={handleCommitNewLab}
      />
    </Box>
  );
}

function LaboratoryReportRow({
  report, knownLaboratories, onPatch, onCreateLaboratory, onRemove,
}: {
  report: LabReport;
  knownLaboratories: string[];
  onPatch: (patch: Partial<LabReport>) => void;
  onCreateLaboratory: () => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newAtt: LabAttachment[] = files.map((f, i) => ({
      id: `att-${Date.now()}-${i}`, name: f.name, size: f.size,
    }));
    onPatch({ attachments: [...report.attachments, ...newAtt] });
    toast.success('File uploaded successfully');
    e.target.value = '';
  };

  return (
    <TableRow hover>
      <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
        <Autocomplete
          size="small"
          options={[...knownLaboratories, CREATE_LABORATORY_ACTION]}
          value={report.laboratory || null}
          getOptionLabel={(opt) => opt === CREATE_LABORATORY_ACTION ? 'Create laboratory' : opt}
          filterOptions={(options, state) => {
            const filtered = options.filter(o => o !== CREATE_LABORATORY_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase()));
            filtered.push(CREATE_LABORATORY_ACTION);
            return filtered;
          }}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            if (option === CREATE_LABORATORY_ACTION) {
              return (
                <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AddIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>Create laboratory</Typography>
                </li>
              );
            }
            return <li key={key} {...rest}>{option}</li>;
          }}
          onChange={(_, v) => {
            if (v === CREATE_LABORATORY_ACTION) {
              onCreateLaboratory();
            } else {
              onPatch({ laboratory: v ?? '' });
            }
          }}
          renderInput={(params) => <TextField {...params} placeholder="Choose a laboratory" />}
          sx={fieldSx}
        />
      </TableCell>
      <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
        <TextField
          size="small" fullWidth placeholder="e.g. RPT-2024-001"
          value={report.labReportId}
          onChange={(e) => onPatch({ labReportId: e.target.value })}
          sx={fieldSx}
        />
      </TableCell>
      <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
        <Stack spacing={0.5}>
          <Button
            variant="soft" color="primary" size="small" startIcon={<AttachFile />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', alignSelf: 'flex-start' }}
          >
            {report.attachments.length === 0 ? 'Attach files' : `${report.attachments.length} file${report.attachments.length !== 1 ? 's' : ''}`}
          </Button>
          <input
            ref={fileInputRef} type="file" multiple hidden
            accept=".pdf,.csv,.xlsx,.docx"
            onChange={handleFiles}
          />
          {report.attachments.map(a => (
            <Stack key={a.id} direction="row" spacing={0.5} alignItems="center" sx={{ pl: 0.5 }}>
              <InsertDriveFile sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Link component="button"
                sx={{ fontSize: '0.75rem', color: 'primary.main', fontWeight: 600 }}
                onClick={() => toast.info(`Open ${a.name}`)}>
                {a.name}
              </Link>
              <IconButton size="small" onClick={() => onPatch({ attachments: report.attachments.filter(x => x.id !== a.id) })}>
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </TableCell>
      <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
        <IconButton size="small" onClick={onRemove}>
          <DeleteOutline fontSize="small" sx={{ color: 'text.secondary' }} />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

// ── Lab results tab — editable rows ───────────────────────────────────────────

function LabResultsTab({
  sample, onChange, onSave, onCancel,
}: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const residues = sample.residues;

  const setResidues = (next: LabResidue[]) => onChange({ residues: next });
  const patchRow = (id: string, patch: Partial<LabResidue>) => {
    setResidues(residues.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  const addRow = () => {
    setResidues([...residues, {
      id: newResidueId(), analyte: '', residueLevel: null,
      residueValue: '', methodLoq: '', methodLod: '', fromTreatment: false,
    }]);
  };
  const removeRow = (id: string) => {
    setResidues(residues.filter(r => r.id !== id));
    toast.success('Result removed');
  };

  const handleSave = () => {
    if (residues.length === 0) {
      toast.error('Add at least one result');
      return;
    }
    const incomplete = residues.filter(r => !r.analyte.trim() || !r.residueLevel);
    if (incomplete.length > 0) {
      toast.error(`${incomplete.length} result${incomplete.length > 1 ? 's' : ''} missing Analyte or Residue level`);
      return;
    }
    onSave();
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {residues.length} result{residues.length !== 1 ? 's' : ''}
          </Typography>
          <Button
            variant="contained" color="primary" startIcon={<AddIcon />} onClick={addRow}
            sx={{ px: 2, height: 40, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >Add row</Button>
        </Stack>

        <TableCard>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', width: '30%' }}>Analyte</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', width: '22%' }}>Residue level</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Residue (mg/kg)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Method LOQ (mg/kg)</TableCell>
                  <TableCell sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {residues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No results yet — click <strong>Add row</strong> to start.
                    </TableCell>
                  </TableRow>
                ) : residues.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                      <TextField
                        size="small" fullWidth placeholder="e.g. deltamethrin"
                        value={r.analyte}
                        onChange={(e) => patchRow(r.id, { analyte: e.target.value })}
                        sx={fieldSx}
                      />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                      <Select
                        size="small" fullWidth displayEmpty
                        value={r.residueLevel ?? ''}
                        onChange={(e) => patchRow(r.id, { residueLevel: (e.target.value || null) as ResidueLevel | null })}
                        renderValue={(v) => v ? String(v) : <Box sx={{ color: 'text.disabled' }}>Choose a level</Box>}
                        sx={{ ...fieldSx, bgcolor: 'white', borderRadius: '8px' }}
                      >
                        {RESIDUE_LEVELS.map(opt => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                      <TextField
                        size="small" fullWidth placeholder="-"
                        value={r.residueValue}
                        onChange={(e) => patchRow(r.id, { residueValue: e.target.value })}
                        disabled={r.residueLevel !== 'Residue'}
                        sx={fieldSx}
                      />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                      <TextField
                        size="small" fullWidth placeholder="0.01"
                        value={r.methodLoq}
                        onChange={(e) => patchRow(r.id, { methodLoq: e.target.value })}
                        sx={fieldSx}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                      <IconButton size="small" onClick={() => removeRow(r.id)}>
                        <DeleteOutline fontSize="small" sx={{ color: 'text.secondary' }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableCard>
      </Box>

      <ActionBar
        primary={{ label: 'Save laboratory report', onClick: handleSave }}
        onCancel={onCancel}
      />
    </Box>
  );
}

// ── Shared action bar ─────────────────────────────────────────────────────────

function ActionBar({
  primary, onCancel,
}: {
  primary: { label: string; onClick: () => void };
  onCancel: () => void;
}) {
  return (
    <Box sx={{
      flexShrink: 0, borderTop: '1px solid', borderColor: 'divider',
      bgcolor: 'background.paper', px: 3, py: 1.5,
      display: 'flex', justifyContent: 'center',
    }}>
      <Box sx={{ width: '100%', maxWidth: 680, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="text" color="inherit" onClick={onCancel}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 3 }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={primary.onClick}
          sx={{ fontWeight: 600, textTransform: 'none', px: 4 }}>
          {primary.label}
        </Button>
      </Box>
    </Box>
  );
}

// ── Create laboratory dialog ──────────────────────────────────────────────────

function CreateLaboratoryDialog({
  open, name, onNameChange, onSave, onCancel,
}: {
  open: boolean;
  name: string;
  onNameChange: (n: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Create new laboratory</Typography>
        <IconButton onClick={onCancel} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter the laboratory name as it appears on their reports.
        </Typography>
        <TextField fullWidth size="small" placeholder="e.g. Wessling Laboratories" autoFocus
          value={name} onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(); }}
          sx={fieldSx} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button variant="text" color="inherit" onClick={onCancel}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" disabled={!name.trim()} onClick={onSave}
          sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export function LabSamplePage() {
  const { id, sampleId } = useParams<{ id: string; sampleId?: string }>();
  const navigate = useNavigate();
  const plots = usePlots();
  const plot = useMemo(() => plots.find(p => p.id === id), [plots, id]);
  const allSamples = useLabSamples();

  const [draftId, setDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [customLabs, setCustomLabs] = useState<string[]>([]);

  useEffect(() => {
    if (sampleId) setDraftId(sampleId);
    else if (!draftId) setDraftId(createLabSample(id!).id);
  }, [sampleId, id]);

  const sample = useMemo(
    () => (draftId ? allSamples.find(s => s.id === draftId) : undefined),
    [allSamples, draftId]
  );

  const allLaboratories = useMemo(() => {
    const all = [...SEED_LABORATORIES, ...customLabs];
    return [...new Set(all)].sort();
  }, [customLabs]);

  const sampleValid = !!(sample && sample.sampleName.trim() && sample.dateOfSample && sample.commodity);

  if (!plot || !sample) return <Box p={3}>Loading…</Box>;

  const handlePatch = (patch: Partial<LabSampleData>) => updateLabSample(sample.id, patch);

  const handleCancel = () => navigate(`/plot/${id}`, { state: { activeTab: 2 } });

  const isNew = !sampleId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'background.default', height: '100%', overflow: 'hidden' }}>
      {/* Top zone — breadcrumb + title */}
      <Box sx={{ flexShrink: 0, px: 3, pt: 3, pb: 2 }}>
        <Breadcrumbs separator={<NavigateNext fontSize="small" color="disabled" />}>
          <Link underline="hover" color="text.secondary" onClick={() => navigate('/')}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Plots</Link>
          <Link underline="hover" color="text.secondary" onClick={() => navigate(`/plot/${id}`)}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            {plot.plotName} ({plot.crop})
          </Link>
          <Link underline="hover" color="text.secondary"
            onClick={() => navigate(`/plot/${id}`, { state: { activeTab: 2 } })}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Laboratory Management
          </Link>
        </Breadcrumbs>
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
          {isNew ? 'Laboratory report' : (sample.sampleName || 'Laboratory report')}
        </Typography>
      </Box>

      {/* Tab strip */}
      <Box sx={{ flexShrink: 0, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          indicatorColor="primary" textColor="primary"
          sx={{ minHeight: 48, '& .MuiTab-root': { minWidth: 100, color: 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&.Mui-selected': { color: 'primary.main' } } }}>
          <Tab label="Residue samples" />
          <Tab label="Lab reports" disabled={!sampleValid} />
          <Tab label="Lab results" disabled={!sampleValid} />
        </Tabs>
      </Box>

      {/* Active tab content */}
      {activeTab === 0 && (
        <SamplesTab
          sample={sample}
          onChange={handlePatch}
          onSaveAndContinue={() => {
            toast.success('Sample saved');
            setActiveTab(1);
          }}
          onCancel={handleCancel}
        />
      )}
      {activeTab === 1 && (
        <LaboratoryReportsTab
          sample={sample}
          onChange={handlePatch}
          knownLaboratories={allLaboratories}
          onAddLaboratory={(name) => setCustomLabs(prev => [...prev, name])}
          onSaveAndContinue={() => {
            toast.success('Laboratory reports saved');
            setActiveTab(2);
          }}
          onCancel={handleCancel}
        />
      )}
      {activeTab === 2 && (
        <LabResultsTab
          sample={sample}
          onChange={handlePatch}
          onSave={() => {
            toast.success('Laboratory report saved successfully');
            navigate(`/plot/${id}`, { state: { activeTab: 2 } });
          }}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}
