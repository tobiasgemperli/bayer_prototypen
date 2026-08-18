import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, IconButton, Paper, Typography, TextField, Fade, CircularProgress,
  Button, Chip, Stack, MenuItem, Select, SelectChangeEvent,
} from '@mui/material';
import { Close, Mic, MicOff, Send, Check, Clear, ImageOutlined } from '@mui/icons-material';
import { pushCommand, VoiceCommand, AddTreatmentCommand } from '../data/voice-commands';
import { treatmentsData } from '../data/plots-data';
import { router } from '../routes';

// ── Domain options (same as TreatmentsGrid) ──────────────────────────────────
const PRODUCT_OPTIONS = ['DECIS FLUX®', 'Roundup', 'Bumper 25 EC', 'Confidor', 'Karate Zeon', 'Copper oxychloride'];
const METHOD_OPTIONS = ['Foliar spray', 'Broadcast', 'Soil drench', 'Seed treatment', 'Drip irrigation'];
const DOSE_UNIT_OPTIONS = ['L/ha', 'kg/ha', 'ml/ha', 'g/ha'];
const VOLUME_UNIT_OPTIONS = ['L/ha', 'ml/ha', 'gal/ac'];

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
  const voiceFields = ['product', 'method', 'date', 'productDoseValue', 'productDoseUnit', 'waterVolumeValue', 'waterVolumeUnit'] as const;
  for (const f of voiceFields) {
    if (cmd[f]) {
      fieldMeta[f] = { source: 'voice' };
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

2. navigate — go to a page
   {"action":"navigate", "to":"/plot/1"}  or  {"action":"navigate", "to":"/"}

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
- Product names from screenshots may differ from our dropdown list — that's OK, include them as-is`;

// ── LLM call ─────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

async function callLLM(messages: LLMMessage[], signal: AbortSignal): Promise<string> {
  if (ANTHROPIC_KEY) {
    const body = {
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
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

// ── Pending card with editable fields ────────────────────────────────────────
function PendingCard({ entry, onAccept, onReject, onUpdate }: {
  entry: ChatEntry;
  onAccept: () => void;
  onReject: () => void;
  onUpdate: (entryId: number, cmdIndex: number, field: string, value: string) => void;
}) {
  const enrichedList = entry.enriched ?? [];
  const commands = entry.commands ?? [];
  const resolved = entry.status != null;
  const hasAssumptions = enrichedList.some(e => Object.values(e.fieldMeta).some(m => m.source === 'assumed'));

  return (
    <Paper variant="outlined" sx={{
      borderRadius: '10px', overflow: 'hidden',
      borderColor: resolved
        ? (entry.status === 'accepted' ? 'success.main' : 'text.disabled')
        : 'warning.main',
      opacity: resolved ? 0.7 : 1,
    }}>
      {enrichedList.length > 1 && (
        <Box sx={{ px: 1.5, pt: 1 }}>
          <Chip size="small" label={`${enrichedList.length} treatments`} color="primary" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
        </Box>
      )}
      <Box sx={{ maxHeight: enrichedList.length > 2 ? 300 : undefined, overflowY: enrichedList.length > 2 ? 'auto' : undefined }}>
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
              Blue = assumed from previous treatment
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

  const acceptPending = useCallback((pendingEntryId?: number) => {
    const target = pendingEntryId != null
      ? entriesRef.current.find(e => e.id === pendingEntryId)
      : findPendingEntry();
    if (!target || target.status != null) return;

    target.status = 'accepted';
    setEntries([...entriesRef.current]);

    // Use enriched commands (with assumptions + user edits applied)
    const cmdsToExecute = target.enriched ?? target.commands ?? [];
    for (const cmd of cmdsToExecute) {
      if (cmd.action === 'navigate') {
        router.navigate((cmd as any).to);
      } else {
        pushCommand(cmd as VoiceCommand);
      }
    }
  }, [findPendingEntry]);

  const rejectPending = useCallback((pendingEntryId?: number) => {
    const target = pendingEntryId != null
      ? entriesRef.current.find(e => e.id === pendingEntryId)
      : findPendingEntry();
    if (!target || target.status != null) return;
    target.status = 'rejected';
    setEntries([...entriesRef.current]);
  }, [findPendingEntry]);

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

        if (actionCommands.length > 0) {
          // Enrich addTreatment commands with assumptions
          const enriched = actionCommands
            .filter(c => c.action === 'addTreatment')
            .map(c => enrichCommand(c as AddTreatmentCommand));

          const pendingEntry: ChatEntry = {
            id: ++entryId,
            role: 'pending',
            content: display || '',
            commands: actionCommands,
            enriched: enriched.length > 0 ? enriched : undefined,
            status: null,
          };
          setEntries(prev => [...prev, pendingEntry]);
        }

        if (display && actionCommands.length === 0) {
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

  // ── Image drop / paste handling ───────────────────────────────────────────
  const [dragging, setDragging] = useState(false);

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

  const handleImageAnalysis = useCallback(async (file: File) => {
    if (loadingRef.current) return;
    const { data, mediaType } = await fileToBase64(file);

    // Show image thumbnail as user entry
    const thumbUrl = URL.createObjectURL(file);
    const userEntry: ChatEntry = { id: ++entryId, role: 'user', content: `📷 Screenshot dropped` };
    setEntries(prev => [...prev, userEntry]);
    setLoading(true);
    loadingRef.current = true;
    scrollToBottom();

    // Build message with image for Claude Vision
    const imageMessage: LLMMessage = {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        { type: 'text', text: 'Extract all treatment/application rows from this screenshot and return them as addTreatment commands.' },
      ],
    };
    llmHistoryRef.current.push(imageMessage);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const fullResponse = await callLLM(llmHistoryRef.current, abort.signal);
      llmHistoryRef.current.push({ role: 'assistant', content: fullResponse });
      const { commands, display } = parseResponse(fullResponse);

      const actionCommands = commands.filter(c => c.action === 'addTreatment');
      const messageCommands = commands.filter(c => c.action === 'message');

      if (actionCommands.length > 0) {
        // All fields from image are explicit — mark as 'voice' source
        const enriched = actionCommands.map(c => {
          const cmd = c as AddTreatmentCommand;
          const fieldMeta: Record<string, FieldMeta> = {};
          for (const f of ['product', 'method', 'date', 'productDoseValue', 'productDoseUnit', 'waterVolumeValue', 'waterVolumeUnit'] as const) {
            if (cmd[f]) fieldMeta[f] = { source: 'voice' };
          }
          return { ...cmd, fieldMeta } as EnrichedTreatment;
        });

        const pendingEntry: ChatEntry = {
          id: ++entryId,
          role: 'pending',
          content: display || `Extracted ${actionCommands.length} treatments from screenshot.`,
          commands: actionCommands,
          enriched,
          status: null,
        };
        setEntries(prev => [...prev, pendingEntry]);
      }

      if (display && actionCommands.length === 0) {
        setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: display }]);
      } else if (messageCommands.length > 0) {
        const msgText = messageCommands.map(c => (c as any).text).join('\n');
        if (msgText) setEntries(prev => [...prev, { id: ++entryId, role: 'assistant', content: msgText }]);
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageAnalysis(file);
    }
  }, [handleImageAnalysis]);

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

  useEffect(() => { return () => abortRef.current?.abort(); }, []);

  return (
    <Box sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1300 }}>
      {open && <Box onClick={() => setOpen(false)} sx={{ position: 'fixed', inset: 0 }} />}

      <Fade in={open}>
        <Paper
          elevation={8}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
          sx={{
            position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
            width: 420, height: 600, display: 'flex', flexDirection: 'column',
            borderRadius: '12px', overflow: 'hidden',
            border: dragging ? '2px dashed' : undefined,
            borderColor: dragging ? 'primary.main' : undefined,
          }}
        >
          {/* Header */}
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 700 }}>Voice Control</Typography>
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
              <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>Drop screenshot here</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                We'll extract treatments from the image
              </Typography>
            </Box>
          )}

          {/* Entries */}
          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {entries.length === 0 && (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem', textAlign: 'center', mt: 4, whiteSpace: 'pre-wrap' }}>
                {'Tap the mic and speak to control the app.\n\nTry: "Add a treatment with Roundup"\n\nYou can also drop a screenshot of a spray journal to extract treatments automatically.\n\nMissing fields are auto-filled from previous treatments (shown in blue). Edit any field before accepting.'}
              </Typography>
            )}
            {entries.map((entry) => {
              if (entry.role === 'pending') {
                return (
                  <Box key={entry.id} sx={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
                    <PendingCard
                      entry={entry}
                      onAccept={() => acceptPending(entry.id)}
                      onReject={() => rejectPending(entry.id)}
                      onUpdate={handleFieldUpdate}
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

      {/* FAB */}
      <IconButton
        onClick={() => setOpen(o => !o)}
        sx={{
          bgcolor: 'primary.main', color: 'white',
          width: 48, height: 48, boxShadow: 3,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        {open ? <Close /> : <Mic />}
      </IconButton>
    </Box>
  );
}
