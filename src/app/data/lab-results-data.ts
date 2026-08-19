import { useSyncExternalStore } from 'react';
import { SEED_PLOTS, treatmentsData, TreatmentData } from './plots-data';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Commodity = 'Fruit' | 'Soil' | 'Irrigation water' | 'Leaf';
export type ResidueLevel = 'Residue' | 'Trace' | 'Below LOQ' | 'Not analyzed';

export interface LabResidue {
  id: string;
  analyte: string;
  residueLevel: ResidueLevel | null;
  residueValue: string;
  methodLoq: string;
  methodLod: string;
  /** True when seeded from the plot's reported treatments (read-only analyte). */
  fromTreatment: boolean;
  /** ID of the LabReport this analyte came from. Required before save in the new grid. */
  labReportId?: string;
  /** Explicit draft flag — set on creation, cleared on save. */
  isDraft?: boolean;
  /** When set, this residue was pushed in from an external system (lab API). */
  managedBy?: string;
}

export interface LabAttachment {
  id: string;
  name: string;
  size: number;
}

/** One lab report. Multiple reports per sample are stored in LabSampleData.reports (variants only). */
export interface LabReport {
  id: string;
  laboratory: string;
  labReportId: string;
  attachments: LabAttachment[];
  /** Report results — variants that manage results per-report (v5) write here. Optional so other variants are unaffected. */
  residues?: LabResidue[];
  /** Explicit draft flag — set on creation, cleared on save. */
  isDraft?: boolean;
  /** When set, this report was pushed in from an external system (FMS, lab
   *  API, …). The row renders with the ManagedTag (red cloud) and is
   *  read-only — the source of truth lives upstream. */
  managedBy?: string;
  /** Optional notes the user can attach to this specific report. */
  notes?: string;
}

export interface LabSampleData {
  id: string;
  plotId: string;
  sampleCode: string;
  sampleName: string;
  dateOfSample: Date | null;
  commodity: Commodity | null;
  comments: string;
  /** True when the user explicitly chose "Save as draft". The Draft chip is
   *  driven by this flag — NOT by missing fields — so a sample can be both
   *  incomplete and not-yet-marked, or complete-but-still-draft. */
  isDraft?: boolean;
  /** Legacy single-report fields — baseline writes here. */
  laboratory: string;
  labReportId: string;
  attachments: LabAttachment[];
  /** Multi-report storage — variants write here. Optional so baseline is unaffected. */
  reports?: LabReport[];
  /** Multi-lab "Send sample to" selection — v10/v11 write here (superset of
   *  the legacy `laboratory` singular field, which stays in sync as the
   *  first selected lab so other variants keep working unmodified).
   *  Optional so baseline/other variants are unaffected. */
  laboratories?: string[];
  residues: LabResidue[];
  createdAt: Date;
}

// ── Reference data ────────────────────────────────────────────────────────────

export const COMMODITY_OPTIONS: Commodity[] = ['Fruit', 'Soil', 'Irrigation water', 'Leaf'];
export const RESIDUE_LEVEL_OPTIONS: ResidueLevel[] = ['Residue', 'Trace', 'Below LOQ', 'Not analyzed'];

/** Predefined analyte list — feeds the Analyte dropdown in the Lab Results grid. */
export const ANALYTE_OPTIONS: string[] = [
  '1,2,4-triazole',
  '1,4-dimethylnaphthalene',
  '2,4-D',
  '2-phenylphenol',
  'acetamiprid',
  'azoxystrobin',
  'boscalid',
  'captan',
  'carbendazim',
  'chlorpyrifos',
  'chlorpyrifos-methyl',
  'cyprodinil',
  'deltamethrin',
  'difenoconazole',
  'dimethoate',
  'dithianon',
  'fenhexamid',
  'fipronil',
  'fludioxonil',
  'fluopyram',
  'glyphosate',
  'imazalil',
  'imidacloprid',
  'iprodione',
  'malathion',
  'mancozeb',
  'metalaxyl',
  'myclobutanil',
  'penconazole',
  'phosmet',
  'propamocarb',
  'propiconazole',
  'pyraclostrobin',
  'pyrimethanil',
  'spinosad',
  'tebuconazole',
  'thiacloprid',
  'thiamethoxam',
  'thiophanate-methyl',
  'trifloxystrobin',
];

/** Dummy list of accredited analytical labs — used to seed the Lab Reports dropdown. */
export const LABORATORY_OPTIONS: string[] = [
  'Eurofins Schweiz AG',
  'SGS Schweiz AG',
  'Agroscope Reckenholz',
  'Bureau Veritas Switzerland',
  'Intertek Schweiz',
  'TÜV SÜD Food Analytics',
  'ALS Czech Republic',
  'Wessling Laboratories',
];

/** Labs that have a live API connection with ResiYou — results are pushed automatically. */
export const LABS_WITH_API_CONNECTION = new Set<string>([
  'Eurofins Schweiz AG',
  'SGS Schweiz AG',
]);

/** Substances that require specific analytical methods. Static reference shown on Sample tab. */
export const SUBSTANCE_ANALYTICAL_METHODS: { substance: string; method: string }[] = [
  { substance: 'Disodium phosphonate', method: 'Polar compounds: Phosphonic acid' },
  { substance: 'Dithianon', method: 'Polar compounds: Dithianon' },
  { substance: 'Ethephon', method: 'Polar compounds: Ethephon' },
  { substance: 'Fosetyl-Al', method: 'Polar compounds: Phosphonic acid' },
  { substance: 'Mancozeb', method: 'Dithiocarbamates: Carbon disulfide' },
  { substance: 'Maneb', method: 'Dithiocarbamates: Carbon disulfide' },
  { substance: 'Metiram', method: 'Dithiocarbamates: Carbon disulfide' },
  { substance: 'Phosphonic acid', method: 'Polar compounds: Phosphonic acid' },
  { substance: 'Potassium phosphonates', method: 'Polar compounds: Phosphonic acid' },
  { substance: 'Propineb', method: 'Dithiocarbamates: Carbon disulfide' },
  { substance: 'Thiram', method: 'Dithiocarbamates: Carbon disulfide' },
  { substance: 'Ziram', method: 'Dithiocarbamates: Carbon disulfide' },
];

/** Map known products to their target analytes (used to derive residues from plot treatments). */
const PRODUCT_TO_ANALYTES: Record<string, string[]> = {
  'DECIS FLUX®': ['deltamethrin'],
  'Roundup': ['glyphosate'],
  'Bumper 25 EC': ['propiconazole'],
  'Confidor': ['imidacloprid', 'acetamiprid'],
};

export function getAnalytesForPlot(plotId: string): string[] {
  const products = treatmentsData
    .filter((t: TreatmentData) => t.plotId === plotId)
    .map(t => t.product);
  const set = new Set<string>();
  products.forEach(p => (PRODUCT_TO_ANALYTES[p] ?? []).forEach(a => set.add(a)));
  return Array.from(set);
}

// ── Reactive store ────────────────────────────────────────────────────────────

// Every other store in this app resets on reload — lab samples are the one
// exception (real ResiYou keeps lab data around), so they're persisted to
// localStorage and re-hydrated by every tab/window that loads this module,
// including the separate tab the sample-sheet route opens in. Without this,
// a sample created in one tab is pure in-memory state in that tab's JS
// realm — a fresh page load in a new tab starts from an empty store and
// never sees it, so "Sample sheet" 404s for anything created this session.

const STORAGE_KEY = 'resiyou:lab-samples:v3';

let _samples: LabSampleData[] = [];
const _listeners = new Set<() => void>();

function emitChange() {
  persistSamples();
  _listeners.forEach((l) => l());
}
function getSnapshot(): LabSampleData[] { return _samples; }
function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function reviveSample(raw: any): LabSampleData {
  return {
    ...raw,
    dateOfSample: raw.dateOfSample ? new Date(raw.dateOfSample) : null,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
  };
}

function loadPersistedSamples(): LabSampleData[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(reviveSample);
  } catch {
    return null;
  }
}

function persistSamples() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_samples));
  } catch {
    // Storage full/unavailable (private browsing, quota) — samples stay
    // usable in-memory for the current tab, just not shared cross-tab.
  }
}

// Highest numeric suffix among ids like "ls-3" for a given prefix — used to
// pick up id counters where a previous tab/session left off, so a freshly
// loaded module doesn't hand out an id that collides with a persisted one.
function maxIdSuffix(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const n = parseInt(id.slice(prefix.length), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max;
}

// Other tabs writing to the same key (e.g. creating a sample) should be
// reflected here too — that's the whole point of "cross-tab".
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const persisted = loadPersistedSamples();
    if (persisted) {
      _samples = persisted;
      _listeners.forEach((l) => l());
    }
  });
}

export function useLabSamples(): LabSampleData[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Empty all lab samples (blank-account state). */
export function clearSamples(): void {
  _samples = [];
  emitChange();
}

/** Restore the seeded demo samples. */
export function resetSamples(): void {
  _samples = [];
  seedDemoSamples();
  emitChange();
}

let _nextId = 1;
const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
function generateSampleCode(): string {
  const seg = () => Array.from({ length: 3 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}

export function createLabSample(plotId: string): LabSampleData {
  // AC-8.2: a brand-new sample is NOT a draft — it has never been saved yet.
  // The 4 px red row marker already communicates "this is new/unsaved".
  // `isDraft` only flips to true when the user explicitly saves an incomplete
  // sample via "Save as draft".
  const sample: LabSampleData = {
    id: `ls-${_nextId++}`,
    plotId,
    sampleCode: generateSampleCode(),
    sampleName: '',
    dateOfSample: null,
    commodity: null,
    comments: '',
    laboratory: '',
    labReportId: '',
    attachments: [],
    residues: [],
    createdAt: new Date(),
  };
  _samples = [..._samples, sample];
  emitChange();
  return sample;
}

export function updateLabSample(id: string, patch: Partial<LabSampleData>): void {
  _samples = _samples.map(s => (s.id === id ? { ...s, ...patch } : s));
  emitChange();
}

export function deleteLabSample(id: string): void {
  _samples = _samples.filter(s => s.id !== id);
  emitChange();
}

export function getLabSample(id: string): LabSampleData | undefined {
  return _samples.find(s => s.id === id);
}

export function getLabSamplesForPlot(plotId: string): LabSampleData[] {
  return _samples.filter(s => s.plotId === plotId);
}

// ── Multi-report helpers (variants only) ──────────────────────────────────────

let _reportIdCounter = 1;
export function newReportId(): string { return `lr-${_reportIdCounter++}`; }

/**
 * Returns reports for a sample. If sample.reports has been populated (by a multi-report
 * variant), returns that. Otherwise falls back to wrapping the legacy single-report
 * fields in a synthetic 1-element array.
 */
export function getReports(sample: LabSampleData): LabReport[] {
  if (sample.reports && sample.reports.length > 0) return sample.reports;
  if (sample.laboratory || sample.labReportId || sample.attachments.length > 0) {
    return [{
      id: `legacy-${sample.id}`,
      laboratory: sample.laboratory,
      labReportId: sample.labReportId,
      attachments: sample.attachments,
    }];
  }
  return [];
}

export function emptyReport(): LabReport {
  return { id: newReportId(), laboratory: '', labReportId: '', attachments: [], residues: [] };
}

// ── Per-report management (v5: reports are first-class, each owns its results) ──

export interface LabReportWithSample {
  sample: LabSampleData;
  report: LabReport;
}

/** Flatten every lab report attached to a plot's samples, paired with its owning sample. */
export function getLabReportsForPlot(plotId: string): LabReportWithSample[] {
  const out: LabReportWithSample[] = [];
  for (const s of _samples) {
    if (s.plotId !== plotId) continue;
    for (const r of s.reports ?? []) out.push({ sample: s, report: r });
  }
  return out;
}

/** Locate a single report (and its sample) by report id, across all samples. */
export function findLabReport(reportId: string): LabReportWithSample | undefined {
  for (const s of _samples) {
    const r = (s.reports ?? []).find(rr => rr.id === reportId);
    if (r) return { sample: s, report: r };
  }
  return undefined;
}

export function addLabReport(sampleId: string, report: LabReport): void {
  _samples = _samples.map(s =>
    s.id === sampleId ? { ...s, reports: [...(s.reports ?? []), report] } : s
  );
  emitChange();
}

export function updateLabReport(reportId: string, patch: Partial<LabReport>): void {
  _samples = _samples.map(s => {
    if (!(s.reports ?? []).some(r => r.id === reportId)) return s;
    return { ...s, reports: (s.reports ?? []).map(r => (r.id === reportId ? { ...r, ...patch } : r)) };
  });
  emitChange();
}

export function deleteLabReport(reportId: string): void {
  _samples = _samples.map(s => {
    if (!(s.reports ?? []).some(r => r.id === reportId)) return s;
    return { ...s, reports: (s.reports ?? []).filter(r => r.id !== reportId) };
  });
  emitChange();
}

// ── Residue helpers ───────────────────────────────────────────────────────────

let _residueIdCounter = 1;
export function newResidueId(): string { return `res-${_residueIdCounter++}`; }

export function residueLabel(r: LabResidue): string {
  if (r.residueLevel === 'Residue') return r.residueValue || '-';
  if (r.residueLevel === 'Trace') return 'Trace';
  if (r.residueLevel === 'Below LOQ') return 'Below LOQ';
  if (r.residueLevel === 'Not analyzed') return 'Not analyzed';
  return '-';
}

export function isDetected(r: LabResidue): boolean {
  return r.residueLevel === 'Residue' || r.residueLevel === 'Trace';
}

export function analytesReportedSummary(sample: LabSampleData): string {
  const reported = sample.residues.filter(r => r.residueLevel != null);
  if (reported.length === 0) return 'Nothing reported';
  return `${reported.length} analyte${reported.length !== 1 ? 's' : ''} reported`;
}

export type LabResultsTone = 'positive' | 'negative' | 'neutral';

/**
 * Summary used in the plot-detail lab results table.
 * - neutral: no analytes reported yet (awaiting lab)
 * - positive: at least one analyte reported, none detected (clean sample)
 * - negative: one or more residues detected (Residue / Trace)
 */
export function labResultsStatus(sample: LabSampleData): { text: string; tone: LabResultsTone } {
  const reported = sample.residues.filter(r => r.residueLevel != null);
  if (reported.length === 0) return { text: 'Awaiting results', tone: 'neutral' };
  const detected = reported.filter(isDetected);
  if (detected.length === 0) return { text: 'All clear, no residues detected', tone: 'positive' };
  return {
    text: `${detected.length} residue${detected.length !== 1 ? 's' : ''} detected`,
    tone: 'negative',
  };
}

// ── Demo seed ─────────────────────────────────────────────────────────────────
// Every seeded plot starts with one realistic lab sample (sample → report →
// attachment → residues) so the UI shows populated state without forcing the
// user to create rows by hand. Runs once at module load — _samples is empty.

const DEMO_COMMODITIES: Commodity[] = ['Fruit', 'Soil', 'Irrigation water', 'Leaf'];

function demoResiduesForIndex(i: number): LabResidue[] {
  const pattern = i % 3;
  if (pattern === 0) return []; // neutral — "Awaiting results"
  if (pattern === 1) return [   // positive — analytes reported, none detected
    // Saved + from-treatment seed.
    { id: newResidueId(), analyte: 'glyphosate', residueLevel: 'Below LOQ', residueValue: '', methodLoq: '0.01', methodLod: '', fromTreatment: false },
    { id: newResidueId(), analyte: 'imidacloprid', residueLevel: 'Not analyzed', residueValue: '', methodLoq: '', methodLod: '', fromTreatment: false },
    // Draft result — analyte picked, level still missing.
    { id: newResidueId(), analyte: 'azoxystrobin', residueLevel: null, residueValue: '', methodLoq: '', methodLod: '', fromTreatment: false, isDraft: true },
    // Managed-by-system result — pushed in from an external system, read-
    // only here. Tooltip will read "Managed in Climate FieldView".
    { id: newResidueId(), analyte: 'spinosad', residueLevel: 'Trace', residueValue: '', methodLoq: '0.005', methodLod: '', fromTreatment: false, managedBy: 'Climate FieldView' },
  ];
  return [                       // negative — at least one detected
    { id: newResidueId(), analyte: 'deltamethrin', residueLevel: 'Residue', residueValue: '0.03', methodLoq: '0.01', methodLod: '', fromTreatment: true },
    { id: newResidueId(), analyte: 'propiconazole', residueLevel: 'Trace', residueValue: '', methodLoq: '0.01', methodLod: '', fromTreatment: false },
    // Draft user-added result.
    { id: newResidueId(), analyte: 'fludioxonil', residueLevel: null, residueValue: '', methodLoq: '', methodLod: '', fromTreatment: false, isDraft: true },
    // Managed-by-system detection — surfaces the red cloud tag in Report results.
    { id: newResidueId(), analyte: 'pyraclostrobin', residueLevel: 'Residue', residueValue: '0.012', methodLoq: '0.005', methodLod: '', fromTreatment: false, managedBy: 'Climate FieldView' },
  ];
}

function seedDemoSamples() {
  SEED_PLOTS.forEach((plot, i) => {
    const sampledAt = new Date();
    sampledAt.setDate(sampledAt.getDate() - (i + 1) * 7);
    const sampleName = `Routine check #${i + 1}`;
    const lab = LABORATORY_OPTIONS[i % LABORATORY_OPTIONS.length];

    const sample: LabSampleData = {
      id: `ls-demo-${plot.id}`,
      plotId: plot.id,
      sampleCode: generateSampleCode(),
      sampleName,
      dateOfSample: sampledAt,
      commodity: DEMO_COMMODITIES[i % DEMO_COMMODITIES.length],
      comments: '',
      laboratory: lab,
      labReportId: '',
      attachments: [],
      reports: [
        // ── Saved lab report (non-draft) — fully filled in by the user ──────
        {
          id: `lr-demo-${plot.id}`,
          laboratory: lab,
          labReportId: `LR-${sampledAt.getFullYear()}-${String(i + 1).padStart(3, '0')}`,
          attachments: [{
            id: `att-demo-${plot.id}`,
            name: `lab-report-${sampledAt.toISOString().slice(0, 10)}.pdf`,
            size: 380_000 + i * 24_000,
          }],
          sampleUsed: sampleName,
        } as LabReport & { sampleUsed: string },
        // ── Draft lab report — lab picked, identifiers + attachment missing ─
        {
          id: `lr-demo-draft-${plot.id}`,
          laboratory: LABORATORY_OPTIONS[(i + 1) % LABORATORY_OPTIONS.length],
          labReportId: '',
          attachments: [],
          isDraft: true,
        },
        // ── Managed-by-system lab report — pushed in from an external system,
        //    rendered with the red cloud ManagedTag + muted row text, read-
        //    only here. Same wording as table-actions-v1's tags demo
        //    ("Managed in Climate FieldView") — never the word "API". ───────
        {
          id: `lr-demo-managed-${plot.id}`,
          laboratory: 'Eurofins SciKo',
          labReportId: `CFV-${sampledAt.getFullYear()}-${String(i + 100).padStart(3, '0')}`,
          attachments: [{
            id: `att-demo-managed-${plot.id}`,
            name: `eurofins-${sampledAt.toISOString().slice(0, 10)}.pdf`,
            size: 412_000,
          }],
          managedBy: 'Climate FieldView',
        },
      ],
      residues: demoResiduesForIndex(i),
      createdAt: sampledAt,
    };

    _samples.push(sample);

    // ── Draft companion sample ────────────────────────────────────────────────
    // Each seeded plot also gets one sample that was explicitly "saved as draft":
    // only the sample name is filled, everything else is empty, isDraft=true.
    // Shows the Draft chip out of the box so the two states are visible side by side.
    _samples.push({
      id: `ls-demo-draft-${plot.id}`,
      plotId: plot.id,
      sampleCode: generateSampleCode(),
      sampleName: `Pre-harvest screen #${i + 1}`,
      dateOfSample: null,
      commodity: null,
      comments: '',
      isDraft: true,
      laboratory: '',
      labReportId: '',
      attachments: [],
      reports: [],
      residues: [],
      createdAt: new Date(),
    });
  });

  // ── API-connected lab demo sample — shows locked/auto-imported state in V10 ──
  // Assigned to plot 1 (North Field A). Laboratory is Eurofins Schweiz AG which
  // has a direct API connection. Two report blocks are pre-filled as if pushed
  // in by the lab API. All fields are locked in the V10 SampleReportPage.
  const apiSampleDate = new Date('2026-06-03');
  _samples.push({
    id: 'ls-api-demo-1',
    plotId: '1',
    sampleCode: 'RY-2026-0601',
    sampleName: 'Fruit Screen Q2 2026',
    dateOfSample: apiSampleDate,
    commodity: 'Fruit',
    comments: '',
    laboratory: 'Eurofins Schweiz AG',
    labReportId: '',
    attachments: [],
    reports: [
      {
        id: 'lr-api-demo-1a',
        laboratory: 'Eurofins Schweiz AG',
        labReportId: 'EUR-2026-0842',
        attachments: [{ id: 'att-api-demo-1a', name: 'eurofins-EUR-2026-0842.pdf', size: 356_000 }],
        notes: 'Received via API on 18 June 2026. All analytes confirmed by Eurofins.',
        managedBy: 'Eurofins Schweiz AG',
      },
      {
        id: 'lr-api-demo-1b',
        laboratory: 'Eurofins Schweiz AG',
        labReportId: 'EUR-2026-0843',
        attachments: [{ id: 'att-api-demo-1b', name: 'eurofins-EUR-2026-0843.pdf', size: 214_000 }],
        notes: 'Supplementary analysis of polar compounds.',
        managedBy: 'Eurofins Schweiz AG',
      },
    ],
    residues: [
      // Block 1: EUR-2026-0842 — dummy data always shows a filled-in result, no empty cells.
      { id: newResidueId(), analyte: 'azoxystrobin',  residueLevel: 'Residue', residueValue: '0.012', methodLoq: '0.010', methodLod: '', fromTreatment: false, labReportId: 'EUR-2026-0842', managedBy: 'Eurofins Schweiz AG' },
      { id: newResidueId(), analyte: 'cypermethrin',  residueLevel: 'Residue', residueValue: '0.015', methodLoq: '0.010', methodLod: '', fromTreatment: false, labReportId: 'EUR-2026-0842', managedBy: 'Eurofins Schweiz AG' },
      { id: newResidueId(), analyte: 'deltamethrin',  residueLevel: 'Residue', residueValue: '0.028', methodLoq: '0.010', methodLod: '', fromTreatment: false, labReportId: 'EUR-2026-0842', managedBy: 'Eurofins Schweiz AG' },
      { id: newResidueId(), analyte: 'imidacloprid',  residueLevel: 'Residue', residueValue: '0.007', methodLoq: '0.005', methodLod: '', fromTreatment: false, labReportId: 'EUR-2026-0842', managedBy: 'Eurofins Schweiz AG' },
      { id: newResidueId(), analyte: 'fludioxonil',   residueLevel: 'Residue', residueValue: '0.006', methodLoq: '0.005', methodLod: '', fromTreatment: false, labReportId: 'EUR-2026-0842', managedBy: 'Eurofins Schweiz AG' },
      // Block 2: EUR-2026-0843
      { id: newResidueId(), analyte: 'glyphosate',    residueLevel: 'Residue', residueValue: '0.018', methodLoq: '0.010', methodLod: '', fromTreatment: false, labReportId: 'EUR-2026-0843', managedBy: 'Eurofins Schweiz AG' },
      { id: newResidueId(), analyte: 'mancozeb',      residueLevel: 'Residue', residueValue: '0.061', methodLoq: '0.050', methodLod: '', fromTreatment: false, labReportId: 'EUR-2026-0843', managedBy: 'Eurofins Schweiz AG' },
    ],
    createdAt: apiSampleDate,
  });

  // ── v13 demo: sample with only manually-added reports ─────────────────────
  // Two reports typed in by the user, sent to two different labs — shows the
  // Reports row list fully populated and editable, no locked/managed rows.
  const manualSampleDate = new Date('2026-05-12');
  _samples.push({
    id: 'ls-v13-manual-1',
    plotId: '1',
    sampleCode: 'RY-2026-0512',
    sampleName: 'Manual reports sample',
    dateOfSample: manualSampleDate,
    commodity: 'Fruit',
    comments: '',
    laboratory: 'Agroscope Reckenholz',
    labReportId: '',
    attachments: [],
    reports: [
      {
        id: 'lr-v13-manual-1a',
        laboratory: 'Agroscope Reckenholz',
        labReportId: 'AGS-2026-0088',
        attachments: [{ id: 'att-v13-manual-1a', name: 'agroscope-report-2026-05-20.pdf', size: 298_000 }],
      },
      {
        id: 'lr-v13-manual-1b',
        laboratory: 'Bureau Veritas Switzerland',
        labReportId: 'BVS-2026-0341',
        attachments: [{ id: 'att-v13-manual-1b', name: 'bureau-veritas-report-2026-05-24.pdf', size: 341_000 }],
      },
    ],
    residues: [
      { id: newResidueId(), analyte: 'captan',        residueLevel: 'Residue', residueValue: '0.032', methodLoq: '0.010', methodLod: '', fromTreatment: false, labReportId: 'AGS-2026-0088' },
      { id: newResidueId(), analyte: 'boscalid',       residueLevel: 'Residue', residueValue: '0.014', methodLoq: '0.010', methodLod: '', fromTreatment: false, labReportId: 'AGS-2026-0088' },
      { id: newResidueId(), analyte: 'chlorpyrifos',   residueLevel: 'Residue', residueValue: '0.009', methodLoq: '0.005', methodLod: '', fromTreatment: false, labReportId: 'BVS-2026-0341' },
    ],
    createdAt: manualSampleDate,
  });

  // ── v13 demo: sample with no reports or results added yet ─────────────────
  // Preference lab picked at creation, but nothing added since — shows the
  // Reports card with just its trailing empty row and the Results empty state.
  const emptySampleDate = new Date('2026-07-08');
  _samples.push({
    id: 'ls-v13-empty-1',
    plotId: '1',
    sampleCode: 'RY-2026-0708',
    sampleName: 'No reports yet',
    dateOfSample: emptySampleDate,
    commodity: 'Fruit',
    comments: '',
    laboratory: 'Agroscope Reckenholz',
    labReportId: '',
    attachments: [],
    reports: [],
    residues: [],
    createdAt: emptySampleDate,
  });
}

const _persisted = loadPersistedSamples();
if (_persisted) {
  _samples = _persisted;
  _nextId = maxIdSuffix(_persisted.map((s) => s.id), 'ls-') + 1;
  _reportIdCounter = maxIdSuffix(_persisted.flatMap((s) => (s.reports ?? []).map((r) => r.id)), 'lr-') + 1;
  _residueIdCounter = maxIdSuffix(_persisted.flatMap((s) => s.residues.map((r) => r.id)), 'res-') + 1;
} else {
  seedDemoSamples();
  persistSamples();
}
