import React, { useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from '../variant-context';
import {
  Autocomplete, Box, Breadcrumbs, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, Link, Paper, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { Add, AttachFile, Close as CloseIcon, DeleteOutline, NavigateNext } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { usePlots } from '../../data/plots-data';
import {
  useLabSamples, updateLabSample, getAnalytesForPlot,
  LABS_WITH_API_CONNECTION, LABORATORY_OPTIONS, COMMODITY_OPTIONS,
  LabReport, LabResidue, LabAttachment, LabSampleData, Commodity,
} from '../../data/lab-results-data';
import { PageLayout } from '../../design-system/PageLayout';
import { FieldLabel, fieldSx, SectionLabel } from '../../design-system/FormField';
import { AttachmentChip } from '../../design-system/AttachmentChip';
import { ActionChip, ApiConnectionChip, NameWithChip } from '../../design-system/Chips';
import { ManagedTag } from '../../design-system/grid/draft-state';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { LabResiduesGrid, LabResiduesGridHandle, newResidueRow } from '../../lab-shared/LabResiduesGrid';

const ADD_LAB_ACTION = '__add_lab__';

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

// ── Report block data type ────────────────────────────────────────────────────

interface ReportBlock {
  id: string;
  labReportId: string;
  attachment: LabAttachment | null;
  residues: LabResidue[];
  notes: string;
}

function newBlock(): ReportBlock {
  return { id: `lr-${Date.now()}`, labReportId: '', attachment: null, residues: [], notes: '' };
}

function initBlocks(sample: LabSampleData | undefined): ReportBlock[] {
  if (!sample) return [];
  const reports = sample.reports ?? [];
  const residues = sample.residues ?? [];
  if (reports.length === 0) return [];
  return reports.map((r, i) => ({
    id: r.id,
    labReportId: r.labReportId,
    attachment: r.attachments?.[0] ?? null,
    residues: i === 0
      ? residues.filter((res) => !res.labReportId || res.labReportId === r.labReportId)
      : residues.filter((res) => res.labReportId === r.labReportId),
    notes: r.notes ?? '',
  }));
}

// ── Per-report block component ────────────────────────────────────────────────

interface BlockProps {
  block: ReportBlock;
  blockIndex: number;
  plotAnalytes: string[];
  isApiLab: boolean;
  labName: string;
  onChange: (id: string, patch: Partial<ReportBlock>) => void;
  onDelete: (id: string) => void;
}

const API_TOOLTIP = 'Imported automatically via direct lab connection — cannot be edited here';

function ReportAndResultsBlock({ block, blockIndex, plotAnalytes, isApiLab, labName, onChange, onDelete }: BlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<LabResiduesGridHandle>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const alreadyAdded = new Set(block.residues.map((r) => r.analyte).filter(Boolean));
  const recommendedChips = plotAnalytes.filter((a) => !alreadyAdded.has(a));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const att: LabAttachment = { id: `att-${Date.now()}`, name: file.name, size: file.size };
    onChange(block.id, { attachment: att });
    e.target.value = '';
  };

  const handleAddResidue = (analyte?: string) => {
    if (block.residues.length === 0) {
      onChange(block.id, { residues: [{ ...newResidueRow(), analyte: analyte ?? '' }] });
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

  const gridHeight = block.residues.length > 0
    ? Math.min(500, Math.max(200, block.residues.length * 52 + 56))
    : 120;

  // Shared right-column height so PDF chip/button aligns with the input field
  const attachColSx = {
    flexShrink: 0, height: 40, display: 'flex', alignItems: 'center',
  } as const;

  return (
    <Paper elevation={0} sx={cardSx}>
      {/* Block header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography sx={sectionLabelSx}>Lab report {blockIndex + 1}</Typography>
          {isApiLab && <ManagedTag system={labName} />}
        </Stack>
        {!isApiLab && (
          <IconButton size="small" onClick={() => onDelete(block.id)}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {/* Report ID row */}
      <Stack direction="row" spacing={2} alignItems="flex-end">
        {/* Lab report ID — greyed for API labs */}
        {isApiLab ? (
          <Tooltip title={API_TOOLTIP} arrow placement="top">
            <Box sx={{ flex: 1, cursor: 'not-allowed' }}>
              <FieldLabel>Lab report ID</FieldLabel>
              <Box sx={{ pointerEvents: 'none', opacity: 0.5 }}>
                <TextField fullWidth size="small" value={block.labReportId} disabled sx={fieldSx} />
              </Box>
            </Box>
          </Tooltip>
        ) : (
          <Box sx={{ flex: 1 }}>
            <FieldLabel>Lab report ID</FieldLabel>
            <TextField
              fullWidth size="small" placeholder="e.g. RPT-2024-001"
              value={block.labReportId}
              onChange={(e) => onChange(block.id, { labReportId: e.target.value })}
              sx={fieldSx}
            />
          </Box>
        )}

        {/* PDF attachment / upload — always clickable regardless of API state */}
        <Box sx={attachColSx}>
          {block.attachment ? (
            <AttachmentChip
              name={block.attachment.name}
              onClick={() => {}}
              onRemove={isApiLab ? undefined : () => onChange(block.id, { attachment: null })}
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
      </Stack>

      {/* Notes — always editable */}
      <Box sx={{ mt: 2 }}>
        <FieldLabel>Notes</FieldLabel>
        <TextField
          fullWidth multiline minRows={2} size="small"
          placeholder="Add notes about this report…"
          value={block.notes}
          onChange={(e) => onChange(block.id, { notes: e.target.value })}
          sx={fieldSx}
        />
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 2.5 }} />

      {/* Results header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography sx={sectionLabelSx}>Results</Typography>
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

      {/* Recommended analyte chips — shown for all labs; non-interactive when API */}
      {recommendedChips.length > 0 && (
        <Box
          sx={{
            mb: block.residues.length > 0 ? 1.5 : 0,
            ...(isApiLab ? { pointerEvents: 'none', opacity: 0.5 } : {}),
          }}
        >
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {recommendedChips.map((analyte) => (
              <ActionChip key={analyte} label={analyte} onClick={() => handleAddResidue(analyte)} />
            ))}
          </Stack>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', mt: 0.75 }}>
            Based on your applied treatments
          </Typography>
        </Box>
      )}

      {/* Results grid — always shown; locked for API labs */}
      {isApiLab ? (
        <Tooltip title={API_TOOLTIP} arrow placement="top">
          <Box sx={{ height: gridHeight, cursor: 'not-allowed' }}>
            <Box sx={{ height: '100%', pointerEvents: 'none', opacity: 0.5 }}>
              <LabResiduesGrid
                ref={gridRef}
                residues={block.residues}
                reports={[]}
                hideLabReport
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
            residues={block.residues}
            reports={[]}
            hideLabReport
            hideSource
            recommendedAnalytes={plotAnalytes}
            onAdd={(r) => onChange(block.id, { residues: [...block.residues, r] })}
            onUpdate={(id, patch) =>
              onChange(block.id, { residues: block.residues.map((r) => r.id === id ? { ...r, ...patch } : r) })
            }
            onDelete={(id) =>
              onChange(block.id, { residues: block.residues.filter((r) => r.id !== id) })
            }
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

  const [reportBlocks, setReportBlocks] = useState<ReportBlock[]>(() => initBlocks(sample));

  if (!plot || !sample) return <Box sx={{ p: 3 }}>Loading…</Box>;

  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];
  const plotAnalytes = getAnalytesForPlot(plotId ?? '');
  const isApiLab = !!laboratory && LABS_WITH_API_CONNECTION.has(laboratory);

  const handleBack = () => navigate(`/plot/${plotId}`, { state: { activeTab: 2 } });

  const handleSave = () => {
    const reports: LabReport[] = reportBlocks.map((b) => ({
      id: b.id,
      laboratory: '',
      labReportId: b.labReportId,
      attachments: b.attachment ? [b.attachment] : [],
      notes: b.notes || undefined,
    }));
    const residues: LabResidue[] = reportBlocks.flatMap((b) =>
      b.residues.map((r) => ({ ...r, labReportId: b.labReportId }))
    );
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

  const handleBlockChange = (id: string, patch: Partial<ReportBlock>) => {
    setReportBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  };

  const handleBlockDelete = (id: string) => {
    setReportBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddBlock = () => {
    setReportBlocks((prev) => [...prev, newBlock()]);
  };

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

          {/* ── Reports & Results section header ─────────────────────── */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.5 }}>
            <Typography sx={sectionLabelSx}>Reports &amp; Results</Typography>
            {!isApiLab && (
              <Button
                variant="soft" color="primary"
                startIcon={<Add sx={{ fontSize: 16 }} />}
                onClick={handleAddBlock}
                sx={softBtnSx}
              >
                Add report &amp; results
              </Button>
            )}
          </Stack>

          {/* ── Report + Results blocks ───────────────────────────────── */}
          {reportBlocks.length === 0 ? (
            <Box sx={{
              border: '1px dashed', borderColor: 'divider', borderRadius: '12px',
              py: 5, textAlign: 'center',
            }}>
              {isApiLab ? (
                <Stack spacing={1} alignItems="center">
                  <ApiConnectionChip />
                  <Typography sx={{ color: 'text.disabled', fontSize: '0.875rem', mt: 1 }}>
                    Results will be imported automatically from {laboratory} once the lab submits them.
                  </Typography>
                </Stack>
              ) : (
                <Typography sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>
                  No reports yet. Click "Add report &amp; results" to attach a lab report and enter results.
                </Typography>
              )}
            </Box>
          ) : (
            reportBlocks.map((block, i) => (
              <ReportAndResultsBlock
                key={block.id}
                block={block}
                blockIndex={i}
                plotAnalytes={plotAnalytes}
                isApiLab={isApiLab}
                labName={laboratory}
                onChange={handleBlockChange}
                onDelete={handleBlockDelete}
              />
            ))
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
