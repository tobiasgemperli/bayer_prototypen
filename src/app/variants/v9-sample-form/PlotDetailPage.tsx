import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabManagementContent } from './LabManagementContent';

/**
 * V9 — Lab management with form-based sample creation.
 *
 * Samples list is a read-only Plots-style table; creating or editing a sample
 * opens a centered form popup; on create, a confirmation popup nudges the
 * user to download the sample sheet or add the lab report straight away.
 * Lab reports + Results stay as V7's editable grids.
 */
export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage
      samplingTabLabel="Samples & lab reports"
      SamplingContent={LabManagementContent}
    />
  );
}
