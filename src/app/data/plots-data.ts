import { useSyncExternalStore } from 'react';

export interface PlotData {
  id: string;
  plotName: string;
  owner: string;
  variety: string;
  location: string;
  lastTreatment: Date | null;
  crop: string;
  season: string;
  /** Mandatory for a complete (forecast-ready) plot. Missing → the plot is a Draft. */
  plantingDate?: Date | null;
  /** Optional in v6 — only required to render the forecast. Missing → forecast prompts inline. */
  floweringStartDate?: Date | null;
}

export type SprayStatus = 'draft' | 'planned' | 'executed' | 'removed';

export const STATUS_ORDER: SprayStatus[] = ['draft', 'planned', 'executed', 'removed'];

export const STATUS_LABEL: Record<SprayStatus, string> = {
  draft: 'Draft',
  planned: 'Planned',
  executed: 'Executed',
  removed: 'Removed',
};

export interface TreatmentData {
  id: string;
  plotId: string;
  date: Date;
  method: string;
  product: string;
  productDoseValue: string;
  productDoseUnit: string;
  waterVolumeValue: string;
  waterVolumeUnit: string;
  type: 'Real' | 'Simulated';
  /** Spray-plans-v5 lifecycle status. Optional — baseline + other variants
   *  ignore it; v5 renders a status column and gates "Executed" by completeness. */
  status?: SprayStatus;
  /** Explicit draft flag — set on creation, cleared on save. Drives the
   *  inline DRAFT chip beside the Application date column. */
  isDraft?: boolean;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

export const SEED_PLOTS: PlotData[] = [
  { id: '1', plotName: 'North Field A', owner: 'john.smith@bayer.com', variety: 'Golden Harvest', location: 'Zone 1', lastTreatment: new Date('2024-03-10'), crop: 'Wheat', season: 'Spring 2024', plantingDate: new Date('2023-10-05') },
  { id: '2', plotName: 'South Field B', owner: 'maria.garcia@bayer.com', variety: 'Silver Dawn', location: 'Zone 2', lastTreatment: new Date('2024-03-15'), crop: 'Corn', season: 'Spring 2024', plantingDate: new Date('2024-04-12') },
  { id: '3', plotName: 'East Plot 12', owner: 'david.chen@bayer.com', variety: 'Red Summit', location: 'Zone 1', lastTreatment: new Date('2024-02-28'), crop: 'Soybeans', season: 'Spring 2024', plantingDate: new Date('2024-04-20') },
  { id: '4', plotName: 'West Valley', owner: 'sarah.johnson@bayer.com', variety: 'Blue Ridge', location: 'Zone 3', lastTreatment: new Date('2024-03-20'), crop: 'Wheat', season: 'Spring 2024', plantingDate: new Date('2023-10-10') },
  { id: '5', plotName: 'Central Garden', owner: 'michael.brown@bayer.com', variety: 'Green Valley', location: 'Zone 2', lastTreatment: new Date('2024-03-05'), crop: 'Corn', season: 'Winter 2023', plantingDate: new Date('2023-09-28') },
  { id: '6', plotName: 'Highland Plot', owner: 'emily.white@bayer.com', variety: 'Mountain Peak', location: 'Zone 4', lastTreatment: new Date('2024-03-12'), crop: 'Barley', season: 'Spring 2024', plantingDate: new Date('2023-11-02') },
  { id: '7', plotName: 'River Bend', owner: 'james.wilson@bayer.com', variety: 'River Gold', location: 'Zone 1', lastTreatment: new Date('2024-02-25'), crop: 'Rice', season: 'Winter 2023', plantingDate: new Date('2023-09-15') },
  { id: '8', plotName: 'Sunset Fields', owner: 'anna.martinez@bayer.com', variety: 'Sunset Special', location: 'Zone 3', lastTreatment: new Date('2024-03-18'), crop: 'Wheat', season: 'Spring 2024', plantingDate: new Date('2023-10-22') },
  // Draft plots — saved with mandatory data still missing → the system marks them Draft.
  { id: '9', plotName: 'New Orchard Block', owner: 'lyle.peterer@bayer.com', variety: '', location: 'Zone 5', lastTreatment: null, crop: 'Wheat', season: 'Spring 2024', plantingDate: null },
  { id: '10', plotName: 'Trial Plot 3', owner: 'lyle.peterer@bayer.com', variety: 'Early Gold', location: 'Zone 2', lastTreatment: null, crop: 'Corn', season: 'Spring 2024', plantingDate: null },
  // Demo plot for the V5 "complete-treatments to get forecast" edge case: plot
  // info is fully filled in (NOT a draft), but the treatments below are drafts
  // (missing product/method/dose). Triggering "Get forecast" on this plot opens
  // the CompleteTreatmentsDialog, not the EditPlotDialog gate.
  { id: '11', plotName: 'Pilot Field (incomplete treatments)', owner: 'lyle.peterer@bayer.com', variety: 'Pinot Noir', location: '46.5197, 6.6323', lastTreatment: new Date('2024-04-15'), crop: 'Wheat', season: 'Spring 2024', plantingDate: new Date('2024-02-01') },
  // V6 demo plot: every required field is filled, only the (optional) planting
  // & flowering dates are missing. Triggering "Get forecast" opens the small
  // CompleteDatesDialog instead of the full Edit plot dialog.
  { id: '12', plotName: 'Vineyard South', owner: 'lyle.peterer@bayer.com', variety: 'Merlot', location: '46.5400, 6.6100', lastTreatment: null, crop: 'Wheat', season: 'Spring 2024', plantingDate: null, floweringStartDate: null },
];

export const treatmentsData: TreatmentData[] = [
  { id: 't1', plotId: '1', date: new Date('2024-03-01'), method: 'Foliar spray', product: 'Copper oxychloride', productDoseValue: '1', productDoseUnit: 'L/ha', waterVolumeValue: '1000', waterVolumeUnit: 'L/ha', type: 'Real', status: 'executed' },
  { id: 't2', plotId: '1', date: new Date('2024-03-05'), method: 'Broadcast', product: 'Roundup', productDoseValue: '2', productDoseUnit: 'L/ha', waterVolumeValue: '500', waterVolumeUnit: 'L/ha', type: 'Real', status: 'executed' },
  { id: 't3', plotId: '2', date: new Date('2024-03-15'), method: 'Foliar spray', product: 'Bumper 25 EC', productDoseValue: '0.5', productDoseUnit: 'L/ha', waterVolumeValue: '800', waterVolumeUnit: 'L/ha', type: 'Real' },
  { id: 't4', plotId: '1', date: new Date('2024-02-20'), method: 'Soil drench', product: 'Confidor', productDoseValue: '1.5', productDoseUnit: 'L/ha', waterVolumeValue: '1200', waterVolumeUnit: 'L/ha', type: 'Real', status: 'executed' },
  { id: 't5', plotId: '4', date: new Date('2024-03-20'), method: 'Foliar spray', product: 'DECIS FLUX\u00AE', productDoseValue: '1', productDoseUnit: 'L/ha', waterVolumeValue: '1000', waterVolumeUnit: 'L/ha', type: 'Real' },
  // Draft treatment \u2014 saved with product / method / dose still missing \u2192 marked Draft.
  { id: 't6', plotId: '1', date: new Date('2024-04-02'), method: '', product: '', productDoseValue: '', productDoseUnit: '', waterVolumeValue: '', waterVolumeUnit: '', type: 'Real', status: 'draft' },
  // Demo drafts on plot 11 \u2014 the date is filled in (so the user knows there
  // are treatments) but product/method/dose are blank \u2192 marked Draft. Two of
  // them, to make the modal grid feel real.
  { id: 't7', plotId: '11', date: new Date('2024-03-12'), method: '', product: '', productDoseValue: '', productDoseUnit: '', waterVolumeValue: '', waterVolumeUnit: '', type: 'Real' },
  { id: 't8', plotId: '11', date: new Date('2024-04-15'), method: '', product: '', productDoseValue: '', productDoseUnit: '', waterVolumeValue: '', waterVolumeUnit: '', type: 'Real' },
  // Plot 1 \u2014 v5 demo rows: future Planned + one Removed. Other variants render
  // them as normal treatments (status field is ignored).
  { id: 't9',  plotId: '1', date: new Date('2026-06-10'), method: 'Foliar spray', product: 'Bumper 25 EC', productDoseValue: '0.5', productDoseUnit: 'L/ha', waterVolumeValue: '800', waterVolumeUnit: 'L/ha', type: 'Real', status: 'planned' },
  { id: 't10', plotId: '1', date: new Date('2026-07-01'), method: 'Soil drench',  product: 'Confidor',     productDoseValue: '1.5', productDoseUnit: 'L/ha', waterVolumeValue: '1200', waterVolumeUnit: 'L/ha', type: 'Real', status: 'planned' },
  { id: 't11', plotId: '1', date: new Date('2026-05-27'), method: 'Foliar spray', product: 'Karate Zeon', productDoseValue: '0.3', productDoseUnit: 'L/ha', waterVolumeValue: '600',  waterVolumeUnit: 'L/ha', type: 'Real', status: 'removed' },
];

// ── Reactive store ────────────────────────────────────────────────────────────

let _plots: PlotData[] = [...SEED_PLOTS];
const _listeners = new Set<() => void>();

function emitChange() { _listeners.forEach((l) => l()); }
function getSnapshot(): PlotData[] { return _plots; }
function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function usePlots(): PlotData[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Non-reactive read of the current plots (for use outside React). */
export function getPlots(): PlotData[] { return _plots; }

let _nextId = 100;

export function addPlot(plot: Omit<PlotData, 'id'>): PlotData {
  const newPlot: PlotData = { ...plot, id: String(_nextId++) };
  _plots = [..._plots, newPlot];
  emitChange();
  return newPlot;
}

/** Load seeded demo data */
export function loadSeedData() {
  _plots = [...SEED_PLOTS];
  emitChange();
}

/** Clear all plots for empty / new-user state */
export function clearPlots() {
  _plots = [];
  emitChange();
}

/** Delete the given plots by id. */
export function deletePlots(ids: string[]) {
  const set = new Set(ids);
  _plots = _plots.filter(p => !set.has(p.id));
  emitChange();
}

// ── Derived helpers ───────────────────────────────────────────────────────────

export function getUniqueSeasons(data: PlotData[]): string[] {
  return Array.from(new Set(data.map(plot => plot.season))).sort();
}

export function getUniqueCrops(data: PlotData[]): string[] {
  return Array.from(new Set(data.map(plot => plot.crop))).sort();
}

/** Update fields of a plot (used to complete drafts). */
export function updatePlot(id: string, patch: Partial<PlotData>): void {
  _plots = _plots.map(p => (p.id === id ? { ...p, ...patch } : p));
  emitChange();
}

// ── Treatments reactivity ──────────────────────────────────────────────────────
// `treatmentsData` is a mutable seed array. To re-render UIs after edits, we
// expose a version counter via useSyncExternalStore. Callers depend on the
// counter; the data they read remains `treatmentsData` (mutated in place).

let _treatmentVersion = 0;
const _treatmentListeners = new Set<() => void>();
function emitTreatmentChange() {
  _treatmentVersion++;
  _treatmentListeners.forEach(l => l());
}
function subscribeTreatments(listener: () => void): () => void {
  _treatmentListeners.add(listener);
  return () => _treatmentListeners.delete(listener);
}
function getTreatmentVersion(): number { return _treatmentVersion; }

/** Hook that re-renders the caller whenever any treatment is updated. */
export function useTreatmentsVersion(): number {
  return useSyncExternalStore(subscribeTreatments, getTreatmentVersion);
}

/** Patch one or more treatments by id, or insert new rows.
 *  AC-9.2: New rows (ids starting with `new-` or `dup-`) are routed to the
 *  insert path so the store accepts them; existing ids are patched in place. */
export function updateTreatments(updates: TreatmentData[]): void {
  for (const u of updates) {
    const idx = treatmentsData.findIndex(t => t.id === u.id);
    if (idx >= 0) treatmentsData[idx] = { ...treatmentsData[idx], ...u };
    else treatmentsData.push({ ...u });
  }
  emitTreatmentChange();
}

/** Remove treatments by id (used to undo an assistant insert). */
export function removeTreatments(ids: string[]): void {
  const set = new Set(ids);
  for (let i = treatmentsData.length - 1; i >= 0; i--) {
    if (set.has(treatmentsData[i].id)) treatmentsData.splice(i, 1);
  }
  emitTreatmentChange();
}

// ── Draft / completeness model (system-managed) ─────────────────────────────────
// A record is a Draft until all mandatory fields are filled. Completeness is derived,
// never stored — the system decides Draft vs Complete from the data itself.

export interface Completeness {
  complete: boolean;
  filled: number;
  total: number;
  missing: string[];      // human labels of the missing mandatory fields
  missingKeys: string[];  // field keys of the missing mandatory fields
  pct: number;            // 0..100
}

export const PLOT_MANDATORY: { key: keyof PlotData; label: string }[] = [
  { key: 'plotName', label: 'Plot name' },
  { key: 'crop', label: 'Crop' },
  { key: 'variety', label: 'Variety' },
  { key: 'location', label: 'Location' },
  { key: 'plantingDate', label: 'Planting date' },
];

export const TREATMENT_MANDATORY: { key: keyof TreatmentData; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'product', label: 'Product' },
  { key: 'method', label: 'Method' },
  { key: 'productDoseValue', label: 'Dose' },
];

function fieldFilled(v: unknown): boolean {
  if (v == null) return false;
  if (v instanceof Date) return !isNaN(v.getTime());
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

function completenessFor<T>(item: T, mandatory: { key: keyof T; label: string }[]): Completeness {
  const missing: string[] = [];
  const missingKeys: string[] = [];
  for (const f of mandatory) {
    if (!fieldFilled(item[f.key])) { missing.push(f.label); missingKeys.push(String(f.key)); }
  }
  const total = mandatory.length;
  const filled = total - missing.length;
  return { complete: missing.length === 0, filled, total, missing, missingKeys, pct: Math.round((filled / total) * 100) };
}

export function getPlotCompleteness(plot: PlotData): Completeness {
  return completenessFor(plot, PLOT_MANDATORY);
}
export function isPlotDraft(plot: PlotData): boolean {
  return !getPlotCompleteness(plot).complete;
}

export function getTreatmentCompleteness(t: TreatmentData): Completeness {
  return completenessFor(t, TREATMENT_MANDATORY);
}
export function isTreatmentDraft(t: TreatmentData): boolean {
  return t.isDraft === true;
}

// ── V5 spray-plans status helpers ─────────────────────────────────────────────

/** Required fields a treatment must have before it can be marked Executed. */
const TREATMENT_EXECUTED_REQUIRED: { key: keyof TreatmentData; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'method', label: 'Method' },
  { key: 'product', label: 'Product' },
  { key: 'productDoseValue', label: 'Dose' },
  { key: 'productDoseUnit', label: 'Dose unit' },
  { key: 'waterVolumeValue', label: 'Water volume' },
  { key: 'waterVolumeUnit', label: 'Water unit' },
];

export function getMissingTreatmentFields(t: TreatmentData): string[] {
  return TREATMENT_EXECUTED_REQUIRED.filter(f => !fieldFilled(t[f.key])).map(f => f.label);
}

/** Status transition with the v5 gating rule:
 *  - any status → 'executed' requires complete data
 *  - all other transitions are free.
 *  Mutates `treatmentsData` in place and emits a treatment-version bump. */
export function setTreatmentStatus(id: string, next: SprayStatus):
  { ok: true } | { ok: false; missing: string[] }
{
  const t = treatmentsData.find(x => x.id === id);
  if (!t) return { ok: true };
  if (next === 'executed') {
    const missing = getMissingTreatmentFields(t);
    if (missing.length > 0) return { ok: false, missing };
  }
  updateTreatments([{ ...t, status: next }]);
  return { ok: true };
}

// ── V6 forecast-readiness ──────────────────────────────────────────────────────
// V6 relaxes save-time validation: only planting + flowering dates are optional.
// They are still required to render a forecast, so we check them separately.

export function getMissingForecastDates(plot: PlotData): {
  needsPlanting: boolean;
  needsFlowering: boolean;
} {
  return {
    needsPlanting: !fieldFilled(plot.plantingDate),
    needsFlowering: !fieldFilled(plot.floweringStartDate),
  };
}
export function isForecastReady(plot: PlotData): boolean {
  const { needsPlanting, needsFlowering } = getMissingForecastDates(plot);
  return !needsPlanting && !needsFlowering;
}
