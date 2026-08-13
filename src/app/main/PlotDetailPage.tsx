import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router';
import { useNavigate } from '../variants/variant-context';
import {
  Box, Typography, Tabs, Tab, Button, TextField,
  InputAdornment, Breadcrumbs, Link, Paper, Stack
} from '@mui/material';
import {
  Add, Save, Search, NavigateNext, ArrowForward,
  ContentCopy, Download, PictureAsPdf, DeleteOutline, SwapHoriz
} from '@mui/icons-material';
import { toast } from 'sonner';
import { usePlots, treatmentsData, TreatmentData, useTreatmentsVersion, TREATMENT_MANDATORY, updateTreatments } from '../data/plots-data';
import { ColDef } from 'ag-grid-community';
import { useDemoMode, setOnboardingStep, setDemoMode, setAuthPhase } from '../data/auth-state';
import { TreatmentsGrid, TreatmentsGridHandle } from './TreatmentsGrid';
import { OptionsTrigger } from '../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../design-system/ActionMenu';
import { TreatmentModal } from './TreatmentModal';
import { LabManagementContent } from './LabManagementContent';
import { EmptyState } from '../design-system/EmptyState';
import { SaveBar } from '../design-system/SaveBar';
import { PrimaryTabs, SecondaryTabs } from '../design-system/PlotTabs';
import noTreatmentImg from '../assets/empty-states/no-treatment-yet-v01.jpg';

interface PlotDetailPageProps {
  /** Label for the 4th tab. Defaults to "Samples & Reports". */
  samplingTabLabel?: string;
  /** Component rendered inside the sampling tab. Defaults to LabManagementContent. */
  SamplingContent?: React.ComponentType<{ plotId: string }>;
  /** Component rendered inside the Residue forecast tab. Defaults to the built-in ResidueForecastContent. */
  ForecastContent?: React.ComponentType<{ plotId: string }>;
  /** Component rendered inside the Treatments tab. When set, replaces the
   *  entire Treatments body (sub-tabs, toolbar, save bar, grid). Used by
   *  spray-plans variants to inject their own view (Notion-style status table,
   *  kanban, calendar, etc.) — spray-plans is no longer a separate tab. */
  TreatmentsContent?: React.ComponentType<{ plotId: string }>;
  /** Extra tabs appended after the core tabs. Additive — baseline passes none. */
  extraTabs?: { label: string; render: (plotId: string) => React.ReactNode }[];
  /** Lightweight hooks into the baseline Treatments tab. Variants can add a
   *  column, a toolbar element, a row filter, or a custom sort — without
   *  replacing the whole tab body (which is what `TreatmentsContent` does). */
  treatmentsCustomization?: {
    /** ColDefs prepended after the select column (before the data cols). */
    prependColumns?: ColDef<TreatmentData>[];
    /** ColDefs appended after the data cols (before the row action col). */
    appendColumns?: ColDef<TreatmentData>[];
    /** Extra elements rendered in the toolbar, just before the Add button. */
    toolbarExtras?: React.ReactNode;
    /** Returning false hides the row. Re-applied whenever it changes (the
     *  grid is keyed on this filter, so changes remount the grid). */
    rowFilter?: (t: TreatmentData) => boolean;
    /** Pre-sort applied to the initialData passed into the grid. */
    sort?: (a: TreatmentData, b: TreatmentData) => number;
    /** Additional content rendered to the right of the "X total treatments"
     *  label — e.g. v5 renders a status-count breakdown. Receives the post-
     *  filter, post-sort treatments array. */
    countBarExtras?: (treatments: TreatmentData[]) => React.ReactNode;
    /** Merged over the default Product colDef — e.g. to filter its dropdown
     *  options by another field. */
    productColumn?: Partial<ColDef<TreatmentData>>;
    /** Merged over the default Application-date colDef — same purpose as
     *  `productColumn`, for the date column. */
    dateColumnOverride?: Partial<ColDef<TreatmentData>>;
    /** Fired once a Save (changes or draft) actually commits, with the rows
     *  that were just saved — e.g. to flag a row whose values became
     *  inconsistent through an interaction the column-level guards don't
     *  cover, such as a pasted row. */
    onAfterSave?: (savedRows: TreatmentData[]) => void;
    /** SaveBar's visual variant for this tab. Defaults to SaveBar's own
     *  default ('rounded') when omitted. */
    saveBarVariant?: 'rounded' | 'edge';
    /** Drops the "Save as draft" action from the SaveBar entirely. */
    hideSaveDraft?: boolean;
  };
  /** Replaces the default `TreatmentModal` used by the bulk-copy action.
   *  Variants supply a custom dialog (e.g. with planting-date validation). */
  TreatmentModalComponent?: React.ComponentType<{
    open: boolean;
    onClose: () => void;
    preSelectedTreatments?: TreatmentData[];
    title?: string;
  }>;
}

export function PlotDetailPage({
  samplingTabLabel = 'Samples & Reports',
  SamplingContent = LabManagementContent,
  ForecastContent,
  TreatmentsContent,
  extraTabs = [],
  treatmentsCustomization,
  TreatmentModalComponent,
}: PlotDetailPageProps = {}) {
  const InjectedTreatmentModal = TreatmentModalComponent ?? TreatmentModal;
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const demoMode = useDemoMode();
  const isOnboarding = demoMode === 'onboarding';

  const initialTab = (location.state as { activeTab?: number } | null)?.activeTab ?? 0;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const t = (location.state as { activeTab?: number } | null)?.activeTab;
    if (typeof t === 'number') setActiveTab(t);
  }, [location.state]);
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTreatmentIds, setSelectedTreatmentIds] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [treatmentCount, setTreatmentCount] = useState(() => treatmentsData.filter(t => t.plotId === id).length);
  const [gridKey, setGridKey] = useState(0);

  const gridRef = useRef<TreatmentsGridHandle>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTreatments, setModalTreatments] = useState<TreatmentData[]>([]);
  const [modalTitle, setModalTitle] = useState('');

  const plots = usePlots();
  const plot = useMemo(() => plots.find(p => p.id === id), [plots, id]);
  // Subscribe to treatment edits so v5 status changes flow through.
  const treatmentVersion = useTreatmentsVersion();
  const treatments = useMemo(() => {
    let rows = treatmentsData.filter(t => t.plotId === id);
    if (treatmentsCustomization?.rowFilter) rows = rows.filter(treatmentsCustomization.rowFilter);
    if (treatmentsCustomization?.sort) rows = [...rows].sort(treatmentsCustomization.sort);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, treatmentVersion, treatmentsCustomization?.rowFilter, treatmentsCustomization?.sort]);

  useEffect(() => {
    setSelectedTreatmentIds([]);
    setHasUnsavedChanges(false);
    setSearchQuery('');
    setTreatmentCount(treatmentsData.filter(t => t.plotId === id).length);
  }, [id]);

  useEffect(() => {
    gridRef.current?.setFilter(searchQuery);
  }, [searchQuery]);

  const handleAddTreatment = () => gridRef.current?.addRow(id!);

  /** Walk every treatment row in the grid and call back with a draft verdict.
   *  Used by both save handlers so the same "completeness" definition drives
   *  validation and the chip. */
  const isRowComplete = (t: TreatmentData) =>
    TREATMENT_MANDATORY.every(({ key }) => {
      const v = (t as any)[key];
      if (v == null) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      return true;
    });

  /** Treatments primary CTA — inline-validates every required field on the
   *  dirty rows. Blocks save until red cells are fixed.
   *  AC-9.2 + AC-9.5: pass ALL dirty rows (new- / dup- included) — the store's
   *  updateTreatments routes new ids to the insert path. AC-9.5 scopes the
   *  isDraft mutation to dirty rows only. */
  const handleCreateTreatment = () => {
    const ok = gridRef.current?.triggerValidation('full');
    if (!ok) return;
    const dirty = (gridRef.current?.getDirtyRows() ?? []) as TreatmentData[];
    dirty.forEach(r => { r.isDraft = false; });
    const saved = dirty.map(r => ({ ...r, isDraft: false }));
    updateTreatments(saved);
    gridRef.current?.save();
    toast.success('Changes saved');
    treatmentsCustomization?.onAfterSave?.(saved);
  };

  /** Treatments secondary CTA — only validates the entity's name field
   *  (product). Other empty fields are fine — row stays a draft.
   *  AC-2.5: each dirty row's isDraft = !isRowComplete(r). Untouched rows
   *  are not flipped (AC-9.5). New- / dup- rows are inserted via the store. */
  const handleSaveTreatmentDraft = () => {
    const ok = gridRef.current?.triggerValidation('name-only');
    if (!ok) return;
    const dirty = (gridRef.current?.getDirtyRows() ?? []) as TreatmentData[];
    dirty.forEach(r => { r.isDraft = !isRowComplete(r); });
    const saved = dirty.map(r => ({ ...r }));
    updateTreatments(saved);
    gridRef.current?.save();
    toast.success('Saved as draft');
    treatmentsCustomization?.onAfterSave?.(saved);
  };

  const handleCancelChanges = () => {
    gridRef.current?.clearValidation();
    setGridKey(k => k + 1); // remount the grid → discard in-grid edits
    setHasUnsavedChanges(false);
    setTreatmentCount(treatmentsData.filter(t => t.plotId === id).length);
    toast.info('Changes discarded');
  };
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAction = (actionKey: string, actionLabel: string) => {
    if (actionKey === 'copy-to-plots') {
      const selected = gridRef.current?.getSelectedRows() ?? [];
      setModalTreatments(selected);
      setModalTitle(selected.length === 1 ? 'Copy applied treatment to selected plots' : 'Copy applied treatments to selected plots');
      setIsModalOpen(true);
      handleMenuClose();
      return;
    }
    toast.success(`${actionLabel} for ${selectedTreatmentIds.length} treatments prepared`);
    handleMenuClose();
  };

  const menuActions: ActionItem[] = useMemo(() => {
    const count = selectedTreatmentIds.length;
    return [
      { label: count === 1 ? 'Copy treatment to plots' : 'Copy treatments to plots', icon: <ContentCopy fontSize="small" />, key: 'copy-to-plots', onClick: () => handleAction('copy-to-plots', count === 1 ? 'Copy treatment to plots' : 'Copy treatments to plots') },
      { label: count === 1 ? 'Move treatment to plan' : 'Move treatments to plan', icon: <SwapHoriz fontSize="small" />, key: 'move', onClick: () => handleAction('move', 'Move treatments to plan') },
      { divider: true, key: 'd1', onClick: () => {} },
      { label: 'Export as Excel', icon: <Download fontSize="small" />, key: 'excel', onClick: () => handleAction('excel', 'Export as Excel') },
      { label: 'Export as PDF', icon: <PictureAsPdf fontSize="small" />, key: 'pdf', onClick: () => handleAction('pdf', 'Export as PDF') },
      { divider: true, key: 'd2', onClick: () => {} },
      { label: count === 1 ? 'Delete treatment' : 'Delete treatments', icon: <DeleteOutline fontSize="small" />, key: 'delete', onClick: () => {
        selectedTreatmentIds.forEach(tid => gridRef.current?.deleteRow(tid));
        toast.success(`${count} treatment${count !== 1 ? 's' : ''} deleted`);
        setSelectedTreatmentIds([]);
        handleMenuClose();
      } },
    ];
  }, [selectedTreatmentIds]);

  if (!plot) return <Box p={3}>Plot not found</Box>;

  const plotsPath = '/';

  // Onboarding: no treatments yet — show focused CTA to add first treatment
  if (isOnboarding && treatments.length === 0) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', p: 3, height: '100%', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3, flexShrink: 0 }}>
          <Breadcrumbs separator={<NavigateNext fontSize="small" color="disabled" />}>
            <Link underline="hover" color="text.secondary" onClick={() => navigate(plotsPath)}
              sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Plots
            </Link>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.primary' }}>
              {plot.plotName} ({plot.crop})
            </Typography>
          </Breadcrumbs>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {plot.plotName} ({plot.crop})
            </Typography>
            <Button variant="text" size="small" color="primary"
              sx={{ fontWeight: 600, p: 0, minWidth: 0, textTransform: 'none', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
              View or edit
            </Button>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ flex: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', display: 'flex' }}>
          <EmptyState
            illustration={noTreatmentImg}
            title="One step to your residue forecast"
            body="Enter the treatment details for this plot to generate your forecast."
            ctaLabel="Add treatment"
            ctaVariant="contained"
            onCta={() => setIsModalOpen(true)}
          />
        </Paper>

        <TreatmentModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          preSelectedPlotIds={[id!]}
          title="Add treatment"
          hideplotsSelector
          confirmLabel="See your residue forecast"
          confirmIcon={<ArrowForward />}
          onConfirmOverride={() => {
            setOnboardingStep('done');
            setDemoMode('seeded');
            setIsModalOpen(false);
            setActiveTab(1);
          }}
        />
      </Box>
    );
  }

  // Full product view
  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', height: '100%', overflow: 'auto', p: 3, gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Breadcrumbs separator={<NavigateNext fontSize="small" color="disabled" />}>
          <Link underline="hover" color="text.secondary" onClick={() => navigate(plotsPath)}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem' }}>
            Plots
          </Link>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.primary', lineHeight: '1.5rem' }}>
            {plot.plotName} ({plot.crop})
          </Typography>
        </Breadcrumbs>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
            {plot.plotName} ({plot.crop})
          </Typography>
          <Button variant="text" size="small" color="primary"
            sx={{ fontWeight: 600, p: 0, minWidth: 0, textTransform: 'none', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
            View or edit
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: '12px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <PrimaryTabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label="Treatments" />
            <Tab label="Residue forecast" />
            <Tab label={samplingTabLabel} />
            {extraTabs.map((t) => <Tab key={t.label} label={t.label} />)}
          </PrimaryTabs>
        </Box>

        {activeTab === 1 ? (
          // Residue forecast tab — render the forecast view inline
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {ForecastContent ? <ForecastContent plotId={id!} /> : <ResidueForecastContent plotId={id!} />}
          </Box>
        ) : activeTab === 2 ? (
          // Sampling / Lab results tab
          <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <SamplingContent plotId={id!} />
          </Box>
        ) : activeTab >= 3 ? (
          // Extra variant-injected tab(s)
          <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {extraTabs[activeTab - 3]?.render(id!)}
          </Box>
        ) : activeTab === 0 && TreatmentsContent ? (
          // Variant-provided Treatments view (spray-plans variants live here now)
          <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <TreatmentsContent plotId={id!} />
          </Box>
        ) : (
          <>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <SecondaryTabs value={activeSubTab} onChange={(_, v) => setActiveSubTab(v)}>
                  <Tab label="Applied" />
                  <Tab label="+ Create alternative log" />
                </SecondaryTabs>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {treatmentsCustomization?.toolbarExtras}
                  <Button variant="soft" color="primary" startIcon={<Add />}
                    onClick={handleAddTreatment}
                    sx={{ px: 2, height: 36, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}>
                    Add treatment
                  </Button>
                  <TextField size="small" placeholder="Search treatments…" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>, sx: { borderRadius: '8px' } }}
                    sx={{ width: 240, '& .MuiOutlinedInput-root': { height: 36, bgcolor: 'white' } }} />
                  <OptionsTrigger onClick={handleMenuOpen} disabled={selectedTreatmentIds.length === 0} />
                  <ActionMenu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose} actions={menuActions} />
                </Box>
              </Stack>
            </Box>

            {hasUnsavedChanges ? (
              <SaveBar
                onSave={handleCreateTreatment}
                onCancel={handleCancelChanges}
                onSaveDraft={treatmentsCustomization?.hideSaveDraft ? undefined : handleSaveTreatmentDraft}
                variant={treatmentsCustomization?.saveBarVariant}
              />
            ) : treatmentCount > 0 ? (
              <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                    {treatmentCount} total treatment{treatmentCount !== 1 ? 's' : ''}
                  </Typography>
                  {treatmentsCustomization?.countBarExtras?.(treatments)}
                </Stack>
              </Box>
            ) : null}

            <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
              <TreatmentsGrid key={`${id}-${gridKey}`} ref={gridRef} initialData={treatments}
                prependColumns={treatmentsCustomization?.prependColumns}
                appendColumns={treatmentsCustomization?.appendColumns}
                productColumn={treatmentsCustomization?.productColumn}
                dateColumnOverride={treatmentsCustomization?.dateColumnOverride}
                onDirtyStateChange={setHasUnsavedChanges} onSelectionChange={setSelectedTreatmentIds}
                onRowCountChange={setTreatmentCount}
                onAssign={(rowId) => {
                  const row = gridRef.current?.getRow(rowId);
                  if (row) { setModalTreatments([row]); setModalTitle('Copy applied treatment to selected plots'); setIsModalOpen(true); }
                }} />
              {treatmentCount === 0 && (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'background.paper', display: 'flex', zIndex: 2 }}>
                  <EmptyState
                    illustration={noTreatmentImg}
                    title="One step to your residue forecast"
                    body="Enter the treatment details for this plot to generate your forecast."
                    ctaLabel="Add treatment"
                    ctaVariant="contained"
                    onCta={handleAddTreatment}
                  />
                </Box>
              )}
            </Box>
          </>
        )}
      </Paper>

      <InjectedTreatmentModal open={isModalOpen} onClose={() => setIsModalOpen(false)}
        preSelectedTreatments={modalTreatments} title={modalTitle} />
    </Box>
  );
}

// ── Inline residue forecast content (same view as standalone page) ─────────

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton
} from '@mui/material';
import { CheckCircle, ChevronLeft, ChevronRight, InfoOutlined } from '@mui/icons-material';

const TIMELINE_START = new Date('2025-04-08');
const TIMELINE_DAYS = 36;

function generateTimeline() {
  const days: { date: Date; day: number; month: string; treatment: string }[] = [];
  let prevMonth = '';
  for (let i = 0; i < TIMELINE_DAYS; i++) {
    const d = new Date(TIMELINE_START);
    d.setDate(d.getDate() + i);
    const month = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    days.push({ date: d, day: d.getDate(), month: month !== prevMonth ? month : '', treatment: i === 0 || i === 7 ? '1' : '—' });
    prevMonth = month;
  }
  return days;
}

const timeline = generateTimeline();
const substances = [
  { name: 'Fluopyram', prediction: '0.401', mrl: '27 %', arfd: '1 %' },
  { name: 'Tebuconazole', prediction: '0.234', mrl: '23 %', arfd: '7 %' },
];

export function ResidueForecastContent({ plotId }: { plotId: string }) {
  const headerSx = { fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 };
  const cellSx = { fontSize: '0.875rem', py: 1.5 };
  const mrlCellSx = { ...cellSx, bgcolor: 'rgba(76,175,80,0.06)' };

  return (
    <Box>
      {/* Status + controls */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'primary.main' }}>Real</Typography>
          <Chip icon={<CheckCircle sx={{ fontSize: 16 }} />} label="Predictions up to date"
            size="small" color="success" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>AHOLD / ALBERT ...</Typography>
          <Button size="small" color="primary" sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}>Options</Button>
        </Stack>
      </Box>

      {/* Timeline */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', px: 1 }}>
          <Box sx={{ flexShrink: 0, width: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pr: 1, pb: 1 }}>
            {['PLOT RISK', 'TREATMENTS', 'LAB ANALYSIS'].map(label => (
              <Typography key={label} sx={{ fontSize: '0.625rem', fontWeight: 700, color: 'text.secondary', lineHeight: 2.4, textTransform: 'uppercase' }}>
                {label} {label === 'PLOT RISK' && <InfoOutlined sx={{ fontSize: 10, verticalAlign: 'middle', ml: 0.25 }} />}
              </Typography>
            ))}
          </Box>
          <IconButton size="small" sx={{ alignSelf: 'center', color: 'text.secondary', flexShrink: 0 }}><ChevronLeft fontSize="small" /></IconButton>
          {timeline.map((t, i) => {
            const isToday = i === 7;
            return (
              <Box key={i} sx={{ flexShrink: 0, width: 36, textAlign: 'center', pb: 1, borderLeft: t.month ? '1px solid' : 'none', borderColor: 'divider', ...(isToday && { bgcolor: 'rgba(212,24,61,0.04)' }) }}>
                {t.month && <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'left', pl: 0.5, mb: 0.25 }}>{t.month}</Typography>}
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: isToday ? 700 : 400, ...(isToday ? { bgcolor: 'primary.main', color: 'white', borderRadius: '50%', width: 20, height: 20, lineHeight: '20px', mx: 'auto' } : { color: 'text.primary' }) }}>{t.day}</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', lineHeight: 2.4 }}>O</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: t.treatment !== '—' ? 'primary.main' : 'text.disabled', lineHeight: 2.4, fontWeight: t.treatment !== '—' ? 700 : 400 }}>{t.treatment !== '—' ? '1' : '—'}</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: 'text.disabled', lineHeight: 2.4 }}>—</Typography>
              </Box>
            );
          })}
          <IconButton size="small" sx={{ alignSelf: 'center', color: 'text.secondary', flexShrink: 0 }}><ChevronRight fontSize="small" /></IconButton>
        </Box>
      </Box>

      {/* Substance table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerSx, width: '30%' }}>Substances</TableCell>
              <TableCell sx={headerSx}>Prediction (ppm)</TableCell>
              <TableCell sx={headerSx}>% MRL</TableCell>
              <TableCell sx={headerSx}>% ARfD</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {substances.map((s) => (
              <TableRow key={s.name} hover>
                <TableCell sx={cellSx}>{s.name}</TableCell>
                <TableCell sx={cellSx}>{s.prediction}</TableCell>
                <TableCell sx={mrlCellSx}>{s.mrl}</TableCell>
                <TableCell sx={mrlCellSx}>{s.arfd}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ ...cellSx, fontWeight: 700, bgcolor: 'primary.main', color: 'white', borderBottom: 'none' }}>Sum of substances and %</TableCell>
              <TableCell sx={{ ...cellSx, bgcolor: 'action.hover', borderBottom: 'none' }}>N/A</TableCell>
              <TableCell sx={{ ...cellSx, bgcolor: 'action.hover', borderBottom: 'none' }}>N/A</TableCell>
              <TableCell sx={{ ...cellSx, bgcolor: 'action.hover', borderBottom: 'none' }}>N/A</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer */}
      <Box sx={{ display: 'flex', borderTop: '1px solid', borderColor: 'divider' }}>
        {[{ label: 'Traces', content: 'No traces' }, { label: 'Not Supported', content: 'No substances' }, { label: 'Not Relevant', content: 'No substances' }].map((section, i) => (
          <Box key={section.label} sx={{ flex: 1, px: 2, py: 2, ...(i > 0 && { borderLeft: '1px solid', borderColor: 'divider' }) }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'primary.main', mb: 0.5, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              {section.label} <InfoOutlined sx={{ fontSize: 12, verticalAlign: 'middle', color: 'primary.main' }} />
            </Typography>
            <Typography variant="body2" color="text.secondary">{section.content}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
