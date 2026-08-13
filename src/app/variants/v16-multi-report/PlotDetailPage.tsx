import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabResultsContent } from '../v15-production-replica/LabResultsContent';

// The Lab results tab (samples list + empty state) doesn't change for the
// multi-report/API-distinction features this variant adds — reused directly
// from v15 rather than duplicated. Only the per-sample "Lab Reports" tab
// differs (see LabSamplePage.tsx).
export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage
      samplingTabLabel="Lab results"
      SamplingContent={LabResultsContent}
    />
  );
}
