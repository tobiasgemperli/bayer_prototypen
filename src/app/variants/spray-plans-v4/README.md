# spray-plans-v4 — Calendar planner

**Archetype:** ③ Time-first  
**Effort / Efficiency:** ▇ / ▅

## Hypothesis

Planning sprays on a timeline (calendar) rather than a list makes gaps, clustering, and overdue
sprays immediately visible. The farmer can see the whole season at a glance and act on overdue
sprays without hunting through a grid.

## What changes vs. baseline

| Feature | Baseline | V4 |
|---|---|---|
| Spray plans UI | None | Month calendar with spray chips on dates |
| Plan selection | — | Dropdown: "All plans" (read-only view) or a specific plan (full edit) |
| Adding a spray | — | Click any day → popover with product / dose / method |
| Overdue detection | — | Planned sprays with date < today shown in red (chip + day number) |
| Plan progress | — | Side panel: executed / total counter + linear progress bar |
| Mark completed | — | "Mark plan completed" CTA appears when all sprays are executed |
| Executed sprays | — | Click chip → mark executed (green chip) or revert to planned |

## Demo today anchor

Seed spray dates are in 2024. To ensure the overdue treatment renders correctly in the demo
without depending on the real system clock, `DEMO_TODAY` is set to `new Date('2024-03-08')`.
This means the March 5 spray (Roundup, plotId=1) is treated as overdue in the demo because
it is before this anchor and still shown as `status: 'executed'` — that one passes through.
The March 12 spray (Movento, Low-residue alternative, `status: planned`) will appear overdue.

To use the real clock instead, replace `DEMO_TODAY` with `new Date()` in `SprayPlansCalendar.tsx`.

## Architecture

- `PlotDetailPage.tsx` — thin wrapper: passes `SprayPlansCalendar` as `TreatmentsContent` into `BaselinePlotDetailPage`, replacing the baseline Treatments tab body.
- `SprayPlansCalendar.tsx` — all UI:
  - `MonthCalendar` — renders a 7-column CSS grid; no third-party calendar component needed.
  - `SprayChip` — chip per spray; click opens a popover with mark-executed / delete actions.
  - `AddSprayPopover` — day-click popover to create a new spray on that date.
  - `SideSummary` — plan progress bar, overdue count, status chip, mark-completed CTA.
  - `NewPlanDialog` — create a new spray plan (name, season, kind).

## Data

Reads from and writes to `data/spray-plans-data.ts` via:
- `useSprayPlans()` (reactive)
- `addPlan`, `addSpray`, `deleteSpray`, `markSprayExecuted`, `setPlanStatus`, `planProgress`
