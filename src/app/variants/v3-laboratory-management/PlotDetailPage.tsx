import React from 'react';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabResultsContent } from './LabResultsContent';

/**
 * v4 — only changes the Sampling tab label and the component rendered inside it.
 * Everything else delegates to baseline. Baseline accepts these as optional props
 * so future variants can do the same with minimal duplication.
 */
export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage SamplingContent={LabResultsContent} />
  );
}
