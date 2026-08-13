import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabResultsContent } from './LabResultsContent';

export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage
      samplingTabLabel="Lab results"
      SamplingContent={LabResultsContent}
    />
  );
}
