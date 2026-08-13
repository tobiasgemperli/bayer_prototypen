import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from '../variant-context';
import {
  Box, Breadcrumbs, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, Link, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { Add, DeleteOutline, EditOutlined, InfoOutlined, NavigateNext } from '@mui/icons-material';
import { toast } from 'sonner';
import { usePlots } from '../../data/plots-data';
import {
  useLabSamples, updateLabSample, getAnalytesForPlot, isDetected, LABS_WITH_API_CONNECTION,
  LabReport, LabResidue,
} from '../../data/lab-results-data';
import { PageLayout } from '../../design-system/PageLayout';
import { ActionChip, ApiConnectionChip } from '../../design-system/Chips';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { TableCard, EmDash } from '../../design-system/TableCard';
import { RowIconButton } from '../../design-system/grid/grid-shared';
import { LabResiduesGrid, LabResiduesGridHandle } from '../../lab-shared/LabResiduesGrid';
import { SampleFormDialog, SampleFormValues, toFormValues } from './SampleFormDialog';
import { AddReportDialog } from './AddReportDialog';
import { Th, readOnlyRowSx, readOnlyHeaderRowSx, checkboxCellSx } from './SamplesReportsTable';

// ── Shared style tokens ───────────────────────────────────────────────────────

const cardSx = {
  borderRadius: '12px', border: '1px solid', borderColor: 'divider',
  bgcolor: 'background.paper', px: { xs: 3, sm: 4 }, pt: 3, pb: 3,
} as const;

const softBtnSx = {
  fontWeight: 600, borderRadius: '8px', px: 2, height: 40, textTransform: 'none',
} as const;

// Same look as the shared SectionLabel, minus its baked-in mb — that margin
// is meant for a label stacked above other content, but here the label sits
// beside a button in a row with alignItems="center": a margin on only one
// flex item shifts its content within its own (taller) box, throwing off
// the vertical centering against the button. Spacing to the row below is
// already handled by the row Stack's own mb.
function CardTitleLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </Typography>
  );
}

// ── FilterChip — a real MUI Chip (per mui.com/material-ui/react-chip), not a
// ToggleButtonGroup: each option is its own standalone clickable element, so
// chips space apart naturally (Stack spacing, same as MUI's own grouped-chip
// demos) instead of fighting a connected-control default. `active` uses
// primary.softBg — this app's own established "selected state" tint (see
// SampleFormDialog's selected-option highlight), not the "two equal audiences"
// misuse from earlier.
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Chip
      label={label}
      clickable
      onClick={onClick}
      sx={{
        height: 40, borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem',
        border: '1px solid',
        ...(active
          ? { bgcolor: 'primary.softBg', color: 'primary.main', borderColor: 'primary.main' }
          : { bgcolor: 'transparent', color: 'text.secondary', borderColor: 'divider' }),
        '&:hover': { bgcolor: active ? 'primary.softBg' : 'action.hover' },
      }}
    />
  );
}

// ── Reports card — same table/checkbox/bulk-action pattern as the Plots and
// Samples tables. Reports are read-only summary rows (Laboratory · Lab
// report ID · PDF) with Edit/Delete icons. Add and Edit both open the same
// AddReportDialog popup — a single-purpose "report only" form, independent
// from adding results — Edit pre-fills it with the report's existing data
// (see `editingReport`). A report pushed in via the lab's direct API
// connection (`managedBy`) can't be selected, edited, or deleted — its
// checkbox is disabled and its Edit/Delete icons are simply absent.

const MANAGED_REPORT_TOOLTIP = "This report was submitted automatically via the lab's direct connection to ResiYou.";

interface ReportRowProps {
  report: LabReport;
  checked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ReportRow({ report, checked, onToggle, onEdit, onDelete }: ReportRowProps) {
  const locked = !!report.managedBy;
  const isApi = LABS_WITH_API_CONNECTION.has(report.laboratory);
  const attachmentCount = report.attachments?.length ?? 0;
  const attachmentLabel = attachmentCount > 1
    ? `${report.attachments[0].name} +${attachmentCount - 1} more`
    : report.attachments?.[0]?.name;
  const textSx = { fontSize: '0.875rem', color: locked ? 'text.disabled' : 'text.primary' } as const;

  const row = (
    <TableRow hover={!locked} sx={{ cursor: locked ? 'not-allowed' : 'default', ...readOnlyRowSx }}>
      <TableCell padding="checkbox" sx={checkboxCellSx}>
        <Checkbox checked={checked} onChange={onToggle} disabled={locked} />
      </TableCell>
      <TableCell>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography component="span" sx={textSx}>{report.laboratory || <EmDash />}</Typography>
          {isApi && (
            <Box sx={locked ? { opacity: 0.6, filter: 'grayscale(1)' } : undefined}>
              <ApiConnectionChip condensed />
            </Box>
          )}
        </Stack>
      </TableCell>
      <TableCell sx={textSx}>{report.labReportId || <EmDash />}</TableCell>
      <TableCell sx={textSx}>{attachmentLabel || <EmDash />}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {!locked && (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <RowIconButton label="Edit" onClick={onEdit}>
              <EditOutlined fontSize="small" />
            </RowIconButton>
            <RowIconButton label="Delete" onClick={onDelete}>
              <DeleteOutline fontSize="small" />
            </RowIconButton>
          </Stack>
        )}
      </TableCell>
    </TableRow>
  );

  if (!locked) return row;
  return (
    <Tooltip title={MANAGED_REPORT_TOOLTIP} arrow placement="top" enterDelay={200}>
      {row}
    </Tooltip>
  );
}

export interface ReportsCardProps {
  reports: LabReport[];
  selected: string[];
  onSelectChange: (ids: string[]) => void;
  onAddReport: () => void;
  onEditReport: (report: LabReport) => void;
  onDeleteReport: (report: LabReport) => void;
  onBulkDelete: () => void;
}

export function ReportsCard({
  reports, selected, onSelectChange, onAddReport, onEditReport, onDeleteReport, onBulkDelete,
}: ReportsCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const selectable = reports.filter((r) => !r.managedBy);
  const allChecked = selectable.length > 0 && selected.length === selectable.length;
  const someChecked = selected.length > 0 && !allChecked;
  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectChange(e.target.checked ? selectable.map((r) => r.id) : []);
  };
  const toggleOne = (id: string) => {
    onSelectChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const bulkActions: ActionItem[] = [
    {
      label: `Delete report${selected.length !== 1 ? 's' : ''}`,
      icon: <DeleteOutline fontSize="small" />,
      key: 'delete',
      color: 'error.main',
      onClick: () => { onBulkDelete(); setMenuAnchor(null); },
    },
  ];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <CardTitleLabel>Reports</CardTitleLabel>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="soft" color="primary"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={onAddReport}
            sx={softBtnSx}>
            Add report
          </Button>
          {selected.length > 0 && (
            <>
              <OptionsTrigger onClick={(e) => setMenuAnchor(e.currentTarget)} hasSelection />
              <ActionMenu anchorEl={menuAnchor} open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)} actions={bulkActions} />
            </>
          )}
        </Stack>
      </Stack>
      {reports.length === 0 ? (
        <Box sx={cardSx}>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.disabled' }}>
            No reports added yet.
          </Typography>
        </Box>
      ) : (
        <TableCard>
          <TableContainer>
            <Table stickyHeader aria-label="reports table">
              <TableHead>
                <TableRow sx={readOnlyHeaderRowSx}>
                  <TableCell padding="checkbox" sx={checkboxCellSx}>
                    <Checkbox indeterminate={someChecked} checked={allChecked} onChange={toggleAll} disabled={selectable.length === 0} />
                  </TableCell>
                  <Th>Laboratory</Th>
                  <Th>Lab report ID</Th>
                  <Th>Attachments</Th>
                  <TableCell sx={{ width: 0 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((r) => (
                  <ReportRow
                    key={r.id} report={r}
                    checked={selected.includes(r.id)}
                    onToggle={() => toggleOne(r.id)}
                    onEdit={() => onEditReport(r)}
                    onDelete={() => onDeleteReport(r)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableCard>
      )}
    </Box>
  );
}

// ── Results card — one shared grid for the whole sample ──────────────────────

export interface ResultsCardProps {
  residues: LabResidue[];
  reports: LabReport[];
  plotAnalytes: string[];
  onAdd: (r: LabResidue) => void;
  onUpdate: (id: string, patch: Partial<LabResidue>) => void;
  onDelete: (id: string) => void;
}

export function ResultsCard({ residues, reports, plotAnalytes, onAdd, onUpdate, onDelete }: ResultsCardProps) {
  const gridRef = useRef<LabResiduesGridHandle>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // "All analytes" vs "Detected analytes" — a segmented toggle instead of a
  // single on/off switch (v15's "View below LOQ" switch reads ambiguous:
  // it's unclear whether checking it adds or removes rows). Each option
  // states directly what's shown, with a live count, so there's nothing to
  // mentally translate. "Detected" means residueLevel is Residue or Trace
  // (the same `isDetected` helper the plot-detail lab-results status line
  // already uses) — Below LOQ / Not analyzed / unset all count as "not
  // detected" and are hidden by the "Detected analytes" option.
  const [resultsFilter, setResultsFilter] = useState<'all' | 'detected'>('all');
  const detectedCount = residues.filter(isDetected).length;
  const filteredResidues = resultsFilter === 'detected' ? residues.filter(isDetected) : residues;

  const handleAddResidue = (analyte?: string) => {
    gridRef.current?.addRow(analyte);
  };

  const bulkActions: ActionItem[] = [
    {
      label: `Delete result${selected.length !== 1 ? 's' : ''}`,
      icon: <DeleteOutline fontSize="small" />,
      key: 'delete',
      color: 'error.main',
      onClick: () => {
        gridRef.current?.deleteRows(selected);
        setSelected([]);
        setMenuAnchor(null);
      },
    },
  ];

  const gridHeight = Math.min(500, Math.max(160, filteredResidues.length * 52 + 52));

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CardTitleLabel>Results</CardTitleLabel>
          {/* Two independent MUI Chips (mui.com/material-ui/react-chip), not
              a ToggleButtonGroup — each is its own clickable element, so they
              space apart naturally instead of rendering as one connected
              control. Counts make each chip state exactly what it shows, so
              no separate "Show" label is needed. */}
          <Stack direction="row" spacing={1}>
            <FilterChip
              label={`All analytes (${residues.length})`}
              active={resultsFilter === 'all'}
              onClick={() => { setSelected([]); setResultsFilter('all'); }}
            />
            <FilterChip
              label={`Detected analytes (${detectedCount})`}
              active={resultsFilter === 'detected'}
              onClick={() => { setSelected([]); setResultsFilter('detected'); }}
            />
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button variant="soft" color="primary"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={() => handleAddResidue()}
            sx={softBtnSx}>
            Add analyte
          </Button>
          {selected.length > 0 && (
            <>
              <OptionsTrigger onClick={(e) => setMenuAnchor(e.currentTarget)} hasSelection />
              <ActionMenu anchorEl={menuAnchor} open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)} actions={bulkActions} />
            </>
          )}
        </Stack>
      </Stack>

      {/* TableCard — same edge-to-edge card wrapper as the Reports table above,
          so a card wrapping a table looks the same whether the table is the
          plain read-only kind or the editable grid kind. */}
      <TableCard>
        {/* Suggested analyte chips — stay visible after use so the same
            analyte can be added again (it may come from more than one report).
            This is the only part of the card that isn't tabular, so it's the
            only part that gets its own padding — the grid below fills the
            card edge-to-edge like the Reports table does. */}
        {plotAnalytes.length > 0 && (
          <Box sx={{ px: 3, pt: 1.5, pb: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                Suggested analytes
              </Typography>
              <Tooltip title="These are analytes we detected in documented treatments on this plot." arrow placement="top" enterDelay={150}>
                <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
              </Tooltip>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {plotAnalytes.map((analyte) => (
                <ActionChip key={analyte} label={analyte} onClick={() => handleAddResidue(analyte)} />
              ))}
            </Stack>
          </Box>
        )}

        {/* Always mounted, even empty — the grid's own empty state (column
            headers + "No rows") tells users what a result looks like before
            they've added one. The grid being mounted from the start is also
            what makes gridRef.current?.addRow() work reliably on the very
            first click, not just subsequent ones. */}
        <Box sx={{ height: gridHeight }}>
          {/* key={resultsFilter} forces a remount when the filter flips —
              EditableDataGrid captures `residues` as initialData once and
              ignores later prop updates, so a plain filter on the same
              mounted instance wouldn't change what's visible. Edits are
              already flushed into the parent's `residues` state on every
              committed cell change (not just on the page's own Save), so
              remounting never loses anything but an edit mid-keystroke. */}
          <LabResiduesGrid
            key={resultsFilter}
            ref={gridRef}
            residues={filteredResidues}
            reports={reports}
            hideSource
            recommendedAnalytes={plotAnalytes}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSelectionChange={setSelected}
            noRowsMessage={resultsFilter === 'detected' ? 'No detected results.' : 'No analytes added yet.'}
          />
        </Box>
      </TableCard>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SampleReportPage() {
  const { id: plotId, sampleId } = useParams<{ id: string; sampleId: string }>();
  const navigate = useNavigate();
  const plots = usePlots();
  const allSamples = useLabSamples();

  const plot = plots.find((p) => p.id === plotId);
  const sample = allSamples.find((s) => s.id === sampleId);

  const [residues, setResidues] = useState<LabResidue[]>(sample?.residues ?? []);
  const [editOpen, setEditOpen] = useState(false);

  // "Have you added all results?" gate in front of the real save — the
  // grid already autosaves every cell edit into `residues`, so this dialog's
  // only job is making the user consciously confirm completeness before it
  // commits (production wants this compared 1:1 against the lab report, not
  // partially transcribed). Every dismiss path — No, the close icon, Escape,
  // backdrop click — must map to the same "don't save yet" outcome as the
  // Dialog's own onClose; only the explicit Yes click may proceed. No
  // autoFocus on Yes, so a stray Enter/Space right after opening can't
  // silently confirm it.
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  // "Add report" popup — also used for editing an existing report (see
  // `editingReport`). It only ever touches `sample.reports`, never residues,
  // so results stay a fully independent action (the grid below persists on
  // the page's own Save). `addReportToken` forces a fresh remount on every
  // open, even re-opening the same sample, so no field state leaks across
  // sessions.
  const [addReportToken, setAddReportToken] = useState(0);
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<LabReport | null>(null);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  useEffect(() => {
    if (sample) setResidues(sample.residues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample?.residues]);

  if (!plot || !sample) return <Box sx={{ p: 3 }}>Loading…</Box>;

  const plotAnalytes = getAnalytesForPlot(plotId ?? '');
  // Some seeded samples carry a "draft" report (lab picked, id/attachment
  // never filled in) left over from the card-based demo data — dropped here
  // rather than surfacing as an empty line in the overview.
  const reports = (sample.reports ?? []).filter(
    (r) => r.labReportId.trim() !== '' || (r.attachments?.length ?? 0) > 0
  );

  // Sample name/date/commodity/comments are edited via the "View or edit"
  // popup (the same SampleFormDialog used everywhere else) instead of
  // inline fields on this page.
  const fmtDate = (d: Date | null) =>
    d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d) : null;
  const titleLine = [sample.sampleName || 'Unnamed sample', fmtDate(sample.dateOfSample), sample.commodity]
    .filter(Boolean)
    .join(' · ');

  const handleBack = () => navigate(`/plot/${plotId}`, { state: { activeTab: 2 } });

  const handleSave = () => {
    updateLabSample(sample.id, { residues, isDraft: false });
    toast.success('Saved');
    handleBack();
  };

  const handleConfirmSaveYes = () => {
    setConfirmSaveOpen(false);
    handleSave();
  };
  const handleConfirmSaveNo = () => setConfirmSaveOpen(false);

  const handleEditSave = (values: SampleFormValues) => {
    updateLabSample(sample.id, { ...values, isDraft: false });
    setEditOpen(false);
    toast.success('Sample updated');
  };

  const openAddReport = () => { setEditingReport(null); setAddReportOpen(true); setAddReportToken((t) => t + 1); };
  const openEditReport = (report: LabReport) => { setEditingReport(report); setAddReportOpen(true); setAddReportToken((t) => t + 1); };
  const closeAddReport = () => setAddReportOpen(false);

  const handleReportDelete = (report: LabReport) => {
    // Orphaned results are intentionally left in place (flagged via the
    // "Lab report" column's warning tag) rather than cascade-deleted.
    updateLabSample(sample.id, { reports: (sample.reports ?? []).filter((r) => r.id !== report.id) });
    toast.success('Report deleted');
  };

  const handleReportBulkDelete = () => {
    if (selectedReports.length === 0) return;
    updateLabSample(sample.id, {
      reports: (sample.reports ?? []).filter((r) => !selectedReports.includes(r.id)),
    });
    toast.success(`${selectedReports.length} report${selectedReports.length !== 1 ? 's' : ''} deleted`);
    setSelectedReports([]);
  };

  const handleResidueAdd = (r: LabResidue) => setResidues((prev) => [...prev, r]);
  const handleResidueUpdate = (id: string, patch: Partial<LabResidue>) =>
    setResidues((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const handleResidueDelete = (id: string) => setResidues((prev) => prev.filter((r) => r.id !== id));

  return (
    <>
      <PageLayout
        variant="centered"
        contentMaxWidth={960}
        breadcrumbs={
          <Breadcrumbs separator={<NavigateNext fontSize="small" color="disabled" />}>
            <Link underline="hover" color="text.secondary" onClick={() => navigate('/')}
              sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem' }}>
              Plots
            </Link>
            <Link underline="hover" color="text.secondary" onClick={() => navigate(`/plot/${plotId}`)}
              sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem' }}>
              {plot.plotName}
            </Link>
            <Link underline="hover" color="text.secondary" onClick={handleBack}
              sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem' }}>
              Samples &amp; Reports
            </Link>
            <Typography
              sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem', color: 'text.primary' }}>
              {sample.sampleName || 'Unnamed sample'}
            </Typography>
          </Breadcrumbs>
        }
        title={
          <Stack spacing={0.25}>
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
              <Box component="span">{titleLine}</Box>
              <Button
                variant="text" color="primary"
                onClick={() => setEditOpen(true)}
                sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.875rem' }}
              >
                View or edit
              </Button>
            </Stack>
            {/* Small repeat of the sample's Comments/Notes (edited via "View
                or edit") so it's visible at a glance without opening the
                dialog — only shown when there's something to show. */}
            {sample.comments?.trim() && (
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 400, color: 'text.secondary' }}>
                {sample.comments}
              </Typography>
            )}
          </Stack>
        }
        actions={
          <>
            <Button variant="text" color="inherit" onClick={handleBack}
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={() => setConfirmSaveOpen(true)}
              sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
              Save
            </Button>
          </>
        }
      >
        <Stack spacing={4}>

          {/* ── Reports ──────────────────────────────────────────────── */}
          <ReportsCard
            reports={reports}
            selected={selectedReports}
            onSelectChange={setSelectedReports}
            onAddReport={openAddReport}
            onEditReport={openEditReport}
            onDeleteReport={handleReportDelete}
            onBulkDelete={handleReportBulkDelete}
          />

          {/* ── Results ──────────────────────────────────────────────── */}
          <ResultsCard
            residues={residues}
            reports={reports}
            plotAnalytes={plotAnalytes}
            onAdd={handleResidueAdd}
            onUpdate={handleResidueUpdate}
            onDelete={handleResidueDelete}
          />

        </Stack>
      </PageLayout>

      <SampleFormDialog
        open={editOpen}
        title="Edit sample"
        initial={toFormValues(sample)}
        onClose={() => setEditOpen(false)}
        onCreate={handleEditSave}
      />

      <AddReportDialog
        key={addReportToken}
        sample={addReportOpen ? sample : null}
        editingReport={editingReport}
        onClose={closeAddReport}
      />

      {/* Save confirmation — every dismiss path (No, close icon, Escape,
          backdrop) resolves to handleConfirmSaveNo, so only an explicit Yes
          click ever commits the save. No autoFocus on Yes on purpose. */}
      <Dialog
        open={confirmSaveOpen}
        onClose={handleConfirmSaveNo}
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}
      >
        <DialogContent sx={{ textAlign: 'center', pt: 3, px: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.0625rem', mb: 1 }}>
            Have you added all results from the report?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will enable us to compare our predictions with the lab reports precisely.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 3 }}>
          <Button
            onClick={handleConfirmSaveYes}
            variant="contained" color="primary"
            sx={{ fontWeight: 600, textTransform: 'none', px: 3, height: 36, borderRadius: '8px' }}
          >
            Yes
          </Button>
          <Button
            onClick={handleConfirmSaveNo}
            variant="text" color="inherit"
            autoFocus
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 3, height: 36 }}
          >
            No
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
