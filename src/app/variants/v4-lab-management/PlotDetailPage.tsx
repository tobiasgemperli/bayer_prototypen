import React from 'react';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabManagementContent } from './LabManagementContent';

/**
 * v5 — restructures the Sampling tab into "Lab management": a treatments-style
 * area with sub-tabs (Sample reports | Lab reports) and a directly-editable grid,
 * instead of the per-sample editor page. Delegates everything else to baseline.
 */
export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage SamplingContent={LabManagementContent} />
  );
}
