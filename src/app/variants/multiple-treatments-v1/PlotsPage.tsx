import { PlotsPage as BaselinePlotsPage } from '../../main/PlotsPage';
import { MultipleTreatmentsModal } from './MultipleTreatmentsModal';

/** multiple-treatments-v1 — Plots list with:
 *  - Required season filter (defaults to season of the latest-planted plot).
 *  - A "Planting date" column (sortable).
 *  - Bulk row-action "Add applied treatments to plots" opens the V1 modal
 *    with per-plot validation. */
export function PlotsPage() {
  return (
    <BaselinePlotsPage
      requireSeasonFilter
      showPlantingDate
      TreatmentModalComponent={MultipleTreatmentsModal}
    />
  );
}
