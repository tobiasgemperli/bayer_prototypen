import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Stack, Button,
  TextField, ToggleButton, ToggleButtonGroup,
  IconButton, Tooltip,
} from '@mui/material';
import { Add, DeleteOutline } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { EmptyState } from '../../design-system/EmptyState';
import { LabReportsTable } from '../../lab-shared/LabReportsTable';
import {
  useLabSamples, createLabSample, updateLabSample, deleteLabSample,
  deleteLabReport,
  COMMODITY_OPTIONS, Commodity, LabSampleData,
} from '../../data/lab-results-data';
import { fmtDate } from '../../lab-shared/format';
import { fieldSx } from '../../design-system/FormField';
import noLabResultsImg from '../../assets/empty-states/no-lab-results-v01.jpg';

// ── Constants ─────────────────────────────────────────────────────────────────

// ── Style helpers ─────────────────────────────────────────────────────────────

const labelSx = {
  fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary',
  textTransform: 'uppercase' as const, letterSpacing: '0.05em', mb: 0.5,
};


// ── Right pane — selected sample detail ──────────────────────────────────────

function SampleDetail({
  sample, onAddSample,
}: { sample: LabSampleData; onAddSample: () => void }) {
  const navigate = useNavigate();
  const reports = sample.reports ?? [];

  const handleSampleField = (patch: Partial<LabSampleData>) => {
    updateLabSample(sample.id, patch);
    toast.success('Saved');
  };

  // Add / open report — both flow through the V5 (v6-lab-management) LabReportPage,
  // registered as V6's LabReportPage override. Row-level delete lives inside that page.
  const goAddReport = () => navigate(`/plot/${sample.plotId}/lab-report/new?sample=${sample.id}`);
  const openReport = (rid: string) => navigate(`/plot/${sample.plotId}/lab-report/${rid}`);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sample header */}
      <Box sx={{
        px: 3, pt: 2.5, pb: 2,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}>
        <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap sx={{ gap: 2 }}>
          {/* Sample name */}
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={labelSx}>Sample name</Typography>
            <TextField
              size="small" fullWidth placeholder="Enter sample name"
              defaultValue={sample.sampleName}
              onBlur={(e) => handleSampleField({ sampleName: e.target.value })}
              key={sample.id + '-name'}
              sx={fieldSx}
            />
          </Box>

          {/* Date */}
          <Box sx={{ flex: '1 1 160px' }}>
            <Typography sx={labelSx}>Date of sample</Typography>
            <DatePicker
              value={sample.dateOfSample}
              onChange={(v) => updateLabSample(sample.id, { dateOfSample: v })}
              format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY', sx: fieldSx } }}
            />
          </Box>

          {/* Commodity */}
          <Box sx={{ flex: '1 1 320px' }}>
            <Typography sx={labelSx}>Sample type</Typography>
            <ToggleButtonGroup
              exclusive
              value={sample.commodity ?? null}
              onChange={(_, v) => { if (v) updateLabSample(sample.id, { commodity: v as Commodity }); }}
              aria-label="Sample type"
              sx={{
                display: 'grid',
                // minmax(max-content, 1fr): every column at LEAST its longest text,
                // and beyond that they share remaining space equally — never wraps.
                gridTemplateColumns: `repeat(${COMMODITY_OPTIONS.length}, minmax(max-content, 1fr))`,
                gap: 1,
                '& .MuiToggleButtonGroup-grouped': {
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px !important',
                  marginLeft: '0 !important',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  color: 'text.primary',
                  whiteSpace: 'nowrap',
                  height: 40,
                  py: 0, px: 2,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(212,24,61,0.05)',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    fontWeight: 600,
                    '&:hover': { bgcolor: 'rgba(212,24,61,0.08)' },
                  },
                },
              }}
            >
              {COMMODITY_OPTIONS.map(opt => (
                <ToggleButton key={opt} value={opt} aria-label={opt}>{opt}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </Box>

      {/* Reports section — same flow as V5: empty state with CTA, or a list of
          clickable cards. Each card opens the V5 LabReportPage editor. */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {reports.length === 0 ? (
          <EmptyState
            illustration={noLabResultsImg}
            title="No lab reports yet"
            body="Add results once you get them back. Each report links to its sample."
            ctaLabel="Add lab report"
            ctaVariant="contained"
            onCta={goAddReport}
            secondaryLabel="Working ahead? Start with a sample report"
            onSecondary={onAddSample}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, pt: 2, pb: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                Lab reports
                <Box component="span" sx={{ ml: 1, fontWeight: 400, color: 'text.secondary', fontSize: '0.875rem' }}>
                  ({reports.length})
                </Box>
              </Typography>
              <Button
                variant="soft" size="small" startIcon={<Add />}
                onClick={goAddReport}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', height: 34, px: 1.5 }}
              >Add lab report</Button>
            </Stack>
            <LabReportsTable
              reports={reports.map(r => ({ sample, report: r }))}
              onOpen={openReport}
              hideSample
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── Left pane — samples list ──────────────────────────────────────────────────

function SampleListItem({
  sample, selected, onClick, onDelete,
}: { sample: LabSampleData; selected: boolean; onClick: () => void; onDelete: () => void }) {
  const reportCount = sample.reports?.length ?? 0;
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        px: 2, py: 1.5, cursor: 'pointer', userSelect: 'none',
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: selected ? 'rgba(212,24,61,0.05)' : 'transparent',
        borderLeft: '3px solid', borderLeftColor: selected ? 'primary.main' : 'transparent',
        transition: 'background-color .12s, border-left-color .12s',
        '&:hover': { bgcolor: selected ? 'rgba(212,24,61,0.07)' : 'action.hover' },
        '&:hover .sample-row-delete': { opacity: 1 },
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.3, color: selected ? 'primary.main' : 'text.primary', mb: 0.5, pr: 4 }}>
        {sample.sampleName || <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400, fontStyle: 'italic' }}>Unnamed sample</Box>}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          {fmtDate(sample.dateOfSample)}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
          {reportCount} report{reportCount !== 1 ? 's' : ''}
        </Typography>
      </Stack>
      <Tooltip title="Delete sample" placement="left">
        <IconButton
          className="sample-row-delete"
          size="small"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          sx={{
            position: 'absolute', top: 6, right: 6,
            opacity: 0, transition: 'opacity .12s',
            color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: 'rgba(211,47,47,0.08)' },
          }}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LabMasterDetail({ plotId }: { plotId: string }) {
  const allSamples = useLabSamples();
  const samples = useMemo(
    () => allSamples.filter(s => s.plotId === plotId),
    [allSamples, plotId],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first sample when list loads or changes
  const selectedSample = useMemo(() => {
    if (selectedId && samples.find(s => s.id === selectedId)) {
      return samples.find(s => s.id === selectedId)!;
    }
    return samples[0] ?? null;
  }, [samples, selectedId]);

  const handleAddSample = () => {
    const s = createLabSample(plotId);
    setSelectedId(s.id);
    toast.success('Sample added. Fill in the details on the right.');
  };

  const handleDeleteSample = (id: string) => {
    // Remove all reports for the sample, then the sample itself.
    const s = samples.find(x => x.id === id);
    s?.reports?.forEach(r => deleteLabReport(r.id));
    deleteLabSample(id);
    if (selectedId === id) setSelectedId(null);
    toast.success('Sample deleted');
  };

  if (samples.length === 0) {
    return (
      <EmptyState
        illustration={noLabResultsImg}
        title="Complete your residue forecast with lab results"
        body="Add lab results to keep residue forecasts and lab data aligned in one place."
        ctaLabel="Add lab result"
        ctaVariant="contained"
        onCta={handleAddSample}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* LEFT PANE — sample list */}
      <Box sx={{
        width: 280, flexShrink: 0,
        borderRight: '1px solid', borderColor: 'divider',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        bgcolor: 'background.paper',
      }}>
        {/* List toolbar */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Samples
            </Typography>
            <Tooltip title="Add sample" placement="top">
              <IconButton size="small" onClick={handleAddSample} color="primary" sx={{ '&:hover': { bgcolor: 'rgba(212,24,61,0.08)' } }}>
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Sample rows */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {samples.map(s => (
            <SampleListItem
              key={s.id}
              sample={s}
              selected={selectedSample?.id === s.id}
              onClick={() => setSelectedId(s.id)}
              onDelete={() => handleDeleteSample(s.id)}
            />
          ))}
        </Box>
      </Box>

      {/* RIGHT PANE — sample detail + reports */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedSample ? (
          <SampleDetail
            key={selectedSample.id}
            sample={selectedSample}
            onAddSample={handleAddSample}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled' }}>
            <Typography>Select a sample on the left to view its reports</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
