import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import {
  Box, Typography, Tabs, Tab, Button, Stack, Breadcrumbs, Link, Paper,
} from '@mui/material';
import {
  NavigateNext, Add, DeleteOutline,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { usePlots } from '../../data/plots-data';
import {
  LABORATORY_OPTIONS, LabReport, LabSampleData,
  createLabSample, getReports, newReportId,
  updateLabSample, useLabSamples,
} from '../../data/lab-results-data';
import {
  SampleTab, ReportResultsTab,
} from '../../main/LabSamplePage';
import { PageLayout } from '../../design-system/PageLayout';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { GridToolbar, GridCountBar, GridSearchField } from '../../design-system/grid/grid-shared';
import { LabReportsGrid, LabReportsGridHandle } from './LabReportsGrid';

// ── Multi-report tab content (editable AG-Grid SSOT) ─────────────────────────

function MultiReportTab({ sample, onChange }: {
  sample: LabSampleData;
  onChange: (patch: Partial<LabSampleData>) => void;
}) {
  const gridRef = useRef<LabReportsGridHandle>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [search, setSearch] = useState('');
  const allSamples = useLabSamples();

  const reports = useMemo(() => getReports(sample), [sample]);
  const laboratoryOptions = useMemo(() => {
    const labs = new Set<string>(LABORATORY_OPTIONS);
    allSamples
      .filter(s => s.plotId === sample.plotId)
      .forEach(s => (s.reports ?? []).forEach(r => r.laboratory && labs.add(r.laboratory)));
    return Array.from(labs);
  }, [allSamples, sample.plotId]);

  const currentReports = sample.reports ?? [];

  // Seed a first row so the grid is never blank. Demo dummies (lab + 2
  // attachments) make the prototype feel real without forcing the user to
  // upload first.
  useEffect(() => {
    if (sample.reports === undefined) {
      const demoLab = LABORATORY_OPTIONS[0];
      onChange({ reports: [{
        id: newReportId(),
        laboratory: demoLab,
        labReportId: '',
        attachments: [
          { id: 'demo-att-1', name: 'lab-report-2026-001.pdf', size: 524_288 },
          { id: 'demo-att-2', name: 'analysis-certificate.pdf', size: 248_832 },
        ],
      }] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample.id]);

  const handleAdd = (r: LabReport) => {
    onChange({ reports: [...currentReports, r] });
  };
  const handleUpdate = (id: string, patch: Partial<LabReport>) => {
    onChange({ reports: currentReports.map(r => r.id === id ? { ...r, ...patch } : r) });
  };
  const handleDelete = (id: string) => {
    onChange({ reports: currentReports.filter(r => r.id !== id) });
    toast.success('Lab report deleted');
  };

  const handleBulkDelete = () => {
    if (!selected.length) return;
    gridRef.current?.deleteRows(selected);
    toast.success(`${selected.length} lab report${selected.length !== 1 ? 's' : ''} deleted`);
    setSelected([]);
    setAnchorEl(null);
  };

  const menuActions: ActionItem[] = useMemo(() => ([
    { label: selected.length === 1 ? 'Delete lab report' : 'Delete lab reports',
      icon: <DeleteOutline fontSize="small" />, key: 'delete',
      color: 'error.main', onClick: handleBulkDelete },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [selected]);

  // Wait for the seed effect to populate reports before mounting the grid —
  // EditableDataGrid captures initialData once and ignores later updates.
  if (currentReports.length === 0) return null;

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
            Add lab report
          </Button>
          <GridSearchField
            placeholder="Search lab reports…"
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
      <GridCountBar count={currentReports.length} label="lab report" />
      <Box sx={{ height: currentReports.length * 52 + 56 + 4 }}>
        <LabReportsGrid
          ref={gridRef}
          reports={currentReports}
          laboratoryOptions={laboratoryOptions}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onSelectionChange={setSelected}
        />
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

  const isNew = !sampleId;

  return (
    <PageLayout
      variant="wide"
      breadcrumbs={
        <Breadcrumbs separator={<NavigateNext fontSize="small" color="disabled" />}>
          <Link underline="hover" color="text.secondary" onClick={() => navigate('/')}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem' }}>
            Plots
          </Link>
          <Link underline="hover" color="text.secondary" onClick={() => navigate(`/plot/${id}`)}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem' }}>
            {plot.plotName} ({plot.crop})
          </Link>
          <Link underline="hover" color="text.secondary"
            onClick={() => navigate(`/plot/${id}`, { state: { activeTab: 2 } })}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem' }}>
            Lab results
          </Link>
        </Breadcrumbs>
      }
      title={isNew ? 'New/Edit Sample' : (sample.sampleName || 'New/Edit Sample')}
    >
      <Paper elevation={0} sx={{
        width: '100%', height: 'fit-content',
        borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
      }}>
        <Box sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
            indicatorColor="primary" textColor="primary"
            sx={{ minHeight: 48, '& .MuiTab-root': { minWidth: 100, color: 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&.Mui-selected': { color: 'primary.main' } } }}>
            <Tab label="Sample" />
            <Tab label="Lab reports" disabled={!sampleValid} />
            <Tab label="Lab results" disabled={!sampleValid} />
          </Tabs>
        </Box>

        {activeTab === 0 && <SampleTab sample={sample} onChange={handlePatch} isNew={isNew} />}
        {activeTab === 1 && <MultiReportTab sample={sample} onChange={handlePatch} />}
        {activeTab === 2 && <ReportResultsTab sample={sample} onChange={handlePatch} />}
      </Paper>
    </PageLayout>
  );
}
