# Multiple treatments → plots V1 — Inline plot validation

**Reach:** `/v/multiple-treatments-v1/` → Plots list → multi-select plots → Options ▾ → **Add applied treatments to plots**. Or `/v/multiple-treatments-v1/plot/1` → Treatments tab → multi-select treatments → Options ▾ → **Copy treatment to plots**.

## Hypothesis

A treatment's spray date is meaningful only *after* the crop is planted. When a user bulk-applies one set of treatments to many plots, they can accidentally pair a spray date with a plot whose planting date is later — a logically impossible combination.

V1 surfaces this edge case **at the source** (the per-plot chip in the selector), in plain language, without blocking the user. The submit succeeds for the compatible plots and clearly reports what was skipped. Underlying patterns: NN/g hostile-patterns (validate at action time, place errors near source), Material 3 button copy + dialog spec, Linear / Salesforce bulk-edit conventions.

## What changes

### Plots list (`PlotsPage` override)

| | Baseline | V1 |
|---|---|---|
| Season filter | Optional. "All seasons" allowed. | **Required.** Defaults to the season of the plot with the latest planting date. Clearing snaps back to that default — never empty. Placeholder reads "Season". |
| Crop filter | Optional | unchanged |
| Plot list columns | Plot · Owner · Variety · Location · Last real treatment | **Plot · Planting date · Owner · Variety · Location · Last real treatment** — new column is sortable. |

### Bulk-apply dialog (`MultipleTreatmentsModal`)

Replaces `main/TreatmentModal` for the bulk row-actions on both Plots list and Treatments tab.

- **Layout.** Sticky header (title + close X), scrollable body, sticky footer (Cancel + primary CTA). The body has a subtle CSS-only scroll-shadow at top/bottom that telegraphs "more content here." Maximum height = `100vh - 64px` so the user always sees the modal frame. Material 3 dialog spec.
- **Plot selector** (`PlotsSelectorWithDates`) replaces `PlotsSelector`:
  - Each dropdown option shows the planting date as muted secondary text.
  - When a plot's `plantingDate` is **after** the earliest treatment date in the grid:
    - The dropdown option's secondary text turns red and reads `· conflict`.
    - A warning icon (`WarningAmber`) renders inline.
    - The selected-chip below the selector gets a **red border + warning icon**.
    - Tooltip on hover: *"Planted DD MMM YYYY — after the earliest treatment date (DD MMM YYYY)"*.
- **Submit CTA copy** rewrites itself: `Apply to 3 plots` when all compatible, `Apply to 1 plot (2 incompatible)` when some aren't. Material 3 action-oriented button copy.
- **Submit behaviour** (smart-skip): clicking applies to the valid plots and shows a toast: *"Treatments added to 1 plot. 2 skipped (planting date conflict)."* If ALL selected plots are incompatible, the action is blocked with a single explanation toast — the user has no successful work to commit.
- **Banner under the selector** lists incompatible plots by name so the user can recover without scrolling: *"2 plots are incompatible: Plot B, Plot C. They will be skipped."*

## Architecture

| File | Role |
|---|---|
| `main/PlotsPage.tsx` | New props `requireSeasonFilter`, `showPlantingDate`, `TreatmentModalComponent` |
| `main/PlotDetailPage.tsx` | New prop `TreatmentModalComponent` |
| `main/PlotsTable.tsx` | New prop `showPlantingDate` (adds sortable column) |
| `variants/multiple-treatments-v1/PlotsPage.tsx` | Thin wrapper passing the three new props |
| `variants/multiple-treatments-v1/PlotDetailPage.tsx` | Thin wrapper passing the modal component |
| `variants/multiple-treatments-v1/MultipleTreatmentsModal.tsx` | The V1 dialog — sticky chrome + scroll-shadow + validation + smart-skip |
| `variants/multiple-treatments-v1/PlotsSelectorWithDates.tsx` | The new selector — planting date as secondary text, warning chip, tooltip |

## Research basis

See `research/multiple-treatments-research.md` for the cited UX patterns: NN/g hostile-patterns, M3 dialog/list/button specs, Atlassian modal, Linear bulk-edit, Salesforce SLDS smart-skip.

## Roadmap

V1 picks the "**per-item indicator + count-on-submit + smart-skip**" pattern. Possible later variants:

- **V2 — Compatibility-first filter.** Incompatible plots simply don't appear in the dropdown; tooltip on a "Show incompatible" toggle explains why.
- **V3 — Two-step wizard.** Step 1: pick treatments + dates. Step 2: pick plots, with explicit reasons rendered next to each excluded plot.
- **V4 — Visual timeline.** A small horizontal timeline below the selector shows treatment dates as dots and each selected plot's planting date as a marker. Visual at-a-glance compatibility.

V1 is the most flexible default — never blocks the user, always communicates.
