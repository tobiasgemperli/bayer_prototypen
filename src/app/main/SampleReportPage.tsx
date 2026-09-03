import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from '../variants/variant-context';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Breadcrumbs, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Stack, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add, Close as CloseIcon, DeleteOutline, EditOutlined, ExpandMore, NavigateNext,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { usePlots } from '../data/plots-data';
import {
  useLabSamples, updateLabSample, getAnalytesForPlot, isDetected, LABS_WITH_API_CONNECTION,
  LabAttachment, LabReport, LabResidue,
} from '../data/lab-results-data';
import { PageLayout } from '../design-system/PageLayout';
import { FieldLabel } from '../design-system/FormField';
import { ApiConnectionChip } from '../design-system/Chips';
import { AttachmentChip } from '../design-system/AttachmentChip';
import { OptionsTrigger } from '../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../design-system/ActionMenu';
import { TableCard, EmDash } from '../design-system/TableCard';
import { SaveBar } from '../design-system/SaveBar';
import { RowIconButton } from '../design-system/grid/grid-shared';
import { LabResiduesGrid, LabResiduesGridHandle } from '../lab-shared/LabResiduesGrid';
import { SampleFormDialog, SampleFormValues, toFormValues } from './SampleFormDialog';
import { AddReportDialog } from './AddReportDialog';
import { AddResultsDialog } from './AddResultsDialog';
import { ConfirmActionDialog } from './ConfirmActionDialog';

// ── Shared style tokens ───────────────────────────────────────────────────────

const softBtnSx = {
  fontWeight: 600, borderRadius: '8px', px: 2, height: 36, textTransform: 'none',
} as const;

// Real heading size now that this is an accordion's own title (not a small
// eyebrow label beside a button) — the accordion header's only job is
// identity + expand/collapse, so it gets room to read as an actual heading.
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'text.primary' }}>
      {children}
    </Typography>
  );
}

// ── SectionAccordion — shared shell for the Reports/Results sections. The
// AccordionSummary holds ONLY the title + expand chevron — no filter chips,
// no CTAs. Those belong to the section's own content, not its collapse
// control, so they live in `toolbar`, rendered at the top of
// AccordionDetails, above `children`. Nothing needs stopPropagation
// anymore: the summary has nothing interactive in it besides the toggle
// itself. ──────────────────────────────────────────────────────────────

function SectionAccordion({
  title, defaultExpanded, toolbar, children,
}: {
  title: string;
  defaultExpanded: boolean;
  /** Row rendered at the top of the expanded content — filters, CTAs, etc. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid', borderColor: 'divider', borderRadius: '12px !important',
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2.5, minHeight: 64 }}>
        <SectionTitle>{title}</SectionTitle>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
        {toolbar && <Box sx={{ mb: 2 }}>{toolbar}</Box>}
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

// ── Section — non-collapsible shell for the Reports/Results sections (same
// bordered card as SectionAccordion but always open; the title is not a
// collapse control). Toolbar renders at the top of the content, above
// `children`, exactly like the accordion's did. ────────────────────────────
function Section({ title, toolbar, children }: {
  title: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Title and section toolbar share one baseline row. */}
      <Box sx={{ px: 2.5, pt: 2, pb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <SectionTitle>{title}</SectionTitle>
        {toolbar && <Box sx={{ flexShrink: 0 }}>{toolbar}</Box>}
      </Box>
      <Box sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
        {children}
      </Box>
    </Box>
  );
}

// ── Report thumbnail — a faux document "page" placeholder (stored reports keep
// only attachment metadata, not the PDF bytes, so there's nothing to render a
// real thumbnail from). Clicking opens the two-pane View report dialog. ──────
function ReportThumbnailImage({ width = 132 }: { width?: number }) {
  const line = (w: string) => (
    <Box sx={{ height: 6, width: w, bgcolor: 'grey.200', borderRadius: 1, mb: 0.75 }} />
  );
  return (
    <Box className="thumb" sx={{
      width, height: Math.round(width * 1.3), bgcolor: '#fff', borderRadius: '6px',
      border: '1px solid', borderColor: 'divider', p: 1.25, position: 'relative', overflow: 'hidden',
      transition: 'border-color .15s, box-shadow .15s',
    }}>
      {line('55%')}{line('85%')}{line('80%')}{line('70%')}{line('82%')}{line('40%')}
      <Chip label="PDF" size="small" sx={{
        position: 'absolute', bottom: 6, right: 6, height: 18, fontSize: '0.625rem', fontWeight: 700,
        bgcolor: 'error.main', color: '#fff', '& .MuiChip-label': { px: 0.75 },
      }} />
    </Box>
  );
}

function ReportThumbnail({ report, onClick }: { report: LabReport; onClick: () => void }) {
  const isApi = LABS_WITH_API_CONNECTION.has(report.laboratory);
  return (
    <Box onClick={onClick} sx={{
      width: 132, cursor: 'pointer',
      '&:hover .thumb': { borderColor: 'primary.main', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' },
    }}>
      <ReportThumbnailImage />
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }} noWrap>{report.laboratory || 'Lab report'}</Typography>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" noWrap>{report.labReportId || '—'}</Typography>
        {isApi && <ApiConnectionChip condensed />}
      </Stack>
    </Box>
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

// ── EmptyDropzone — the Reports/Results pre-first-item state: a transparent,
// dashed-border box with a single big "+" add button centered inside (no
// label). ctaLabel is kept for the accessible name/tooltip only.
function EmptyDropzone({ onClick, ctaLabel }: { onClick: () => void; ctaLabel: string }) {
  return (
    <Box
      sx={{
        mt: 2, py: 6, borderRadius: '12px',
        border: '1px dashed', borderColor: 'divider', bgcolor: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Tooltip title={ctaLabel} arrow>
        <IconButton
          aria-label={ctaLabel}
          onClick={onClick}
          sx={{
            width: 56, height: 56, color: 'primary.main', bgcolor: 'primary.softBg',
            '&:hover': { bgcolor: alpha('#d4183d', 0.16) },
          }}
        >
          <Add sx={{ fontSize: 30 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ── Reports card — one bordered card per report (not a table): Laboratory +
// Lab report ID, then every PDF attached to it as its own row with an eye
// icon to view. Add and Edit both open AddReportDialog — a single-purpose
// report form, independent from adding results — Edit pre-fills it with the
// report's existing data. A report pushed in via the lab's direct API
// connection (`managedBy`) can't be edited or deleted — its card renders
// muted with a lock tooltip instead of Edit/Delete icons.

const MANAGED_REPORT_TOOLTIP = "This report was submitted automatically via the laboratory's direct connection to ResiYou.";

// Demo-only attachment padding, local to this variant — never touches the
// underlying store. Every seeded report in this app has 0-1 real
// attachments; the card view wants 3 per report to look like a populated
// real report, so this synthesizes enough extra (named off the first real
// attachment, or the report's own ID if it has none) to reach 3, without
// ever trimming a report that already has 3+.
function withDemoAttachments(report: LabReport): LabAttachment[] {
  const real = report.attachments ?? [];
  if (real.length >= 3) return real;
  // Generic filename, not derived from the report's own (often free-typed,
  // sometimes gibberish-during-testing) labReportId — demo attachments
  // should read as a plausible lab document regardless of what's typed.
  const base = real[0] ?? {
    id: `${report.id}-demo-base`,
    name: 'lab-report.pdf',
    size: 240_000,
  };
  const stem = base.name.replace(/\.pdf$/i, '');
  const extraSuffixes = ['-appendix', '-coa'];
  const needed = 3 - real.length;
  const synthesized = extraSuffixes.slice(0, needed).map((suffix, i) => ({
    id: `${report.id}-demo-${i}`,
    name: `${stem}${suffix}.pdf`,
    size: base.size + (i + 1) * 18_000,
  }));
  return real.length > 0 ? [...real, ...synthesized] : [base, ...synthesized];
}

// Label-over-value pair for Laboratory / Lab report ID, side by side. Plain
// MUI Typography variants (body2 secondary label, body1 value) — no custom
// font-size/weight overrides.
function LabeledValue({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <FieldLabel>{label}</FieldLabel>
      <Typography variant="body1" color={color ?? 'text.primary'}>
        {value}
      </Typography>
    </Box>
  );
}

interface ReportCardItemProps {
  report: LabReport;
  onEdit: () => void;
  onDelete: () => void;
}

function ReportCardItem({ report, onEdit, onDelete }: ReportCardItemProps) {
  const locked = !!report.managedBy;
  const isApi = LABS_WITH_API_CONNECTION.has(report.laboratory);
  const attachments = withDemoAttachments(report);
  const textColor = locked ? 'text.disabled' : 'text.primary';

  const handleView = (name: string) => {
    toast.info(`Open ${name}`);
    window.open('about:blank', '_blank', 'noopener,noreferrer');
  };

  const card = (
    <Box
      sx={{
        border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 2,
        cursor: locked ? 'not-allowed' : 'default',
        ...(locked ? { bgcolor: 'action.hover' } : {}),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        {/* Laboratory / Lab report ID — each hugs its own content width with
            a gap between, not stretched to 50/50 (short values shouldn't
            leave half the row empty). */}
        <Stack direction="row" spacing={4} sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ minWidth: 0 }}>
            <FieldLabel>Laboratory</FieldLabel>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body1" color={textColor}>
                {report.laboratory || <EmDash />}
              </Typography>
              {isApi && (
                <Box sx={locked ? { opacity: 0.6, filter: 'grayscale(1)' } : undefined}>
                  <ApiConnectionChip condensed />
                </Box>
              )}
            </Stack>
          </Box>
          <LabeledValue label="Lab report ID" value={report.labReportId || <EmDash />} color={textColor} />
        </Stack>
        {!locked && (
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, ml: 1 }}>
            <RowIconButton label="Edit" onClick={onEdit}>
              <EditOutlined fontSize="small" />
            </RowIconButton>
            <RowIconButton label="Delete" onClick={onDelete}>
              <DeleteOutline fontSize="small" />
            </RowIconButton>
          </Stack>
        )}
      </Stack>

      {/* Attachments — same label style as Laboratory/Lab report ID above,
          instead of the PDF chips appearing with no heading at all. */}
      <Box>
        <FieldLabel>Attachments</FieldLabel>
        {/* PDFs hug their own content width and wrap onto further rows if
            there are many, rather than each stretching full-width — a report
            with 3 (or hypothetically many more) attachments stays compact. */}
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {attachments.map((a) => (
            <AttachmentChip
              key={a.id}
              name={a.name}
              muted={locked}
              onView={() => handleView(a.name)}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );

  if (!locked) return card;
  return (
    <Tooltip title={MANAGED_REPORT_TOOLTIP} arrow placement="top" enterDelay={200}>
      {card}
    </Tooltip>
  );
}

export interface ReportsCardProps {
  reports: LabReport[];
  onAddReport: () => void;
  onViewReport: (report: LabReport) => void;
}

export function ReportsCard({ reports, onAddReport, onViewReport }: ReportsCardProps) {
  // Before the first report exists, show the section title plus a plain
  // add-CTA in a dashed dropzone-style box.
  if (reports.length === 0) {
    return (
      <Box>
        <SectionTitle>Reports</SectionTitle>
        <EmptyDropzone onClick={onAddReport} ctaLabel="Add report" />
      </Box>
    );
  }

  return (
    <Section
      title="Reports"
      toolbar={
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="soft" color="primary"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={onAddReport}
            sx={softBtnSx}>
            Add report
          </Button>
        </Stack>
      }
    >
      <Stack direction="row" flexWrap="wrap" gap={2.5}>
        {reports.map((r) => (
          <ReportThumbnail key={r.id} report={r} onClick={() => onViewReport(r)} />
        ))}
      </Stack>
    </Section>
  );
}

// ── ReportResidues — compact read-only table of the residues that belong to a
// report, shown in the right pane of the View report dialog. ────────────────
function ReportResidues({ residues }: { residues: LabResidue[] }) {
  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '.03em', color: 'text.secondary', mb: 1 }}>
        Results in this report ({residues.length})
      </Typography>
      {residues.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No residues linked to this report.</Typography>
      ) : (
        <Box sx={{ maxHeight: 340, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
          <Box component="table" sx={{
            width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem',
            '& th': { position: 'sticky', top: 0, bgcolor: 'grey.50', textAlign: 'left', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '.03em', color: 'text.secondary', fontWeight: 600, py: 0.75, px: 1.5, borderBottom: '1px solid', borderColor: 'divider' },
            '& td': { py: 0.75, px: 1.5, borderBottom: '1px solid', borderColor: 'grey.100', whiteSpace: 'nowrap' },
            '& tr:last-of-type td': { borderBottom: 'none' },
          }}>
            <thead>
              <tr><th>Analyte</th><th>Level</th><th>Result mg/kg</th><th>LOQ</th></tr>
            </thead>
            <tbody>
              {residues.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>{r.analyte || <EmDash />}</td>
                  <td>{r.residueLevel ?? <EmDash />}</td>
                  <td>{r.residueValue?.trim() ? r.residueValue : <EmDash />}</td>
                  <td style={{ color: '#6b7280' }}>{r.methodLoq?.trim() ? r.methodLoq : <EmDash />}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── View report dialog — the two-pane report view: the page thumbnail + report
// identity on the left, and the residues that came from this report on the
// right. Edit/Delete live here for a non-managed report. ────────────────────
export interface ViewReportDialogProps {
  report: LabReport | null;
  /** All residues on the sample — filtered here to the ones from this report. */
  residues: LabResidue[];
  onClose: () => void;
  onEdit: (report: LabReport) => void;
  onDelete: (report: LabReport) => void;
}

export function ViewReportDialog({ report, residues, onClose, onEdit, onDelete }: ViewReportDialogProps) {
  if (!report) return <Dialog open={false} onClose={onClose} />;
  const locked = !!report.managedBy;
  const isApi = LABS_WITH_API_CONNECTION.has(report.laboratory);
  const attachments = withDemoAttachments(report);
  // Residues link to a report by matching labReportId (see LabResiduesGrid).
  const reportResidues = residues.filter((r) => r.labReportId && r.labReportId === report.labReportId);
  const handleView = (name: string) => {
    toast.info(`Open ${name}`);
    window.open('about:blank', '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>Report</Typography>
        <RowIconButton label="Close" onClick={onClose}><CloseIcon fontSize="small" /></RowIconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          {/* Left: page thumbnail + report identity + attachments */}
          <Box sx={{ width: 220, flexShrink: 0 }}>
            <ReportThumbnailImage width={220} />
            <Stack spacing={2} sx={{ mt: 2 }}>
              <LabeledValue
                label="Laboratory"
                value={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <span>{report.laboratory || <EmDash />}</span>
                    {isApi && <ApiConnectionChip condensed />}
                  </Stack>
                }
              />
              <LabeledValue label="Lab report ID" value={report.labReportId || <EmDash />} />
              <Box>
                <FieldLabel>Attachments</FieldLabel>
                <Stack direction="column" gap={0.75} sx={{ alignItems: 'flex-start' }}>
                  {attachments.map((a) => (
                    <AttachmentChip key={a.id} name={a.name} onView={() => handleView(a.name)} />
                  ))}
                </Stack>
              </Box>
              {locked && (
                <Typography variant="caption" color="text.secondary">{MANAGED_REPORT_TOOLTIP}</Typography>
              )}
            </Stack>
          </Box>
          {/* Right: residues from this report */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ReportResidues residues={reportResidues} />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
        {!locked && (
          <>
            <Button onClick={() => { onDelete(report); onClose(); }} variant="text" color="error"
              startIcon={<DeleteOutline fontSize="small" />}
              sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, mr: 'auto' }}>
              Delete
            </Button>
            <Button onClick={() => { onEdit(report); onClose(); }} variant="text" color="inherit"
              startIcon={<EditOutlined fontSize="small" />}
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
              Edit
            </Button>
          </>
        )}
        <Button onClick={onClose} variant="contained" color="primary"
          sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
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
  /** Empty-state CTA — opens the standalone AddResultsDialog. Only ever
   *  used before the first residue exists (see the early-return below);
   *  once results exist, further additions happen inline in the grid. */
  onOpenAddResults: () => void;
  /** Commits the current `residues` to the sample record. Called after the
   *  user confirms the "have you added everything" gate. */
  onPersist: () => void;
  /** Reverts `residues` back to the sample's last-saved value. */
  onDiscard: () => void;
}

export function ResultsCard({
  residues, reports, plotAnalytes, onAdd, onUpdate, onDelete, onOpenAddResults, onPersist, onDiscard,
}: ResultsCardProps) {
  const gridRef = useRef<LabResiduesGridHandle>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Grid-level dirty tracking → a contextual SaveBar, same pattern as the
  // Treatments tab. `discardToken` forces a grid remount on Cancel to wipe
  // AG-Grid's own in-progress edit buffer, since `residues` reverting alone
  // doesn't touch cells the grid already has open/dirty.
  const [isDirty, setIsDirty] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [discardToken, setDiscardToken] = useState(0);

  // "All" vs "Detected residues" toggle state (see its usage below) — every
  // useState call in this component must run before the empty-state early
  // return below, regardless of residues.length on any given render.
  const [resultsFilter, setResultsFilter] = useState<'all' | 'detected'>('all');

  // Before the first residue exists there's nothing to edit inline — the
  // dropzone opens AddResultsDialog instead.
  if (residues.length === 0) {
    return (
      <Box>
        <SectionTitle>Residues</SectionTitle>
        <EmptyDropzone onClick={onOpenAddResults} ctaLabel="Add residue" />
      </Box>
    );
  }

  const handleSaveClick = () => setConfirmSaveOpen(true);
  const handleConfirmSaveYes = () => {
    setConfirmSaveOpen(false);
    onPersist();
    gridRef.current?.save();
  };
  const handleConfirmSaveNo = () => setConfirmSaveOpen(false);
  const handleCancelClick = () => {
    onDiscard();
    setDiscardToken((t) => t + 1);
    setSelected([]);
    setIsDirty(false);
  };

  // "All" vs "Detected residues" — a segmented toggle instead of a single
  // on/off switch (v15's "View below LOQ" switch reads ambiguous: it's
  // unclear whether checking it adds or removes rows). Each option states
  // directly what's shown, with a live count, so there's nothing to
  // mentally translate. "Detected" means residueLevel is Residue or Trace
  // (the same `isDetected` helper the plot-detail lab-results status line
  // already uses) — Below LOQ / Not analyzed / unset all count as "not
  // detected" and are hidden by the "Detected residues" option.
  const detectedCount = residues.filter(isDetected).length;
  // The toggle only means something when the list is genuinely mixed — all-
  // detected or all-not-detected has nothing for it to filter, so it's
  // hidden rather than shown as a no-op control.
  const hasMixedResults = detectedCount > 0 && detectedCount < residues.length;
  const filteredResidues = hasMixedResults && resultsFilter === 'detected' ? residues.filter(isDetected) : residues;

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
    <>
    <Section
      title="Residues"
      toolbar={
        <Stack direction="row" justifyContent={hasMixedResults ? 'space-between' : 'flex-end'} alignItems="center" flexWrap="wrap" gap={1.5}>
          {hasMixedResults && (
            <Stack direction="row" spacing={1}>
              <FilterChip
                label={`All (${residues.length})`}
                active={resultsFilter === 'all'}
                onClick={() => { setSelected([]); setResultsFilter('all'); }}
              />
              <FilterChip
                label={`Detected residues (${detectedCount})`}
                active={resultsFilter === 'detected'}
                onClick={() => { setSelected([]); setResultsFilter('detected'); }}
              />
            </Stack>
          )}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button variant="soft" color="primary"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={() => handleAddResidue()}
              sx={softBtnSx}>
              Add residue
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
      }
    >
      {isDirty && <SaveBar onSave={handleSaveClick} onCancel={handleCancelClick} />}

      {/* TableCard — same edge-to-edge card wrapper the Reports cards' own
          borders echo, so the grid still reads as "the same visual family"
          even though Reports itself is no longer a table. */}
      <TableCard>
        <Box sx={{ height: gridHeight }}>
          {/* key includes resultsFilter (remount on filter flip — see below)
              and discardToken (remount on Cancel, to wipe AG-Grid's own
              in-progress edit buffer). EditableDataGrid captures `residues`
              as initialData once and ignores later prop updates, so a plain
              filter on the same mounted instance wouldn't change what's
              visible. Edits are already flushed into the parent's `residues`
              state on every committed cell change (not just on Save), so
              remounting never loses anything but an edit mid-keystroke. */}
          <LabResiduesGrid
            key={`${resultsFilter}-${discardToken}`}
            ref={gridRef}
            residues={filteredResidues}
            reports={reports}
            hideSource
            recommendedAnalytes={plotAnalytes}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSelectionChange={setSelected}
            onDirtyStateChange={setIsDirty}
            noRowsMessage={resultsFilter === 'detected' ? 'No detected results.' : 'No residues added yet.'}
          />
        </Box>
      </TableCard>
    </Section>

    {/* "Have you added all results?" gate in front of the real save — every
        dismiss path (No, close icon, Escape, backdrop) resolves to
        handleConfirmSaveNo, so only an explicit Yes click ever commits. No
        autoFocus on Yes, so a stray Enter/Space right after opening can't
        silently confirm it. */}
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
          This will enable us to compare our predictions with the laboratory reports precisely.
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

  // "Add report" popup — also used for editing an existing report (see
  // `editingReport`). It only ever touches `sample.reports`, never residues,
  // so results stay a fully independent action. `addReportToken` forces a
  // fresh remount on every open, even re-opening the same sample, so no
  // field state leaks across sessions.
  const [addReportToken, setAddReportToken] = useState(0);
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<LabReport | null>(null);
  // "View report" two-pane popup — opened by clicking a report thumbnail.
  const [viewingReport, setViewingReport] = useState<LabReport | null>(null);

  // "Add results" popup — the Results card's empty-state entry point only
  // (see ResultsCard's early-return). Once results exist, further additions
  // happen inline in the grid, with its own SaveBar/confirm flow.
  const [addResultsToken, setAddResultsToken] = useState(0);
  const [addResultsOpen, setAddResultsOpen] = useState(false);

  const [deleteReportTarget, setDeleteReportTarget] = useState<LabReport | null>(null);

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

  // Commits the current `residues` state to the sample record. Passed to
  // ResultsCard as onPersist — called only after its own "have you added
  // everything" confirm gate, and doesn't navigate away: saving results is
  // now a contextual in-place action, not a whole-page one.
  const handlePersistResults = () => {
    updateLabSample(sample.id, { residues, isDraft: false });
    toast.success('Results saved');
  };
  const handleDiscardResults = () => setResidues(sample.residues);

  const openAddResults = () => { setAddResultsOpen(true); setAddResultsToken((t) => t + 1); };
  const closeAddResults = () => setAddResultsOpen(false);
  const handleAddResultsSave = (newResidues: LabResidue[]) => {
    setResidues(newResidues);
    updateLabSample(sample.id, { residues: newResidues, isDraft: false });
    toast.success('Results saved');
  };

  const handleEditSave = (values: SampleFormValues) => {
    updateLabSample(sample.id, { ...values, isDraft: false });
    setEditOpen(false);
    toast.success('Sample updated');
  };

  const openAddReport = () => { setEditingReport(null); setAddReportOpen(true); setAddReportToken((t) => t + 1); };
  const openEditReport = (report: LabReport) => { setEditingReport(report); setAddReportOpen(true); setAddReportToken((t) => t + 1); };
  const closeAddReport = () => setAddReportOpen(false);

  const handleReportDelete = (report: LabReport) => {
    setDeleteReportTarget(report);
  };

  const handleConfirmReportDelete = () => {
    if (!deleteReportTarget) return;
    // Orphaned results are intentionally left in place (flagged via the
    // "Lab report" column's warning tag) rather than cascade-deleted.
    updateLabSample(sample.id, { reports: (sample.reports ?? []).filter((r) => r.id !== deleteReportTarget.id) });
    toast.success('Report deleted');
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
      >
        <Stack spacing={4}>

          {/* ── Reports ──────────────────────────────────────────────── */}
          <ReportsCard
            reports={reports}
            onAddReport={openAddReport}
            onViewReport={setViewingReport}
          />

          {/* ── Results ──────────────────────────────────────────────── */}
          <ResultsCard
            residues={residues}
            reports={reports}
            plotAnalytes={plotAnalytes}
            onAdd={handleResidueAdd}
            onUpdate={handleResidueUpdate}
            onDelete={handleResidueDelete}
            onOpenAddResults={openAddReport}
            onPersist={handlePersistResults}
            onDiscard={handleDiscardResults}
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

      <ViewReportDialog
        report={viewingReport}
        residues={residues}
        onClose={() => setViewingReport(null)}
        onEdit={openEditReport}
        onDelete={handleReportDelete}
      />

      <AddReportDialog
        key={addReportToken}
        sample={addReportOpen ? sample : null}
        editingReport={editingReport}
        onClose={closeAddReport}
      />

      <AddResultsDialog
        key={addResultsToken}
        sample={addResultsOpen ? sample : null}
        reports={reports}
        plotAnalytes={plotAnalytes}
        onClose={closeAddResults}
        onSave={handleAddResultsSave}
      />

      <ConfirmActionDialog
        open={!!deleteReportTarget}
        title="Delete report?"
        body={
          deleteReportTarget && (
            deleteReportTarget.labReportId ? (
              <>
                This will delete the report (ID:{' '}
                <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{deleteReportTarget.labReportId}</Box>).
              </>
            ) : (
              <>This will delete this report.</>
            )
          )
        }
        primaryLabel="Delete report"
        primaryColor="error"
        onClose={() => setDeleteReportTarget(null)}
        onPrimary={handleConfirmReportDelete}
      />
    </>
  );
}
