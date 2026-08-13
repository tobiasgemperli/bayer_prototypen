# Draft state V3 — Drafts tray

**Route:** `/v/draft-state-v3/`

## Hypothesis

Separating work-in-progress records from trustworthy ones reduces cognitive noise on the main list and makes finishing incomplete plots feel purposeful — users see a dedicated "Drafts" tray that explains exactly what is missing, then a guided step-by-step dialog walks them through each missing field so nothing gets overlooked.

## What changes vs baseline

| Area | Baseline | V3 |
|------|----------|----|
| Plot list | All plots shown identically | Splits into **Drafts tray** (incomplete) + **Ready plots** table (complete only) |
| Draft signal | None | Pinned amber tray with per-row "Missing: X" chips |
| Completion flow | — | **Guided stepper dialog**: one missing field per step, Back/Next/Complete |
| Empty states | Generic | Context-aware: fully empty, drafts-only, or filter-no-results |
| Filters | Season, crop, search | Same — applied before the draft/complete split |

## Key design decisions

- The **Drafts tray is hidden entirely** when there are no drafts — never an empty disabled section.
- The stepper dialog validates each field before allowing Next, preventing partial saves.
- Season/crop/search filters apply to the whole dataset first; the tray and table then each show their subset of the filtered results.
- `updatePlot` from `data/plots-data.ts` persists the patch to the reactive store — the plot leaves the tray and joins the ready list reactively upon completion.
