import React from 'react';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { SprayPlansBoard } from './SprayPlansBoard';

/**
 * spray-plans-v2 — Kanban "Planning board" variant.
 * Replaces the Treatments tab body with the SprayPlansBoard; all other tabs are baseline unchanged.
 */
export function PlotDetailPage() {
  return <BaselinePlotDetailPage TreatmentsContent={SprayPlansBoard} />;
}
