import React from 'react';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabManagementContent } from './LabManagementContent';

/**
 * v6 — sample-first evolution of v5. Same two-tab structure, but the empty state
 * and copy steer users toward registering a sample (print + send) first, while a
 * report-first path stays one click away (Add lab report → choose/create sample).
 */
export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage SamplingContent={LabManagementContent} />
  );
}
