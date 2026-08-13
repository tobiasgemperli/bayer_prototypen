import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { LabManagementContent } from './LabManagementContent';

export function PlotDetailPage() {
  return (
    <BaselinePlotDetailPage
      samplingTabLabel="Samples & lab reports"
      SamplingContent={LabManagementContent}
    />
  );
}
