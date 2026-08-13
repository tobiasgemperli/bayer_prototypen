import React, { useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from '../variant-context';
import {
  Autocomplete, Box, Breadcrumbs, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Link, Paper, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { Add, AttachFile, Close as CloseIcon, DeleteOutline, NavigateNext } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { usePlots } from '../../data/plots-data';
import {
  useLabSamples, updateLabSample, getAnalytesForPlot, newReportId,
  LABS_WITH_API_CONNECTION, LABORATORY_OPTIONS, COMMODITY_OPTIONS,
  LabReport, LabResidue, LabAttachment, LabSampleData, Commodity,
} from '../../data/lab-results-data';
import { PageLayout } from '../../design-system/PageLayout';
import { FieldLabel, fieldSx, SectionLabel } from '../../design-system/FormField';
import { AttachmentChip } from '../../design-system/AttachmentChip';
import { ActionChip, ApiConnectionChip, NameWithChip } from '../../design-system/Chips';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { LabResiduesGrid, LabResiduesGridHandle, newResidueRow } from '../../lab-shared/LabResiduesGrid';

const ADD_LAB_ACTION = '__add_lab__';
const API_TOOLTIP = 'Imported automatically via direct lab connection — cannot be edited here';

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
  labReportId: string;
  attachment: LabAttachment | null;
}

function newReportRow(): ReportRow {
  return { id: newReportId(), labReportId: '', attachment: null };
}

function isRowFilled(row: ReportRow): boolean {
  return row.labReportId.trim() !== '' || row.attachment !== null;
}

/** Keeps the invariant "the list always ends with exactly one empty row" —
 *  this is what makes a fresh row appear automatically once the previous
 *  last row gets data, and disappear the extra blank slot on delete. */
function ensureTrailingEmptyRow(rows: ReportRow[]): ReportRow[] {
  if (rows.length === 0) return [newReportRow()];
  return isRowFilled(rows[rows.length - 1]) ? [...rows, newReportRow()] : rows;
}

function initReportRows(sample: LabSampleData | undefined, isApiLab: boolean): ReportRow[] {
  const reports = sample?.reports ?? [];
  const rows: ReportRow[] = reports.map((r) => ({
    id: r.id,
    labReportId: r.labReportId,
    attachment: r.attachments?.[0] ?? null,
  }));
  // API-managed report lists are read-only — no open slot to type into.
  return isApiLab ? rows : ensureTrailingEmptyRow(rows);
}

// ── Reports card — the growing ID + PDF row list ─────────────────────────────

interface ReportRowItemProps {
  row: ReportRow;
  isApiLab: boolean;
  onChange: (id: string, patch: Partial<ReportRow>) => void;
  onDelete: (id: string) => void;
}

function ReportRowItem({ row, isApiLab, onChange, onDelete }: ReportRowItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filled = isRowFilled(row);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const att: LabAttachment = { id: `att-${Date.now()}`, name: file.name, size: file.size };
    onChange(row.id, { attachment: att });
    e.target.value = '';
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box sx={{ flex: 1 }}>
        {isApiLab ? (
          <Tooltip title={API_TOOLTIP} arrow placement="top">
            <Box sx={{ cursor: 'not-allowed' }}>
              <Box sx={{ pointerEvents: 'none', opacity: 0.5 }}>
                <TextField fullWidth size="small" value={row.labReportId} disabled sx={fieldSx} />
              </Box>
            </Box>
          </Tooltip>
        ) : (
          <TextField
            fullWidth size="small" placeholder="e.g. RPT-2024-001"
            value={row.labReportId}
            onChange={(e) => onChange(row.id, { labReportId: e.target.value })}
            sx={fieldSx}
          />
        )}
      </Box>

      <Box sx={{ flex: 1, ...rowFieldColSx }}>
        {row.attachment ? (
          <AttachmentChip
            name={row.attachment.name}
            onClick={() => {}}
            onRemove={isApiLab ? undefined : () => onChange(row.id, { attachment: null })}
          />
        ) : !isApiLab ? (
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
        ) : null}
      </Box>

      {/* Fixed-width gutter so the two columns above stay aligned across rows
          regardless of whether this particular row shows a delete icon. */}
      <Box sx={{ width: 32, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {!isApiLab && filled && (
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
  isApiLab: boolean;
  onChange: (id: string, patch: Partial<ReportRow>) => void;
  onDelete: (id: string) => void;
}

export function ReportsCard({ rows, isApiLab, onChange, onDelete }: ReportsCardProps) {
  return (
    <Paper elevation={0} sx={cardSx}>
      <SectionLabel>Reports</SectionLabel>
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1 }}><FieldLabel>Lab report ID</FieldLabel></Box>
          <Box sx={{ flex: 1 }}><FieldLabel>PDF</FieldLabel></Box>
          <Box sx={{ width: 32, flexShrink: 0 }} />
        </Stack>
        {rows.map((row) => (
          <ReportRowItem key={row.id} row={row} isApiLab={isApiLab} onChange={onChange} onDelete={onDelete} />
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
  isApiLab: boolean;
  onAdd: (r: LabResidue) => void;
  onUpdate: (id: string, patch: Partial<LabResidue>) => void;
  onDelete: (id: string) => void;
}

export function ResultsCard({ residues, reports, plotAnalytes, isApiLab, onAdd, onUpdate, onDelete }: ResultsCardProps) {
  const gridRef = useRef<LabResiduesGridHandle>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleAddResidue = (analyte?: string) => {
    if (residues.length === 0) {
      onAdd({ ...newResidueRow(), analyte: analyte ?? '' });
    } else {
      gridRef.current?.addRow(analyte);
    }
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

  const gridHeight = residues.length > 0
    ? Math.min(500, Math.max(200, residues.length * 52 + 56))
    : 120;

  return (
    <Paper elevation={0} sx={cardSx}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <SectionLabel>Results</SectionLabel>
        {!isApiLab && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="soft" color="primary"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={() => handleAddResidue()}
              sx={softBtnSx}>
              Add result
            </Button>
            {selected.length > 0 && (
              <>
                <OptionsTrigger onClick={(e) => setMenuAnchor(e.currentTarget)} hasSelection />
                <ActionMenu anchorEl={menuAnchor} open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)} actions={bulkActions} />
              </>
            )}
          </Stack>
        )}
      </Stack>

      {/* Recommended analyte chips — stay visible after use so the same
          analyte can be added again (it may come from more than one report). */}
      {plotAnalytes.length > 0 && (
        <Box
          sx={{
            mb: residues.length > 0 ? 1.5 : 0,
            ...(isApiLab ? { pointerEvents: 'none', opacity: 0.5 } : {}),
          }}
        >
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {plotAnalytes.map((analyte) => (
              <ActionChip key={analyte} label={analyte} onClick={() => handleAddResidue(analyte)} />
            ))}
          </Stack>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', mt: 0.75 }}>
            Based on your applied treatments — click to add a result, even more than once
          </Typography>
        </Box>
      )}

      {isApiLab ? (
        <Tooltip title={API_TOOLTIP} arrow placement="top">
          <Box sx={{ height: gridHeight, cursor: 'not-allowed' }}>
            <Box sx={{ height: '100%', pointerEvents: 'none', opacity: 0.5 }}>
              <LabResiduesGrid
                ref={gridRef}
                residues={residues}
                reports={reports}
                hideSource
                recommendedAnalytes={plotAnalytes}
                onAdd={() => {}}
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            </Box>
          </Box>
        </Tooltip>
      ) : (
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
      )}
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
  const [laboratory, setLaboratory] = useState(sample?.laboratory ?? '');
  const [comments, setComments] = useState(sample?.comments ?? '');
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [labDropdownOpen, setLabDropdownOpen] = useState(false);
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');

  const initialIsApiLab = !!sample?.laboratory && LABS_WITH_API_CONNECTION.has(sample.laboratory);
  const [reportRows, setReportRows] = useState<ReportRow[]>(() => initReportRows(sample, initialIsApiLab));
  const [residues, setResidues] = useState<LabResidue[]>(sample?.residues ?? []);

  if (!plot || !sample) return <Box sx={{ p: 3 }}>Loading…</Box>;

  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];
  const plotAnalytes = getAnalytesForPlot(plotId ?? '');
  const isApiLab = !!laboratory && LABS_WITH_API_CONNECTION.has(laboratory);

  const validReports: LabReport[] = reportRows
    .filter((r) => r.labReportId.trim() !== '')
    .map((r) => ({
      id: r.id, laboratory: '', labReportId: r.labReportId,
      attachments: r.attachment ? [r.attachment] : [],
    }));

  const handleBack = () => navigate(`/plot/${plotId}`, { state: { activeTab: 2 } });

  const handleSave = () => {
    const reports: LabReport[] = reportRows
      .filter(isRowFilled)
      .map((r) => ({
        id: r.id, laboratory: '', labReportId: r.labReportId,
        attachments: r.attachment ? [r.attachment] : [],
      }));
    updateLabSample(sample.id, {
      sampleName, dateOfSample, commodity, laboratory, comments, reports, residues, isDraft: false,
    });
    toast.success('Saved');
    handleBack();
  };

  const handleConfirmNewLab = () => {
    const name = newLabName.trim();
    if (!name) return;
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    setLaboratory(name);
    setAddLabOpen(false);
    setNewLabName('');
  };

  const handleReportRowChange = (id: string, patch: Partial<ReportRow>) => {
    setReportRows((prev) => ensureTrailingEmptyRow(prev.map((r) => (r.id === id ? { ...r, ...patch } : r))));
  };

  const handleReportRowDelete = (id: string) => {
    // Orphaned results are intentionally left in place (flagged via the
    // "Lab report" column's warning tag) rather than cascade-deleted.
    setReportRows((prev) => ensureTrailingEmptyRow(prev.filter((r) => r.id !== id)));
  };

  const handleResidueAdd = (r: LabResidue) => setResidues((prev) => [...prev, r]);
  const handleResidueUpdate = (id: string, patch: Partial<LabResidue>) =>
    setResidues((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const handleResidueDelete = (id: string) => setResidues((prev) => prev.filter((r) => r.id !== id));

  const hasAnyReport = reportRows.some(isRowFilled);

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
                <FieldLabel>Send sample to</FieldLabel>
                <Box sx={{ position: 'relative' }}>
                  <Autocomplete
                    size="small"
                    options={[...allLabs, ADD_LAB_ACTION]}
                    value={laboratory || null}
                    onOpen={() => setLabDropdownOpen(true)}
                    onClose={() => setLabDropdownOpen(false)}
                    getOptionLabel={(opt) => opt === ADD_LAB_ACTION ? 'Add laboratory' : opt}
                    filterOptions={(options, state) => {
                      const filtered = options.filter(
                        (o) => o !== ADD_LAB_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase())
                      );
                      filtered.push(ADD_LAB_ACTION);
                      return filtered;
                    }}
                    onChange={(_, next) => {
                      if (next === ADD_LAB_ACTION) { setNewLabName(''); setAddLabOpen(true); }
                      else { setLaboratory(next ?? ''); }
                    }}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props as any;
                      if (option === ADD_LAB_ACTION) {
                        return (
                          <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Add sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>Add laboratory</Typography>
                          </li>
                        );
                      }
                      return (
                        <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <NameWithChip
                            name={option}
                            chip={LABS_WITH_API_CONNECTION.has(option) && <ApiConnectionChip />}
                          />
                        </li>
                      );
                    }}
                    renderInput={(params) => {
                      const showInline = !labDropdownOpen && !!laboratory && LABS_WITH_API_CONNECTION.has(laboratory);
                      return (
                        <TextField
                          {...params}
                          placeholder="Choose a laboratory"
                          sx={fieldSx}
                          inputProps={{
                            ...params.inputProps,
                            style: { ...(params.inputProps as any)?.style, ...(showInline ? { color: 'transparent', caretColor: 'transparent' } : {}) },
                          }}
                        />
                      );
                    }}
                  />
                  {!labDropdownOpen && !!laboratory && LABS_WITH_API_CONNECTION.has(laboratory) && (
                    <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: '14px', right: '40px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <NameWithChip name={laboratory} chip={<ApiConnectionChip />} sx={{ fontSize: '0.875rem' }} />
                    </Box>
                  )}
                </Box>
              </Box>

              <Box>
                <FieldLabel>Comments / Notes</FieldLabel>
                <TextField fullWidth multiline minRows={3} size="small"
                  value={comments} onChange={(e) => setComments(e.target.value)}
                  sx={fieldSx} />
              </Box>
            </Stack>
          </Paper>

          {/* ── Reports + Results ────────────────────────────────────── */}
          {isApiLab && !hasAnyReport ? (
            <Box sx={{
              border: '1px dashed', borderColor: 'divider', borderRadius: '12px',
              py: 5, textAlign: 'center',
            }}>
              <Stack spacing={1} alignItems="center">
                <ApiConnectionChip />
                <Typography sx={{ color: 'text.disabled', fontSize: '0.875rem', mt: 1 }}>
                  Results will be imported automatically from {laboratory} once the lab submits them.
                </Typography>
              </Stack>
            </Box>
          ) : (
            <>
              <ReportsCard
                rows={reportRows}
                isApiLab={isApiLab}
                onChange={handleReportRowChange}
                onDelete={handleReportRowDelete}
              />
              <ResultsCard
                residues={residues}
                reports={validReports}
                plotAnalytes={plotAnalytes}
                isApiLab={isApiLab}
                onAdd={handleResidueAdd}
                onUpdate={handleResidueUpdate}
                onDelete={handleResidueDelete}
              />
            </>
          )}

        </Stack>
      </PageLayout>

      {/* Add laboratory dialog */}
      <Dialog open={addLabOpen} onClose={() => setAddLabOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add laboratory</Typography>
          <IconButton onClick={() => setAddLabOpen(false)} sx={{ color: 'text.secondary', p: 0.5 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 1, pb: 0 }}>
          <FieldLabel>Laboratory name</FieldLabel>
          <TextField autoFocus fullWidth size="small" placeholder="e.g. Eurofins AG"
            value={newLabName}
            onChange={(e) => setNewLabName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmNewLab(); }}
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button variant="text" onClick={() => setAddLabOpen(false)}
            sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleConfirmNewLab}
            disabled={!newLabName.trim()}
            sx={{ fontWeight: 600 }}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
