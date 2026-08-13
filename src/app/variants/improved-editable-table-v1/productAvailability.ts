import { PRODUCT_OPTIONS } from '../../main/TreatmentsGrid';

/**
 * Demo registration/application windows per crop-protection product. A
 * product with no entry here is available on every date (no restriction).
 * Anchored around the current demo date so the three validation cases
 * (filtered dropdown, disabled dates, paste fallback) are all reachable
 * without hunting for a specific day.
 */
const PRODUCT_AVAILABILITY: Record<string, { start: Date; end: Date }[]> = {
  'Roundup': [{ start: new Date('2026-01-01'), end: new Date('2026-06-30') }],
  'Bumper 25 EC': [{ start: new Date('2026-07-01'), end: new Date('2026-12-31') }],
  'Confidor': [{ start: new Date('2026-08-01'), end: new Date('2026-08-31') }],
  'Karate Zeon': [{ start: new Date('2026-09-01'), end: new Date('2026-12-31') }],
  // Registered through Mar 6, 2024 only — every later date is disabled.
  // Seeded on Plot 1's first treatment row to demo the disabled-dates state
  // and, when a later date is pasted in over the picker, the paste-fallback
  // toast on Save.
  'Copper oxychloride': [{ start: new Date('2024-01-01'), end: new Date('2024-03-06') }],
  // 'DECIS FLUX®' is unrestricted.
};

/** True when `product` has no registered restriction, or `date` falls
 *  inside one of its available windows. Missing product/date always passes
 *  — there's nothing yet to validate against. */
export function isProductAvailableOnDate(product: string | null | undefined, date: Date | null | undefined): boolean {
  if (!product || !date || isNaN(date.getTime())) return true;
  const windows = PRODUCT_AVAILABILITY[product];
  if (!windows) return true;
  return windows.some((w) => date >= w.start && date <= w.end);
}

/** Products available on `date`, in the same order as PRODUCT_OPTIONS.
 *  Returns every product when `date` is unset — nothing to filter by yet. */
export function availableProductsForDate(date: Date | null | undefined): string[] {
  if (!date || isNaN(date.getTime())) return PRODUCT_OPTIONS;
  return PRODUCT_OPTIONS.filter((p) => isProductAvailableOnDate(p, date));
}
