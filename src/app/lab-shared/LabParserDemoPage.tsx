import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Chip, Paper, Stack, CircularProgress, LinearProgress } from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import { loadDoc } from './parsers/load-pdf';
import { route, ParseResult, Residue } from './parsers';

const FIELD_LABELS: Record<string, string> = {
  sample_id: 'Sample ID', report_number: 'Report no.', client_name: 'Client',
  client_code: 'Client code', client_reference: 'Client reference',
  customer_reference: 'Customer reference', sample_type: 'Sample type',
  lab_description: 'Lab description', weight_kg: 'Weight (kg)', pieces: 'Pieces',
  sample_condition: 'Condition', sampling_point: 'Sampling point',
  sampling_date: 'Sampling date', sampling_datetime: 'Sampling date',
  reception_date: 'Reception', reception_datetime: 'Reception',
  analysis_start: 'Analysis start', analysis_end: 'Analysis end', report_date: 'Report date',
};
const FIELD_ORDER = ['sample_id', 'report_number', 'sample_type', 'lab_description', 'client_name',
  'client_code', 'client_reference', 'customer_reference', 'weight_kg', 'pieces', 'sample_condition',
  'sampling_point', 'sampling_date', 'sampling_datetime', 'reception_date', 'reception_datetime',
  'analysis_start', 'analysis_end', 'report_date'];

const humanize = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmt = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: 4 });

function pctColor(p: number | null): string {
  if (p == null) return '#94a3b8';
  if (p < 33) return '#15803d';
  if (p < 66) return '#ca8a04';
  if (p <= 100) return '#ea580c';
  return '#b91c1c';
}

function ResidueRow({ r }: { r: Residue }) {
  const pct = r.result_mgkg != null && r.mrl_eu_mgkg ? (r.result_mgkg / r.mrl_eu_mgkg) * 100 : null;
  const col = pctColor(pct);
  const w = pct == null ? 0 : Math.min(pct, 100);
  const mrl = (v: number | null | undefined, note?: string) =>
    v != null ? fmt(v) : note ? <span style={{ color: '#6b7280', fontSize: 12 }}>{note}</span> : '—';
  return (
    <Box component="tr" sx={{ '& td': { py: 1.25, px: 1.5, borderBottom: '1px solid #f1f3f5', whiteSpace: 'nowrap' } }}>
      <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>
        {r.analyte}
        {r.technique && <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>{r.technique}</div>}
      </td>
      <td>{r.result_qualifier || ''}{fmt(r.result_mgkg)}</td>
      <td style={{ color: '#6b7280' }}>{r.uncertainty_mgkg != null ? `± ${fmt(r.uncertainty_mgkg)}` : ''}</td>
      <td>{mrl(r.mrl_eu_mgkg, r.mrl_eu_note)}</td>
      <td>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
          <Box sx={{ flex: 1, height: 7, borderRadius: 1, bgcolor: '#eef1f5', overflow: 'hidden', minWidth: 60 }}>
            <Box sx={{ height: '100%', width: `${w}%`, bgcolor: col, borderRadius: 1 }} />
          </Box>
          <Box sx={{ fontSize: 12, fontWeight: 600, color: col, minWidth: 42, textAlign: 'right' }}>
            {pct == null ? '—' : `${pct.toFixed(0)}%`}
          </Box>
        </Box>
      </td>
      <td>{mrl(r.mrl_uk_mgkg, r.mrl_uk_note)}</td>
      <td style={{ color: '#6b7280' }}>{fmt(r.loq_mgkg)}</td>
    </Box>
  );
}

export function LabParserDemoPage() {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBuffer = useCallback(async (name: string, buf: ArrayBuffer) => {
    setBusy(true); setError(null); setResult(null); setFileName(name);
    try {
      const doc = await loadDoc(buf);
      setResult(route(doc));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleFile = useCallback((f: File) => f.arrayBuffer().then((b) => handleBuffer(f.name, b)), [handleBuffer]);

  // optional deep-link for testing: /explore/lab-parser?sample=<url>
  useEffect(() => {
    const url = new URLSearchParams(location.search).get('sample');
    if (!url) return;
    fetch(url).then((r) => r.arrayBuffer()).then((b) => handleBuffer(url.split('/').pop() || url, b)).catch(() => {});
  }, [handleBuffer]);

  const header = result?.header ?? {};
  const hk = Object.keys(header);
  const ordered = FIELD_ORDER.filter((k) => hk.includes(k)).concat(hk.filter((k) => !FIELD_ORDER.includes(k)));
  const rows = result?.detected_residues ?? [];

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Stack direction="row" spacing={1.5} alignItems="baseline">
        <Typography variant="h5" fontWeight={650}>Lab Report Parser</Typography>
        <Chip label="deterministic · no LLM · in-browser" size="small"
          sx={{ bgcolor: '#fef2f4', color: 'primary.main', fontWeight: 600 }} />
      </Stack>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
        Drop a residue report PDF (Aqua/Tentamus, Eurofins, or orange-data). Parsed entirely in your browser with pdf.js.
      </Typography>

      <Paper
        variant="outlined"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        sx={{
          mt: 3, p: 5, textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed', borderWidth: 2,
          borderColor: over ? 'primary.main' : '#cfd4dc', bgcolor: over ? '#fffafb' : 'background.paper',
          transition: '.15s',
        }}
      >
        <UploadFile sx={{ fontSize: 34, color: 'primary.main' }} />
        <Typography fontWeight={600} sx={{ mt: 1 }}>Drop a PDF here</Typography>
        <Typography variant="body2" color="text.secondary">or click to browse · results appear below</Typography>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </Paper>

      {busy && <LinearProgress sx={{ mt: 2 }} />}
      {error && (
        <Paper variant="outlined" sx={{ mt: 3, p: 2, bgcolor: '#fdeaea', borderColor: '#f4c5c5' }}>
          <Typography color="#7f1d1d" fontWeight={600}>Could not parse</Typography>
          <Typography color="#7f1d1d" variant="body2">{error}</Typography>
        </Paper>
      )}

      {result && (
        <>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 3, mb: 1.5, flexWrap: 'wrap' }}>
            <Chip size="small" label={result._validation.ok ? '✓ Validation passed' : '✕ Validation failed'}
              sx={{ bgcolor: result._validation.ok ? '#e8f6ec' : '#fdeaea', color: result._validation.ok ? '#15803d' : '#b91c1c', fontWeight: 600 }} />
            <Chip size="small" label={result.template} sx={{ bgcolor: '#eef1f5', color: '#475569' }} />
            <Chip size="small" label={`${rows.length} detected`} sx={{ bgcolor: '#fef2f4', color: 'primary.main', fontWeight: 600 }} />
            <Typography variant="caption" color="text.secondary">{fileName}</Typography>
          </Stack>

          <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="overline" color="text.secondary">Sample details</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '12px 24px', mt: 1 }}>
              {ordered.filter((k) => header[k] != null && header[k] !== '').map((k) => (
                <Box key={k}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.03em' }}>
                    {FIELD_LABELS[k] || humanize(k)}
                  </Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-word' }}>{String(header[k])}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">Detected residues</Typography>
            {rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No residues detected above LOQ — clean sample.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto', mt: 1 }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 560,
                  '& th': { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em', color: 'text.secondary', fontWeight: 600, pb: 1, px: 1.5, borderBottom: '1px solid #e5e7eb' } }}>
                  <thead><tr>
                    <th>Analyte</th><th>Result mg/kg</th><th>Uncert.</th><th>EU MRL</th><th>% EU MRL</th><th>UK MRL</th><th>LOQ</th>
                  </tr></thead>
                  <tbody>{rows.map((r, i) => <ResidueRow key={i} r={r} />)}</tbody>
                </Box>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
