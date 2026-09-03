import React, { useMemo, useState } from 'react';
import { Box, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { Search, ScheduleOutlined } from '@mui/icons-material';
import { toast } from 'sonner';
import { useLabSamples, deleteLabSample, LabSampleData } from '../data/lab-results-data';
import { usePlots } from '../data/plots-data';
import { useNavigate } from '../variants/variant-context';
import { PageLayout } from '../design-system/PageLayout';
import { SamplesReportsTable } from './SamplesReportsTable';
import { AddReportDialog } from './AddReportDialog';
import { ConfirmActionDialog } from './ConfirmActionDialog';

const hasReport = (s: LabSampleData) => (s.reports?.length ?? 0) > 0 || !!s.labReportId?.trim();

/**
 * Global "Samples" view (opened from the sidebar) — every sample across all
 * plots, grouped into "Awaiting lab report" (the to-do list) and "Samples with
 * reports". Adds a Plot column so it works as an all-plots overview.
 */
export function AllSamplesPage() {
  const navigate = useNavigate();
  const allSamples = useLabSamples();
  const plots = usePlots();
  const [search, setSearch] = useState('');
  const [uploadSampleId, setUploadSampleId] = useState<string | null>(null);
  const [uploadToken, setUploadToken] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<LabSampleData | null>(null);

  const plotName = (plotId: string) => plots.find((p) => p.id === plotId)?.plotName ?? '—';

  const samples = useMemo(() => allSamples.filter((s) => !s.isDraft), [allSamples]);
  const filtered = useMemo(() => {
    if (!search.trim()) return samples;
    const q = search.toLowerCase();
    return samples.filter((s) =>
      s.sampleName.toLowerCase().includes(q) ||
      s.sampleCode.toLowerCase().includes(q) ||
      (s.commodity ?? '').toLowerCase().includes(q) ||
      (s.laboratory ?? '').toLowerCase().includes(q) ||
      plotName(s.plotId).toLowerCase().includes(q)
    );
  }, [samples, search, plots]);

  const withoutReports = filtered.filter((s) => !hasReport(s));
  const withReports = filtered.filter(hasReport);

  const uploadSample = uploadSampleId ? allSamples.find((s) => s.id === uploadSampleId) ?? null : null;
  const openUploadReport = (s: LabSampleData) => { setUploadSampleId(s.id); setUploadToken((t) => t + 1); };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    deleteLabSample(confirmDelete.id);
    toast.success('Sample deleted');
  };

  const groups = [
    { key: 'without', title: 'Awaiting lab report', rows: withoutReports, todo: true },
    { key: 'with', title: 'Samples with reports', rows: withReports, todo: false },
  ].filter((g) => g.rows.length > 0);

  return (
    <PageLayout variant="wide" title="Samples">
      <Box sx={{ mb: 3 }}>
        <TextField
          size="small" placeholder="Search all samples…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
            sx: { borderRadius: '8px' },
          }}
          sx={{ width: 320, '& .MuiOutlinedInput-root': { height: 40, bgcolor: 'white' } }}
        />
      </Box>

      <Stack spacing={5}>
        {groups.map((g) => (
          <Box key={g.key}>
            {g.todo ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: 'primary.main', color: 'white', px: 2, py: 1.25, borderRadius: '8px', mb: 1.5 }}>
                <ScheduleOutlined sx={{ fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{g.title} ({g.rows.length})</Typography>
              </Box>
            ) : (
              <Box sx={{ bgcolor: 'grey.200', color: 'text.primary', px: 2, py: 1.25, borderRadius: '8px', mb: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{g.title} ({g.rows.length})</Typography>
              </Box>
            )}
            <SamplesReportsTable
              rows={g.rows}
              plotNameOf={(s) => plotName(s.plotId)}
              onRowClick={(s) => navigate(`/plot/${s.plotId}/samples/${s.id}`)}
              onDelete={setConfirmDelete}
              uploadCta={g.todo}
              onUploadReport={openUploadReport}
              hideCounts={g.todo}
            />
          </Box>
        ))}
        {filtered.length === 0 && (
          <Typography sx={{ color: 'text.secondary', px: 1, py: 4, textAlign: 'center' }}>
            {samples.length === 0 ? 'No samples yet.' : 'No samples match your search.'}
          </Typography>
        )}
      </Stack>

      <AddReportDialog key={`upl-${uploadToken}`} sample={uploadSample} onClose={() => setUploadSampleId(null)} />

      <ConfirmActionDialog
        open={!!confirmDelete}
        title="Delete sample?"
        body={confirmDelete ? (
          <>This will permanently delete <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{confirmDelete.sampleName}</Box>, along with its reports and results. This cannot be undone.</>
        ) : null}
        primaryLabel="Delete sample"
        primaryColor="error"
        onClose={() => setConfirmDelete(null)}
        onPrimary={handleConfirmDelete}
      />
    </PageLayout>
  );
}
