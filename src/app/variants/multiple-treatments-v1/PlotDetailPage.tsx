import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { MultipleTreatmentsModal } from './MultipleTreatmentsModal';

/** multiple-treatments-v1 — the bulk-copy treatment modal (triggered from the
 *  Treatments tab row-actions) is the V1 dialog with per-plot date validation. */
export function PlotDetailPage() {
  return <BaselinePlotDetailPage TreatmentModalComponent={MultipleTreatmentsModal} />;
}
