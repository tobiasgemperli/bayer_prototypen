# Spray plans V1 — Plan list

**Hypothesis:** Making spray plans first-class objects with an explicit Pending/Completed lifecycle—and letting users commit a simulation to a real plan—gives agronomists just enough structure to track what they intend to spray and what has actually happened, without adding process overhead.

## What changes vs baseline

| Baseline | This variant |
|---|---|
| "Treatments" tab has a "+ New simulated plan" sub-tab with no lifecycle | **Treatments** tab body is replaced with the spray plans view (via `TreatmentsContent`) |
| Simulated plans are throwaway: no status, no execution tracking | Plans are first-class: **Pending / Completed** status, per-spray **executed** checkbox |
| No way to commit a simulation | **Convert to plan** action promotes a simulation to a committed plan |
| No execution progress visible | **Progress** column ("2/3 executed" + LinearProgress) in the plan list |

## Key design decisions

- **List-first, then detail.** Plans show as a simple MUI Table (name · season · kind chip · spray count · progress · status chip). Clicking a row opens the detail.
- **Plan detail = EditableDataGrid.** Reuses the same AG Grid editable table (dateColumn, DropdownEditor, DropdownCellRenderer) already used by Treatments.
- **Mark plan completed / Reopen** is a primary button in the detail header — the dominant action once all sprays are executed.
- **New spray plan** dialog keeps it minimal: name, season, kind toggle (Planned / Simulated).
- **SaveBar** only appears in the detail when the grid has unsaved edits (UX principle: never show disabled controls, SaveBar replaces the count bar while dirty).
- **Empty state** (no plans) hides the toolbar and shows a single CTA — consistent with existing patterns.

## How to reach it

1. Open the prototype navigator (bottom-right ⊞).
2. Select **Spray plans → V1 Plan list**.
3. Navigate to any plot, e.g. `/v/spray-plans-v1/plot/1`.
4. The **Treatments** tab now shows the spray plans view (it replaces the baseline Treatments body).
5. The list shows two seed plans for plot 1 (one planned, one simulated). Click any row to open the sprays editor.
