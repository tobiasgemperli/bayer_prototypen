import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, CircularProgress, Chip, Stack, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Dialog, DialogContent,
} from '@mui/material';
import { Send, AttachFile, RestartAlt, AutoAwesome, OpenInNew, HelpOutline } from '@mui/icons-material';
import {
  callLLM, parseResponse, enrichCommand, PendingCard,
  SAMPLE_CSV_COMMANDS, SAMPLE_SCREENSHOT_COMMANDS,
  type EnrichedTreatment, type ChatEntry,
} from '../../main/ChatAssistant';
import { VoiceCommand, AddTreatmentCommand } from '../../data/voice-commands';
import {
  usePlots, getPlots, treatmentsData, useTreatmentsVersion, updateTreatments, TreatmentData,
} from '../../data/plots-data';
import { useChatFirstMode, setChatFirstMode } from '../../data/chat-first';
import { useLabSamples } from '../../data/lab-results-data';
import { router } from '../../routes';

const HEADER_H = 56;
let wid = 0;

const plotName = (id?: string) => getPlots().find(p => p.id === id)?.plotName ?? 'plot';
const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d) : '—';
const prettyDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return fmtDate(new Date(y, m - 1, d)); };
/** Does a plot owner (e.g. "john.smith@bayer.com") match a person query (e.g. "John Smith")? */
const matchOwner = (owner: string, query: string) => {
  const o = owner.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every(tok => o.includes(tok));
};
/** Resolve a plot id or name (e.g. "West Valley") to its id. */
const resolvePlot = (q: string): string | undefined => {
  const plots = getPlots();
  return plots.find(p => p.id === q)?.id ?? plots.find(p => p.plotName.toLowerCase().includes(q.toLowerCase()))?.id;
};
/** Find a plot whose name appears anywhere in a free-form sentence. */
const plotIdFromText = (text: string): string | undefined => {
  const lower = text.toLowerCase();
  return getPlots().find(p => lower.includes(p.plotName.toLowerCase()))?.id;
};

// ── Inline result blocks ─────────────────────────────────────────────────────
interface Block { kind: 'treatments' | 'plots' | 'samples' | 'open-ui'; title: string; plotId?: string; date?: string; owner?: string; tab?: number }

function SamplesBlock({ plotId }: { plotId?: string }) {
  const samples = useLabSamples().filter(s => (plotId ? s.plotId === plotId : true));
  const showPlot = !plotId;
  const head = { fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', bgcolor: 'grey.50' };
  const cell = { fontSize: '0.8rem' };
  return (
    <TableContainer sx={{ maxHeight: 340 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {showPlot && <TableCell sx={head}>Plot</TableCell>}
            <TableCell sx={head}>Sample code</TableCell>
            <TableCell sx={head}>Name</TableCell>
            <TableCell sx={head}>Date of sample</TableCell>
            <TableCell sx={head}>Commodity</TableCell>
            <TableCell sx={head}>Laboratory</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {samples.length === 0 ? (
            <TableRow><TableCell colSpan={showPlot ? 6 : 5} sx={{ color: 'text.secondary' }}>No samples yet.</TableCell></TableRow>
          ) : samples.map(s => (
            <TableRow key={s.id} hover>
              {showPlot && <TableCell sx={cell}>{plotName(s.plotId)}</TableCell>}
              <TableCell sx={cell}>{s.sampleCode || '—'}</TableCell>
              <TableCell sx={cell}>{s.sampleName || '—'}</TableCell>
              <TableCell sx={cell}>{fmtDate(s.dateOfSample)}</TableCell>
              <TableCell sx={cell}>{s.commodity || '—'}</TableCell>
              <TableCell sx={cell}>{s.laboratory || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TreatmentsBlock({ plotId, date, owner }: { plotId?: string; date?: string; owner?: string }) {
  useTreatmentsVersion(); // re-render when treatments change (e.g. after an accept)
  const plots = getPlots();
  const ownerOf = (pid: string) => plots.find(p => p.id === pid)?.owner ?? '';
  let rows = treatmentsData.filter(t => t.product);
  if (plotId) rows = rows.filter(t => t.plotId === plotId);
  if (date) rows = rows.filter(t => t.date.toISOString().slice(0, 10) === date);
  if (owner) rows = rows.filter(t => matchOwner(ownerOf(t.plotId), owner));
  const showPlot = !plotId;
  const head = { fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', bgcolor: 'grey.50' };
  const cell = { fontSize: '0.8rem' };
  return (
    <TableContainer sx={{ maxHeight: 340 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {showPlot && <TableCell sx={head}>Plot</TableCell>}
            <TableCell sx={head}>Application date</TableCell>
            <TableCell sx={head}>Product</TableCell>
            <TableCell sx={head}>Method</TableCell>
            <TableCell sx={head}>Dose</TableCell>
            <TableCell sx={head}>Water</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={showPlot ? 6 : 5} sx={{ color: 'text.secondary' }}>No treatments yet.</TableCell></TableRow>
          ) : rows.map(t => (
            <TableRow key={t.id} hover>
              {showPlot && <TableCell sx={cell}>{plotName(t.plotId)}</TableCell>}
              <TableCell sx={cell}>{fmtDate(t.date)}</TableCell>
              <TableCell sx={cell}>{t.product}</TableCell>
              <TableCell sx={cell}>{t.method}</TableCell>
              <TableCell sx={cell}>{t.productDoseValue} {t.productDoseUnit}</TableCell>
              <TableCell sx={cell}>{t.waterVolumeValue} {t.waterVolumeUnit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function PlotsBlock() {
  const plots = usePlots();
  const head = { fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', bgcolor: 'grey.50' };
  const cell = { fontSize: '0.8rem' };
  return (
    <TableContainer sx={{ maxHeight: 340 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={head}>Plot</TableCell>
            <TableCell sx={head}>Owner</TableCell>
            <TableCell sx={head}>Variety</TableCell>
            <TableCell sx={head}>Last real treatment</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plots.map(p => (
            <TableRow key={p.id} hover>
              <TableCell sx={cell}>{p.plotName}</TableCell>
              <TableCell sx={cell}>{p.owner}</TableCell>
              <TableCell sx={cell}>{p.variety || '—'}</TableCell>
              <TableCell sx={cell}>{fmtDate(p.lastTreatment)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** "Open in ResiYou" link shown under every read-only table. */
function OpenInUi({ to, tab }: { to: string; tab?: number }) {
  return (
    <Box sx={{ mt: 0.75 }}>
      <Button
        size="small" startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
        onClick={() => { setChatFirstMode('ui'); router.navigate(to, tab != null ? { state: { activeTab: tab } } : undefined); }}
        sx={{ textTransform: 'none', color: 'text.secondary', fontSize: '0.75rem', borderRadius: '8px' }}
      >
        Open in ResiYou
      </Button>
    </Box>
  );
}

/** A titled card for an inline result — gray header bar + framed, padded body. */
function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', borderColor: 'grey.400' }}>
      <Box sx={{ px: 2, py: 1.25, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'grey.300' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{title}</Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>{children}</Box>
    </Paper>
  );
}

// ── Workspace ────────────────────────────────────────────────────────────────
interface WEntry {
  id: number;
  role: 'user' | 'assistant' | 'pending' | 'block';
  content: string;
  commands?: VoiceCommand[];
  enriched?: EnrichedTreatment[];
  status?: 'accepted' | 'rejected' | null;
  source?: string;
  block?: Block;
}

export function ChatFirstWorkspace() {
  const mode = useChatFirstMode();
  const [entries, setEntries] = useState<WEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const entriesRef = useRef<WEntry[]>(entries);
  entriesRef.current = entries;
  const llmHistoryRef = useRef<{ role: 'user' | 'assistant'; content: any }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  const add = (e: Omit<WEntry, 'id'>) => { setEntries(prev => [...prev, { id: ++wid, ...e }]); scrollToBottom(); };

  // ── Result actions ─────────────────────────────────────────────────────────
  const showTreatments = (opts: { plotId?: string; date?: string; owner?: string } = {}) => {
    const title = opts.date ? `Treatments on ${prettyDate(opts.date)}`
      : opts.owner ? `Treatments by ${opts.owner}`
      : opts.plotId ? `Treatments — ${plotName(opts.plotId)}`
      : 'All treatments';
    add({ role: 'block', content: '', block: { kind: 'treatments', plotId: opts.plotId, date: opts.date, owner: opts.owner, title } });
  };
  const showPlots = () => add({ role: 'block', content: '', block: { kind: 'plots', title: 'All plots' } });
  const showSamples = (plotId?: string) =>
    add({ role: 'block', content: '', block: { kind: 'samples', plotId, title: plotId ? `Samples — ${plotName(plotId)}` : 'All samples' } });

  const enrichAll = (cmds: AddTreatmentCommand[]) => cmds.map(c => enrichCommand(c, true));

  const runSample = (source: string, cmds: AddTreatmentCommand[]) => {
    if (loadingRef.current) return;
    add({ role: 'user', content: source });
    setLoading(true); loadingRef.current = true;
    setTimeout(() => {
      add({ role: 'pending', content: `Extracted ${cmds.length} treatments.`, commands: cmds, enriched: enrichAll(cmds), status: null, source });
      setLoading(false); loadingRef.current = false;
    }, 600);
  };

  // Translate the assistant's read-only navigate commands into inline results.
  const handleNavigate = (to: string, tab?: number) => {
    if (to === '/') { showPlots(); return; }
    const pid = to.match(/\/plot\/([^/?]+)/)?.[1];
    if (tab === 1 || tab === 2) {
      add({ role: 'block', content: '', block: { kind: 'open-ui', plotId: pid, tab, title: tab === 1 ? `Residue forecast — ${plotName(pid)}` : `Samples & reports — ${plotName(pid)}` } });
    } else {
      showTreatments({ plotId: pid });
    }
  };

  const runLLM = async (userLabel: string, llmContent: any, source?: string) => {
    if (loadingRef.current) return;
    add({ role: 'user', content: userLabel });
    setLoading(true); loadingRef.current = true;
    llmHistoryRef.current.push({ role: 'user', content: llmContent });
    try {
      const res = await callLLM(llmHistoryRef.current as any, new AbortController().signal);
      llmHistoryRef.current.push({ role: 'assistant', content: res });
      const { commands, display } = parseResponse(res);
      const adds = commands.filter(c => c.action === 'addTreatment') as AddTreatmentCommand[];
      const navs = commands.filter(c => c.action === 'navigate');
      navs.forEach(n => handleNavigate((n as any).to, (n as any).tab));
      if (adds.length > 0) {
        add({ role: 'pending', content: display || `${adds.length} treatment(s)`, commands: adds, enriched: enrichAll(adds), status: null, source });
      } else if (navs.length === 0) {
        const msg = display || commands.filter(c => c.action === 'message').map(c => (c as any).text).join('\n');
        if (msg) add({ role: 'assistant', content: msg });
      }
    } catch (e: any) {
      add({ role: 'assistant', content: `Error: ${e.message}` });
    }
    setLoading(false); loadingRef.current = false;
  };

  // Handle "show/find" queries client-side (instant, no API): plots, all
  // treatments, treatments on a date, or treatments by a person.
  const handleLocalQuery = (text: string): boolean => {
    const lower = text.toLowerCase();
    const isQuery = /^(show|find|list|display|which|what)\b/i.test(text.trim()) || lower.includes('show me') || lower.includes('find ') || lower.includes('sample');
    if (!isQuery) return false;
    if (lower.includes('sample')) { add({ role: 'user', content: text }); showSamples(plotIdFromText(text)); return true; }
    if (lower.includes('plot') && !lower.includes('treatment')) { add({ role: 'user', content: text }); showPlots(); return true; }
    const by = text.match(/\bby\s+([A-Za-z][A-Za-z .'-]+)/);
    if (by) { add({ role: 'user', content: text }); showTreatments({ owner: by[1].trim().replace(/[?.!]+$/, '') }); return true; }
    const dmy = text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (dmy) {
      const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      const iso = `${y}-${String(+dmy[2]).padStart(2, '0')}-${String(+dmy[1]).padStart(2, '0')}`;
      add({ role: 'user', content: text }); showTreatments({ date: iso }); return true;
    }
    if (lower.includes('treatment')) { add({ role: 'user', content: text }); showTreatments(); return true; }
    return false;
  };

  const doSend = (text: string) => {
    const t = text.trim();
    if (!t || loadingRef.current) return;
    setInput('');
    if (handleLocalQuery(t)) return;
    runLLM(t, t);
  };

  // ── File import ─────────────────────────────────────────────────────────────
  const fileToBase64 = (file: File): Promise<{ data: string; mediaType: string }> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ data: (r.result as string).split(',')[1], mediaType: file.type });
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  const handleFile = async (file: File) => {
    if (file.type.startsWith('image/')) {
      const { data, mediaType } = await fileToBase64(file);
      runLLM(`📷 ${file.name}`, [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        { type: 'text', text: 'Extract all treatment rows from this image as addTreatment commands.' },
      ], `📷 ${file.name}`);
    } else {
      const text = await file.text();
      runLLM(`📄 ${file.name}`, `Here is a CSV export of a spray journal. Extract every data row as an addTreatment command.\n\n${text}`, `📄 ${file.name}`);
    }
  };

  // ── Proposal card handlers ──────────────────────────────────────────────────
  const updateField = useCallback((entryId: number, i: number, field: string, value: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId || !e.enriched) return e;
      const enriched = [...e.enriched];
      enriched[i] = { ...enriched[i], [field]: value, fieldMeta: { ...enriched[i].fieldMeta, [field]: { source: 'voice' } } };
      return { ...e, enriched };
    }));
  }, []);
  const updatePlot = useCallback((entryId: number, plotId: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId || !e.enriched) return e;
      const enriched = e.enriched.map(en => ({ ...en, plotId, fieldMeta: { ...en.fieldMeta, plotId: { source: 'voice' as const } } }));
      return { ...e, enriched };
    }));
  }, []);
  const accept = useCallback((entryId: number) => {
    const entry = entriesRef.current.find(e => e.id === entryId);
    if (!entry || entry.status != null || !entry.enriched) return;
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: 'accepted' } : e));
    const cmds = entry.enriched;
    const plotId = cmds[0]?.plotId ?? getPlots()[0]?.id;
    const toAdd: TreatmentData[] = cmds.map((c, i) => ({
      id: `cf-${Date.now()}-${i}`,
      plotId: c.plotId || plotId!,
      date: c.date ? new Date(c.date) : new Date(),
      product: c.product || '', method: c.method || '',
      productDoseValue: c.productDoseValue || '', productDoseUnit: c.productDoseUnit || 'L/ha',
      waterVolumeValue: c.waterVolumeValue || '', waterVolumeUnit: c.waterVolumeUnit || 'L/ha',
      type: 'Real',
    }));
    updateTreatments(toAdd);
    add({ role: 'assistant', content: `Added ${toAdd.length} treatment${toAdd.length !== 1 ? 's' : ''} to ${plotName(plotId)}.` });
    showTreatments({ plotId });
  }, []);
  const reject = useCallback((entryId: number) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: 'rejected' } : e));
  }, []);

  const reset = () => { llmHistoryRef.current = []; setEntries([]); setInput(''); setLoading(false); loadingRef.current = false; };

  useEffect(() => { scrollToBottom(); }, [entries.length]);

  // Sample prompts — shared by the empty state and the "Examples" dialog.
  // All are canned (deterministic, no API cost); only free-form typing calls the LLM.
  const [helpOpen, setHelpOpen] = useState(false);
  // Echo the request as a user bubble, then run the (read-only) action.
  const echo = (label: string, action: () => void) => { add({ role: 'user', content: label }); action(); };
  const primarySamples: { label: string; run: () => void }[] = [
    { label: 'Show me all treatments', run: () => echo('Show me all treatments', () => showTreatments()) },
    { label: 'Show me all plots', run: () => echo('Show me all plots', () => showPlots()) },
    { label: 'Find treatments on 20 Mar 2024', run: () => echo('Find treatments on 20 Mar 2024', () => showTreatments({ date: '2024-03-20' })) },
    { label: 'Find treatments by John Smith', run: () => echo('Find treatments by John Smith', () => showTreatments({ owner: 'John Smith' })) },
    { label: 'Show me all samples of West Valley', run: () => echo('Show me all samples of West Valley', () => showSamples(resolvePlot('West Valley'))) },
    { label: 'Add Roundup 2 L/ha', run: () => runSample('Add Roundup 2 L/ha', [{ action: 'addTreatment', product: 'Roundup', productDoseValue: '2', productDoseUnit: 'L/ha' }] as AddTreatmentCommand[]) },
    { label: 'Add Confidor, soil drench', run: () => runSample('Add Confidor, soil drench', [{ action: 'addTreatment', product: 'Confidor', method: 'Soil drench' }] as AddTreatmentCommand[]) },
  ];
  const importSamples: { label: string; run: () => void }[] = [
    { label: 'Import CSV example', run: () => runSample('📄 treatments.csv', SAMPLE_CSV_COMMANDS) },
    { label: 'Import screenshot example', run: () => runSample('📷 farm-ui-screenshot.png', SAMPLE_SCREENSHOT_COMMANDS) },
  ];

  // UI mode: the assistant steps aside and the normal app shows underneath.
  if (mode === 'ui') return null;

  return (
    <Box sx={{ position: 'fixed', top: HEADER_H, left: 0, right: 0, bottom: 0, zIndex: 1100, bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar: examples help + reset */}
      <Box sx={{ px: 2, pt: 1.5 }}>
        <Box sx={{ maxWidth: 860, mx: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, minHeight: 32 }}>
          {entries.length > 0 && (
            <Button size="small" startIcon={<RestartAlt />} onClick={reset}
              sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: '8px' }}>
              New chat
            </Button>
          )}
          <Button size="small" startIcon={<HelpOutline />} onClick={() => setHelpOpen(true)}
            sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: '8px' }}>
            Examples
          </Button>
          <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: '14px' } }}>
            <DialogContent sx={{ pb: 4 }}>
              <EmptyState
                samples={primarySamples.map(s => ({ label: s.label, run: () => { s.run(); setHelpOpen(false); } }))}
                moreOptions={importSamples.map(s => ({ label: s.label, run: () => { s.run(); setHelpOpen(false); } }))}
              />
            </DialogContent>
          </Dialog>
        </Box>
      </Box>

      {/* Thread */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 3 }}>
        <Box sx={{ maxWidth: 860, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {entries.length === 0 && <EmptyState samples={primarySamples} moreOptions={importSamples} />}
          {entries.map(entry => {
            if (entry.role === 'pending') {
              return (
                <Box key={entry.id} sx={{ alignSelf: 'flex-start', width: '100%' }}>
                  <PendingCard
                    entry={entry as ChatEntry}
                    onAccept={() => accept(entry.id)}
                    onReject={() => reject(entry.id)}
                    onUpdate={updateField}
                    onPlotChange={(plotId) => updatePlot(entry.id, plotId)}
                  />
                </Box>
              );
            }
            if (entry.role === 'block' && entry.block) {
              const b = entry.block;
              return (
                <Box key={entry.id} sx={{ alignSelf: 'flex-start', width: '100%', mb: 1 }}>
                  {b.kind === 'treatments' && (<>
                    <ResultCard title={b.title}><TreatmentsBlock plotId={b.plotId} date={b.date} owner={b.owner} /></ResultCard>
                    <OpenInUi to={b.plotId ? `/plot/${b.plotId}` : '/'} tab={b.plotId ? 0 : undefined} />
                  </>)}
                  {b.kind === 'plots' && (<>
                    <ResultCard title={b.title}><PlotsBlock /></ResultCard>
                    <OpenInUi to="/" />
                  </>)}
                  {b.kind === 'samples' && (<>
                    <ResultCard title={b.title}><SamplesBlock plotId={b.plotId} /></ResultCard>
                    <OpenInUi to={b.plotId ? `/plot/${b.plotId}` : '/'} tab={b.plotId ? 2 : undefined} />
                  </>)}
                  {b.kind === 'open-ui' && (<>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 0.75 }}>{b.title}</Typography>
                    <Button variant="outlined" startIcon={<OpenInNew />} sx={{ textTransform: 'none', borderRadius: '8px' }}
                      onClick={() => { setChatFirstMode('ui'); router.navigate(`/plot/${b.plotId}`, { state: { activeTab: b.tab } }); }}>
                      Open in ResiYou
                    </Button>
                  </>)}
                </Box>
              );
            }
            return (
              <Box key={entry.id} sx={{ alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <Paper variant="outlined" sx={{
                  px: 1.5, py: 1, borderRadius: '12px',
                  bgcolor: entry.role === 'user' ? 'grey.900' : 'grey.100',
                  color: entry.role === 'user' ? 'common.white' : 'text.primary',
                  borderColor: entry.role === 'user' ? 'grey.900' : 'divider',
                }}>
                  <Typography sx={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{entry.content}</Typography>
                </Paper>
              </Box>
            );
          })}
          {loading && <Box sx={{ alignSelf: 'flex-start' }}><CircularProgress size={18} sx={{ color: 'text.secondary' }} /></Box>}
        </Box>
      </Box>

      {/* Input bar */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'grey.100', px: 2, py: 1.5 }}>
        <Box sx={{ maxWidth: 860, mx: 'auto', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <input ref={fileInputRef} type="file" accept="image/*,.csv,text/csv" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          <IconButton size="small" onClick={() => fileInputRef.current?.click()} title="Attach screenshot or CSV" sx={{ color: 'text.secondary' }}><AttachFile /></IconButton>
          <TextField fullWidth size="small" multiline maxRows={4} placeholder="Ask or command… e.g. “Show me all treatments”"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(input); } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '0.85rem' } }} />
          <IconButton size="small" onClick={() => doSend(input)} disabled={!input.trim() || loading} sx={{ color: 'text.primary' }}>
            {loading ? <CircularProgress size={20} /> : <Send />}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

function EmptyState({ samples, moreOptions }: { samples: { label: string; run: () => void }[]; moreOptions: { label: string; run: () => void }[] }) {
  const chip = { fontSize: '0.75rem', height: 28, borderRadius: '8px' };
  return (
    <Box sx={{ textAlign: 'center', mt: 6 }}>
      <Box sx={{ width: 60, height: 60, borderRadius: '50%', mx: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
        <AutoAwesome sx={{ color: 'text.primary', fontSize: 30 }} />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mt: 1.5 }}>What would you like to do?</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>Ask to see data or make changes — everything happens right here in the chat.</Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 3, mb: 1 }}>Try one:</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
        {samples.map(s => (
          <Chip key={s.label} label={s.label} clickable variant="outlined" size="small" sx={chip} onClick={s.run} />
        ))}
      </Stack>
      {moreOptions.length > 0 && (
        <>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 2.5, mb: 1 }}>More options</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
            {moreOptions.map(s => (
              <Chip key={s.label} label={s.label} clickable variant="outlined" size="small" sx={chip} onClick={s.run} />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
