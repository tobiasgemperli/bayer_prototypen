import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabManagementContent } from './LabManagementContent';

/**
 * V8 — Lab management with progressive tab disclosure.
 *
 * Same baseline shell as V7, with a different SamplingContent that hides the
 * tab strip until the user has created their first sample.
 */
export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage
      samplingTabLabel="Samples & lab reports"
      SamplingContent={LabManagementContent}
    />
  );
}
