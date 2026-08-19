import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, IconButton, Paper, Typography, TextField, Fade, CircularProgress,
  Button, Chip, Stack, MenuItem, Select, SelectChangeEvent, Menu, ListItemText, ListItemIcon,
} from '@mui/material';
import { Close, Mic, MicOff, Send, Check, Clear, ImageOutlined, AttachFile, AutoAwesome, Tune, RestartAlt } from '@mui/icons-material';
import { useAssistantLayout, setAssistantLayout, ASSISTANT_LAYOUTS } from '../data/assistant-layout';
import { pushCommand, VoiceCommand, AddTreatmentCommand } from '../data/voice-commands';
import { treatmentsData, usePlots, getPlots } from '../data/plots-data';
import { getLastOpenedPlot, focusPlotRow, useAssistantOpenSignal } from '../data/plot-focus';
import { router } from '../routes';

// ── Domain options (same as TreatmentsGrid) ──────────────────────────────────
const PRODUCT_OPTIONS = ['DECIS FLUX®', 'Roundup', 'Bumper 25 EC', 'Confidor', 'Karate Zeon', 'Copper oxychloride'];
const METHOD_OPTIONS = ['Foliar spray', 'Broadcast', 'Soil drench', 'Seed treatment', 'Drip irrigation'];
const DOSE_UNIT_OPTIONS = ['L/ha', 'kg/ha', 'ml/ha', 'g/ha'];
const VOLUME_UNIT_OPTIONS = ['L/ha', 'ml/ha', 'gal/ac'];

// ── Canned demo results ──────────────────────────────────────────────────────
// The empty-state "sample" chips return these pre-baked extractions instead of
// calling the API — so the demo is instant, free, and deterministic.
// CSV sample mirrors treatments.csv (7 active-substance rows).
const SAMPLE_CSV_COMMANDS: AddTreatmentCommand[] = [
  { action: 'addTreatment', date: '2025-04-12', product: 'Mancozeb', method: 'Foliar spray', productDoseValue: '1.5', productDoseUnit: 'L/ha', waterVolumeValue: '900', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-04-28', product: 'Glyphosate', method: 'Broadcast', productDoseValue: '1.8', productDoseUnit: 'L/ha', waterVolumeValue: '450', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-05-15', product: 'Imidacloprid', method: 'Soil drench', productDoseValue: '2', productDoseUnit: 'L/ha', waterVolumeValue: '1100', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-06-03', product: 'Captan', method: 'Foliar spray', productDoseValue: '0.8', productDoseUnit: 'L/ha', waterVolumeValue: '700', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-07-20', product: 'Tebuconazole', method: 'Foliar spray', productDoseValue: '0.6', productDoseUnit: 'L/ha', waterVolumeValue: '850', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-08-05', product: 'Chlorpyrifos', method: 'Soil drench', productDoseValue: '1.2', productDoseUnit: 'L/ha', waterVolumeValue: '1000', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-09-10', product: 'Lambda-cyhalothrin', method: 'Foliar spray', productDoseValue: '0.4', productDoseUnit: 'L/ha', waterVolumeValue: '550', waterVolumeUnit: 'L/ha' },
];
// Screenshot sample mirrors the AgriTrack Pro journal (8 trade-name rows).
const SAMPLE_SCREENSHOT_COMMANDS: AddTreatmentCommand[] = [
  { action: 'addTreatment', date: '2025-04-12', product: 'Mancozeb 80 WP', method: 'Foliar spray', productDoseValue: '1.5', productDoseUnit: 'kg/ha', waterVolumeValue: '900', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-04-28', product: 'Touchdown Quattro', method: 'Broadcast', productDoseValue: '1.8', productDoseUnit: 'L/ha', waterVolumeValue: '450', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-05-15', product: 'Confidor WG 70', method: 'Soil drench', productDoseValue: '2.0', productDoseUnit: 'L/ha', waterVolumeValue: '1100', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-06-03', product: 'Captan 80 WDG', method: 'Foliar spray', productDoseValue: '0.8', productDoseUnit: 'kg/ha', waterVolumeValue: '700', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-06-20', product: 'Folicur EW 250', method: 'Foliar spray', productDoseValue: '0.6', productDoseUnit: 'L/ha', waterVolumeValue: '850', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-07-05', product: 'Dursban 480 EC', method: 'Soil drench', productDoseValue: '1.2', productDoseUnit: 'L/ha', waterVolumeValue: '1000', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-07-22', product: 'Score 250 EC', method: 'Foliar spray', productDoseValue: '0.5', productDoseUnit: 'L/ha', waterVolumeValue: '750', waterVolumeUnit: 'L/ha' },
  { action: 'addTreatment', date: '2025-08-10', product: 'Karate Zeon', method: 'Foliar spray', productDoseValue: '0.4', productDoseUnit: 'L/ha', waterVolumeValue: '550', waterVolumeUnit: 'L/ha' },
];

// ── Types ────────────────────────────────────────────────────────────────────
/** Tracks which fields came from voice vs assumed from previous data */
interface FieldMeta {
  source: 'voice' | 'assumed';
}

interface EnrichedTreatment extends AddTreatmentCommand {
  fieldMeta: Record<string, FieldMeta>;
}

interface ChatEntry {
  id: number;
  role: 'user' | 'assistant' | 'pending';
  content: string;
  commands?: VoiceCommand[];
  enriched?: EnrichedTreatment[];
  status?: 'accepted' | 'rejected' | null;
  /** Where an extracted proposal came from, e.g. "📄 treatments.csv" or "📷 screenshot". */
  source?: string;
}

type LLMContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string | LLMContentBlock[];
}

let entryId = 0;

// ── Assumption logic ─────────────────────────────────────────────────────────

/** Get the current plot ID from the URL */
function getCurrentPlotId(): string | null {
  const m = window.location.pathname.match(/\/plot\/([^/]+)/);
  return m ? m[1] : null;
}

/** Get the most recent treatment on the current plot to use as defaults */
function getLastTreatment(): Record<string, string> | null {
  const plotId = getCurrentPlotId();
  if (!plotId) return null;
  const plotTreatments = treatmentsData
    .filter(t => t.plotId === plotId && t.product)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  if (plotTreatments.length === 0) return null;
  const last = plotTreatments[0];
  return {
    method: last.method,
    productDoseValue: last.productDoseValue,
    productDoseUnit: last.productDoseUnit || 'L/ha',
    waterVolumeValue: last.waterVolumeValue,
    waterVolumeUnit: last.waterVolumeUnit || 'L/ha',
  };
}

/** Enrich a command with assumptions from previous data.
 *  If fromImage=true, all provided fields are treated as explicit (not assumed). */
function enrichCommand(cmd: AddTreatmentCommand, fromImage = false): EnrichedTreatment {
  const last = getLastTreatment();
  const fieldMeta: Record<string, FieldMeta> = {};
  const enriched = { ...cmd, fieldMeta };

  // Fields the user explicitly provided
  const voiceFields = ['plotId', 'product', 'method', 'date', 'productDoseValue', 'productDoseUnit', 'waterVolumeValue', 'waterVolumeUnit'] as const;
  for (const f of voiceFields) {
    if (cmd[f]) {
      fieldMeta[f] = { source: 'voice' };
    }
  }

  // Plot: if the user didn't say which plot, assume the last-opened plot
  // (or the first plot in the list) and flag it as an assumption (blue).
  if (!enriched.plotId) {
    const assumedPlot = getCurrentPlotId() ?? getLastOpenedPlot() ?? getPlots()[0]?.id;
    if (assumedPlot) {
      enriched.plotId = assumedPlot;
      fieldMeta.plotId = { source: 'assumed' };
    }
  }

  // Fill missing fields from last treatment
  if (last) {
    if (!enriched.method && last.method) {
      enriched.method = last.method;
      fieldMeta.method = { source: 'assumed' };
    }
    if (!enriched.productDoseValue && last.productDoseValue) {
      enriched.productDoseValue = last.productDoseValue;
      fieldMeta.productDoseValue = { source: 'assumed' };
    }
    if (!enriched.productDoseUnit && last.productDoseUnit) {
      enriched.productDoseUnit = last.productDoseUnit;
      fieldMeta.productDoseUnit = { source: 'assumed' };
    }
    if (!enriched.waterVolumeValue && last.waterVolumeValue) {
      enriched.waterVolumeValue = last.waterVolumeValue;
      fieldMeta.waterVolumeValue = { source: 'assumed' };
    }
    if (!enriched.waterVolumeUnit && last.waterVolumeUnit) {
      enriched.waterVolumeUnit = last.waterVolumeUnit;
      fieldMeta.waterVolumeUnit = { source: 'assumed' };
    }
  }

  // Default date to today if missing
  if (!enriched.date) {
    enriched.date = new Date().toISOString().slice(0, 10);
    fieldMeta.date = { source: 'assumed' };
  }

  return enriched;
}

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a voice-controlled UI assistant for ResiYou, a crop-protection residue management app.

Your job: translate spoken user instructions into JSON commands the app can execute.

IMPORTANT: The user may say "accept", "approve", "yes", "confirm" or "reject", "no", "cancel", "discard" to approve/reject a pending command. When you detect this intent, respond with:
- {"action":"approve"} for acceptance
- {"action":"reject"} for rejection

For all other instructions, respond with a JSON object (or array of objects for multiple actions). After the JSON, add a short confirmation on a new line.

Available commands:

1. addTreatment — adds a treatment row to the current plot's grid
   {"action":"addTreatment", "product":"...", "method":"...", "date":"YYYY-MM-DD", "productDoseValue":"...", "productDoseUnit":"...", "waterVolumeValue":"...", "waterVolumeUnit":"..."}
   Only include fields the user explicitly mentioned. Missing fields will be auto-filled from previous treatments.
   Products: DECIS FLUX®, Roundup, Bumper 25 EC, Confidor, Karate Zeon, Copper oxychloride.
   Methods: Foliar spray, Broadcast, Soil drench, Seed treatment, Drip irrigation.
   Dose units: L/ha, kg/ha, ml/ha, g/ha. Water units: L/ha, ml/ha, gal/ac.

2. navigate — go to a page (use for "show me…" / "open…" queries; these are read-only so they run immediately)
   {"action":"navigate", "to":"/plot/1", "tab":0}  or  {"action":"navigate", "to":"/"}
   "to":"/" shows all plots. "to":"/plot/<id>" opens one plot; "tab" picks 0 = Treatments, 1 = Residue forecast, 2 = Samples & Reports.
   Resolve plot names/numbers to an id using the plot list below.
   Examples:
   - "Show me all plots" → {"action":"navigate","to":"/"}
   - "Show treatments for North Field A" → {"action":"navigate","to":"/plot/1","tab":0}
   - "Residue forecast for plot 2" → {"action":"navigate","to":"/plot/2","tab":1}
   - "Samples and reports for North Field A" → {"action":"navigate","to":"/plot/1","tab":2}

3. save — save current changes
   {"action":"save"}

4. message — when you can't map to a command, reply conversationally
   {"action":"message", "text":"..."}

Today's date: ${new Date().toISOString().slice(0, 10)}.

Examples:
User: "Add Roundup, foliar spray, 2 liters per hectare"
→ {"action":"addTreatment","product":"Roundup","method":"Foliar spray","productDoseValue":"2","productDoseUnit":"L/ha"}
Adding Roundup treatment.

User: "Add Confidor"
→ {"action":"addTreatment","product":"Confidor"}
Adding Confidor (other fields will be assumed from previous treatment).

User: "yes" / "accept"
→ {"action":"approve"}

User: "no" / "reject"
→ {"action":"reject"}

When the user sends an IMAGE (screenshot of a spray journal, treatment table, etc.):
- Analyze the image and extract ALL treatment/application rows visible in the table
- Return an array of addTreatment commands, one per row
- Include ALL fields you can read: product, method, date (as YYYY-MM-DD), productDoseValue, productDoseUnit, waterVolumeValue, waterVolumeUnit
- Use the exact product names and values shown in the image
- After the JSON array, add a summary like "Extracted 8 treatments from screenshot."
- Product names from screenshots may differ from our dropdown list — that's OK, include them as-is

When the user sends CSV TEXT (a spray-journal export):
- Treat the first row as headers and every following row as one treatment
- Map columns to the fields (application date → date as YYYY-MM-DD, product, method, product dose value + unit, water volume value + unit)
- Return one addTreatment command per data row, as a JSON array
- Only fill fields present in the CSV — leave the rest out so the app can auto-fill them
- After the JSON array, add a summary like "Extracted 7 treatments from CSV."`;

// ── LLM call ─────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

async function callLLM(messages: LLMMessage[], signal: AbortSignal): Promise<string> {
  if (ANTHROPIC_KEY) {
    const plotList = getPlots().map(p => `  ${p.id}: ${p.plotName}`).join('\n');
    const body = {
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}\n\nPlots (id: name) on the current account:\n${plotList}`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? '';
  }
  return '{"action":"message","text":"Add VITE_ANTHROPIC_API_KEY to .env to enable voice commands."}';
}

function parseResponse(text: string): { commands: VoiceCommand[]; display: string } {
  const trimmed = text.trim();
  const commands: VoiceCommand[] = [];
  let rest = trimmed;

  // Try to extract JSON — find the first { or [ and parse from there
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  const jsonStart = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket;

  if (jsonStart >= 0) {
    const jsonStr = trimmed.slice(jsonStart);
    // Try progressively shorter substrings to find valid JSON
    for (let end = jsonStr.length; end > 0; end--) {
      try {
        const candidate = jsonStr.slice(0, end);
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) commands.push(...parsed);
        else if (typeof parsed === 'object') commands.push(parsed);
        rest = trimmed.slice(0, jsonStart).trim() + ' ' + jsonStr.slice(end).trim();
        rest = rest.trim();
        break;
      } catch { continue; }
    }
  }

  let display = rest;
  if (!display && commands.length === 1 && commands[0].action === 'message') {
    display = (commands[0] as any).text;
  }
  return { commands, display };
}

// ── Speech recognition ───────────────────────────────────────────────────────
function useSpeechRecognition(onResult: (text: string, isFinal: boolean) => void) {
  const recogRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
    recog.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (final) onResult(final, true);
      else if (interim) onResult(interim, false);
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recog.start();
    recogRef.current = recog;
    setListening(true);
  }, [onResult]);
  const stop = useCallback(() => { recogRef.current?.stop(); recogRef.current = null; setListening(false); }, []);
  return { listening, start, stop };
}

// ── Editable field components ────────────────────────────────────────────────

const ASSUMED_BG = 'rgba(33, 150, 243, 0.08)';
const ASSUMED_BORDER = 'rgba(33, 150, 243, 0.3)';

function EditableTextField({ value, onChange, assumed, disabled }: {
  value: string; onChange: (v: string) => void; assumed: boolean; disabled: boolean;
}) {
  return (
    <TextField
      size="small" variant="outlined" value={value} disabled={disabled}
      onChange={e => onChange(e.target.value)}
      sx={{
        flex: 1, '& .MuiOutlinedInput-root': {
          fontSize: '0.75rem', height: 28, borderRadius: '6px',
          bgcolor: assumed ? ASSUMED_BG : 'transparent',
          '& fieldset': { borderColor: assumed ? ASSUMED_BORDER : undefined },
        },
      }}
    />
  );
}

function EditableSelect({ value, options, onChange, assumed, disabled }: {
  value: string; options: string[]; onChange: (v: string) => void; assumed: boolean; disabled: boolean;
}) {
  // Include current value in options if it's not in the predefined list (e.g. from screenshot)
  const allOptions = options.includes(value) || !value ? options : [value, ...options];
  return (
    <Select
      size="small" value={value} disabled={disabled}
      onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
      sx={{
        flex: 1, fontSize: '0.75rem', height: 28, borderRadius: '6px',
        bgcolor: assumed ? ASSUMED_BG : 'transparent',
        '& fieldset': { borderColor: assumed ? ASSUMED_BORDER : undefined },
      }}
    >
      {allOptions.map(o => <MenuItem key={o} value={o} sx={{ fontSize: '0.75rem' }}>{o}</MenuItem>)}
    </Select>
  );
}

// ── Table preview for an extracted list of treatments ────────────────────────
// Columns mirror the plot's treatments grid exactly, in the same order:
// Application date · Product · Method · Product dose · Dose unit · Water volume · Water unit
const TABLE_COLS = 'minmax(104px,1.3fr) minmax(140px,1.7fr) minmax(120px,1.5fr) minmax(76px,0.8fr) minmax(84px,0.8fr) minmax(84px,0.8fr) minmax(84px,0.8fr)';
const TABLE_MIN_WIDTH = 748;
const TABLE_HEADERS = ['Application date', 'Product', 'Method', 'Product dose', 'Dose unit', 'Water volume', 'Water unit'];

function TreatmentTable({ enrichedList, resolved, entryId, onUpdate }: {
  enrichedList: EnrichedTreatment[];
  resolved: boolean;
  entryId: number;
  onUpdate: (entryId: number, cmdIndex: number, field: string, value: string) => void;
}) {
  const headSx = { fontSize: '0.625rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.03em' } as const;
  const scroll = enrichedList.length > 6;
  return (
    <Box sx={{ px: 1.5, pt: 1, pb: 0.5, overflowX: 'auto' }}>
      <Box sx={{ minWidth: TABLE_MIN_WIDTH }}>
        {/* Header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: TABLE_COLS, gap: 0.75, alignItems: 'end', pb: 0.5, borderBottom: 1, borderColor: 'divider' }}>
          {TABLE_HEADERS.map(h => <Typography key={h} sx={headSx}>{h}</Typography>)}
        </Box>
        {/* Rows */}
        <Box sx={{ maxHeight: scroll ? 320 : undefined, overflowY: scroll ? 'auto' : undefined }}>
          {enrichedList.map((t, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: TABLE_COLS, gap: 0.75, alignItems: 'center', py: 0.5, borderBottom: i < enrichedList.length - 1 ? 1 : 0, borderColor: 'divider' }}>
              <EditableTextField value={t.date || ''} disabled={resolved} assumed={t.fieldMeta.date?.source === 'assumed'} onChange={v => onUpdate(entryId, i, 'date', v)} />
              <EditableSelect value={t.product || ''} options={PRODUCT_OPTIONS} disabled={resolved} assumed={t.fieldMeta.product?.source === 'assumed'} onChange={v => onUpdate(entryId, i, 'product', v)} />
              <EditableSelect value={t.method || ''} options={METHOD_OPTIONS} disabled={resolved} assumed={t.fieldMeta.method?.source === 'assumed'} onChange={v => onUpdate(entryId, i, 'method', v)} />
              <EditableTextField value={t.productDoseValue || ''} disabled={resolved} assumed={t.fieldMeta.productDoseValue?.source === 'assumed'} onChange={v => onUpdate(entryId, i, 'productDoseValue', v)} />
              <EditableSelect value={t.productDoseUnit || 'L/ha'} options={DOSE_UNIT_OPTIONS} disabled={resolved} assumed={t.fieldMeta.productDoseUnit?.source === 'assumed'} onChange={v => onUpdate(entryId, i, 'productDoseUnit', v)} />
              <EditableTextField value={t.waterVolumeValue || ''} disabled={resolved} assumed={t.fieldMeta.waterVolumeValue?.source === 'assumed'} onChange={v => onUpdate(entryId, i, 'waterVolumeValue', v)} />
              <EditableSelect value={t.waterVolumeUnit || 'L/ha'} options={VOLUME_UNIT_OPTIONS} disabled={resolved} assumed={t.fieldMeta.waterVolumeUnit?.source === 'assumed'} onChange={v => onUpdate(entryId, i, 'waterVolumeUnit', v)} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function EditablePlotSelect({ plotId, onChange, assumed, disabled }: {
  plotId: string; onChange: (v: string) => void; assumed: boolean; disabled: boolean;
}) {
  const plots = usePlots();
  return (
    <Select
      size="small" value={plots.some(p => p.id === plotId) ? plotId : ''} disabled={disabled}
      displayEmpty
      onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
      sx={{
        flex: 1, fontSize: '0.75rem', height: 28, borderRadius: '6px',
        bgcolor: assumed ? ASSUMED_BG : 'transparent',
        '& fieldset': { borderColor: assumed ? ASSUMED_BORDER : undefined },
      }}
    >
      {plots.map(p => <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.75rem' }}>{p.plotName}</MenuItem>)}
    </Select>
  );
}

// ── Pending card with editable fields ────────────────────────────────────────
function PendingCard({ entry, onAccept, onReject, onUpdate, onPlotChange }: {
  entry: ChatEntry;
  onAccept: () => void;
  onReject: () => void;
  onUpdate: (entryId: number, cmdIndex: number, field: string, value: string) => void;
  onPlotChange: (plotId: string) => void;
}) {
  const enrichedList = entry.enriched ?? [];
  const commands = entry.commands ?? [];
  const resolved = entry.status != null;
  const hasAssumptions = enrichedList.some(e => Object.values(e.fieldMeta).some(m => m.source === 'assumed'));
  const plotId = enrichedList[0]?.plotId ?? '';
  const plotAssumed = enrichedList[0]?.fieldMeta.plotId?.source === 'assumed';
  const plots = usePlots();
  const plotName = plots.find(p => p.id === plotId)?.plotName ?? '';
  // Accepting will browse to another plot unless we're already on it.
  const willNavigate = !resolved && enrichedList.length > 0 && !!plotId && getCurrentPlotId() !== plotId;

  return (
    <Paper variant="outlined" sx={{
      borderRadius: '10px', overflow: 'hidden',
      borderColor: resolved
        ? (entry.status === 'accepted' ? 'success.main' : 'text.disabled')
        : 'warning.main',
      opacity: resolved ? 0.7 : 1,
    }}>
      {/* Provenance — where this proposal came from */}
      {entry.source && (
        <Box sx={{ px: 1.5, pt: 1.25 }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            Source: <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{entry.source}</Box>
          </Typography>
        </Box>
      )}
      {/* Target plot — one selector for the whole proposal */}
      {enrichedList.length > 0 && (
        <Box sx={{ px: 1.5, pt: entry.source ? 0.75 : 1.25, pb: 0.25 }}>
          <FieldRow label="Plot" assumed={plotAssumed}>
            <EditablePlotSelect
              plotId={plotId} disabled={resolved} assumed={plotAssumed}
              onChange={onPlotChange}
            />
          </FieldRow>
        </Box>
      )}
      {enrichedList.length > 1 ? (
        <>
          <Box sx={{ px: 1.5, pt: 1 }}>
            <Chip size="small" label={`${enrichedList.length} treatments extracted`} color="primary" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
          </Box>
          <TreatmentTable enrichedList={enrichedList} resolved={resolved} entryId={entry.id} onUpdate={onUpdate} />
        </>
      ) : (
      <Box>
      {enrichedList.map((enriched, i) => (
        <Box key={i} sx={{ px: 1.5, pt: 1, pb: 0.5, borderTop: i > 0 ? 1 : 0, borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', mb: 0.75 }}>
            {enrichedList.length > 1 ? `Treatment ${i + 1}` : 'Add treatment'}
          </Typography>

          {/* Product */}
          <FieldRow label="Product" assumed={enriched.fieldMeta.product?.source === 'assumed'}>
            <EditableSelect
              value={enriched.product || ''} options={PRODUCT_OPTIONS} disabled={resolved}
              assumed={enriched.fieldMeta.product?.source === 'assumed'}
              onChange={v => onUpdate(entry.id, i, 'product', v)}
            />
          </FieldRow>

          {/* Method */}
          <FieldRow label="Method" assumed={enriched.fieldMeta.method?.source === 'assumed'}>
            <EditableSelect
              value={enriched.method || ''} options={METHOD_OPTIONS} disabled={resolved}
              assumed={enriched.fieldMeta.method?.source === 'assumed'}
              onChange={v => onUpdate(entry.id, i, 'method', v)}
            />
          </FieldRow>

          {/* Date */}
          <FieldRow label="Date" assumed={enriched.fieldMeta.date?.source === 'assumed'}>
            <EditableTextField
              value={enriched.date || ''} disabled={resolved}
              assumed={enriched.fieldMeta.date?.source === 'assumed'}
              onChange={v => onUpdate(entry.id, i, 'date', v)}
            />
          </FieldRow>

          {/* Dose */}
          <FieldRow label="Dose" assumed={enriched.fieldMeta.productDoseValue?.source === 'assumed'}>
            <EditableTextField
              value={enriched.productDoseValue || ''} disabled={resolved}
              assumed={enriched.fieldMeta.productDoseValue?.source === 'assumed'}
              onChange={v => onUpdate(entry.id, i, 'productDoseValue', v)}
            />
            <EditableSelect
              value={enriched.productDoseUnit || 'L/ha'} options={DOSE_UNIT_OPTIONS} disabled={resolved}
              assumed={enriched.fieldMeta.productDoseUnit?.source === 'assumed'}
              onChange={v => onUpdate(entry.id, i, 'productDoseUnit', v)}
            />
          </FieldRow>

          {/* Water volume */}
          <FieldRow label="Water" assumed={enriched.fieldMeta.waterVolumeValue?.source === 'assumed'}>
            <EditableTextField
              value={enriched.waterVolumeValue || ''} disabled={resolved}
              assumed={enriched.fieldMeta.waterVolumeValue?.source === 'assumed'}
              onChange={v => onUpdate(entry.id, i, 'waterVolumeValue', v)}
            />
            <EditableSelect
              value={enriched.waterVolumeUnit || 'L/ha'} options={VOLUME_UNIT_OPTIONS} disabled={resolved}
              assumed={enriched.fieldMeta.waterVolumeUnit?.source === 'assumed'}
              onChange={v => onUpdate(entry.id, i, 'waterVolumeUnit', v)}
            />
          </FieldRow>
        </Box>
      ))}
      </Box>
      )}
      {/* Non-treatment commands */}
      {commands.filter(c => c.action !== 'addTreatment').map((cmd, i) => (
        <Box key={`other-${i}`} sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary' }}>
            {cmd.action === 'navigate' ? `Navigate to ${(cmd as any).to}` : cmd.action === 'save' ? 'Save changes' : cmd.action}
          </Typography>
        </Box>
      ))}

      {/* Legend + buttons */}
      {!resolved && hasAssumptions && (
        <Box sx={{ px: 1.5, pt: 0.25 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 0.75, py: 0.25, borderRadius: '4px', bgcolor: ASSUMED_BG, border: `1px solid ${ASSUMED_BORDER}` }}>
            <Typography sx={{ fontSize: '0.625rem', color: 'info.main' }}>
              Blue = assumed (plot & fields auto-filled) — edit before accepting
            </Typography>
          </Box>
        </Box>
      )}

      {resolved ? (
        <Box sx={{ px: 1.5, py: 1 }}>
          <Chip
            size="small"
            label={entry.status === 'accepted' ? 'Accepted' : 'Rejected'}
            color={entry.status === 'accepted' ? 'success' : 'default'}
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 22 }}
          />
        </Box>
      ) : (
        <>
        {willNavigate && (
          <Box sx={{ px: 1.5, pt: 0.75 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'info.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              ↪ On accept, I'll open <strong>{plotName || 'the plot'}</strong> and add {enrichedList.length > 1 ? `these ${enrichedList.length} treatments` : 'this treatment'}.
            </Typography>
          </Box>
        )}
        <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 1 }}>
          <Button
            size="small" variant="contained" color="success"
            startIcon={<Check sx={{ fontSize: 16 }} />}
            onClick={onAccept}
            sx={{ fontSize: '0.75rem', textTransform: 'none', borderRadius: '8px', py: 0.25 }}
          >
            Accept
          </Button>
          <Button
            size="small" variant="outlined" color="inherit"
            startIcon={<Clear sx={{ fontSize: 16 }} />}
            onClick={onReject}
            sx={{ fontSize: '0.75rem', textTransform: 'none', borderRadius: '8px', py: 0.25, color: 'text.secondary' }}
          >
            Reject
          </Button>
        </Stack>
        </>
      )}
    </Paper>
  );
}

function FieldRow({ label, assumed, children }: { label: string; assumed: boolean; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', minWidth: 40, flexShrink: 0 }}>{label}</Typography>
      {children}
    </Box>
  );
}

// ── Empty-state capability row ────────────────────────────────────────────────
function CapabilityRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
      <Box sx={{
        width: 32, height: 32, flexShrink: 0, borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'grey.100', color: 'text.primary',
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.3 }}>{title}</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>{desc}</Typography>
      </Box>
    </Box>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const entriesRef = useRef<ChatEntry[]>(entries);
  entriesRef.current = entries;
  const loadingRef = useRef(false);
  const llmHistoryRef = useRef<LLMMessage[]>([]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  const findPendingEntry = useCallback((): ChatEntry | undefined => {
    return [...entriesRef.current].reverse().find(e => e.role === 'pending' && e.status == null);
  }, []);

  /** Update a field in an enriched command (user editing in the card) */
  const handleFieldUpdate = useCallback((entryId: number, cmdIndex: number, field: string, value: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId || !e.enriched) return e;
      const newEnriched = [...e.enriched];
      const updated = { ...newEnriched[cmdIndex], [field]: value };
      // Once the user edits an assumed field, mark it as voice (user-confirmed)
      updated.fieldMeta = { ...updated.fieldMeta, [field]: { source: 'voice' as const } };
      newEnriched[cmdIndex] = updated;
      // Also update the commands array to match
      const newCommands = [...(e.commands ?? [])];
      if (newCommands[cmdIndex]?.action === 'addTreatment') {
        newCommands[cmdIndex] = { ...newCommands[cmdIndex], [field]: value };
      }
      return { ...e, enriched: newEnriched, commands: newCommands };
    }));
  }, []);

  /** Retarget every treatment in a proposal to a different plot (one selector
   *  controls the whole card). Marks the plot as user-confirmed (no longer blue). */
  const handlePlotUpdate = useCallback((entryId: number, plotId: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId || !e.enriched) return e;
      const newEnriched = e.enriched.map(en => ({
        ...en, plotId,
        fieldMeta: { ...en.fieldMeta, plotId: { source: 'voice' as const } },
      }));
      const newCommands = (e.commands ?? []).map(c =>
        c.action === 'addTreatment' ? { ...c, plotId } : c);
      return { ...e, enriched: newEnriched, commands: newCommands };
    }));
  }, []);

  const acceptPending = useCallback((pendingEntryId?: number) => {
    const target = pendingEntryId != null
      ? entriesRef.current.find(e => e.id === pendingEntryId)
      : findPendingEntry();
    if (!target || target.status != null) return;

    target.status = 'accepted';
    setEntries([...entriesRef.current]);

    // Use enriched commands (with assumptions + user edits applied)
    const cmdsToExecute = (target.enriched ?? target.commands ?? []) as VoiceCommand[];
    const treatmentCmds = cmdsToExecute.filter(c => c.action === 'addTreatment') as AddTreatmentCommand[];
    const otherCmds = cmdsToExecute.filter(c => c.action !== 'addTreatment');

    for (const cmd of otherCmds) {
      if (cmd.action === 'navigate') runNavigate((cmd as any).to, (cmd as any).tab);
      else pushCommand(cmd);
    }

    if (treatmentCmds.length === 0) return;

    // The proposal's target plot (assumed = last-opened / first in list).
    const targetPlot = treatmentCmds[0].plotId ?? getLastOpenedPlot() ?? getPlots()[0]?.id;
    if (!targetPlot) return;

    // Already viewing that plot → add inline (existing row-pulse highlight).
    if (getCurrentPlotId() === targetPlot) {
      treatmentCmds.forEach(c => pushCommand(c));
      return;
    }

    // Otherwise browse into it: show the list, blink the plot row, then open it.
    router.navigate('/');
    setTimeout(() => focusPlotRow(targetPlot), 350);
    setTimeout(() => {
      treatmentCmds.forEach(c => pushCommand(c));
      router.navigate(`/plot/${targetPlot}`);
    }, 1600);
  }, [findPendingEntry]);

  const rejectPending = useCallback((pendingEntryId?: number) => {
    const target = pendingEntryId != null
      ? entriesRef.current.find(e => e.id === pendingEntryId)
      : findPendingEntry();
    if (!target || target.status != null) return;
    target.status = 'rejected';
    setEntries([...entriesRef.current]);
  }, [findPendingEntry]);

  /** Read-only navigation (optionally to a specific plot tab). */
  const runNavigate = useCallback((to: string, tab?: number) => {
    router.navigate(to, tab != null ? { state: { activeTab: tab } } : undefined);
  }, []);

  /** Empty-state "ask" chips: echo the query, navigate, and confirm — no API. */
  const runQuerySample = useCallback((label: string, to: string, tab: number | undefined, confirm: string) => {
    setEntries(prev => [...prev, { id: ++entryId, role: 'user', content: label }]);
    runNavigate(to, tab);
    setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: confirm }]);
  }, [runNavigate]);

  const doSend = useCallback(async (text: string) => {
    if (!text.trim() || loadingRef.current) return;
    const trimmed = text.trim();

    const userEntry: ChatEntry = { id: ++entryId, role: 'user', content: trimmed };
    setEntries(prev => [...prev, userEntry]);
    setInput('');
    setLoading(true);
    loadingRef.current = true;
    scrollToBottom();

    llmHistoryRef.current.push({ role: 'user', content: trimmed });
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const fullResponse = await callLLM(llmHistoryRef.current, abort.signal);
      llmHistoryRef.current.push({ role: 'assistant', content: fullResponse });
      const { commands, display } = parseResponse(fullResponse);

      const isApprove = commands.some(c => (c as any).action === 'approve');
      const isReject = commands.some(c => (c as any).action === 'reject');

      if (isApprove) {
        acceptPending();
        setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: display || 'Accepted.' }]);
      } else if (isReject) {
        rejectPending();
        setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: display || 'Rejected.' }]);
      } else {
        const actionCommands = commands.filter(c => c.action !== 'message');
        const messageCommands = commands.filter(c => c.action === 'message');

        // Navigation / "show me…" queries are read-only — run them immediately, no approval.
        const navCommands = actionCommands.filter(c => c.action === 'navigate');
        const pendable = actionCommands.filter(c => c.action !== 'navigate');
        for (const nav of navCommands) runNavigate((nav as any).to, (nav as any).tab);

        if (pendable.length > 0) {
          // Enrich addTreatment commands with assumptions
          const enriched = pendable
            .filter(c => c.action === 'addTreatment')
            .map(c => enrichCommand(c as AddTreatmentCommand));

          const pendingEntry: ChatEntry = {
            id: ++entryId,
            role: 'pending',
            content: display || '',
            commands: pendable,
            enriched: enriched.length > 0 ? enriched : undefined,
            status: null,
          };
          setEntries(prev => [...prev, pendingEntry]);
        }

        if (display && pendable.length === 0) {
          setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: display }]);
        } else if (messageCommands.length > 0) {
          const msgText = messageCommands.map(c => (c as any).text).join('\n');
          if (msgText) setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: msgText }]);
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: `Error: ${e.message}` }]);
      }
    }

    setLoading(false);
    loadingRef.current = false;
    scrollToBottom();
  }, [acceptPending, rejectPending]);

  // ── File drop / paste handling (images + CSV) ─────────────────────────────
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<{ data: string; mediaType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const data = result.split(',')[1];
        resolve({ data, mediaType: file.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /** Run one extraction turn (image or CSV) through the LLM and show a pending card.
   *  Extracted rows are enriched so any field the extractor couldn't read is
   *  auto-filled from the last treatment and highlighted blue. */
  const runExtraction = useCallback(async (
    userLabel: string,
    llmContent: string | LLMContentBlock[],
    fallbackSummary: string,
    source: string,
  ) => {
    if (loadingRef.current) return;
    setEntries(prev => [...prev, { id: ++entryId, role: 'user', content: userLabel }]);
    setLoading(true);
    loadingRef.current = true;
    scrollToBottom();

    llmHistoryRef.current.push({ role: 'user', content: llmContent });
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const fullResponse = await callLLM(llmHistoryRef.current, abort.signal);
      llmHistoryRef.current.push({ role: 'assistant', content: fullResponse });
      const { commands, display } = parseResponse(fullResponse);

      const actionCommands = commands.filter(c => c.action === 'addTreatment');
      const messageCommands = commands.filter(c => c.action === 'message');

      if (actionCommands.length > 0) {
        const enriched = actionCommands.map(c => enrichCommand(c as AddTreatmentCommand, true));
        setEntries(prev => [...prev, {
          id: ++entryId,
          role: 'pending',
          content: display || fallbackSummary,
          commands: actionCommands,
          enriched,
          status: null,
          source,
        }]);
      } else {
        const msg = display || messageCommands.map(c => (c as any).text).join('\n');
        if (msg) setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: msg }]);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: `Error: ${e.message}` }]);
      }
    }

    setLoading(false);
    loadingRef.current = false;
    scrollToBottom();
  }, []);

  const handleImageAnalysis = useCallback(async (file: File) => {
    const { data, mediaType } = await fileToBase64(file);
    runExtraction(
      `📷 ${file.name || 'Screenshot'}`,
      [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        { type: 'text', text: 'Extract all treatment/application rows from this image and return them as addTreatment commands.' },
      ],
      'Extracted treatments from screenshot.',
      `📷 ${file.name || 'screenshot'}`,
    );
  }, [runExtraction]);

  const handleCsvAnalysis = useCallback(async (file: File) => {
    const text = await file.text();
    runExtraction(
      `📄 ${file.name}`,
      `Here is a CSV export of a spray journal. Extract every data row as an addTreatment command.\n\n${text}`,
      'Extracted treatments from CSV.',
      `📄 ${file.name}`,
    );
  }, [runExtraction]);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) handleImageAnalysis(file);
    else if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv') || file.type.startsWith('text/')) handleCsvAnalysis(file);
  }, [handleImageAnalysis, handleCsvAnalysis]);

  /** Demo sample chips: return a canned extraction — no API call. */
  const runSample = useCallback((source: string, cmds: AddTreatmentCommand[]) => {
    if (loadingRef.current) return;
    setEntries(prev => [...prev, { id: ++entryId, role: 'user', content: source }]);
    setLoading(true);
    loadingRef.current = true;
    scrollToBottom();
    // Brief beat so it reads as "processing", then show the pre-baked proposal.
    setTimeout(() => {
      const enriched = cmds.map(c => enrichCommand(c, true));
      setEntries(prev => [...prev, {
        id: ++entryId,
        role: 'pending',
        content: `Extracted ${cmds.length} treatments.`,
        commands: cmds,
        enriched,
        status: null,
        source,
      }]);
      setLoading(false);
      loadingRef.current = false;
      scrollToBottom();
    }, 650);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); handleImageAnalysis(file); return; }
      }
    }
  }, [handleImageAnalysis]);

  const handleSpeechResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) { setInterimText(''); doSend(text); }
    else setInterimText(text);
  }, [doSend]);

  const { listening, start: startListening, stop: stopListening } = useSpeechRecognition(handleSpeechResult);

  const sendMessage = () => { stopListening(); setInterimText(''); doSend(input); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /** Reset the conversation back to the initial empty state. */
  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    llmHistoryRef.current = [];
    setEntries([]);
    setInput('');
    setInterimText('');
    setLoading(false);
    loadingRef.current = false;
    stopListening();
  }, [stopListening]);

  useEffect(() => { return () => abortRef.current?.abort(); }, []);

  // F4: inline entry points (e.g. the Treatments toolbar) can open the assistant.
  const openSignal = useAssistantOpenSignal();
  useEffect(() => { if (openSignal > 0) setOpen(true); }, [openSignal]);

  // Widen the panel once an extracted list (>1 treatment) is on screen
  const wide = entries.some(e => (e.enriched?.length ?? 0) > 1);

  // Switchable layout: floating (bubble) / sidebar (right rail) / inline (bottom console)
  const layout = useAssistantLayout();
  const [layoutAnchor, setLayoutAnchor] = useState<null | HTMLElement>(null);
  const sidebarWidth = wide ? 820 : 400;

  // Sidebar pushes the page content left so the assistant doesn't overlap it.
  // (Inline overlays the bottom as a sheet — the app shell is a fixed 100vh
  // column, so padding-bottom there would spawn a page scrollbar.)
  useEffect(() => {
    const b = document.body;
    b.style.transition = 'padding 0.25s ease';
    b.style.paddingRight = open && layout === 'sidebar' ? `${sidebarWidth}px` : '';
    return () => { b.style.paddingRight = ''; };
  }, [open, layout, sidebarWidth]);

  const shellSx = layout === 'sidebar'
    ? { top: 0, right: 0, bottom: 0, width: sidebarWidth, maxWidth: '100vw', borderRadius: 0, borderLeft: 1, borderColor: 'divider' as const }
    : layout === 'inline'
    ? { left: 0, right: 0, bottom: 0, height: '48vh', borderRadius: 0, borderTop: 1, borderColor: 'divider' as const }
    : { right: 16, bottom: 80, width: wide ? 880 : 420, maxWidth: 'calc(100vw - 32px)', height: 600, borderRadius: '12px' };

  return (
    <>
      {/* Click-away backdrop only for the floating bubble; docked modes coexist with content */}
      {open && layout === 'floating' && (
        <Box onClick={() => setOpen(false)} sx={{ position: 'fixed', inset: 0, zIndex: 1290 }} />
      )}

      <Fade in={open}>
        <Paper
          elevation={8}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
          sx={{
            position: 'fixed', zIndex: 1300,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            transition: 'width 0.25s ease, height 0.25s ease',
            ...shellSx,
            ...(dragging && { outline: '2px dashed', outlineColor: 'primary.main', outlineOffset: '-2px' }),
          }}
        >
          {/* Header */}
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 700 }}>Assistant</Typography>
            {entries.length > 0 && (
              <IconButton size="small" onClick={handleReset} title="Reset conversation">
                <RestartAlt fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small" onClick={e => setLayoutAnchor(e.currentTarget)} title="Layout">
              <Tune fontSize="small" />
            </IconButton>
            <Menu anchorEl={layoutAnchor} open={Boolean(layoutAnchor)} onClose={() => setLayoutAnchor(null)}>
              {ASSISTANT_LAYOUTS.map(opt => (
                <MenuItem
                  key={opt.id} selected={layout === opt.id}
                  onClick={() => { setAssistantLayout(opt.id); setLayoutAnchor(null); }}
                >
                  <ListItemIcon>{layout === opt.id ? <Check fontSize="small" /> : null}</ListItemIcon>
                  <ListItemText primary={opt.label} secondary={opt.hint} />
                </MenuItem>
              ))}
            </Menu>
            <IconButton size="small" onClick={() => setOpen(false)}><Close fontSize="small" /></IconButton>
          </Box>

          {/* Drop overlay */}
          {dragging && (
            <Box sx={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.92)', gap: 1,
            }}>
              <ImageOutlined sx={{ fontSize: 48, color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>Drop screenshot or CSV here</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                We'll extract treatments from the file
              </Typography>
            </Box>
          )}

          {/* Entries */}
          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {entries.length === 0 && (
              <Box sx={{ mt: 2, px: 0.5 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{
                    width: 52, height: 52, borderRadius: '50%', mx: 'auto',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: 'rgba(212, 24, 61, 0.08)',
                  }}>
                    <AutoAwesome sx={{ color: 'primary.main', fontSize: 26 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mt: 1.25 }}>How can I help?</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.5 }}>
                    Speak, type, or drop a file — I'll turn it into treatments for you to review.
                  </Typography>
                </Box>

                <Stack spacing={1.5} sx={{ mt: 3 }}>
                  <CapabilityRow icon={<Mic sx={{ fontSize: 18 }} />} title="Speak or type a command" desc="“Add Roundup, 2 litres per hectare”" />
                  <CapabilityRow icon={<AttachFile sx={{ fontSize: 18 }} />} title="Drop a screenshot or CSV" desc="Extract a whole spray journal at once" />
                  <CapabilityRow icon={<Check sx={{ fontSize: 18 }} />} title="Review, then accept" desc="Anything I guessed is shown in blue" />
                </Stack>

                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 3, mb: 1 }}>Try one:</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {['Add Roundup 2 L/ha', 'Add Confidor, soil drench', 'Add DECIS FLUX®'].map(ex => (
                    <Chip
                      key={ex} label={ex} size="small" variant="outlined" clickable
                      onClick={() => doSend(ex)}
                      sx={{ fontSize: '0.72rem', height: 26, borderRadius: '8px' }}
                    />
                  ))}
                </Stack>

                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 2, mb: 1 }}>Or import a sample:</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    icon={<AttachFile sx={{ fontSize: 15 }} />} label="CSV example" size="small"
                    variant="outlined" color="primary" clickable
                    onClick={() => runSample('📄 treatments.csv', SAMPLE_CSV_COMMANDS)}
                    sx={{ fontSize: '0.72rem', height: 26, borderRadius: '8px' }}
                  />
                  <Chip
                    icon={<ImageOutlined sx={{ fontSize: 15 }} />} label="Screenshot example" size="small"
                    variant="outlined" color="primary" clickable
                    onClick={() => runSample('📷 farm-ui-screenshot.png', SAMPLE_SCREENSHOT_COMMANDS)}
                    sx={{ fontSize: '0.72rem', height: 26, borderRadius: '8px' }}
                  />
                </Stack>

                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 2, mb: 1 }}>Or ask to see something:</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {[
                    { label: 'Show me all plots', to: '/', tab: undefined as number | undefined, confirm: 'Here are all your plots.' },
                    { label: 'Treatments for North Field A', to: '/plot/1', tab: 0, confirm: 'Opening North Field A — Treatments.' },
                    { label: 'Residue forecast for North Field A', to: '/plot/1', tab: 1, confirm: 'Opening North Field A — Residue forecast.' },
                    { label: 'Samples & reports for North Field A', to: '/plot/1', tab: 2, confirm: 'Opening North Field A — Samples & Reports.' },
                  ].map(q => (
                    <Chip
                      key={q.label} label={q.label} size="small" variant="outlined" clickable
                      onClick={() => runQuerySample(q.label, q.to, q.tab, q.confirm)}
                      sx={{ fontSize: '0.72rem', height: 26, borderRadius: '8px' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
            {entries.map((entry) => {
              if (entry.role === 'pending') {
                return (
                  <Box key={entry.id} sx={{ alignSelf: 'flex-start', width: '100%', maxWidth: '100%' }}>
                    <PendingCard
                      entry={entry}
                      onAccept={() => acceptPending(entry.id)}
                      onReject={() => rejectPending(entry.id)}
                      onUpdate={handleFieldUpdate}
                      onPlotChange={(plotId) => handlePlotUpdate(entry.id, plotId)}
                    />
                  </Box>
                );
              }
              return (
                <Box key={entry.id} sx={{
                  alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}>
                  <Paper variant="outlined" sx={{
                    px: 1.5, py: 1, borderRadius: '10px',
                    bgcolor: entry.role === 'user' ? 'primary.main' : 'grey.100',
                    color: entry.role === 'user' ? 'white' : 'text.primary',
                    borderColor: entry.role === 'user' ? 'primary.main' : 'divider',
                  }}>
                    <Typography sx={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
                      {entry.content}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
            {loading && (
              <Box sx={{ alignSelf: 'flex-start' }}>
                <CircularProgress size={18} sx={{ color: 'text.secondary' }} />
              </Box>
            )}
          </Box>

          {/* Interim speech */}
          {interimText && (
            <Box sx={{ px: 2, pb: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>
                {interimText}
              </Typography>
            </Box>
          )}

          {/* Input bar */}
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.csv,text/csv"
              hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              sx={{ color: 'text.secondary' }}
              title="Attach screenshot or CSV"
            >
              <AttachFile />
            </IconButton>
            <IconButton
              size="small"
              onClick={listening ? stopListening : startListening}
              sx={{
                color: listening ? 'error.main' : 'text.secondary',
                animation: listening ? 'pulse 1.5s ease-in-out infinite' : 'none',
                '@keyframes pulse': { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.15)' } },
              }}
            >
              {listening ? <Mic /> : <MicOff />}
            </IconButton>
            <TextField
              fullWidth size="small" multiline maxRows={3}
              placeholder={listening ? 'Listening…' : 'Type a command…'}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.8125rem' } }}
            />
            <IconButton size="small" onClick={sendMessage} disabled={!input.trim() || loading} color="primary">
              {loading ? <CircularProgress size={20} /> : <Send />}
            </IconButton>
          </Box>
        </Paper>
      </Fade>

      {/* FAB — always bottom-right, toggles the assistant in every layout */}
      <IconButton
        onClick={() => setOpen(o => !o)}
        sx={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 1500,
          bgcolor: 'primary.main', color: 'white',
          width: 48, height: 48, boxShadow: 3,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        {open ? <Close /> : <AutoAwesome />}
      </IconButton>
    </>
  );
}
