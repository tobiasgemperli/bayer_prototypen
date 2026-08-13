import { PlotsPage as BaselinePlotsPage } from '../../main/PlotsPage';

/** V6 shows the same red "Draft" chip as V5 — a plot missing planting or
 *  flowering date is still a draft (not forecast-ready). */
export function PlotsPage() {
  return <BaselinePlotsPage showDraftBadge />;
}
