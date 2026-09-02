import React, { useMemo, useState } from 'react';
import {
  Box, Button, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { Add, DeleteOutline, Search } from '@mui/icons-material';
import { toast } from 'sonner';
import { EmptyState } from '../design-system/EmptyState';
import { OptionsTrigger } from '../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../design-system/ActionMenu';
import {
  useLabSamples, LabSampleData,
  createLabSample, deleteLabSample, updateLabSample, LABS_WITH_API_CONNECTION,
} from '../data/lab-results-data';
import { useNavigate } from '../variants/variant-context';
import noLabResultsImg from '../assets/empty-states/no-lab-results-v01.jpg';
import { SamplesReportsTable } from './SamplesReportsTable';
import { SampleFormDialog, SampleFormValues, toFormValues } from './SampleFormDialog';
import { SampleCreatedDialog } from './SampleCreatedDialog';
import { AddReportAndResultsDialog } from './AddReportAndResultsDialog';
import { ConfirmActionDialog } from './ConfirmActionDialog';

// V14's story is exactly 3 sample states: no report/results yet (non-API
// lab), manual reports+results, and API-imported reports+results — see
// `ls-v13-empty-1`, `ls-v13-manual-1`, and `ls-api-demo-1` in the shared
// seed. The generic `ls-demo-<plotId>` seed sample mixes a saved + draft +
// API-managed report on one sample (useful noise for other variants, not
// this story), so it's filtered out here rather than in the shared seed —
// scoped to this variant only, other variants still see it.
function isGenericHybridSeed(sampleId: string, plotId: string) {
  return sampleId === `ls-demo-${plotId}`;
}

export function LabManagementContent({ plotId }: { plotId: string }) {
  const navigate = useNavigate();
  const allSamples = useLabSamples();
  // V10 has no draft state for samples — filter them out so seed draft companions are invisible.
  const samples = useMemo(
    () => allSamples.filter((s) => s.plotId === plotId && !s.isDraft && !isGenericHybridSeed(s.id, plotId)),
    [allSamples, plotId]
  );

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

  // "Add report & results" quick-add popup — the samples list's own
  // convenience action (2-step Report -> Results wizard), distinct from the
  // sample page's independent Add report / Add analyte actions. openToken
  // forces a fresh remount on every open (even re-opening the same sample)
  // so step state never leaks across sessions.
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

  // A sample "has a report" when it has any attached report (new multi-report
  // array or the legacy single labReportId).
  const hasReport = (s: LabSampleData) =>
    (s.reports?.length ?? 0) > 0 || !!s.labReportId?.trim();
  const withoutReports = filteredSamples.filter((s) => !hasReport(s));
  const withReports = filteredSamples.filter(hasReport);

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

  // Delete confirmation — single row or the bulk-selection menu action,
  // both funnel through the same modal so the destructive step is never skippable.
  const [confirmDelete, setConfirmDelete] = useState<
    { kind: 'single'; sample: LabSampleData } | { kind: 'bulk'; count: number } | null
  >(null);

  const handleDelete = (s: LabSampleData) => {
    setConfirmDelete({ kind: 'single', sample: s });
  };

  const handleAddReportAndResults = (s: LabSampleData) => {
    openAddReport(s.id);
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    setAnchorEl(null);
    setConfirmDelete({ kind: 'bulk', count: selected.length });
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === 'single') {
      deleteLabSample(confirmDelete.sample.id);
      toast.success('Sample deleted');
    } else {
      selected.forEach((id) => deleteLabSample(id));
      toast.success(`${confirmDelete.count} sample${confirmDelete.count !== 1 ? 's' : ''} deleted`);
      setSelected([]);
    }
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
          title="Compare forecasts with lab results"
          body="Add a sample and attach its lab report now or later. Compare measured residue levels with ResiYou forecasts and plan with greater confidence."
          ctaLabel="Add sample"
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
        <AddReportAndResultsDialog key={addReportOpenToken} sample={addReportSample} onClose={closeAddReport} />
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

      {/* Table — split into "without reports" (top) and "with reports". Each
          group table gets a scoped slice of the shared selection so its own
          select-all stays correct while bulk delete still sees everything. */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <Stack spacing={3}>
          {[
            { key: 'without', title: 'Samples without reports', rows: withoutReports },
            { key: 'with', title: 'Samples with reports', rows: withReports },
          ].filter((g) => g.rows.length > 0).map((g) => {
            const ids = new Set(g.rows.map((r) => r.id));
            return (
              <Box key={g.key}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary', mb: 1.5 }}>
                  {g.title} ({g.rows.length})
                </Typography>
                <SamplesReportsTable
                  rows={g.rows}
                  selected={selected.filter((id) => ids.has(id))}
                  onSelectChange={(next) => setSelected([...selected.filter((id) => !ids.has(id)), ...next])}
                  onRowClick={(s) => navigate(`/plot/${plotId}/samples/${s.id}`)}
                  onDelete={handleDelete}
                  onAddReportAndResults={handleAddReportAndResults}
                />
              </Box>
            );
          })}
          {filteredSamples.length === 0 && (
            <Typography sx={{ color: 'text.secondary', px: 1, py: 4, textAlign: 'center' }}>
              No samples match your search.
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Sample form popup */}
      <SampleFormDialog
        open={formOpen}
        title={editingId ? 'Edit sample' : 'Add a sample'}
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
      <AddReportAndResultsDialog key={addReportOpenToken} sample={addReportSample} onClose={closeAddReport} />

      {/* Delete confirmation */}
      <ConfirmActionDialog
        open={!!confirmDelete}
        title={confirmDelete?.kind === 'bulk' ? 'Delete samples?' : 'Delete sample?'}
        body={
          confirmDelete?.kind === 'bulk' ? (
            <>
              This will permanently delete <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{confirmDelete.count} sample{confirmDelete.count !== 1 ? 's' : ''}</Box>, along with their reports and results. This cannot be undone.
            </>
          ) : confirmDelete?.kind === 'single' ? (
            <>
              This will permanently delete <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{confirmDelete.sample.sampleName}</Box>, along with its reports and results. This cannot be undone.
            </>
          ) : null
        }
        primaryLabel={confirmDelete?.kind === 'bulk' ? `Delete sample${confirmDelete.count !== 1 ? 's' : ''}` : 'Delete sample'}
        primaryColor="error"
        onClose={() => setConfirmDelete(null)}
        onPrimary={handleConfirmDelete}
      />
    </Box>
  );
}
