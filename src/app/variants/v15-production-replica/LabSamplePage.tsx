import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from '../variant-context';
import {
  Box, Typography, Tabs, Tab, Button, TextField, Stack, Breadcrumbs, Link, Paper,
  Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Checkbox,
  Select, MenuItem, Switch, FormControlLabel, Tooltip,
} from '@mui/material';
import {
  NavigateNext, DeleteOutline, Add, Print, Close as CloseIcon,
  EditOutlined, InfoOutlined, Search as SearchIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { usePlots } from '../../data/plots-data';
import {
  COMMODITY_OPTIONS, ANALYTE_OPTIONS, SUBSTANCE_ANALYTICAL_METHODS,
  ResidueLevel, LabResidue, LabSampleData,
  createLabSample, deleteLabSample, getAnalytesForPlot,
  newResidueId, updateLabSample, useLabSamples,
} from '../../data/lab-results-data';
import { LabReportForm } from '../../lab-shared/LabReportForm';
import { FieldLabel, SectionLabel, fieldSx } from '../../design-system/FormField';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { TableCard, EmDash } from '../../design-system/TableCard';
import { RowIconButton } from '../../design-system/grid/grid-shared';
import { Th } from './LabResultsContent';

// V15 replicates the live production app's "New/Edit Sample" wizard exactly
// (see research/production-lab-results-flow-analysis.txt for the source
// screenshots this file was built from): a 3-tab Sample / Lab Report /
// Report results page, tabs 2 and 3 locked until the Sample tab's required
// fields are filled, a "Sample Code" panel + substance/analytical-method
// reference table that appears once the sample is valid, and a required
// "Analytes as a result of the treatments reported" modal (with a
// below-LOQ-by-default confirm warning) the first time Report results is
// opened on a fresh sample.

// ── Residue level vocabulary ──────────────────────────────────────────────────
// Production's dropdown options were never visible in the screenshots (only
// the "Choose an option" placeholder was), so this reuses the repo's existing
// ResidueLevel vocabulary (data/lab-results-data.ts) with production-style
// display labels. LOD (limit of detection) and LOQ (limit of quantification)
// are different analytical thresholds, so a row whose value is 'Below LOQ'
// is labeled with LOQ, matching the confirm dialog's own "reported as Below
// LOQ" copy below and this repo's data model (the ResidueLevel value itself
// is 'Below LOQ', never 'Below LOD').
const LEVEL_OPTIONS: { value: ResidueLevel; label: string }[] = [
  { value: 'Residue', label: 'Detected' },
  { value: 'Trace', label: 'Trace' },
  { value: 'Below LOQ', label: 'Below LOQ' },
  { value: 'Not analyzed', label: 'Not analyzed' },
];

function levelLabel(level: ResidueLevel | null): string {
  if (level == null) return '-';
  return LEVEL_OPTIONS.find(o => o.value === level)?.label ?? level;
}

// ── Sample tab ────────────────────────────────────────────────────────────────
// Exported so v16-multi-report can reuse it verbatim — the Sample tab (and
// its Sample Code panel + analytical-method reference table) doesn't change
// for that variant's added multi-report/API-distinction features.

export function SampleTab({ sample, onChange, isNew }: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
  isNew: boolean;
}) {
  const navigate = useNavigate();

  const canSave = sample.sampleName.trim().length > 0
    && sample.dateOfSample !== null
    && sample.commodity !== null;

  const handleSave = () => {
    if (!canSave) {
      toast.error('Please fill all required fields');
      return;
    }
    toast.success(isNew ? 'Lab sample created successfully' : 'Lab sample updated successfully');
  };

  const handleCancel = () => navigate(`/plot/${sample.plotId}`, { state: { activeTab: 2 } });

  return (
    <Box sx={{ p: 3, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <Box sx={{ width: { xs: '100%', md: '50%' }, minWidth: 320 }}>
        <SectionLabel>Sample</SectionLabel>

        <Stack spacing={2}>
          <Box>
            <FieldLabel required>Sample name</FieldLabel>
            <TextField
              size="small" fullWidth placeholder="Type here"
              value={sample.sampleName}
              onChange={(e) => onChange({ sampleName: e.target.value })}
              sx={fieldSx}
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel required>Date of sample</FieldLabel>
              <DatePicker
                value={sample.dateOfSample}
                onChange={(v) => onChange({ dateOfSample: v })}
                format="dd/MM/yyyy"
                slotProps={{ textField: {
                  size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY', sx: fieldSx,
                } }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel required>Commodity</FieldLabel>
              <Autocomplete
                size="small"
                options={COMMODITY_OPTIONS}
                value={sample.commodity}
                onChange={(_, v) => onChange({ commodity: v })}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Choose an option" />
                )}
                sx={fieldSx}
              />
            </Box>
          </Stack>

          <Box>
            <FieldLabel>Comments/ Notes</FieldLabel>
            <TextField
              size="small" fullWidth multiline minRows={2}
              value={sample.comments}
              onChange={(e) => onChange({ comments: e.target.value })}
              sx={fieldSx}
            />
          </Box>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button variant="text" color="inherit" onClick={handleCancel}
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 3 }}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={handleSave}
              sx={{ fontWeight: 600, textTransform: 'none', px: 4 }}>
              Save
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Sample Code panel + substance/analytical-method reference table —
          only appears once the sample's required fields are filled in,
          mirroring production's "only after the sample is saved" gating. */}
      {canSave && (
        <Box sx={{ width: { xs: '100%', md: '40%' }, minWidth: 280 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', mb: 1 }}>
            Sample Code
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To ensure traceability of your sample, you can print the sample label by clicking
            on &ldquo;Sample label&rdquo; below and attach it to the sample container.
          </Typography>
          <Button
            variant="soft" color="primary" startIcon={<Print sx={{ fontSize: 18 }} />}
            onClick={() => window.open(`/sample-sheet/${sample.id}`, '_blank', 'noopener,noreferrer')}
            sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', mb: 3 }}
          >
            Sample label
          </Button>

          <Box sx={{
            p: 2, borderRadius: '8px', bgcolor: 'warning.softBg',
            border: '1px solid', borderColor: 'warning.light',
          }}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700 }}>Note:</Box> Residues of most substances
              can be analyzed using routine multi-residue analytical methods. Nevertheless, if your
              plot has been sprayed with any of the substances listed below, you should request the
              laboratory to use the corresponding analytical method:
            </Typography>
            <TableContainer sx={{ maxHeight: 280, bgcolor: 'background.paper', borderRadius: '6px' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Substance Applied</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Analytical method and target analyte</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SUBSTANCE_ANALYTICAL_METHODS.map((row) => (
                    <TableRow key={row.substance}>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{row.substance}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{row.method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Lab Report tab — already a faithful match to production; reuse as-is ─────

function LabReportTab({ sample, onChange }: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
}) {
  const canSave = sample.laboratory.trim() !== '' && sample.labReportId.trim() !== '';
  const handleSave = () => {
    if (!canSave) return;
    toast.success('Lab sample updated successfully');
  };

  return (
    <Box sx={{ p: 3 }}>
      <LabReportForm
        value={{
          laboratory: sample.laboratory,
          labReportId: sample.labReportId,
          attachments: sample.attachments,
        }}
        onChange={(patch) => onChange(patch)}
      />
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
        <Button
          variant="contained" color="primary" disabled={!canSave} onClick={handleSave}
          sx={{ minWidth: 200, height: 36, fontWeight: 600, textTransform: 'none', borderRadius: '8px' }}
        >Save</Button>
      </Box>
    </Box>
  );
}

// ── Report results tab ────────────────────────────────────────────────────────

type PendingRow = { analyte: string; residueLevel: ResidueLevel | null; residueValue: string; methodLoq: string };

/** Single-row Add/Edit popup — used by the grid's "Add Residue" button and
 *  each row's edit icon. Mirrors the field set from the initial completion
 *  modal (Residue level / Residue (mg/kg) / Method LOQ (mg/kg)). */
function ResidueEditDialog({ open, initialAnalyte, initial, onClose, onSave }: {
  open: boolean;
  initialAnalyte?: string;
  initial?: LabResidue | null;
  onClose: () => void;
  onSave: (values: { analyte: string; residueLevel: ResidueLevel | null; residueValue: string; methodLoq: string }) => void;
}) {
  const isEditing = !!initial;
  const [analyte, setAnalyte] = useState(initial?.analyte ?? initialAnalyte ?? '');
  const [residueLevel, setResidueLevel] = useState<ResidueLevel | null>(initial?.residueLevel ?? null);
  const [residueValue, setResidueValue] = useState(initial?.residueValue ?? '');
  const [methodLoq, setMethodLoq] = useState(initial?.methodLoq ?? '0.01');

  useEffect(() => {
    if (open) {
      setAnalyte(initial?.analyte ?? initialAnalyte ?? '');
      setResidueLevel(initial?.residueLevel ?? null);
      setResidueValue(initial?.residueValue ?? '');
      setMethodLoq(initial?.methodLoq ?? '0.01');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const canSave = analyte.trim() !== '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          {isEditing ? 'Edit residue' : 'Add residue'}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set the residue level and values reported by the lab for this analyte.
        </Typography>
        <Stack spacing={2}>
          <Box>
            <FieldLabel required>Analyte</FieldLabel>
            <Autocomplete
              size="small" freeSolo disabled={isEditing}
              options={ANALYTE_OPTIONS}
              value={analyte}
              onInputChange={(_, v) => setAnalyte(v)}
              renderInput={(params) => <TextField {...params} placeholder="Choose or type an analyte" sx={fieldSx} />}
            />
          </Box>
          <Box>
            <FieldLabel>Residue level</FieldLabel>
            <Select
              size="small" fullWidth displayEmpty
              value={residueLevel ?? ''}
              onChange={(e) => setResidueLevel((e.target.value || null) as ResidueLevel | null)}
              sx={fieldSx}
            >
              <MenuItem value=""><em>Choose an option</em></MenuItem>
              {LEVEL_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box>
            <FieldLabel>Residue (mg/kg)</FieldLabel>
            <TextField
              size="small" fullWidth placeholder="-"
              disabled={residueLevel !== 'Residue'}
              value={residueLevel === 'Residue' ? residueValue : ''}
              onChange={(e) => setResidueValue(e.target.value)}
              sx={fieldSx}
            />
          </Box>
          <Box>
            <FieldLabel>Method LOQ (mg/kg)</FieldLabel>
            <TextField
              size="small" fullWidth
              value={methodLoq}
              onChange={(e) => setMethodLoq(e.target.value)}
              sx={fieldSx}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="text" color="inherit"
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave({ analyte, residueLevel, residueValue, methodLoq })}
          variant="contained" color="primary" disabled={!canSave}
          sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ReportResultsTab({ sample, onChange, onLeaveTab }: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
  /** Called when the user backs out of the required completion modal instead
   *  of completing it. There is no "empty results" state to fall back to —
   *  production's pop-up can't be gotten past without either adding the
   *  treatment-derived analytes to Report results or leaving the tab
   *  entirely, so Cancel exits back to the Sample tab rather than closing
   *  into a blank grid. */
  onLeaveTab: () => void;
}) {
  const plotAnalytes = useMemo(() => getAnalytesForPlot(sample.plotId), [sample.plotId]);

  // Required completion modal, pre-populated from the plot's reported
  // treatments. See production screenshots 7-9 in
  // research/production-lab-results-flow-analysis.txt. Re-triggers any time
  // residues drops back to zero while the plot has treatment-derived
  // analytes (e.g. the user bulk-deletes every row) — there's never a way to
  // land on this tab with treatment analytes pending and no pop-up.
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    if (sample.residues.length === 0 && plotAnalytes.length > 0) {
      setPendingRows(plotAnalytes.map((a) => ({ analyte: a, residueLevel: null, residueValue: '', methodLoq: '0.01' })));
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample.residues.length, plotAnalytes.length]);

  const [search, setSearch] = useState('');
  const [viewNotDetected, setViewNotDetected] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editState, setEditState] = useState<{ mode: 'add' | 'edit'; row: LabResidue | null } | null>(null);

  const updatePendingRow = (index: number, patch: Partial<PendingRow>) => {
    setPendingRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const commitPendingRows = () => {
    const residues: LabResidue[] = pendingRows.map((r) => ({
      id: newResidueId(),
      analyte: r.analyte,
      residueLevel: r.residueLevel ?? 'Below LOQ',
      residueValue: r.residueLevel === 'Residue' ? r.residueValue : '',
      methodLoq: r.methodLoq,
      methodLod: '',
      fromTreatment: true,
    }));
    onChange({ residues: [...sample.residues, ...residues] });
    toast.success('Lab sample created successfully');
    setModalOpen(false);
    setWarningOpen(false);
  };

  const handleModalSave = () => {
    const hasUnset = pendingRows.some((r) => r.residueLevel === null);
    if (hasUnset) { setWarningOpen(true); return; }
    commitPendingRows();
  };

  const handleModalCancel = () => onLeaveTab();

  // ── Grid-equivalent table ───────────────────────────────────────────────
  const visibleResidues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sample.residues.filter((r) => {
      if (q && !r.analyte.toLowerCase().includes(q)) return false;
      if (!viewNotDetected && r.residueLevel === 'Below LOQ') return false;
      return true;
    });
  }, [sample.residues, search, viewNotDetected]);

  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(e.target.checked ? visibleResidues.map((r) => r.id) : []);
  };

  const handleBulkDelete = () => {
    onChange({ residues: sample.residues.filter((r) => !selected.includes(r.id)) });
    toast.success(`${selected.length} residue${selected.length !== 1 ? 's' : ''} deleted`);
    setSelected([]);
    setAnchorEl(null);
  };

  const menuActions: ActionItem[] = [
    { label: selected.length === 1 ? 'Delete residue' : 'Delete residues',
      icon: <DeleteOutline fontSize="small" />, key: 'delete',
      color: 'error.main', onClick: handleBulkDelete },
  ];

  const openAdd = () => setEditState({ mode: 'add', row: null });
  const openEdit = (row: LabResidue) => setEditState({ mode: 'edit', row });
  const closeEdit = () => setEditState(null);

  const handleEditSave = (values: { analyte: string; residueLevel: ResidueLevel | null; residueValue: string; methodLoq: string }) => {
    if (editState?.mode === 'edit' && editState.row) {
      const id = editState.row.id;
      onChange({
        residues: sample.residues.map((r) => (r.id === id ? {
          ...r,
          residueLevel: values.residueLevel,
          residueValue: values.residueLevel === 'Residue' ? values.residueValue : '',
          methodLoq: values.methodLoq,
        } : r)),
      });
      toast.success('Residue updated');
    } else {
      const fresh: LabResidue = {
        id: newResidueId(),
        analyte: values.analyte,
        residueLevel: values.residueLevel,
        residueValue: values.residueLevel === 'Residue' ? values.residueValue : '',
        methodLoq: values.methodLoq,
        methodLod: '',
        fromTreatment: false,
      };
      onChange({ residues: [...sample.residues, fresh] });
      toast.success('Residue added');
    }
    setEditState(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1.5}>
          <Button
            variant="soft" color="primary" startIcon={<Add />}
            onClick={openAdd}
            sx={{ height: 40, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >
            Add Residue
          </Button>
          <TextField
            size="small" placeholder="Search"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.disabled', fontSize: 20, mr: 0.5 }} />,
              sx: { borderRadius: '8px' },
            }}
            sx={{ width: 200, '& .MuiOutlinedInput-root': { height: 40, bgcolor: 'white' } }}
          />
          <FormControlLabel
            labelPlacement="start"
            control={<Switch size="small" checked={viewNotDetected} onChange={(e) => setViewNotDetected(e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary' }}>View below LOQ</Typography>}
            sx={{ ml: 0 }}
          />
          <OptionsTrigger
            onClick={(e) => setAnchorEl(e.currentTarget)}
            disabled={selected.length === 0}
            hasSelection={selected.length > 0}
          />
          <ActionMenu
            anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            actions={menuActions}
          />
        </Stack>
      </Box>

      <Box sx={{ p: 2 }}>
        {sample.residues.length === 0 ? (
          <Box sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: '12px',
            p: 4, textAlign: 'center',
          }}>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>
              No analytes added yet.
            </Typography>
          </Box>
        ) : (
          <TableCard>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selected.length > 0 && selected.length < visibleResidues.length}
                        checked={visibleResidues.length > 0 && selected.length === visibleResidues.length}
                        onChange={toggleAll}
                      />
                    </TableCell>
                    <Th>Analyte</Th>
                    <Th>Residue level</Th>
                    <Th>Residue (mg/kg)</Th>
                    <Th>Method LOQ (mg/kg)</Th>
                    <TableCell sx={{ width: 0 }}>More</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleResidues.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {r.fromTreatment && (
                            <Tooltip title="Derived from this plot's reported treatments" arrow placement="top" enterDelay={150}>
                              <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                            </Tooltip>
                          )}
                          <span>{r.analyte}</span>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{levelLabel(r.residueLevel)}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>
                        {r.residueLevel === 'Residue' ? (r.residueValue || <EmDash />) : <EmDash />}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{r.methodLoq || <EmDash />}</TableCell>
                      <TableCell align="right">
                        <RowIconButton label="Edit" onClick={() => openEdit(r)}>
                          <EditOutlined fontSize="small" />
                        </RowIconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TableCard>
        )}
      </Box>

      {/* Required completion modal — first visit on a fresh sample only */}
      <Dialog open={modalOpen} onClose={handleModalCancel} fullWidth maxWidth="md"
        PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
        <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
            Analytes as a result of the treatments reported
          </Typography>
          <IconButton onClick={handleModalCancel} sx={{ color: 'text.secondary', p: 0.5 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please complete the reported residue levels for these analytes. These analytes are a
            result of the plot&apos;s reported treatments.
          </Typography>
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 } }}>
                  <TableCell>Analyte</TableCell>
                  <TableCell>Residue level</TableCell>
                  <TableCell>Residue (mg/kg)</TableCell>
                  <TableCell>Method LOQ (mg/kg)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingRows.map((row, i) => (
                  <TableRow key={row.analyte}>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{row.analyte}</TableCell>
                    <TableCell>
                      <Select
                        size="small" fullWidth displayEmpty variant="standard"
                        value={row.residueLevel ?? ''}
                        onChange={(e) => updatePendingRow(i, { residueLevel: (e.target.value || null) as ResidueLevel | null })}
                      >
                        <MenuItem value=""><em>Choose an option</em></MenuItem>
                        {LEVEL_OPTIONS.map((o) => (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {row.residueLevel === 'Residue' ? (
                        <TextField
                          size="small" variant="standard" placeholder="-"
                          value={row.residueValue}
                          onChange={(e) => updatePendingRow(i, { residueValue: e.target.value })}
                        />
                      ) : <EmDash />}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small" variant="standard"
                        value={row.methodLoq}
                        onChange={(e) => updatePendingRow(i, { methodLoq: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={handleModalCancel} variant="text" color="inherit"
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
            Cancel
          </Button>
          <Button onClick={handleModalSave} variant="contained" color="primary"
            sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Nested confirm — unset rows default to Below LOQ / not detected */}
      <Dialog open={warningOpen} onClose={() => setWarningOpen(false)} maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Warning!</Typography>
          <Typography variant="body2" color="text.secondary">
            If you save now all the values not informed will be reported as Below LOQ
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1, pb: 3 }}>
          <Button onClick={() => setWarningOpen(false)} variant="text" color="primary"
            sx={{ fontWeight: 600, textTransform: 'none' }}>
            Cancel &amp; Review
          </Button>
          <Button onClick={commitPendingRows} variant="text" color="primary"
            sx={{ fontWeight: 700, textTransform: 'none' }}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit single residue */}
      <ResidueEditDialog
        open={!!editState}
        initial={editState?.row ?? null}
        onClose={closeEdit}
        onSave={handleEditSave}
      />
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LabSamplePage() {
  const { id, sampleId } = useParams<{ id: string; sampleId?: string }>();
  const navigate = useNavigate();
  const plots = usePlots();
  const plot = useMemo(() => plots.find(p => p.id === id), [plots, id]);
  const allSamples = useLabSamples();

  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (sampleId) {
      setDraftId(sampleId);
    } else if (!draftId) {
      const created = createLabSample(id!);
      setDraftId(created.id);
    }
  }, [sampleId, id]);

  const sample = useMemo(
    () => (draftId ? allSamples.find(s => s.id === draftId) : undefined),
    [allSamples, draftId]
  );

  const [activeTab, setActiveTab] = useState(0);
  const sampleValid = !!(sample && sample.sampleName.trim() && sample.dateOfSample && sample.commodity);

  if (!plot || !sample) {
    return <Box p={3}>Loading…</Box>;
  }

  const handlePatch = (patch: Partial<LabSampleData>) => {
    updateLabSample(sample.id, patch);
  };

  const handleDelete = () => {
    deleteLabSample(sample.id);
    toast.success('Lab sample deleted');
    navigate(`/plot/${id}`, { state: { activeTab: 2 } });
  };

  const isNew = !sampleId;

  return (
    <Box sx={{
      flexGrow: 1, display: 'flex', flexDirection: 'column',
      bgcolor: 'background.default', height: '100%', overflow: 'auto', p: 3, gap: 2,
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Breadcrumbs separator={<NavigateNext fontSize="small" color="disabled" />}>
          <Link
            underline="hover" color="text.secondary"
            onClick={() => navigate('/')}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}
          >Plots</Link>
          <Link
            underline="hover" color="text.secondary"
            onClick={() => navigate(`/plot/${id}`)}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}
          >{plot.plotName} ({plot.crop})</Link>
          <Link
            underline="hover" color="text.secondary"
            onClick={() => navigate(`/plot/${id}`, { state: { activeTab: 2 } })}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}
          >Lab results</Link>
        </Breadcrumbs>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          New/Edit Sample
        </Typography>
      </Box>

      <Paper elevation={0} sx={{
        flexGrow: 1, display: 'flex', flexDirection: 'column',
        borderRadius: '12px', border: '1px solid', borderColor: 'divider',
        overflow: 'visible', bgcolor: 'background.paper',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab} onChange={(_, v) => setActiveTab(v)}
            indicatorColor="primary" textColor="primary"
            sx={{ minHeight: 48, '& .MuiTab-root': { minWidth: 100, color: 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&.Mui-selected': { color: 'primary.main' } } }}
          >
            <Tab label="Sample" />
            <Tab label="Lab Report" disabled={!sampleValid} />
            <Tab label="Report results" disabled={!sampleValid} />
          </Tabs>
          {sampleValid && (
            <Button
              startIcon={<DeleteOutline />} color="inherit" onClick={handleDelete}
              sx={{ fontWeight: 600, textTransform: 'none', color: 'text.secondary' }}
            >Delete</Button>
          )}
        </Box>

        {activeTab === 0 && <SampleTab sample={sample} onChange={handlePatch} isNew={isNew} />}
        {activeTab === 1 && <LabReportTab sample={sample} onChange={handlePatch} />}
        {activeTab === 2 && <ReportResultsTab sample={sample} onChange={handlePatch} onLeaveTab={() => setActiveTab(0)} />}
      </Paper>
    </Box>
  );
}
