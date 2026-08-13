# Draft state V5 — Save anytime, mark as draft

**Reach:** `/v/draft-state-v5/`

## Hypothesis

The friction of plot creation is *required-field validation*. The user should always be able to save what they have, even when most of the form is empty — and the system should then **gate forecast generation** behind the missing data, rather than gate the *save*. This separates "I want to record this" from "this is ready to compute on", which matches the real workflow (entering the field today, finishing the data later).

## What changes vs baseline

| Area | Baseline | V5 |
|---|---|---|
| Add plot required indicators | All fields shown as required | **All fields still shown as required** (red asterisks) — V5 doesn't relax the *visual* contract |
| Add plot footer | `Cancel` · `Save` | **`Cancel` · `Save as draft` · `Save`** — three buttons. Save = full validation; Save as draft = only Plot name required |
| Plots list signal | Every row looks identical | Draft rows show a **red outlined `Draft` chip** next to the plot name |
| Residue forecast tab | Always renders the forecast view | **Three branches** depending on data completeness (see below) |

## The three-branch forecast flow

When the user lands on the Residue forecast tab and clicks **Get forecast** (canonical Lokalise copy — `plotPredictionDetail.noData.l1/l2`, `plotDetails.getPredictions`):

1. **Plot is still a draft** (any `PLOT_MANDATORY` field empty) → small gate dialog ("Complete your plot first — Before you can add a treatment, please complete your plot information.") with **Cancel | Next**. Next opens **`EditPlotDialog`** — the full Add-plot form rendered inside a Dialog. All fields required; Save persists via `updatePlot()` then navigates to the Treatments tab.
2. **Plot is complete but has draft treatments** (any treatment with empty product/method/dose) → **`CompleteTreatmentsDialog`** opens with *only* the draft treatments preloaded in an editable grid. No "Add treatment" button, no plot selector — the user is here to *finish* what's there. CTA: **Get forecast**. On save, edits persist via `updateTreatments()` and `useTreatmentsVersion()` re-renders the parent → branch 3 takes over.
3. **Everything complete** → renders the real baseline `ResidueForecastContent` inline (no empty state at all).

Edge case: plot complete + zero treatments → navigates to the Treatments tab so the user can add the first one.

## Implementation

Thin-wrapper variant — no fork. The variant adds three overrides via `registry.ts`:

- `PlotsPage` → red `Draft` chip via baseline `showDraftBadge?: boolean` prop.
- `AddPlotPage` → the three-button footer via baseline `allowDraft?: boolean` prop. Wrapper passes `allowDraft`; the prop only controls *whether the "Save as draft" button is rendered* — field labels and validation are identical to baseline.
- `PlotDetailPage` → forecast tab content via baseline `ForecastContent?: ComponentType` prop. The variant's `DraftForecastEmpty` component owns the 3-branch decision tree.

### New reusable pieces extracted to `main/`

These were built for V5 but live in `main/` because they're plot-domain primitives, not variant code:

- **`AddPlotForm`** — the AddPlot form body (state, validation, sub-modals) extracted from `AddPlotPage`. Exposes `submit()` (full validation) and `submitAsDraft()` (plotName only) via `forwardRef`. `bordered?` prop drops the `<Paper>` chrome when rendered inside a Dialog.
- **`EditPlotDialog`** — modal wrapping `AddPlotForm` for completing a draft plot. Always requires all fields. Has a cross-field rule: **planting date must be on or before the earliest treatment date** (inline error + `maxDate` on the DatePicker).
- **`CompleteTreatmentsDialog`** — modal wrapping `TreatmentsGrid` for finishing draft treatments. Stripped of "Add treatment" toolbar and plot selector. CTA is "Get forecast"; on save, calls `updateTreatments(rows)` and blocks closure if any row is still incomplete.

### Data plumbing added

- `data/plots-data.ts` — `useTreatmentsVersion()` (a `useSyncExternalStore` version counter) + `updateTreatments(rows)` (patches in place, bumps version). Lets the variant re-render when the modal saves.
- `design-system/grid/EditableDataGrid` + `main/TreatmentsGrid` — new `getAllRows()` on the imperative handle so the modal can read its grid state on save.

## Seed data for testing

- **Plot 9 "New Orchard Block"**, **Plot 10 "Trial Plot 3"** — draft plots (planting date + others missing). Test branch 1.
- **Plot 11 "Pilot Field (incomplete treatments)"** — complete plot info + two draft treatments (`t7`, `t8`). Test branch 2.
- **Plot 1 "North Field A"** — complete plot, mostly complete treatments + one draft `t6`. Mixed case.

Baseline behaviour is unchanged because every prop the variant uses defaults to off / undefined.
