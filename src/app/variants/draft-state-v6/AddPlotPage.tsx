import { AddPlotPage as BaselineAddPlotPage } from '../../main/AddPlotPage';

/** V6: only planting + flowering dates are optional. No "Save as draft" — Save
 *  passes with those two fields empty; the forecast flow prompts for them later. */
export function AddPlotPage() {
  return <BaselineAddPlotPage softRequiredDates />;
}
