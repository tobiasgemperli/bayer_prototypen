import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from '../variant-context';
import {
  Box, Typography, Tabs, Tab, Button, Breadcrumbs, Link, Paper,
} from '@mui/material';
import { NavigateNext, DeleteOutline } from '@mui/icons-material';
import { toast } from 'sonner';
import { usePlots } from '../../data/plots-data';
import {
  LabReport, LabSampleData,
  createLabSample, deleteLabSample, updateLabSample, useLabSamples,
} from '../../data/lab-results-data';
import { SampleTab, ReportResultsTab } from '../v15-production-replica/LabSamplePage';
import { ReportsCard } from '../v14-sample-summary-header/SampleReportPage';
import { AddReportDialog } from '../v14-sample-summary-header/AddReportDialog';

// V16 = v15 (the faithful production replica) plus three v14 features
// grafted in wholesale rather than rebuilt, per an explicit request to keep
// engineering workload low: multiple lab reports per sample, an "Add report"
// popup to create additional ones, and the API/non-API (locked,
// auto-imported) distinction between reports. The Sample tab and Report
// results tab are reused byte-for-byte from v15 — only the middle tab
// changes, since that's the one part production only ever showed as a
// single-report form (one Laboratory + one Lab report ID + attachments).
// See README.md for the full reuse rationale and file provenance.

// ── Lab Reports tab — v14's ReportsCard + AddReportDialog, wired to this
// sample's `reports` array. Both components already write to/read from
// `LabSampleData.reports` generically (no v14-specific coupling), so they're
// imported directly rather than copied.

function ReportsTab({ sample }: { sample: LabSampleData }) {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [addReportToken, setAddReportToken] = useState(0);
  const [editingReport, setEditingReport] = useState<LabReport | null>(null);

  // Some seeded samples carry a "draft" report (lab picked, id/attachment
  // never filled in) left over from card-based demo data elsewhere in this
  // repo — dropped here rather than surfacing as an empty line, same
  // rationale v14 uses for the same shared seed data.
  const reports = (sample.reports ?? []).filter(
    (r) => r.labReportId.trim() !== '' || (r.attachments?.length ?? 0) > 0
  );

  const openAddReport = () => { setEditingReport(null); setAddReportOpen(true); setAddReportToken((t) => t + 1); };
  const openEditReport = (report: LabReport) => { setEditingReport(report); setAddReportOpen(true); setAddReportToken((t) => t + 1); };
  const closeAddReport = () => setAddReportOpen(false);

  const handleDeleteReport = (report: LabReport) => {
    // Orphaned results are intentionally left in place rather than
    // cascade-deleted — same stance v14 takes.
    updateLabSample(sample.id, { reports: (sample.reports ?? []).filter((r) => r.id !== report.id) });
    toast.success('Report deleted');
  };

  const handleBulkDelete = () => {
    if (selectedReports.length === 0) return;
    updateLabSample(sample.id, {
      reports: (sample.reports ?? []).filter((r) => !selectedReports.includes(r.id)),
    });
    toast.success(`${selectedReports.length} report${selectedReports.length !== 1 ? 's' : ''} deleted`);
    setSelectedReports([]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <ReportsCard
        reports={reports}
        selected={selectedReports}
        onSelectChange={setSelectedReports}
        onAddReport={openAddReport}
        onEditReport={openEditReport}
        onDeleteReport={handleDeleteReport}
        onBulkDelete={handleBulkDelete}
      />

      {/* v14's single-purpose report popup — supports create AND edit
          (editingReport prefills it). Never touches residues. */}
      <AddReportDialog
        key={addReportToken}
        sample={addReportOpen ? sample : null}
        editingReport={editingReport}
        onClose={closeAddReport}
      />
    </Box>
  );
}

// ── Main page — identical structure/gating to v15, just a different tab 1 ────

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
            <Tab label="Lab Reports" disabled={!sampleValid} />
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
        {activeTab === 1 && <ReportsTab sample={sample} />}
        {activeTab === 2 && <ReportResultsTab sample={sample} onChange={handlePatch} onLeaveTab={() => setActiveTab(0)} />}
      </Paper>
    </Box>
  );
}
