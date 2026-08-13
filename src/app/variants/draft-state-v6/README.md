# Draft state V6 — Dates-only optional

**Reach:** `/v/draft-state-v6/`

## Hypothesis

V5 let the user save almost anything by introducing a parallel "Save as draft" path. V6 narrows that idea: in practice, only **planting date** and **flowering start date** are the fields users routinely don't have on hand at plot-creation time (the planting may not have happened yet; flowering is a future event). Every other field — name, location, crop, variety, density, etc. — the user knows up-front. So V6 makes those two dates the *only* optional fields, drops the dual-button footer, and surfaces the missing dates exactly when they matter: at forecast time.

## What changes vs V5

| Area | V5 | V6 |
|---|---|---|
| Add plot required indicators | All fields red-asterisked | Planting & flowering dates have **no asterisk** (truly optional) |
| Add plot footer | `Cancel` · `Save as draft` · `Save` | **`Cancel` · `Save`** — one path. Save passes with the two dates empty |
| Plots list signal | Red "Draft" chip on rows missing any mandatory field | Same red "Draft" chip — now meaning "not forecast-ready" (planting date is still in `PLOT_MANDATORY`) |
| Forecast branch 1 (plot needs data) | Gate dialog → full `EditPlotDialog` (12 fields) | Direct → small **`CompleteDatesDialog`** (2 fields) |
| Forecast branch 2 (draft treatments) | `CompleteTreatmentsDialog` | unchanged |
| Forecast branch 3 (everything complete) | `ResidueForecastContent` inline | unchanged |

## Implementation

Thin-wrapper variant — same shape as V5. The variant adds three overrides via `registry.ts`:

- `PlotsPage` → red `Draft` chip via baseline `showDraftBadge?: boolean` prop.
- `AddPlotPage` → drops "Save as draft" and softens the date asterisks via a new baseline `softRequiredDates?: boolean` prop.
- `PlotDetailPage` → forecast tab content via baseline `ForecastContent?: ComponentType` prop. The variant's `DraftForecastEmpty` component owns the 3-branch decision tree (now using `CompleteDatesDialog` for branch 1).

### Changes that landed in shared code

- **`PlotData.floweringStartDate?: Date | null`** — added so the form value is persisted (it was previously dropped on save). Baseline + V5 still set this when the user fills it.
- **`AddPlotForm` `softRequiredDates?: boolean`** — when true, planting + flowering dates are not validated and their labels render without the red asterisk.
- **`AddPlotPage` `softRequiredDates?: boolean`** — forwards the prop to the form and persists `floweringStartDate` through `addPlot()`.
- **`main/CompleteDatesDialog`** — new small modal: 2 date fields, `Cancel` · `Get forecast`. Cross-field rule still applies: planting date must be on or before the earliest treatment date.
- **`isForecastReady(plot)` / `getMissingForecastDates(plot)`** in `data/plots-data.ts` — derive forecast-readiness from planting + flowering dates only.

## Seed data for testing

- **Plot 12 "Vineyard South"** — every required field filled, **both dates missing**. Test branch 1: click Residue forecast → "Get forecast" → small `CompleteDatesDialog` opens.
- **Plot 11 "Pilot Field (incomplete treatments)"** — same as V5: complete plot, two draft treatments. Tests branch 2.
- **Plot 1 "North Field A"** — complete plot, mostly complete treatments + one draft `t6`. Mixed case.

Baseline behaviour is unchanged because every prop the variant uses defaults to off / undefined.
