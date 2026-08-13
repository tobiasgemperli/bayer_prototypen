import React from 'react';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabMasterDetail } from './LabMasterDetail';

/**
 * v7 — Master–detail: one screen shows a sample list on the left and the selected
 * sample's lab reports (each expandable to its results) on the right. No page-swap;
 * the whole 1 sample → N reports → results chain is in the tab.
 */
export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage
      samplingTabLabel="Lab management"
      SamplingContent={LabMasterDetail}
    />
  );
}
