import React from 'react';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { SprayPlansLifecycle } from './SprayPlansLifecycle';

/**
 * spray-plans-v3 — replaces the Treatments tab body with a spray-plan lifecycle
 * view: each plan rendered as a panel with a horizontal Stepper across
 * Simulated → Planned → In progress → Completed. Delegates everything else
 * (Residue forecast, Compare, Lab management) to baseline.
 */
export function PlotDetailPage() {
  return <BaselinePlotDetailPage TreatmentsContent={SprayPlansLifecycle} />;
}
