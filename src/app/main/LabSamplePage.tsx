import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from '../variants/variant-context';
import {
  Box, Typography, Tabs, Tab, Button, TextField, Stack, Breadcrumbs, Link, Paper,
  Autocomplete,
} from '@mui/material';
import {
  NavigateNext, DeleteOutline, Add, OpenInNew,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { usePlots } from '../data/plots-data';
import {
  COMMODITY_OPTIONS,
  LabResidue, LabSampleData,
  createLabSample, deleteLabSample, getAnalytesForPlot,
  newResidueId, updateLabSample, useLabSamples,
} from '../data/lab-results-data';
import { LabReportForm } from '../lab-shared/LabReportForm';
import { LabResiduesGrid, LabResiduesGridHandle } from '../lab-shared/LabResiduesGrid';
import { FieldLabel, SectionLabel, fieldSx } from '../design-system/FormField';
import { OptionsTrigger } from '../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../design-system/ActionMenu';
import { GridToolbar, GridCountBar, GridSearchField } from '../design-system/grid/grid-shared';

// ── Sample tab ────────────────────────────────────────────────────────────────

export function SampleTab({ sample, onChange, isNew, hideActions = false }: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
  isNew: boolean;
  /** Hide the inline Cancel/Save row when the host page provides its own action bar. */
  hideActions?: boolean;
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
    navigate(`/plot/${sample.plotId}`, { state: { activeTab: 2 } });
  };

  const handleCancel = () => navigate(`/plot/${sample.plotId}`, { state: { activeTab: 2 } });

  const pdfReady = canSave;

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-start' }}>
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
              <FieldLabel required>Sample date</FieldLabel>
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

          {pdfReady && (
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2.5, mt: 0.5 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.5 }}>
                Your sample label is ready
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Print it and attach it to the sample container so the lab can trace it back to this record.
              </Typography>
              <Button variant="soft" color="primary"
                startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                onClick={() => window.open('about:blank', '_blank', 'noopener,noreferrer')}
                sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '6px' }}
              >Open PDF</Button>
            </Box>
          )}

          {!hideActions && (
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
          )}
        </Stack>
      </Box>
    </Box>
  );
}

// ── Lab Report tab ────────────────────────────────────────────────────────────

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

// ── Report Results tab ────────────────────────────────────────────────────────
// Editable grid (EditableDataGrid SSOT). Analytes derived from the plot's
// treatments are seeded on first visit with fromTreatment=true. Users can add
// manually-entered rows. Per CONVENTIONS §8, the toolbar Options menu hides
// when nothing is selected.

export function ReportResultsTab({ sample, onChange }: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
}) {
  const gridRef = useRef<LabResiduesGridHandle>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [search, setSearch] = useState('');

  const plotAnalytes = useMemo(() => getAnalytesForPlot(sample.plotId), [sample.plotId]);

  // First visit seeds the residues:
  //  - one row per treatment-derived analyte (fromTreatment=true, level null)
  //  - or one empty manual row if the plot has no treatments yet
  useEffect(() => {
    if (sample.residues.length > 0) return;
    const seeded: LabResidue[] = plotAnalytes.length > 0
      ? plotAnalytes.map(a => ({
          id: newResidueId(), analyte: a, residueLevel: null,
          residueValue: '', methodLoq: '0.01', methodLod: '', fromTreatment: true,
        }))
      : [{
          id: newResidueId(), analyte: '', residueLevel: null,
          residueValue: '', methodLoq: '', methodLod: '', fromTreatment: false,
        }];
    onChange({ residues: seeded });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample.id]);

  const handleAdd = (r: LabResidue) => {
    onChange({ residues: [...sample.residues, r] });
  };
  const handleUpdate = (id: string, patch: Partial<LabResidue>) => {
    onChange({ residues: sample.residues.map(x => x.id === id ? { ...x, ...patch } : x) });
  };
  const handleDelete = (id: string) => {
    onChange({ residues: sample.residues.filter(x => x.id !== id) });
    toast.success('Residue deleted');
  };
  const handleBulkDelete = () => {
    if (!selected.length) return;
    gridRef.current?.deleteRows(selected);
    toast.success(`${selected.length} residue${selected.length !== 1 ? 's' : ''} deleted`);
    setSelected([]);
    setAnchorEl(null);
  };

  const menuActions: ActionItem[] = useMemo(() => ([
    { label: selected.length === 1 ? 'Delete residue' : 'Delete residues',
      icon: <DeleteOutline fontSize="small" />, key: 'delete',
      color: 'error.main', onClick: handleBulkDelete },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [selected]);

  // Wait for the seed effect before mounting the grid — EditableDataGrid
  // captures initialData once and ignores later updates.
  if (sample.residues.length === 0) return null;

  const reports = sample.reports ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <GridToolbar>
        <Box />
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button
            variant="soft" color="primary" startIcon={<Add />}
            onClick={() => gridRef.current?.addRow()}
            sx={{ height: 36, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >
            Add residue
          </Button>
          <GridSearchField
            placeholder="Search residues…"
            value={search}
            onChange={(v) => { setSearch(v); gridRef.current?.setFilter(v); }}
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
      </GridToolbar>
      <GridCountBar count={sample.residues.length} label="residue" />
      <Box sx={{ height: sample.residues.length * 52 + 56 + 4 }}>
        <LabResiduesGrid
          ref={gridRef}
          residues={sample.residues}
          reports={reports}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onSelectionChange={setSelected}
        />
      </Box>
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

  // Maintain or create a draft sample
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
  // Sample tab gated until first save (we still allow free editing — for Bayer flow Lab Report & Report results are disabled until sample fields are valid)
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
      {/* Breadcrumbs & title */}
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
          {isNew ? 'New/Edit Sample' : (sample.sampleName || 'New/Edit Sample')}
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
          <Button
            startIcon={<DeleteOutline />} color="inherit" onClick={handleDelete}
            sx={{ fontWeight: 600, textTransform: 'none', color: 'text.secondary' }}
          >Delete</Button>
        </Box>

        {activeTab === 0 && <SampleTab sample={sample} onChange={handlePatch} isNew={isNew} />}
        {activeTab === 1 && <LabReportTab sample={sample} onChange={handlePatch} />}
        {activeTab === 2 && <ReportResultsTab sample={sample} onChange={handlePatch} />}
      </Paper>
    </Box>
  );
}
