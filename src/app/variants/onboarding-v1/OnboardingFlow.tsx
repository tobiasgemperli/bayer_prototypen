import React, { useState, useRef } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, TextField, CircularProgress, Chip, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import {
  CloudUploadOutlined, AttachFile, Mic, Send, CheckCircle, ArrowBack, AutoAwesome,
} from '@mui/icons-material';
import {
  enrichCommand, PendingCard, SAMPLE_CSV_COMMANDS,
  type EnrichedTreatment, type ChatEntry,
} from '../../main/ChatAssistant';
import { addPlot, updateTreatments, getPlots, PlotData, TreatmentData } from '../../data/plots-data';
import { useOnboardingStep, setOnboardingStep, ONB_TITLES } from '../../data/onboarding-flow';
import { launchPrototype } from '../../data/prototypes';

const HEADER_H = 56;
let oid = 0;

// Canned extractions — deterministic, no API cost.
const CANNED_PLOTS = [
  { plotName: 'Orchard East', crop: 'Pome fruits', variety: 'Gala', location: 'Zone 6' },
  { plotName: 'Berry Field 3', crop: 'Strawberries', variety: 'Elsanta', location: 'Zone 6' },
  { plotName: 'Stone Hill', crop: 'Stone fruits', variety: 'Regina', location: 'Zone 7' },
];
const CANNED_SAMPLES = [
  { sampleCode: 'ONB-1042', sampleName: 'Pre-harvest screen', date: 'Jun 15, 2026', commodity: 'Fruit', laboratory: 'Bureau Veritas Switzerland' },
  { sampleCode: 'ONB-1043', sampleName: 'Soil residue check', date: 'Jun 18, 2026', commodity: 'Soil', laboratory: 'SGS' },
];

const STEP_COPY = [
  { q: 'What plots do you have?', hint: 'Drop a farm export or a screenshot and I’ll pull out your plots. You can also speak or type them.' },
  { q: 'What treatments have you applied?', hint: 'Drop a spray journal (CSV or screenshot) and I’ll extract every application for you to review.' },
  { q: 'Do you have sample data to share?', hint: 'Drop your lab reports and I’ll list the samples. Speak or type works too.' },
];

export function OnboardingFlow() {
  const step = useOnboardingStep();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [plots, setPlots] = useState<typeof CANNED_PLOTS | null>(null);
  const [plotsAdded, setPlotsAdded] = useState(0);
  const [pending, setPending] = useState<ChatEntry | null>(null);
  const [txAdded, setTxAdded] = useState(0);
  const [samples, setSamples] = useState<typeof CANNED_SAMPLES | null>(null);
  const [samplesAdded, setSamplesAdded] = useState(0);

  // Any input (drop / attach / mic / send) triggers the current step's extraction.
  const triggerExtract = () => {
    if (loading) return;
    setInput('');
    setLoading(true);
    setTimeout(() => {
      if (step === 1) setPlots(CANNED_PLOTS);
      else if (step === 2) setPending({
        id: ++oid, role: 'pending', content: '', commands: SAMPLE_CSV_COMMANDS,
        enriched: SAMPLE_CSV_COMMANDS.map(c => enrichCommand(c, true)), status: null, source: '📄 spray-journal.csv',
      });
      else if (step === 3) setSamples(CANNED_SAMPLES);
      setLoading(false);
    }, 600);
  };

  // ── Step 1: plots ───────────────────────────────────────────────────────────
  const acceptPlots = () => {
    if (!plots) return;
    plots.forEach(p => addPlot({
      plotName: p.plotName, owner: 'lyle.peterer@bayer.com', variety: p.variety, location: p.location,
      crop: p.crop, season: 'Spring 2024', lastTreatment: null, plantingDate: null,
    } as Omit<PlotData, 'id'>));
    setPlotsAdded(plots.length);
    setPlots(null);
  };

  // ── Step 2: treatments (reuses the real approval card) ────────────────────────
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

  // ── Step 3: samples ───────────────────────────────────────────────────────────
  const acceptSamples = () => { if (!samples) return; setSamplesAdded(samples.length); setSamples(null); };

  const next = () => setOnboardingStep(Math.min(4, step + 1) as any);
  const back = () => setOnboardingStep(Math.max(1, step - 1) as any);
  const finish = () => launchPrototype('assistant-floating');

  const head = { fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' };
  const cell = { fontSize: '0.82rem' };

  // ── Finish screen ─────────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <Shell>
        <Box sx={{ textAlign: 'center', maxWidth: 520, mx: 'auto', mt: 6 }}>
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
      </Shell>
    );
  }

  const copy = STEP_COPY[step - 1];

  return (
    <Shell>
      {/* Progress */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
        {ONB_TITLES.map((tl, i) => (
          <Box key={tl} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700,
              bgcolor: i + 1 < step ? 'success.main' : i + 1 === step ? 'grey.900' : 'grey.200',
              color: i + 1 <= step ? 'common.white' : 'text.secondary',
            }}>{i + 1 < step ? '✓' : i + 1}</Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: i + 1 === step ? 700 : 500, color: i + 1 === step ? 'text.primary' : 'text.secondary' }}>{tl}</Typography>
            {i < ONB_TITLES.length - 1 && <Box sx={{ width: 28, height: 1, bgcolor: 'divider', mx: 0.5 }} />}
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
          borderRadius: '14px', p: 3, borderStyle: 'dashed', borderWidth: 2,
          borderColor: dragging ? 'grey.900' : 'divider',
          bgcolor: dragging ? 'action.hover' : 'background.paper',
          textAlign: 'center', transition: 'border-color .12s, background-color .12s',
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/*,.csv,text/csv,application/pdf" hidden
          onChange={e => { if (e.target.files?.length) triggerExtract(); e.target.value = ''; }} />
        <CloudUploadOutlined sx={{ fontSize: 40, color: 'text.secondary' }} />
        <Typography sx={{ fontWeight: 600, mt: 1 }}>Drop files here</Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>CSV, screenshot or PDF — or use the options below</Typography>

        {/* Always: drop / speak / write */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mt: 2, maxWidth: 560, mx: 'auto' }}>
          <IconButton size="small" onClick={() => fileInputRef.current?.click()} title="Attach a file" sx={{ color: 'text.secondary' }}><AttachFile /></IconButton>
          <IconButton size="small" onClick={triggerExtract} title="Speak" sx={{ color: 'text.secondary' }}><Mic /></IconButton>
          <TextField fullWidth size="small" placeholder="…or type what you have"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); triggerExtract(); } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.85rem' } }} />
          <IconButton size="small" onClick={triggerExtract} disabled={loading} sx={{ color: 'text.primary' }}>
            {loading ? <CircularProgress size={20} /> : <Send />}
          </IconButton>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <Chip icon={<AutoAwesome sx={{ fontSize: 15 }} />} label={`Use example ${['plots', 'spray journal', 'lab reports'][step - 1]}`}
            size="small" variant="outlined" clickable onClick={triggerExtract} sx={{ borderRadius: '8px' }} />
        </Box>
      </Paper>

      {/* Extracted preview */}
      {step === 1 && plots && (
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ ...head, mb: 0.75 }}>{plots.length} plots found</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell sx={head}>Plot</TableCell><TableCell sx={head}>Crop</TableCell><TableCell sx={head}>Variety</TableCell><TableCell sx={head}>Location</TableCell>
              </TableRow></TableHead>
              <TableBody>{plots.map(p => (
                <TableRow key={p.plotName} hover>
                  <TableCell sx={cell}>{p.plotName}</TableCell><TableCell sx={cell}>{p.crop}</TableCell><TableCell sx={cell}>{p.variety}</TableCell><TableCell sx={cell}>{p.location}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </TableContainer>
          <Button variant="contained" onClick={acceptPlots} sx={{ mt: 1.5, textTransform: 'none', borderRadius: '8px', bgcolor: 'grey.900', color: 'common.white', '&:hover': { bgcolor: '#000' } }}>Add {plots.length} plots</Button>
        </Box>
      )}
      {step === 1 && plotsAdded > 0 && !plots && <Done label={`${plotsAdded} plots added`} />}

      {step === 2 && pending && (
        <Box sx={{ mt: 3 }}>
          <PendingCard entry={pending} onAccept={acceptTreatments} onReject={() => setPending(p => p ? { ...p, status: 'rejected' } : p)} onUpdate={updateField} onPlotChange={(plotId) => updatePlot(pending.id, plotId)} />
        </Box>
      )}
      {step === 2 && txAdded > 0 && <Done label={`${txAdded} treatments added`} />}

      {step === 3 && samples && (
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ ...head, mb: 0.75 }}>{samples.length} samples found</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell sx={head}>Sample code</TableCell><TableCell sx={head}>Name</TableCell><TableCell sx={head}>Date</TableCell><TableCell sx={head}>Commodity</TableCell><TableCell sx={head}>Laboratory</TableCell>
              </TableRow></TableHead>
              <TableBody>{samples.map(s => (
                <TableRow key={s.sampleCode} hover>
                  <TableCell sx={cell}>{s.sampleCode}</TableCell><TableCell sx={cell}>{s.sampleName}</TableCell><TableCell sx={cell}>{s.date}</TableCell><TableCell sx={cell}>{s.commodity}</TableCell><TableCell sx={cell}>{s.laboratory}</TableCell>
                </TableRow>
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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ position: 'fixed', top: HEADER_H, left: 0, right: 0, bottom: 0, zIndex: 1100, bgcolor: 'background.default', overflowY: 'auto' }}>
      <Box sx={{ maxWidth: 720, mx: 'auto', px: 3, py: 5 }}>{children}</Box>
    </Box>
  );
}

function Done({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 2, px: 1.5, py: 0.75, borderRadius: '8px', bgcolor: 'success.50', border: 1, borderColor: 'success.light' }}>
      <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'success.dark' }}>{label}</Typography>
    </Box>
  );
}
