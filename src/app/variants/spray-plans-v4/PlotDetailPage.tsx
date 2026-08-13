import React from 'react';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { SprayPlansCalendar } from './SprayPlansCalendar';

/**
 * spray-plans-v4 — Calendar planner (archetype ③ time-first).
 * Replaces the baseline Treatments tab body with `SprayPlansCalendar` via `TreatmentsContent`.
 * Delegates everything else (Residue forecast, Compare, Lab management) to baseline.
 */
export function PlotDetailPage() {
  return <BaselinePlotDetailPage TreatmentsContent={SprayPlansCalendar} />;
}
