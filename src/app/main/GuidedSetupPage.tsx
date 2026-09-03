import React, { useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, MenuItem, Select, Stack, TextField, Typography, Chip,
} from '@mui/material';
import { UploadFile, AutoAwesome, CheckCircle } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import {
  useLabSamples, createLabSample, updateLabSample, newReportId, newResidueId,
  LabReport, LabResidue, LabSampleData,
} from '../data/lab-results-data';
import { usePlots } from '../data/plots-data';
import { useNavigate } from '../variants/variant-context';
import { PageLayout } from '../design-system/PageLayout';
import { FieldLabel } from '../design-system/FormField';
import { PdfThumbnail } from '../lab-shared/PdfThumbnail';
import { loadDoc } from '../lab-shared/parsers/load-pdf';
import { route, ParseResult } from '../lab-shared/parsers';

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
      setItems((prev) => [...prev, {
        id, file, parse, lab, reportId, target: 'new',
        plotId: plots[0]?.id ?? '', sampleName, sampleDate,
      }]);
    }
    setBusy(false);
  };

  const patch = (id: string, p: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));

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
      const residues = it.parse ? toLabResidues(it.parse, labReportId) : [];
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

      {/* Assignment rows */}
      <Stack spacing={2} sx={{ maxWidth: 1000 }}>
        {items.map((it) => (
          <Box key={it.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ width: 96, flexShrink: 0 }}>
              <PdfThumbnail file={it.file} width={96} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>{it.file.name}</Typography>
                {it.parse ? (
                  <Chip size="small" icon={<AutoAwesome sx={{ fontSize: 14 }} />}
                    label={`${it.lab || 'report'}${it.reportId ? ` ${it.reportId}` : ''} · ${it.parse.detected_residues.length} residues`}
                    sx={{ bgcolor: '#fef2f4', color: 'primary.main', fontWeight: 600 }} />
                ) : (
                  <Chip size="small" label="Not auto-read — assign manually" sx={{ bgcolor: 'grey.100', color: 'text.secondary' }} />
                )}
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <FieldLabel required>Assign to sample</FieldLabel>
                  <Select fullWidth size="small" value={it.target} onChange={(e) => patch(it.id, { target: e.target.value })}>
                    <MenuItem value="new">➕ Create a new sample</MenuItem>
                    {samples.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{plotName(s.plotId)} · {s.sampleName || 'Unnamed'}</MenuItem>
                    ))}
                  </Select>
                </Box>
                {it.target === 'new' ? (
                  <Box>
                    <FieldLabel required>Plot</FieldLabel>
                    <Select fullWidth size="small" value={it.plotId} onChange={(e) => patch(it.id, { plotId: e.target.value })} displayEmpty>
                      <MenuItem value="" disabled>Select plot…</MenuItem>
                      {plots.map((p) => <MenuItem key={p.id} value={p.id}>{p.plotName}</MenuItem>)}
                    </Select>
                  </Box>
                ) : <Box />}
                {it.target === 'new' && (
                  <>
                    <Box>
                      <FieldLabel required>Sample name</FieldLabel>
                      <TextField fullWidth size="small" value={it.sampleName}
                        onChange={(e) => patch(it.id, { sampleName: e.target.value })} placeholder="e.g. Routine check" />
                    </Box>
                    <Box>
                      <FieldLabel required>When was the sample taken?</FieldLabel>
                      <DatePicker value={it.sampleDate} onChange={(d) => patch(it.id, { sampleDate: d })}
                        slotProps={{ textField: { size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY' } }} />
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Stack>

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
