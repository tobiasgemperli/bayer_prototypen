import React, { useMemo, useState } from 'react';
import {
  Box, Button, InputAdornment, Stack, TextField,
} from '@mui/material';
import { Add, DeleteOutline, Search } from '@mui/icons-material';
import { toast } from 'sonner';
import { EmptyState } from '../../design-system/EmptyState';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import {
  useLabSamples, LabSampleData,
  createLabSample, deleteLabSample, updateLabSample, LABS_WITH_API_CONNECTION,
} from '../../data/lab-results-data';
import { useNavigate } from '../variant-context';
import noLabResultsImg from '../../assets/empty-states/no-lab-results-v01.jpg';
import { SamplesReportsTable } from './SamplesReportsTable';
import { SampleFormDialog, SampleFormValues, toFormValues } from './SampleFormDialog';
import { SampleCreatedDialog } from './SampleCreatedDialog';
import { AddReportResultsDialog } from './AddReportResultsDialog';

export function LabManagementContent({ plotId }: { plotId: string }) {
  const navigate = useNavigate();
  const allSamples = useLabSamples();
  // V10 has no draft state for samples — filter them out so seed draft companions are invisible.
  const samples = useMemo(() => allSamples.filter((s) => s.plotId === plotId && !s.isDraft), [allSamples, plotId]);

  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingSample = editingId ? samples.find((s) => s.id === editingId) ?? null : null;

  // Post-creation success dialog
  const [createdOpen, setCreatedOpen] = useState(false);
  const [createdSampleId, setCreatedSampleId] = useState<string | null>(null);
  const [createdLab, setCreatedLab] = useState('');

  // "Add report & results" quick-add popup. openToken forces a fresh remount
  // on every open (even re-opening the same sample) so step state never leaks
  // across sessions — see AddReportResultsDialog's key usage below.
  const [addReportSampleId, setAddReportSampleId] = useState<string | null>(null);
  const [addReportOpenToken, setAddReportOpenToken] = useState(0);
  const addReportSample = addReportSampleId
    ? allSamples.find((s) => s.id === addReportSampleId) ?? null
    : null;
  const openAddReport = (id: string) => {
    setAddReportSampleId(id);
    setAddReportOpenToken((t) => t + 1);
  };
  const closeAddReport = () => setAddReportSampleId(null);

  const openCreate = () => { setEditingId(null); setFormOpen(true); };
  const openEdit = (s: LabSampleData) => { setEditingId(s.id); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const filteredSamples = useMemo(() => {
    if (!search.trim()) return samples;
    const q = search.toLowerCase();
    return samples.filter((s) =>
      s.sampleName.toLowerCase().includes(q) ||
      s.sampleCode.toLowerCase().includes(q) ||
      (s.commodity ?? '').toLowerCase().includes(q) ||
      (s.laboratory ?? '').toLowerCase().includes(q)
    );
  }, [samples, search]);

  const persistSample = (values: SampleFormValues, isDraft: boolean): LabSampleData => {
    if (editingId) {
      updateLabSample(editingId, { ...values, isDraft });
      return { ...(samples.find((s) => s.id === editingId) as LabSampleData), ...values, isDraft };
    }
    const fresh = createLabSample(plotId);
    updateLabSample(fresh.id, { ...values, isDraft });
    return { ...fresh, ...values, isDraft };
  };

  const handleCreate = (values: SampleFormValues) => {
    const wasEditing = !!editingId;
    const s = persistSample(values, false);
    setFormOpen(false);
    if (!wasEditing) {
      setCreatedSampleId(s.id);
      setCreatedLab(values.laboratory);
      setCreatedOpen(true);
    } else {
      toast.success('Sample updated');
    }
  };

const handleDuplicate = (s: LabSampleData) => {
    const fresh = createLabSample(plotId);
    updateLabSample(fresh.id, {
      sampleName: s.sampleName,
      dateOfSample: s.dateOfSample,
      commodity: s.commodity,
      comments: s.comments,
      laboratory: s.laboratory,
      isDraft: false,
    });
    toast.success('Sample duplicated');
  };

  const handleDelete = (s: LabSampleData) => {
    deleteLabSample(s.id);
    toast.success('Sample deleted');
  };

  const handleAddReportAndResults = (s: LabSampleData) => {
    openAddReport(s.id);
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    selected.forEach((id) => deleteLabSample(id));
    toast.success(`${selected.length} sample${selected.length !== 1 ? 's' : ''} deleted`);
    setSelected([]);
    setAnchorEl(null);
  };

  const menuActions: ActionItem[] = [
    {
      label: `Delete sample${selected.length !== 1 ? 's' : ''}`,
      icon: <DeleteOutline fontSize="small" />, key: 'delete',
      onClick: handleBulkDelete,
    },
  ];

  if (samples.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <EmptyState
          illustration={noLabResultsImg}
          title="Manage samples and lab reports"
          body="Start by creating a sample record. Assign it to a laboratory, then add the report and results once you receive them — all in one place."
          ctaLabel="Create sample"
          ctaVariant="contained"
          onCta={openCreate}
        />
        <SampleFormDialog open={formOpen} onClose={closeForm} onCreate={handleCreate} />
        <SampleCreatedDialog
          open={createdOpen}
          labHasApiConnection={LABS_WITH_API_CONNECTION.has(createdLab)}
          labName={createdLab}
          onClose={() => setCreatedOpen(false)}
          onOpenSheet={() => { if (createdSampleId) window.open(`/sample-sheet/${createdSampleId}`, '_blank', 'noopener,noreferrer'); setCreatedOpen(false); }}
          onAddReportAndResults={() => {
            setCreatedOpen(false);
            if (createdSampleId) openAddReport(createdSampleId);
          }}
        />
        <AddReportResultsDialog key={addReportOpenToken} sample={addReportSample} onClose={closeAddReport} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1.5}>
          <Button
            variant="soft" color="primary" startIcon={<Add />}
            onClick={openCreate}
            sx={{ px: 2, height: 36, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
          >
            Create sample
          </Button>
          <TextField
            size="small" placeholder="Search samples…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
              sx: { borderRadius: '8px' },
            }}
            sx={{ width: 240, '& .MuiOutlinedInput-root': { height: 36, bgcolor: 'white' } }}
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

      {/* Table */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <SamplesReportsTable
          rows={filteredSamples}
          selected={selected}
          onSelectChange={setSelected}
          onRowClick={(s) => navigate(`/plot/${plotId}/samples/${s.id}`)}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onAddReportAndResults={handleAddReportAndResults}
        />
      </Box>

      {/* Sample form popup */}
      <SampleFormDialog
        open={formOpen}
        title={editingId ? 'Edit sample' : 'Create sample'}
        initial={editingSample ? toFormValues(editingSample) : undefined}
        onClose={closeForm}
        onCreate={handleCreate}
      />

      {/* Post-creation success dialog */}
      <SampleCreatedDialog
        open={createdOpen}
        labHasApiConnection={LABS_WITH_API_CONNECTION.has(createdLab)}
        labName={createdLab}
        onClose={() => setCreatedOpen(false)}
        onOpenSheet={() => {
          if (createdSampleId) window.open(`/sample-sheet/${createdSampleId}`, '_blank', 'noopener,noreferrer');
          setCreatedOpen(false);
        }}
        onAddReportAndResults={() => {
          setCreatedOpen(false);
          if (createdSampleId) openAddReport(createdSampleId);
        }}
      />

      {/* "Add report & results" quick-add popup */}
      <AddReportResultsDialog key={addReportOpenToken} sample={addReportSample} onClose={closeAddReport} />
    </Box>
  );
}
