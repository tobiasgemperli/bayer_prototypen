import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, TextField, CircularProgress, Chip, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import {
  CloudUploadOutlined, AttachFile, Mic, Send, CheckCircle, ArrowBack, AutoAwesome, Check, Clear,
} from '@mui/icons-material';
import {
  enrichCommand, PendingCard, SAMPLE_CSV_COMMANDS, EditableTextField, EditableSelect,
  type ChatEntry,
} from '../../main/ChatAssistant';
import {
  addPlot, updateTreatments, getPlots, usePlots, treatmentsData, useTreatmentsVersion,
  PlotData, TreatmentData,
} from '../../data/plots-data';
import { useLabSamples, createLabSample, updateLabSample } from '../../data/lab-results-data';
import { useOnboardingStep, setOnboardingStep, ONB_TITLES } from '../../data/onboarding-flow';
import { launchPrototype } from '../../data/prototypes';

const HEADER_H = 56;
let oid = 0;

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d) : '—';
const plotName = (id?: string) => getPlots().find(p => p.id === id)?.plotName ?? 'plot';

// Canned extractions — deterministic, no API cost.
const CANNED_PLOTS = [
  { plotName: 'Orchard East', crop: 'Pome fruits', variety: 'Gala', location: 'Zone 6' },
  { plotName: 'Berry Field 3', crop: 'Strawberries', variety: 'Elsanta', location: 'Zone 6' },
  { plotName: 'Stone Hill', crop: 'Stone fruits', variety: 'Regina', location: 'Zone 7' },
];
const CROP_OPTIONS = ['Strawberries', 'Pome fruits', 'Stone fruits', 'Wheat', 'Corn'];
const SEASON_OPTIONS = ['Spring 2024', 'Winter 2023', 'Spring 2025'];

/** An extracted plot with per-field provenance (voice = read, assumed = auto-filled). */
interface OnbPlot {
  plotName: string; crop: string; variety: string; location: string; owner: string; season: string;
  meta: Record<string, 'voice' | 'assumed'>;
}
const CANNED_SAMPLES = [
  { sampleCode: 'ONB-1042', sampleName: 'Pre-harvest screen', iso: '2026-06-15', commodity: 'Fruit', laboratory: 'Bureau Veritas Switzerland' },
  { sampleCode: 'ONB-1043', sampleName: 'Soil residue check', iso: '2026-06-18', commodity: 'Soil', laboratory: 'SGS' },
];

const STEP_COPY = [
  { q: 'What plots would you like to import?', hint: 'Drop a farm export or a screenshot and I’ll pull out your plots. You can also speak or type them.' },
  { q: 'What treatments have you applied?', hint: 'Drop a spray journal (CSV or screenshot) and I’ll extract every application for you to review.' },
  { q: 'Do you have sample data to share?', hint: 'Drop your lab reports and I’ll list the samples. Speak or type works too.' },
];

const head = { fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' } as const;
const cell = { fontSize: '0.8rem' } as const;

// ── Left pane: the data that exists in the system, per step ───────────────────
function DataPane({ step }: { step: number }) {
  const plots = usePlots();
  useTreatmentsVersion();
  const samples = useLabSamples();
  const treatments = treatmentsData.filter(t => t.product);

  const title = step === 1 ? `Your plots (${plots.length})`
    : step === 2 ? `Your treatments (${treatments.length})`
    : `Your samples (${samples.length})`;

  return (
    <Box>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary' }}>In your account</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mt: 0.25, mb: 1.5 }}>{title}</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
        <Table size="small" stickyHeader>
          {step === 1 && (<>
            <TableHead><TableRow><TableCell sx={head}>Plot</TableCell><TableCell sx={head}>Crop</TableCell><TableCell sx={head}>Variety</TableCell><TableCell sx={head}>Location</TableCell></TableRow></TableHead>
            <TableBody>{plots.map(p => (
              <TableRow key={p.id} hover><TableCell sx={cell}>{p.plotName}</TableCell><TableCell sx={cell}>{p.crop}</TableCell><TableCell sx={cell}>{p.variety || '—'}</TableCell><TableCell sx={cell}>{p.location}</TableCell></TableRow>
            ))}</TableBody>
          </>)}
          {step === 2 && (<>
            <TableHead><TableRow><TableCell sx={head}>Plot</TableCell><TableCell sx={head}>Date</TableCell><TableCell sx={head}>Product</TableCell><TableCell sx={head}>Method</TableCell></TableRow></TableHead>
            <TableBody>{treatments.map(t => (
              <TableRow key={t.id} hover><TableCell sx={cell}>{plotName(t.plotId)}</TableCell><TableCell sx={cell}>{fmtDate(t.date)}</TableCell><TableCell sx={cell}>{t.product}</TableCell><TableCell sx={cell}>{t.method}</TableCell></TableRow>
            ))}</TableBody>
          </>)}
          {step === 3 && (<>
            <TableHead><TableRow><TableCell sx={head}>Code</TableCell><TableCell sx={head}>Name</TableCell><TableCell sx={head}>Commodity</TableCell><TableCell sx={head}>Laboratory</TableCell></TableRow></TableHead>
            <TableBody>
              {samples.length === 0 ? (
                <TableRow><TableCell colSpan={4} sx={{ color: 'text.secondary' }}>No samples yet.</TableCell></TableRow>
              ) : samples.map(s => (
                <TableRow key={s.id} hover><TableCell sx={cell}>{s.sampleCode || '—'}</TableCell><TableCell sx={cell}>{s.sampleName || '—'}</TableCell><TableCell sx={cell}>{s.commodity || '—'}</TableCell><TableCell sx={cell}>{s.laboratory || '—'}</TableCell></TableRow>
              ))}
            </TableBody>
          </>)}
        </Table>
      </TableContainer>
    </Box>
  );
}

export function OnboardingFlow() {
  const step = useOnboardingStep();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [plots, setPlots] = useState<OnbPlot[] | null>(null);
  const [plotsAdded, setPlotsAdded] = useState(0);
  const [pending, setPending] = useState<ChatEntry | null>(null);
  const [txAdded, setTxAdded] = useState(0);
  const [samples, setSamples] = useState<typeof CANNED_SAMPLES | null>(null);
  const [samplesAdded, setSamplesAdded] = useState(0);

  // Resizable split ratio.
  const [leftWidth, setLeftWidth] = useState<number>(() => Math.round((typeof window !== 'undefined' ? window.innerWidth : 1200) * 0.44));
  const draggingRef = useRef(false);
  useEffect(() => {
    const move = (e: MouseEvent) => { if (draggingRef.current) setLeftWidth(Math.min(Math.max(e.clientX, 300), window.innerWidth - 440)); };
    const up = () => { if (draggingRef.current) { draggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; } };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  const triggerExtract = () => {
    if (loading) return;
    setInput('');
    setLoading(true);
    setTimeout(() => {
      if (step === 1) setPlots(CANNED_PLOTS.map(p => ({
        plotName: p.plotName, crop: p.crop, variety: p.variety, location: p.location,
        owner: 'lyle.peterer@bayer.com', season: 'Spring 2024',
        meta: { plotName: 'voice', crop: 'voice', variety: 'voice', location: 'voice', owner: 'assumed', season: 'assumed' },
      })));
      else if (step === 2) setPending({
        id: ++oid, role: 'pending', content: '', commands: SAMPLE_CSV_COMMANDS,
        enriched: SAMPLE_CSV_COMMANDS.map(c => enrichCommand(c, true)), status: null, source: '📄 spray-journal.csv',
      });
      else if (step === 3) setSamples(CANNED_SAMPLES);
      setLoading(false);
    }, 600);
  };

  const updatePlotField = (i: number, field: keyof OnbPlot, value: string) =>
    setPlots(prev => prev ? prev.map((p, idx) => idx === i ? { ...p, [field]: value, meta: { ...p.meta, [field]: 'voice' } } : p) : prev);
  const acceptPlots = () => {
    if (!plots) return;
    plots.forEach(p => addPlot({
      plotName: p.plotName, owner: p.owner, variety: p.variety, location: p.location,
      crop: p.crop, season: p.season, lastTreatment: null, plantingDate: null,
    } as Omit<PlotData, 'id'>));
    setPlotsAdded(plots.length);
    setPlots(null);
  };

  const updateField = (entryId: number, i: number, field: string, value: string) =>
    setPending(p => { if (!p?.enriched) return p; const e = [...p.enriched]; e[i] = { ...e[i], [field]: value, fieldMeta: { ...e[i].fieldMeta, [field]: { source: 'voice' } } }; return { ...p, enriched: e }; });
  const updatePlot = (entryId: number, plotId: string) =>
    setPending(p => { if (!p?.enriched) return p; const e = p.enriched.map(en => ({ ...en, plotId, fieldMeta: { ...en.fieldMeta, plotId: { source: 'voice' as const } } })); return { ...p, enriched: e }; });
  const acceptTreatments = () => {
    if (!pending?.enriched) return;
    const cmds = pending.enriched;
    const plotId = cmds[0]?.plotId ?? getPlots()[0]?.id;
    const toAdd: TreatmentData[] = cmds.map((c, i) => ({
      id: `onb-${Date.now()}-${i}`, plotId: c.plotId || plotId!,
      date: c.date ? new Date(c.date) : new Date(),
      product: c.product || '', method: c.method || '',
      productDoseValue: c.productDoseValue || '', productDoseUnit: c.productDoseUnit || 'L/ha',
      waterVolumeValue: c.waterVolumeValue || '', waterVolumeUnit: c.waterVolumeUnit || 'L/ha', type: 'Real',
    }));
    updateTreatments(toAdd);
    setTxAdded(toAdd.length);
    setPending(p => p ? { ...p, status: 'accepted' } : p);
  };

  const acceptSamples = () => {
    if (!samples) return;
    const plotId = getPlots()[0]?.id;
    if (plotId) samples.forEach(s => {
      const created = createLabSample(plotId);
      updateLabSample(created.id, {
        sampleCode: s.sampleCode, sampleName: s.sampleName, dateOfSample: new Date(s.iso),
        commodity: s.commodity as any, laboratory: s.laboratory, isDraft: false,
      });
    });
    setSamplesAdded(samples.length);
    setSamples(null);
  };

  const next = () => setOnboardingStep(Math.min(4, step + 1) as any);
  const back = () => setOnboardingStep(Math.max(1, step - 1) as any);
  const finish = () => launchPrototype('assistant-floating');

  // ── Finish screen ─────────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <Box sx={{ position: 'fixed', top: HEADER_H, left: 0, right: 0, bottom: 0, zIndex: 1100, bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', maxWidth: 520, px: 3 }}>
          <CheckCircle sx={{ fontSize: 56, color: 'success.main' }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', mt: 2 }}>You're all set</Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            Imported <b>{plotsAdded}</b> plot{plotsAdded !== 1 ? 's' : ''}, <b>{txAdded}</b> treatment{txAdded !== 1 ? 's' : ''} and <b>{samplesAdded}</b> sample{samplesAdded !== 1 ? 's' : ''}.
          </Typography>
          <Button variant="contained" onClick={finish}
            sx={{ mt: 4, textTransform: 'none', borderRadius: '10px', bgcolor: 'grey.900', color: 'common.white', px: 3, py: 1, '&:hover': { bgcolor: '#000' } }}>
            Go to ResiYou
          </Button>
        </Box>
      </Box>
    );
  }

  const copy = STEP_COPY[step - 1];
  const exampleLabel = `Use example ${['plots', 'spray journal', 'lab reports'][step - 1]}`;

  return (
    <Box sx={{ position: 'fixed', top: HEADER_H, left: 0, right: 0, bottom: 0, zIndex: 1100, bgcolor: 'background.default', display: 'flex' }}>
      {/* Left — the data that now exists */}
      <Box sx={{ width: leftWidth, flexShrink: 0, bgcolor: 'background.paper', overflowY: 'auto', p: 3 }}>
        <DataPane step={step} />
      </Box>

      {/* Drag handle to resize the split */}
      <Box
        onMouseDown={(e) => { e.preventDefault(); draggingRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
        sx={{ width: 6, flexShrink: 0, cursor: 'col-resize', bgcolor: 'divider', transition: 'background-color .12s', '&:hover': { bgcolor: 'text.disabled' } }}
      />

      {/* Right — the AI */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 4, py: 4 }}>
          <Box sx={{ maxWidth: 620, mx: 'auto' }}>
            {/* Progress */}
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
              {ONB_TITLES.map((tl, i) => (
                <Box key={tl} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                    bgcolor: i + 1 < step ? 'success.main' : i + 1 === step ? 'grey.900' : 'grey.200',
                    color: i + 1 <= step ? 'common.white' : 'text.secondary',
                  }}>{i + 1 < step ? '✓' : i + 1}</Box>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: i + 1 === step ? 700 : 500, color: i + 1 === step ? 'text.primary' : 'text.secondary' }}>{tl}</Typography>
                </Box>
              ))}
            </Box>

            <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', textAlign: 'center' }}>{copy.q}</Typography>
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 1, mb: 3 }}>{copy.hint}</Typography>

            {/* Drop-active field */}
            <Paper
              variant="outlined"
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); triggerExtract(); }}
              sx={{
                borderRadius: '16px', py: 7, px: 3, minHeight: 240, borderStyle: 'dashed', borderWidth: 2,
                borderColor: dragging ? 'grey.900' : 'divider',
                bgcolor: dragging ? 'action.hover' : 'background.paper',
                textAlign: 'center', transition: 'border-color .12s, background-color .12s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*,.csv,text/csv,application/pdf" hidden
                onChange={e => { if (e.target.files?.length) triggerExtract(); e.target.value = ''; }} />
              <CloudUploadOutlined sx={{ fontSize: 60, color: 'text.secondary' }} />
              <Typography sx={{ fontWeight: 600, fontSize: '1.1rem', mt: 1.5 }}>Drop files here</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>CSV, screenshot or PDF</Typography>
              <Box sx={{ mt: 2.5 }}>
                <Chip icon={<AutoAwesome sx={{ fontSize: 15 }} />} label={exampleLabel}
                  size="small" variant="outlined" clickable onClick={triggerExtract} sx={{ borderRadius: '8px' }} />
              </Box>
            </Paper>

            {/* Extracted preview / approval */}
            {step === 1 && plots && (
              <Box sx={{ mt: 3 }}>
                <PlotsCard plots={plots} onUpdate={updatePlotField} onAccept={acceptPlots} onReject={() => setPlots(null)} />
              </Box>
            )}
            {step === 1 && plotsAdded > 0 && !plots && <Done label={`${plotsAdded} plots added`} />}

            {step === 2 && pending && (
              <Box sx={{ mt: 3 }}>
                <PendingCard entry={pending} neutral onAccept={acceptTreatments} onReject={() => setPending(p => p ? { ...p, status: 'rejected' } : p)} onUpdate={updateField} onPlotChange={(plotId) => updatePlot(pending.id, plotId)} />
              </Box>
            )}
            {step === 2 && txAdded > 0 && <Done label={`${txAdded} treatments added`} />}

            {step === 3 && samples && (
              <Box sx={{ mt: 3 }}>
                <Typography sx={{ ...head, mb: 0.75 }}>{samples.length} samples found — review and import</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell sx={head}>Code</TableCell><TableCell sx={head}>Name</TableCell><TableCell sx={head}>Commodity</TableCell><TableCell sx={head}>Laboratory</TableCell></TableRow></TableHead>
                    <TableBody>{samples.map(s => (
                      <TableRow key={s.sampleCode} hover><TableCell sx={cell}>{s.sampleCode}</TableCell><TableCell sx={cell}>{s.sampleName}</TableCell><TableCell sx={cell}>{s.commodity}</TableCell><TableCell sx={cell}>{s.laboratory}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                </TableContainer>
                <Button variant="contained" onClick={acceptSamples} sx={{ mt: 1.5, textTransform: 'none', borderRadius: '8px', bgcolor: 'grey.900', color: 'common.white', '&:hover': { bgcolor: '#000' } }}>Import {samples.length} samples</Button>
              </Box>
            )}
            {step === 3 && samplesAdded > 0 && !samples && <Done label={`${samplesAdded} samples imported`} />}

            {/* Nav */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button onClick={back} disabled={step === 1} startIcon={<ArrowBack />} sx={{ textTransform: 'none', color: 'text.secondary' }}>Back</Button>
              <Button variant="contained" onClick={next}
                sx={{ textTransform: 'none', borderRadius: '10px', bgcolor: 'grey.900', color: 'common.white', px: 3, '&:hover': { bgcolor: '#000' } }}>
                {step === 3 ? 'Finish' : 'Continue'}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Composer — speak / type / send, below the box */}
        <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 3, py: 1.5 }}>
          <Box sx={{ maxWidth: 620, mx: 'auto', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <IconButton size="small" onClick={() => fileInputRef.current?.click()} title="Attach a file" sx={{ color: 'text.secondary' }}><AttachFile /></IconButton>
            <IconButton size="small" onClick={triggerExtract} title="Speak" sx={{ color: 'text.secondary' }}><Mic /></IconButton>
            <TextField fullWidth size="small" placeholder="Speak or type what you have…"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); triggerExtract(); } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.85rem' } }} />
            <IconButton size="small" onClick={triggerExtract} disabled={loading} sx={{ color: 'text.primary' }}>
              {loading ? <CircularProgress size={20} /> : <Send />}
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// Editable "Add plots" card — mirrors the treatment approval card (assumptions in blue).
function PlotsCard({ plots, onUpdate, onAccept, onReject }: {
  plots: OnbPlot[];
  onUpdate: (i: number, field: keyof OnbPlot, value: string) => void;
  onAccept: () => void; onReject: () => void;
}) {
  const cols = 'minmax(120px,1.4fr) minmax(120px,1.2fr) minmax(100px,1fr) minmax(110px,1.1fr) minmax(150px,1.4fr) minmax(110px,1fr)';
  const headSx = { fontSize: '0.625rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.03em' } as const;
  const hasAssumed = plots.some(p => Object.values(p.meta).some(m => m === 'assumed'));
  return (
    <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden', borderColor: 'grey.900' }}>
      <Box sx={{ px: 1.5, pt: 1 }}>
        <Chip size="small" label={`${plots.length} plots found`} variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
      </Box>
      <Box sx={{ px: 1.5, pt: 1, pb: 0.5, overflowX: 'auto' }}>
        <Box sx={{ minWidth: 720 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: cols, gap: 0.75, alignItems: 'end', pb: 0.5, borderBottom: 1, borderColor: 'divider' }}>
            {['Plot name', 'Crop', 'Variety', 'Location', 'Owner', 'Season'].map(h => <Typography key={h} sx={headSx}>{h}</Typography>)}
          </Box>
          {plots.map((p, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: cols, gap: 0.75, alignItems: 'center', py: 0.5, borderBottom: i < plots.length - 1 ? 1 : 0, borderColor: 'divider' }}>
              <EditableTextField value={p.plotName} disabled={false} assumed={p.meta.plotName === 'assumed'} onChange={v => onUpdate(i, 'plotName', v)} />
              <EditableSelect value={p.crop} options={CROP_OPTIONS} disabled={false} assumed={p.meta.crop === 'assumed'} onChange={v => onUpdate(i, 'crop', v)} />
              <EditableTextField value={p.variety} disabled={false} assumed={p.meta.variety === 'assumed'} onChange={v => onUpdate(i, 'variety', v)} />
              <EditableTextField value={p.location} disabled={false} assumed={p.meta.location === 'assumed'} onChange={v => onUpdate(i, 'location', v)} />
              <EditableTextField value={p.owner} disabled={false} assumed={p.meta.owner === 'assumed'} onChange={v => onUpdate(i, 'owner', v)} />
              <EditableSelect value={p.season} options={SEASON_OPTIONS} disabled={false} assumed={p.meta.season === 'assumed'} onChange={v => onUpdate(i, 'season', v)} />
            </Box>
          ))}
        </Box>
      </Box>
      {hasAssumed && (
        <Box sx={{ px: 1.5, pt: 0.5 }}>
          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Blue = assumed values — edit before accepting.</Typography>
        </Box>
      )}
      <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 1 }}>
        <Button size="small" variant="contained" startIcon={<Check sx={{ fontSize: 16 }} />} onClick={onAccept}
          sx={{ fontSize: '0.75rem', textTransform: 'none', borderRadius: '8px', py: 0.25, bgcolor: 'grey.900', color: 'common.white', '&:hover': { bgcolor: '#000' } }}>Add plots</Button>
        <Button size="small" variant="outlined" color="inherit" startIcon={<Clear sx={{ fontSize: 16 }} />} onClick={onReject}
          sx={{ fontSize: '0.75rem', textTransform: 'none', borderRadius: '8px', py: 0.25, color: 'text.secondary' }}>Discard</Button>
      </Stack>
    </Paper>
  );
}

function Done({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 2, px: 1.5, py: 0.75, borderRadius: '8px', bgcolor: 'grey.100', border: 1, borderColor: 'divider' }}>
      <CheckCircle sx={{ fontSize: 18, color: 'text.primary' }} />
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>{label}</Typography>
    </Box>
  );
}
