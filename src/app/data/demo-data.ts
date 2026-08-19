import { loadSeedData, clearPlots, resetTreatments, clearTreatments } from './plots-data';
import { resetSamples, clearSamples } from './lab-results-data';

/** Empty the whole account — plots, treatments and samples (blank onboarding state). */
export function clearAllDemoData(): void {
  clearPlots();
  clearTreatments();
  clearSamples();
}

/** Restore the standard seeded demo data. */
export function resetAllDemoData(): void {
  loadSeedData();
  resetTreatments();
  resetSamples();
}
