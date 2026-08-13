import React, { useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from '../variant-context';
import {
  Box, Breadcrumbs, Button, IconButton, Link, Paper, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { Add, AttachFile, DeleteOutline, NavigateNext } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { usePlots } from '../../data/plots-data';
import {
  useLabSamples, updateLabSample, getAnalytesForPlot, newReportId,
  LABORATORY_OPTIONS, COMMODITY_OPTIONS,
  LabReport, LabResidue, LabAttachment, LabSampleData, Commodity,
} from '../../data/lab-results-data';
import { PageLayout } from '../../design-system/PageLayout';
import { FieldLabel, fieldSx, SectionLabel } from '../../design-system/FormField';
import { AttachmentChip } from '../../design-system/AttachmentChip';
import { ActionChip } from '../../design-system/Chips';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { LabResiduesGrid, LabResiduesGridHandle } from '../../lab-shared/LabResiduesGrid';
import { LabAutocomplete } from './LabAutocomplete';
import { AddLaboratoryDialog } from './AddLaboratoryDialog';

// ── Shared style tokens ───────────────────────────────────────────────────────

const sectionLabelSx = {
  fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary',
  textTransform: 'uppercase', letterSpacing: '0.06em',
} as const;

const cardSx = {
  borderRadius: '12px', border: '1px solid', borderColor: 'divider',
  bgcolor: 'background.paper', px: { xs: 3, sm: 4 }, pt: 3, pb: 3,
} as const;

const softBtnSx = {
  fontWeight: 600, borderRadius: '8px', px: 2, height: 40, textTransform: 'none',
} as const;

// Shared height so the PDF chip/upload button lines up with the ID text field.
const rowFieldColSx = { height: 40, display: 'flex', alignItems: 'center' } as const;

// ── Report row data type ──────────────────────────────────────────────────────
// A row is just an ID + one PDF. Results live separately in a single shared
// grid (see ResultsCard) — a row no longer owns its own residues.

export interface ReportRow {
  id: string;
  laboratory: string;
  labReportId: string;
  attachment: LabAttachment | null;
  /** When set, this report was pushed in automatically via the lab's direct
   *  API connection — the row is read-only and shows a lock tooltip. */
  managedBy?: string;
}

function newReportRow(defaultLab: string): ReportRow {
  return { id: newReportId(), laboratory: defaultLab, labReportId: '', attachment: null };
}

function isRowFilled(row: ReportRow): boolean {
  return row.labReportId.trim() !== '' || row.attachment !== null;
}

/** Keeps the invariant "the list always ends with exactly one empty row" —
 *  this is what makes a fresh row appear automatically once the previous
 *  last row gets data, and disappear the extra blank slot on delete. Its
 *  laboratory defaults to the sample's preferred lab (chosen at creation)
 *  every time a new row is opened, but stays editable per row. */
function ensureTrailingEmptyRow(rows: ReportRow[], defaultLab: string): ReportRow[] {
  if (rows.length === 0) return [newReportRow(defaultLab)];
  return isRowFilled(rows[rows.length - 1]) ? [...rows, newReportRow(defaultLab)] : rows;
}

function initReportRows(sample: LabSampleData | undefined, defaultLab: string): ReportRow[] {
  // Some seeded samples carry a "draft" report (lab picked, id/attachment
  // never filled in) left over from the card-based demo data — the growing
  // row list has no concept of a mid-list draft row, so it's dropped here
  // rather than surfacing as a phantom empty row between real ones.
  const reports = (sample?.reports ?? []).filter(
    (r) => r.labReportId.trim() !== '' || (r.attachments?.length ?? 0) > 0
  );
  const rows: ReportRow[] = reports.map((r) => ({
    id: r.id,
    laboratory: r.laboratory || defaultLab,
    labReportId: r.labReportId,
    attachment: r.attachments?.[0] ?? null,
    managedBy: r.managedBy,
  }));
  return ensureTrailingEmptyRow(rows, defaultLab);
}

// ── Reports card — the growing Laboratory + ID + PDF row list ───────────────

const MANAGED_REPORT_TOOLTIP = "This report was submitted automatically via the lab's direct connection to ResiYou.";

interface ReportRowItemProps {
  row: ReportRow;
  allLabs: string[];
  onChange: (id: string, patch: Partial<ReportRow>) => void;
  onDelete: (id: string) => void;
  onAddLabRequest: (rowId: string) => void;
}

function ReportRowItem({ row, allLabs, onChange, onDelete, onAddLabRequest }: ReportRowItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filled = isRowFilled(row);
  const locked = !!row.managedBy;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const att: LabAttachment = { id: `att-${Date.now()}`, name: file.name, size: file.size };
    onChange(row.id, { attachment: att });
    e.target.value = '';
  };

  if (locked) {
    const textSx = {
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      fontSize: '0.875rem', color: 'text.disabled',
    } as const;
    return (
      <Tooltip title={MANAGED_REPORT_TOOLTIP} arrow placement="top" enterDelay={200}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ cursor: 'not-allowed' }}>
          <Box sx={{ flex: 1, ...textSx }}>{row.laboratory || '—'}</Box>
          <Box sx={{ flex: 1, ...textSx }}>{row.labReportId || '—'}</Box>
          <Box sx={{ flex: 1, ...rowFieldColSx, ...textSx }}>{row.attachment ? row.attachment.name : '—'}</Box>
          <Box sx={{ width: 32, flexShrink: 0 }} />
        </Stack>
      </Tooltip>
    );
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box sx={{ flex: 1 }}>
        <LabAutocomplete
          value={row.laboratory}
          options={allLabs}
          onChange={(next) => onChange(row.id, { laboratory: next })}
          onAddLab={() => onAddLabRequest(row.id)}
        />
      </Box>

      <Box sx={{ flex: 1 }}>
        <TextField
          fullWidth size="small" placeholder="e.g. RPT-2024-001"
          value={row.labReportId}
          onChange={(e) => onChange(row.id, { labReportId: e.target.value })}
          sx={fieldSx}
        />
      </Box>

      <Box sx={{ flex: 1, ...rowFieldColSx }}>
        {row.attachment ? (
          <AttachmentChip
            name={row.attachment.name}
            height={40}
            onClick={() => {}}
            onRemove={() => onChange(row.id, { attachment: null })}
          />
        ) : (
          <>
            <Button
              variant="soft" color="primary"
              startIcon={<AttachFile sx={{ fontSize: 18 }} />}
              onClick={() => fileInputRef.current?.click()}
              sx={softBtnSx}
            >
              Upload PDF
            </Button>
            <input ref={fileInputRef} type="file" hidden accept=".pdf,.csv,.xlsx,.docx" onChange={handleFile} />
          </>
        )}
      </Box>

      {/* Fixed-width gutter so the columns above stay aligned across rows
          regardless of whether this particular row shows a delete icon. */}
      <Box sx={{ width: 32, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {filled && (
          <IconButton size="small" onClick={() => onDelete(row.id)}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Stack>
  );
}

export interface ReportsCardProps {
  rows: ReportRow[];
  allLabs: string[];
  onChange: (id: string, patch: Partial<ReportRow>) => void;
  onDelete: (id: string) => void;
  onAddLabRequest: (rowId: string) => void;
}

export function ReportsCard({ rows, allLabs, onChange, onDelete, onAddLabRequest }: ReportsCardProps) {
  return (
    <Paper elevation={0} sx={cardSx}>
      <SectionLabel>Reports</SectionLabel>
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1 }}><FieldLabel>Laboratory</FieldLabel></Box>
          <Box sx={{ flex: 1 }}><FieldLabel>Lab report ID</FieldLabel></Box>
          <Box sx={{ flex: 1 }}><FieldLabel>PDF</FieldLabel></Box>
          <Box sx={{ width: 32, flexShrink: 0 }} />
        </Stack>
        {rows.map((row) => (
          <ReportRowItem
            key={row.id} row={row} allLabs={allLabs}
            onChange={onChange} onDelete={onDelete} onAddLabRequest={onAddLabRequest}
          />
        ))}
      </Stack>
    </Paper>
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

  const gridHeight = Math.min(500, Math.max(160, residues.length * 52 + 56));

  return (
    <Paper elevation={0} sx={cardSx}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <SectionLabel>Results</SectionLabel>
        <Stack direction="row" spacing={1} alignItems="center">
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

      {/* Recommended analyte chips — stay visible after use so the same
          analyte can be added again (it may come from more than one report). */}
      {plotAnalytes.length > 0 && (
        <Box sx={{ mb: residues.length > 0 ? 1.5 : 0 }}>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {plotAnalytes.map((analyte) => (
              <ActionChip key={analyte} label={analyte} onClick={() => handleAddResidue(analyte)} />
            ))}
          </Stack>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', mt: 0.75 }}>
            Based on your applied treatments. Click an analyte to add a result, even more than once.
          </Typography>
        </Box>
      )}

      {/* Always mounted, even empty — the grid's own empty state (column
          headers + "No rows") tells users what a result looks like before
          they've added one. The grid being mounted from the start is also
          what makes gridRef.current?.addRow() work reliably on the very
          first click, not just subsequent ones. */}
      <Box sx={{ height: gridHeight }}>
        <LabResiduesGrid
          ref={gridRef}
          residues={residues}
          reports={reports}
          hideSource
          recommendedAnalytes={plotAnalytes}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onSelectionChange={setSelected}
        />
      </Box>
    </Paper>
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

  const [sampleName, setSampleName] = useState(sample?.sampleName ?? '');
  const [dateOfSample, setDateOfSample] = useState<Date | null>(sample?.dateOfSample ?? null);
  const [commodity, setCommodity] = useState<Commodity | null>(sample?.commodity ?? null);
  const [comments, setComments] = useState(sample?.comments ?? '');
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [addLabForRowId, setAddLabForRowId] = useState<string | null>(null);

  // The sample's preferred laboratory (chosen at creation) — not editable
  // here; it only seeds the default for each new report row below.
  const defaultLab = sample?.laboratory ?? '';
  const [reportRows, setReportRows] = useState<ReportRow[]>(() => initReportRows(sample, defaultLab));
  const [residues, setResidues] = useState<LabResidue[]>(sample?.residues ?? []);

  if (!plot || !sample) return <Box sx={{ p: 3 }}>Loading…</Box>;

  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];
  const plotAnalytes = getAnalytesForPlot(plotId ?? '');

  const validReports: LabReport[] = reportRows
    .filter((r) => r.labReportId.trim() !== '')
    .map((r) => ({
      id: r.id, laboratory: r.laboratory, labReportId: r.labReportId,
      attachments: r.attachment ? [r.attachment] : [], managedBy: r.managedBy,
    }));

  const handleBack = () => navigate(`/plot/${plotId}`, { state: { activeTab: 2 } });

  const handleSave = () => {
    const reports: LabReport[] = reportRows
      .filter(isRowFilled)
      .map((r) => ({
        id: r.id, laboratory: r.laboratory, labReportId: r.labReportId,
        attachments: r.attachment ? [r.attachment] : [], managedBy: r.managedBy,
      }));
    updateLabSample(sample.id, {
      sampleName, dateOfSample, commodity, comments, reports, residues, isDraft: false,
    });
    toast.success('Saved');
    handleBack();
  };

  const handleConfirmNewLab = (name: string) => {
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    if (addLabForRowId) handleReportRowChange(addLabForRowId, { laboratory: name });
    setAddLabForRowId(null);
  };

  const handleReportRowChange = (id: string, patch: Partial<ReportRow>) => {
    setReportRows((prev) => ensureTrailingEmptyRow(prev.map((r) => (r.id === id ? { ...r, ...patch } : r)), defaultLab));
  };

  const handleReportRowDelete = (id: string) => {
    // Orphaned results are intentionally left in place (flagged via the
    // "Lab report" column's warning tag) rather than cascade-deleted.
    setReportRows((prev) => ensureTrailingEmptyRow(prev.filter((r) => r.id !== id), defaultLab));
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
              {sampleName || 'Unnamed sample'}
            </Typography>
          </Breadcrumbs>
        }
        title={sampleName || 'Unnamed sample'}
        actions={
          <>
            <Button variant="text" color="inherit" onClick={handleBack}
              sx={{ fontWeight: 600, color: 'text.secondary', px: 3 }}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={handleSave}
              sx={{ fontWeight: 600, px: 4 }}>
              Save
            </Button>
          </>
        }
      >
        <Stack spacing={2}>

          {/* ── Results ──────────────────────────────────────────────── */}
          <ResultsCard
            residues={residues}
            reports={validReports}
            plotAnalytes={plotAnalytes}
            onAdd={handleResidueAdd}
            onUpdate={handleResidueUpdate}
            onDelete={handleResidueDelete}
          />

          {/* ── Reports ──────────────────────────────────────────────── */}
          <ReportsCard
            rows={reportRows}
            allLabs={allLabs}
            onChange={handleReportRowChange}
            onDelete={handleReportRowDelete}
            onAddLabRequest={setAddLabForRowId}
          />

          {/* ── Sample ───────────────────────────────────────────────── */}
          <Paper elevation={0} sx={cardSx}>
            <SectionLabel>Sample</SectionLabel>
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <FieldLabel required>Sample name</FieldLabel>
                  <TextField fullWidth size="small" placeholder="Type here"
                    value={sampleName} onChange={(e) => setSampleName(e.target.value)}
                    sx={fieldSx} />
                </Box>
                <Box>
                  <FieldLabel>Sample date</FieldLabel>
                  <DatePicker
                    value={dateOfSample}
                    onChange={(d) => setDateOfSample(d)}
                    format="dd/MM/yyyy"
                    slotProps={{
                      textField: { size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY', sx: fieldSx },
                    }}
                  />
                </Box>
              </Box>

              <Box>
                <FieldLabel>Commodity</FieldLabel>
                <ToggleButtonGroup
                  exclusive
                  value={commodity}
                  onChange={(_, next: Commodity | null) => { if (next !== null) setCommodity(next); }}
                  sx={{
                    flexWrap: 'wrap', gap: 1,
                    '& .MuiToggleButtonGroup-grouped': {
                      border: '1px solid rgba(0,0,0,0.23)', borderRadius: '8px !important', marginLeft: '0 !important',
                    },
                    '& .MuiToggleButton-root': {
                      textTransform: 'none', fontWeight: 500, px: 2, height: 36, fontSize: '0.875rem',
                      color: 'text.primary', bgcolor: 'background.paper',
                      '&.Mui-selected': {
                        bgcolor: 'primary.softBg', color: 'primary.main', borderColor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.softBg' },
                      },
                    },
                  }}
                >
                  {COMMODITY_OPTIONS.map((opt) => (
                    <ToggleButton key={opt} value={opt}>{opt}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Box>
                <FieldLabel>Comments / Notes</FieldLabel>
                <TextField fullWidth multiline minRows={3} size="small"
                  value={comments} onChange={(e) => setComments(e.target.value)}
                  sx={fieldSx} />
              </Box>
            </Stack>
          </Paper>

        </Stack>
      </PageLayout>

      <AddLaboratoryDialog
        open={addLabForRowId !== null}
        onClose={() => setAddLabForRowId(null)}
        onConfirm={handleConfirmNewLab}
      />
    </>
  );
}
