import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, IconButton, Paper, Typography, TextField, Fade, CircularProgress,
  Button, Chip, Stack,
} from '@mui/material';
import { Close, Mic, MicOff, Send, Check, Clear } from '@mui/icons-material';
import { pushCommand, VoiceCommand, AddTreatmentCommand } from '../data/voice-commands';
import { router } from '../routes';

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatEntry {
  id: number;
  role: 'user' | 'assistant' | 'pending';
  content: string;
  /** Pending commands awaiting approval */
  commands?: VoiceCommand[];
  /** Status of approval: null = awaiting, 'accepted' | 'rejected' */
  status?: 'accepted' | 'rejected' | null;
}

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

let entryId = 0;

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
   All fields optional. Products: DECIS FLUX®, Roundup, Bumper 25 EC, Confidor, Karate Zeon, Copper oxychloride.
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

User: "Add Confidor on March 1st and Karate Zeon on March 15th"
→ [{"action":"addTreatment","product":"Confidor","date":"2026-03-01"},{"action":"addTreatment","product":"Karate Zeon","date":"2026-03-15"}]
Adding 2 treatments.

User: "yes" / "accept" / "approve" / "confirm"
→ {"action":"approve"}

User: "no" / "reject" / "cancel" / "discard"
→ {"action":"reject"}`;

// ── LLM call ─────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

async function callLLM(
  messages: LLMMessage[],
  signal: AbortSignal,
): Promise<string> {
  if (ANTHROPIC_KEY) {
    const body = {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
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
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? '';
  }

  // Mock
  return '{"action":"message","text":"Add VITE_ANTHROPIC_API_KEY to .env to enable voice commands."}';
}

/** Parse Claude's response into commands + display text */
function parseResponse(text: string): { commands: VoiceCommand[]; display: string } {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/^(\{[\s\S]*?\}|\[[\s\S]*?\])/);
  const commands: VoiceCommand[] = [];
  let rest = trimmed;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) commands.push(...parsed);
      else commands.push(parsed);
      rest = trimmed.slice(jsonMatch[1].length).trim();
    } catch { /* treat as plain text */ }
  }

  let display = rest;
  if (!display && commands.length === 1 && commands[0].action === 'message') {
    display = (commands[0] as any).text;
  }

  return { commands, display };
}

/** Format a treatment command as a readable preview */
function formatTreatmentPreview(cmd: AddTreatmentCommand): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  if (cmd.product) fields.push({ label: 'Product', value: cmd.product });
  if (cmd.method) fields.push({ label: 'Method', value: cmd.method });
  if (cmd.date) fields.push({ label: 'Date', value: cmd.date });
  if (cmd.productDoseValue) {
    fields.push({ label: 'Dose', value: `${cmd.productDoseValue} ${cmd.productDoseUnit || 'L/ha'}` });
  }
  if (cmd.waterVolumeValue) {
    fields.push({ label: 'Water', value: `${cmd.waterVolumeValue} ${cmd.waterVolumeUnit || 'L/ha'}` });
  }
  return fields;
}

function formatCommandPreview(cmd: VoiceCommand): string {
  if (cmd.action === 'addTreatment') return 'Add treatment';
  if (cmd.action === 'navigate') return `Navigate to ${(cmd as any).to}`;
  if (cmd.action === 'save') return 'Save changes';
  return cmd.action;
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
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += transcript;
        else interim += transcript;
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

  const stop = useCallback(() => {
    recogRef.current?.stop();
    recogRef.current = null;
    setListening(false);
  }, []);

  return { listening, start, stop };
}

// ── Pending command card ─────────────────────────────────────────────────────
function PendingCard({ entry, onAccept, onReject }: {
  entry: ChatEntry;
  onAccept: () => void;
  onReject: () => void;
}) {
  const commands = entry.commands ?? [];
  const resolved = entry.status != null;

  return (
    <Paper variant="outlined" sx={{
      borderRadius: '10px', overflow: 'hidden',
      borderColor: resolved
        ? (entry.status === 'accepted' ? 'success.main' : 'text.disabled')
        : 'warning.main',
      opacity: resolved ? 0.7 : 1,
    }}>
      {commands.map((cmd, i) => (
        <Box key={i} sx={{ px: 1.5, pt: 1, pb: commands.length > 1 && i < commands.length - 1 ? 0.5 : 0 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
            {formatCommandPreview(cmd)}
          </Typography>
          {cmd.action === 'addTreatment' && (
            <Stack spacing={0.25}>
              {formatTreatmentPreview(cmd as AddTreatmentCommand).map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 48 }}>{label}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{value}</Typography>
                </Box>
              ))}
            </Stack>
          )}
          {cmd.action === 'navigate' && (
            <Typography sx={{ fontSize: '0.75rem' }}>→ {(cmd as any).to}</Typography>
          )}
        </Box>
      ))}

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

  /** Find the most recent pending entry (status === null) */
  const findPendingEntry = useCallback((): ChatEntry | undefined => {
    return [...entriesRef.current].reverse().find(e => e.role === 'pending' && e.status == null);
  }, []);

  const acceptPending = useCallback((pendingEntryId?: number) => {
    const target = pendingEntryId != null
      ? entriesRef.current.find(e => e.id === pendingEntryId)
      : findPendingEntry();
    if (!target || target.status != null) return;

    target.status = 'accepted';
    setEntries([...entriesRef.current]);

    // Execute commands
    for (const cmd of target.commands ?? []) {
      if (cmd.action === 'navigate') {
        router.navigate((cmd as any).to);
      } else {
        pushCommand(cmd);
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

    // Add user entry
    const userEntry: ChatEntry = { id: ++entryId, role: 'user', content: trimmed };
    setEntries(prev => [...prev, userEntry]);
    setInput('');
    setLoading(true);
    loadingRef.current = true;
    scrollToBottom();

    // Add to LLM history
    llmHistoryRef.current.push({ role: 'user', content: trimmed });

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const fullResponse = await callLLM(llmHistoryRef.current, abort.signal);
      llmHistoryRef.current.push({ role: 'assistant', content: fullResponse });

      const { commands, display } = parseResponse(fullResponse);

      // Check for approve/reject voice commands
      const isApprove = commands.some(c => (c as any).action === 'approve');
      const isReject = commands.some(c => (c as any).action === 'reject');

      if (isApprove) {
        acceptPending();
        const confirmEntry: ChatEntry = { id: ++entryId, role: 'assistant', content: display || 'Accepted.' };
        setEntries(prev => [...prev, confirmEntry]);
      } else if (isReject) {
        rejectPending();
        const confirmEntry: ChatEntry = { id: ++entryId, role: 'assistant', content: display || 'Rejected.' };
        setEntries(prev => [...prev, confirmEntry]);
      } else {
        // Filter actionable commands (not message)
        const actionCommands = commands.filter(c => c.action !== 'message');
        const messageCommands = commands.filter(c => c.action === 'message');

        if (actionCommands.length > 0) {
          // Show pending card for approval
          const pendingEntry: ChatEntry = {
            id: ++entryId,
            role: 'pending',
            content: display || '',
            commands: actionCommands,
            status: null,
          };
          setEntries(prev => [...prev, pendingEntry]);
        }

        // Show any message text
        if (display && actionCommands.length === 0) {
          const msgEntry: ChatEntry = { id: ++entryId, role: 'assistant', content: display };
          setEntries(prev => [...prev, msgEntry]);
        } else if (messageCommands.length > 0) {
          const msgText = messageCommands.map(c => (c as any).text).join('\n');
          if (msgText) {
            const msgEntry: ChatEntry = { id: ++entryId, role: 'assistant', content: msgText };
            setEntries(prev => [...prev, msgEntry]);
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const errEntry: ChatEntry = { id: ++entryId, role: 'assistant', content: `Error: ${e.message}` };
        setEntries(prev => [...prev, errEntry]);
      }
    }

    setLoading(false);
    loadingRef.current = false;
    scrollToBottom();
  }, [acceptPending, rejectPending]);

  const handleSpeechResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setInterimText('');
      doSend(text);
    } else {
      setInterimText(text);
    }
  }, [doSend]);

  const { listening, start: startListening, stop: stopListening } = useSpeechRecognition(handleSpeechResult);

  const sendMessage = () => {
    stopListening();
    setInterimText('');
    doSend(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <Box sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1300 }}>
      {open && <Box onClick={() => setOpen(false)} sx={{ position: 'fixed', inset: 0 }} />}

      <Fade in={open}>
        <Paper elevation={8} sx={{
          position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
          width: 380, height: 520, display: 'flex', flexDirection: 'column',
          borderRadius: '12px', overflow: 'hidden',
        }}>
          {/* Header */}
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 700 }}>Voice Control</Typography>
            <IconButton size="small" onClick={() => setOpen(false)}><Close fontSize="small" /></IconButton>
          </Box>

          {/* Entries */}
          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {entries.length === 0 && (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem', textAlign: 'center', mt: 4, whiteSpace: 'pre-wrap' }}>
                {'Tap the mic and speak to control the app.\n\nTry: "Add a treatment with Roundup, foliar spray, 2 liters per hectare"\n\nAll changes need your approval before they are applied.'}
              </Typography>
            )}
            {entries.map((entry) => {
              if (entry.role === 'pending') {
                return (
                  <Box key={entry.id} sx={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
                    <PendingCard
                      entry={entry}
                      onAccept={() => acceptPending(entry.id)}
                      onReject={() => rejectPending(entry.id)}
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
              fullWidth
              size="small"
              multiline
              maxRows={3}
              placeholder={listening ? 'Listening…' : 'Type a command…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
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
