import React, { useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, MenuItem, Select, Stack, TextField, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Collapse,
} from '@mui/material';
import { UploadFile, AutoAwesome, CheckCircle, ExpandMore, Add } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import {
  useLabSamples, createLabSample, updateLabSample, newReportId, newResidueId,
  LabReport, LabResidue, LabSampleData,
} from '../data/lab-results-data';
import { usePlots } from '../data/plots-data';
import { useNavigate } from '../variants/variant-context';
import { PageLayout } from '../design-system/PageLayout';
import { PdfThumbnail } from '../lab-shared/PdfThumbnail';
import { Th, readOnlyHeaderRowSx } from './SamplesReportsTable';
import { TableCard } from '../design-system/TableCard';
import { LabResiduesGrid, LabResiduesGridHandle } from '../lab-shared/LabResiduesGrid';
import { loadDoc } from '../lab-shared/parsers/load-pdf';
import { route, ParseResult } from '../lab-shared/parsers';

// Underline (standard) inputs so the table reads like a clean editable grid
// rather than a grid of boxed form fields.
const cellInputSx = {
  '& .MuiInput-root': { fontSize: '0.875rem' },
  '& .MuiInput-input': { py: 0.5 },
  '& .MuiSelect-select': { py: 0.5 },
} as const;

const TEMPLATE_LAB: Record<string, string> = {
  'aqua-informe-de-ensayo': 'Tentamus',
  'eurofins-relatorio-de-ensaio': 'Eurofins',
  'orangedata-analytical-report': 'orange-data',
};

function parseDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

function toLabResidues(res: ParseResult, labReportId: string): LabResidue[] {
  return res.detected_residues.map((r) => ({
    id: newResidueId(), analyte: r.analyte, residueLevel: 'Residue',
    residueValue: r.result_mgkg != null ? String(r.result_mgkg) : '',
    methodLoq: r.loq_mgkg != null ? String(r.loq_mgkg) : '',
    methodLod: '', fromTreatment: false, labReportId, isDraft: false,
  }));
}

interface Item {
  id: string;
  file: File;
  parse: ParseResult | null;
  lab: string;
  reportId: string;
  residues: LabResidue[];   // editable, seeded from the parse
  // assignment
  target: string;      // 'new' or an existing sample id
  plotId: string;
  sampleName: string;
  sampleDate: Date | null;
}

/**
 * Guided setup — assign uploaded lab reports to samples. The user drops the
 * reports they've collected; each is parsed in-browser and turned into an
 * assignment row where they pick the plot + sample (new or existing) and
 * confirm when the sample was taken. Finishing creates the samples and files
 * the reports + results onto them.
 */
export function GuidedSetupPage() {
  const navigate = useNavigate();
  const samples = useLabSamples().filter((s) => !s.isDraft);
  const plots = usePlots();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: File[]) => {
    setBusy(true);
    for (const file of files) {
      const id = `it-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      let parse: ParseResult | null = null;
      try { parse = route(await loadDoc(await file.arrayBuffer())); } catch { /* unrecognized */ }
      const lab = parse ? (TEMPLATE_LAB[parse.template] ?? '') : '';
      const reportId = String(parse?.header.sample_id ?? parse?.header.report_number ?? '');
      const sampleName = String(parse?.header.client_reference ?? parse?.header.lab_description ?? reportId ?? file.name.replace(/\.[^.]+$/, ''));
      const sampleDate = parseDate(parse?.header.sampling_datetime ?? parse?.header.sampling_date ?? parse?.header.reception_datetime);
      const residues = parse ? toLabResidues(parse, reportId) : [];
      setItems((prev) => [...prev, {
        id, file, parse, lab, reportId, residues, target: 'new',
        plotId: plots[0]?.id ?? '', sampleName, sampleDate,
      }]);
    }
    setBusy(false);
  };

  const patch = (id: string, p: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  const patchResidues = (id: string, fn: (rs: LabResidue[]) => LabResidue[]) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, residues: fn(it.residues) } : it)));

  const canFinish = items.length > 0 && items.every((it) =>
    it.target !== 'new' || (it.plotId && it.sampleName.trim() && it.sampleDate));

  const handleFinish = () => {
    let created = 0;
    for (const it of items) {
      const labReportId = it.reportId || it.file.name.replace(/\.[^.]+$/, '');
      const report: LabReport = {
        id: newReportId(), laboratory: it.lab, labReportId,
        attachments: [{ id: `att-${it.id}`, name: it.file.name, size: it.file.size }],
      };
      // Use the (possibly edited) residues from the grid, linked to this report.
      const residues = it.residues.map((r) => ({ ...r, labReportId, isDraft: false }));
      if (it.target === 'new') {
        const s = createLabSample(it.plotId);
        updateLabSample(s.id, {
          sampleName: it.sampleName.trim(), dateOfSample: it.sampleDate,
          laboratory: it.lab, reports: [report], residues, isDraft: false,
        });
        created++;
      } else {
        const s = samples.find((x) => x.id === it.target);
        if (s) updateLabSample(s.id, {
          reports: [...(s.reports ?? []), report],
          residues: [...(s.residues ?? []), ...residues], isDraft: false,
        });
      }
    }
    toast.success(`Assigned ${items.length} report${items.length === 1 ? '' : 's'}${created ? ` · ${created} new sample${created === 1 ? '' : 's'}` : ''}`);
    navigate('/samples');
  };

  const plotName = (plotId: string) => plots.find((p) => p.id === plotId)?.plotName ?? '';

  return (
    <PageLayout variant="wide" title="Guided setup · Assign your lab reports">
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3, maxWidth: 680 }}>
        Upload the lab reports you’ve received. We read each one, then help you assign it to a sample
        and confirm when the sample was taken. Finishing creates the samples with their results.
      </Typography>

      {/* Dropzone */}
      <Box
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
        sx={{
          border: '2px dashed', borderColor: over ? 'primary.main' : 'divider', borderRadius: '12px',
          bgcolor: over ? 'primary.softBg' : 'grey.50', py: 4, textAlign: 'center', cursor: 'pointer', mb: 3,
        }}
      >
        <UploadFile sx={{ fontSize: 30, color: 'primary.main' }} />
        <Typography fontWeight={600} sx={{ mt: 0.5 }}>Drop lab reports here</Typography>
        <Typography variant="body2" color="text.secondary">or click to browse · PDF, multiple at once</Typography>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden multiple
          onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.currentTarget.value = ''; }} />
      </Box>

      {busy && <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, color: 'text.secondary' }}><CircularProgress size={16} /><Typography variant="body2">Reading reports…</Typography></Stack>}

      {/* Assignment table — one row per report; Lab and Lab report ID are
          editable columns (auto-filled from the parse). */}
      {items.length > 0 && (
        <TableCard>
          <TableContainer>
            <Table sx={{ minWidth: 1320 }}>
              <TableHead>
                <TableRow sx={readOnlyHeaderRowSx}>
                  <Th>Report</Th>
                  <Th>Lab</Th>
                  <Th>Lab report ID</Th>
                  <Th>Assign to sample</Th>
                  <Th>Plot</Th>
                  <Th>Sample name</Th>
                  <Th>Sample taken</Th>
                  <Th>Results</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => {
                  const existing = it.target !== 'new' ? samples.find((s) => s.id === it.target) : null;
                  return (
                    <React.Fragment key={it.id}>
                    <TableRow>
                      <TableCell sx={{ minWidth: 180 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 40, flexShrink: 0 }}><PdfThumbnail file={it.file} width={40} /></Box>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 130 }}>{it.file.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ width: 160 }}>
                        <TextField variant="standard" fullWidth value={it.lab} placeholder="—"
                          onChange={(e) => patch(it.id, { lab: e.target.value })} sx={cellInputSx} />
                      </TableCell>
                      <TableCell sx={{ width: 160 }}>
                        <TextField variant="standard" fullWidth value={it.reportId} placeholder="—"
                          onChange={(e) => patch(it.id, { reportId: e.target.value })} sx={cellInputSx} />
                      </TableCell>
                      <TableCell sx={{ width: 200 }}>
                        <Select variant="standard" fullWidth value={it.target}
                          onChange={(e) => patch(it.id, { target: e.target.value })} sx={cellInputSx}>
                          <MenuItem value="new">➕ Create a new sample</MenuItem>
                          {samples.map((s) => (
                            <MenuItem key={s.id} value={s.id}>{plotName(s.plotId)} · {s.sampleName || 'Unnamed'}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell sx={{ width: 160 }}>
                        {existing ? (
                          <Typography variant="body2" color="text.secondary">{plotName(existing.plotId)}</Typography>
                        ) : (
                          <Select variant="standard" fullWidth value={it.plotId} displayEmpty
                            onChange={(e) => patch(it.id, { plotId: e.target.value })} sx={cellInputSx}>
                            <MenuItem value="" disabled>Select plot…</MenuItem>
                            {plots.map((p) => <MenuItem key={p.id} value={p.id}>{p.plotName}</MenuItem>)}
                          </Select>
                        )}
                      </TableCell>
                      <TableCell sx={{ width: 180 }}>
                        {existing ? (
                          <Typography variant="body2" color="text.secondary" noWrap>{existing.sampleName || 'Unnamed'}</Typography>
                        ) : (
                          <TextField variant="standard" fullWidth value={it.sampleName} placeholder="—"
                            onChange={(e) => patch(it.id, { sampleName: e.target.value })} sx={cellInputSx} />
                        )}
                      </TableCell>
                      <TableCell sx={{ width: 150 }}>
                        {existing ? (
                          <Typography variant="body2" color="text.secondary">
                            {existing.dateOfSample ? new Intl.DateTimeFormat('en-GB').format(existing.dateOfSample) : '—'}
                          </Typography>
                        ) : (
                          <DatePicker value={it.sampleDate} onChange={(d) => patch(it.id, { sampleDate: d })}
                            slotProps={{ textField: { variant: 'standard', fullWidth: true, placeholder: 'DD/MM/YYYY', sx: { ...cellInputSx, minWidth: 128, '& input': { whiteSpace: 'nowrap' } } } }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ width: 110 }}>
                        <Chip size="small" clickable onClick={() => toggle(it.id)}
                          icon={<AutoAwesome sx={{ fontSize: 13 }} />}
                          label={
                            <Stack direction="row" alignItems="center" spacing={0.25}>
                              <span>{it.residues.length}</span>
                              <ExpandMore sx={{ fontSize: 15, transform: expanded[it.id] ? 'rotate(180deg)' : 'none', transition: '.15s' }} />
                            </Stack>
                          }
                          sx={{ bgcolor: '#fef2f4', color: 'primary.main', fontWeight: 700 }} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0, borderBottom: expanded[it.id] ? '1px solid' : 'none', borderColor: 'divider' }}>
                        <Collapse in={!!expanded[it.id]} unmountOnExit>
                          <Box sx={{ bgcolor: 'grey.50', px: 2, py: 1.5 }}>
                            <ReportResiduesEditor
                              residues={it.residues}
                              onAdd={(r) => patchResidues(it.id, (rs) => [...rs, r])}
                              onUpdate={(rid, p) => patchResidues(it.id, (rs) => rs.map((r) => (r.id === rid ? { ...r, ...p } : r)))}
                              onDelete={(rid) => patchResidues(it.id, (rs) => rs.filter((r) => r.id !== rid))}
                            />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TableCard>
      )}

      {items.length > 0 && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3, maxWidth: 1000 }}>
          <Button variant="contained" color="primary" startIcon={<CheckCircle />} disabled={!canFinish}
            onClick={handleFinish}
            sx={{ fontWeight: 600, textTransform: 'none', px: 3, height: 40, borderRadius: '8px' }}>
            Create samples & file reports
          </Button>
        </Stack>
      )}
    </PageLayout>
  );
}

const softBtnSx = { fontWeight: 600, borderRadius: '8px', px: 2, height: 34, textTransform: 'none' } as const;

/** Editable residues grid for an expanded report row — the same grid used in
 *  the extraction/add-report overlay, so values can be overwritten and rows
 *  added before finishing. */
function ReportResiduesEditor({ residues, onAdd, onUpdate, onDelete }: {
  residues: LabResidue[];
  onAdd: (r: LabResidue) => void;
  onUpdate: (id: string, patch: Partial<LabResidue>) => void;
  onDelete: (id: string) => void;
}) {
  const gridRef = useRef<LabResiduesGridHandle>(null);
  const height = Math.min(360, Math.max(120, residues.length * 52 + 56));
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '.03em', color: 'text.secondary' }}>
          Results found in this report ({residues.length})
        </Typography>
        <Button variant="soft" color="primary" startIcon={<Add sx={{ fontSize: 16 }} />}
          onClick={() => gridRef.current?.addRow()} sx={softBtnSx}>
          Add residue
        </Button>
      </Stack>
      <TableCard>
        <Box sx={{ height }}>
          <LabResiduesGrid
            ref={gridRef}
            residues={residues}
            reports={[]}
            hideLabReport
            hideSource
            onAdd={onAdd}
            onUpdate={onUpdate}
            onDelete={onDelete}
            noRowsMessage="No residues — add them manually."
          />
        </Box>
      </TableCard>
    </Box>
  );
}
