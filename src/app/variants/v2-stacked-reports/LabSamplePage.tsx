import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import {
  Box, Typography, Tabs, Tab, Button, Stack, Breadcrumbs, Link, Paper, IconButton,
} from '@mui/material';
import {
  NavigateNext, DeleteOutline, Add, Close,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { usePlots } from '../../data/plots-data';
import {
  LabReport, LabSampleData,
  createLabSample, deleteLabSample, emptyReport,
  updateLabSample, useLabSamples,
} from '../../data/lab-results-data';
import {
  SampleTab, ReportResultsTab,
} from '../../main/LabSamplePage';
import { LabReportForm } from '../../lab-shared/LabReportForm';

// ── Single report card ────────────────────────────────────────────────────────

function ReportCard({
  report, index, onChange, onRemove,
}: {
  report: LabReport;
  index: number;
  onChange: (patch: Partial<LabReport>) => void;
  onRemove: () => void;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid', borderColor: 'divider', borderRadius: '8px',
        p: 2.5, position: 'relative',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Report {index + 1}
        </Typography>
        <IconButton size="small" onClick={onRemove} aria-label="Remove report">
          <Close fontSize="small" sx={{ color: 'text.secondary' }} />
        </IconButton>
      </Stack>

      <LabReportForm value={report} onChange={onChange} dense hideHeading />
    </Paper>
  );
}

// ── Stacked-reports tab ───────────────────────────────────────────────────────

function StackedReportsTab({ sample, onChange }: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
}) {
  const seedFromLegacy = (): LabReport[] => {
    if (sample.laboratory || sample.labReportId || sample.attachments.length > 0) {
      return [{
        id: `lr-seed-${sample.id}`,
        laboratory: sample.laboratory,
        labReportId: sample.labReportId,
        attachments: sample.attachments,
      }];
    }
    return [emptyReport()];
  };

  const reports = sample.reports ?? seedFromLegacy();

  useEffect(() => {
    if (!sample.reports) onChange({ reports });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setReports = (next: LabReport[]) => onChange({ reports: next });
  const handleAdd = () => setReports([...reports, emptyReport()]);
  const handleRemove = (id: string) => {
    if (reports.length === 1) {
      toast.error('At least one report is required (you can clear its fields)');
      return;
    }
    setReports(reports.filter(r => r.id !== id));
    toast.success('Report removed');
  };
  const handlePatchReport = (id: string, patch: Partial<LabReport>) => {
    setReports(reports.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  const handleSaveAll = () => {
    const incomplete = reports.filter(r => !r.laboratory.trim() || !r.labReportId.trim());
    if (incomplete.length > 0) {
      toast.error(`${incomplete.length} report(s) missing Laboratory or Lab report ID`);
      return;
    }
    toast.success(`${reports.length} lab report${reports.length !== 1 ? 's' : ''} saved`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
          {reports.length} lab report{reports.length !== 1 ? 's' : ''}
        </Typography>
        <Button
          variant="soft" color="primary" startIcon={<Add />} onClick={handleAdd}
          sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', height: 36 }}
        >Add another lab report</Button>
      </Stack>

      <Stack spacing={2}>
        {reports.map((r, idx) => (
          <ReportCard
            key={r.id} report={r} index={idx}
            onChange={(patch) => handlePatchReport(r.id, patch)}
            onRemove={() => handleRemove(r.id)}
          />
        ))}
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="contained" color="primary" onClick={handleSaveAll}
          sx={{ minWidth: 220, height: 36, fontWeight: 600, textTransform: 'none', borderRadius: '8px' }}
        >Save all reports</Button>
      </Box>
    </Box>
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

  useEffect(() => {
    if (sampleId) setDraftId(sampleId);
    else if (!draftId) setDraftId(createLabSample(id!).id);
  }, [sampleId, id]);

  const sample = useMemo(
    () => (draftId ? allSamples.find(s => s.id === draftId) : undefined),
    [allSamples, draftId]
  );

  const [activeTab, setActiveTab] = useState(0);
  const sampleValid = !!(sample && sample.sampleName.trim() && sample.dateOfSample && sample.commodity);

  if (!plot || !sample) return <Box p={3}>Loading…</Box>;

  const handlePatch = (patch: Partial<LabSampleData>) => updateLabSample(sample.id, patch);
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
          <Link underline="hover" color="text.secondary" onClick={() => navigate('/')}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Plots</Link>
          <Link underline="hover" color="text.secondary" onClick={() => navigate(`/plot/${id}`)}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            {plot.plotName} ({plot.crop})
          </Link>
          <Link underline="hover" color="text.secondary"
            onClick={() => navigate(`/plot/${id}`, { state: { activeTab: 2 } })}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Lab results</Link>
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
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
            indicatorColor="primary" textColor="primary"
            sx={{ minHeight: 48, '& .MuiTab-root': { minWidth: 100, color: 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&.Mui-selected': { color: 'primary.main' } } }}>
            <Tab label="Sample" />
            <Tab label="Lab Reports" disabled={!sampleValid} />
            <Tab label="Report results" disabled={!sampleValid} />
          </Tabs>
          <Button startIcon={<DeleteOutline />} color="inherit" onClick={handleDelete}
            sx={{ fontWeight: 600, textTransform: 'none', color: 'text.secondary' }}>Delete</Button>
        </Box>

        {activeTab === 0 && <SampleTab sample={sample} onChange={handlePatch} isNew={isNew} />}
        {activeTab === 1 && <StackedReportsTab sample={sample} onChange={handlePatch} />}
        {activeTab === 2 && <ReportResultsTab sample={sample} onChange={handlePatch} />}
      </Paper>
    </Box>
  );
}
