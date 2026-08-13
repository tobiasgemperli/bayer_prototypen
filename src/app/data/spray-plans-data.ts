import { useSyncExternalStore } from 'react';

/**
 * Spray plans — the "Spray plans" project's domain store.
 *
 * A spray plan is a named programme of planned spray applications for a plot.
 * Two orthogonal states:
 *   - kind:   simulated (a what-if / "alternative plan") → planned (committed to execute)
 *   - status: pending → completed   (PLANNING STATUS, user-managed, reflects real-world operation)
 * Individual sprays carry their own status (planned → executed) so a plan can show
 * execution progress and the user can mark sprays done "some day", then close the plan.
 */

export type PlanStatus = 'pending' | 'completed';      // user-managed planning status
export type PlanKind = 'simulated' | 'planned';        // what-if vs committed
export type SprayStatus = 'planned' | 'executed';

export interface PlannedSpray {
  id: string;
  date: Date | null;
  product: string;
  method: string;
  doseValue: string;
  doseUnit: string;
  status: SprayStatus;
  executedDate: Date | null;
}

export interface SprayPlan {
  id: string;
  plotId: string;
  name: string;
  season: string;
  kind: PlanKind;
  status: PlanStatus;
  createdAt: Date;
  sprays: PlannedSpray[];
}

export const SPRAY_METHODS = ['Foliar spray', 'Broadcast', 'Soil drench', 'Seed treatment'];
export const SPRAY_PRODUCTS = ['DECIS FLUX®', 'Roundup', 'Bumper 25 EC', 'Confidor', 'Movento'];
export const DOSE_UNITS = ['L/ha', 'kg/ha', 'mL/ha', 'g/ha'];

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_PLANS: SprayPlan[] = [
  {
    id: 'sp-1', plotId: '1', name: 'Pre-harvest programme', season: 'Spring 2024',
    kind: 'planned', status: 'pending', createdAt: new Date('2024-02-01'),
    sprays: [
      { id: 'ss-1', date: new Date('2024-03-05'), product: 'Roundup', method: 'Broadcast', doseValue: '2', doseUnit: 'L/ha', status: 'executed', executedDate: new Date('2024-03-05') },
      { id: 'ss-2', date: new Date('2024-03-10'), product: 'DECIS FLUX®', method: 'Foliar spray', doseValue: '1', doseUnit: 'L/ha', status: 'executed', executedDate: new Date('2024-03-11') },
      { id: 'ss-3', date: new Date('2024-04-18'), product: 'Bumper 25 EC', method: 'Foliar spray', doseValue: '0.5', doseUnit: 'L/ha', status: 'planned', executedDate: null },
    ],
  },
  {
    id: 'sp-2', plotId: '1', name: 'Low-residue alternative', season: 'Spring 2024',
    kind: 'simulated', status: 'pending', createdAt: new Date('2024-02-15'),
    sprays: [
      { id: 'ss-4', date: new Date('2024-03-12'), product: 'Movento', method: 'Foliar spray', doseValue: '0.75', doseUnit: 'L/ha', status: 'planned', executedDate: null },
      { id: 'ss-5', date: new Date('2024-04-02'), product: 'Bumper 25 EC', method: 'Foliar spray', doseValue: '0.4', doseUnit: 'L/ha', status: 'planned', executedDate: null },
    ],
  },
  {
    id: 'sp-3', plotId: '2', name: 'Corn 2024 standard', season: 'Spring 2024',
    kind: 'planned', status: 'completed', createdAt: new Date('2024-01-20'),
    sprays: [
      { id: 'ss-6', date: new Date('2024-03-15'), product: 'Bumper 25 EC', method: 'Foliar spray', doseValue: '0.5', doseUnit: 'L/ha', status: 'executed', executedDate: new Date('2024-03-15') },
      { id: 'ss-7', date: new Date('2024-03-28'), product: 'Confidor', method: 'Soil drench', doseValue: '1.5', doseUnit: 'L/ha', status: 'executed', executedDate: new Date('2024-03-29') },
    ],
  },
];

// ── Reactive store ──────────────────────────────────────────────────────────────

let _plans: SprayPlan[] = SEED_PLANS.map(clonePlan);
const _listeners = new Set<() => void>();

function clonePlan(p: SprayPlan): SprayPlan { return { ...p, sprays: p.sprays.map(s => ({ ...s })) }; }
function emitChange() { _plans = [..._plans]; _listeners.forEach((l) => l()); }
function getSnapshot(): SprayPlan[] { return _plans; }
function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function useSprayPlans(): SprayPlan[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function getPlansForPlot(plotId: string): SprayPlan[] {
  return _plans.filter(p => p.plotId === plotId);
}

let _planSeq = 100;
let _spraySeq = 100;

export function addPlan(plotId: string, partial: Partial<SprayPlan> = {}): SprayPlan {
  const plan: SprayPlan = {
    id: `sp-${_planSeq++}`,
    plotId,
    name: partial.name ?? 'New spray plan',
    season: partial.season ?? 'Spring 2024',
    kind: partial.kind ?? 'planned',
    status: partial.status ?? 'pending',
    createdAt: new Date(),
    sprays: partial.sprays ?? [],
  };
  _plans = [..._plans, plan];
  emitChange();
  return plan;
}

export function updatePlan(id: string, patch: Partial<SprayPlan>): void {
  _plans = _plans.map(p => (p.id === id ? { ...p, ...patch } : p));
  emitChange();
}

export function deletePlan(id: string): void {
  _plans = _plans.filter(p => p.id !== id);
  emitChange();
}

export function duplicatePlan(id: string, overrides: Partial<SprayPlan> = {}): SprayPlan | undefined {
  const src = _plans.find(p => p.id === id);
  if (!src) return undefined;
  const copy: SprayPlan = {
    ...clonePlan(src),
    id: `sp-${_planSeq++}`,
    name: overrides.name ?? `${src.name} (copy)`,
    createdAt: new Date(),
    sprays: src.sprays.map(s => ({ ...s, id: `ss-${_spraySeq++}` })),
    ...overrides,
  };
  _plans = [..._plans, copy];
  emitChange();
  return copy;
}

export function setPlanStatus(id: string, status: PlanStatus): void {
  updatePlan(id, { status });
}

/** Promote a simulated plan to a committed (planned) plan. */
export function convertToPlanned(id: string): void {
  updatePlan(id, { kind: 'planned' });
}

export function emptySpray(): PlannedSpray {
  return { id: `ss-${_spraySeq++}`, date: null, product: '', method: '', doseValue: '', doseUnit: 'L/ha', status: 'planned', executedDate: null };
}

export function addSpray(planId: string, spray?: Partial<PlannedSpray>): void {
  _plans = _plans.map(p => p.id === planId
    ? { ...p, sprays: [...p.sprays, { ...emptySpray(), ...spray }] }
    : p);
  emitChange();
}

export function updateSpray(planId: string, sprayId: string, patch: Partial<PlannedSpray>): void {
  _plans = _plans.map(p => {
    if (p.id !== planId) return p;
    return { ...p, sprays: p.sprays.map(s => (s.id === sprayId ? { ...s, ...patch } : s)) };
  });
  emitChange();
}

export function deleteSpray(planId: string, sprayId: string): void {
  _plans = _plans.map(p => (p.id === planId ? { ...p, sprays: p.sprays.filter(s => s.id !== sprayId) } : p));
  emitChange();
}

export function markSprayExecuted(planId: string, sprayId: string, executed: boolean): void {
  updateSpray(planId, sprayId, executed
    ? { status: 'executed', executedDate: new Date() }
    : { status: 'planned', executedDate: null });
}

// ── Derived helpers ──────────────────────────────────────────────────────────────

export interface PlanProgress { executed: number; total: number; pct: number; allExecuted: boolean; }

export function planProgress(plan: SprayPlan): PlanProgress {
  const total = plan.sprays.length;
  const executed = plan.sprays.filter(s => s.status === 'executed').length;
  return { executed, total, pct: total === 0 ? 0 : Math.round((executed / total) * 100), allExecuted: total > 0 && executed === total };
}

/** What the planning status *should* be from execution data (system suggestion; user confirms). */
export function suggestedStatus(plan: SprayPlan): PlanStatus {
  return planProgress(plan).allExecuted ? 'completed' : 'pending';
}
