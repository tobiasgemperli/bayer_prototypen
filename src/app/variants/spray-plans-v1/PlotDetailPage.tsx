import React from 'react';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { SprayPlansContent } from './SprayPlansContent';

/**
 * spray-plans-v1 — replaces the Treatments tab body with the Spray plans view.
 * Delegates everything else (Residue forecast, Compare, Lab management) to baseline.
 */
export function PlotDetailPage() {
  return <BaselinePlotDetailPage TreatmentsContent={SprayPlansContent} />;
}
