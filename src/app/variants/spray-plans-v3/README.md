# Spray plans V3 — Lifecycle stepper

**Archetype:** ② Lifecycle-first  
**Effort / Efficiency:** ▅ / ▅

## Hypothesis

The simulate → plan → execute progression is the core mental model for spray management.
Making it explicit — as a horizontal stepper on each plan — grounds the user's status
management in the real-world operation, rather than an opaque dropdown or chip.

## What changes vs baseline

- The **Treatments** tab body is replaced with the spray-plan lifecycle view via the baseline's `TreatmentsContent` prop (baseline untouched).
- Each spray plan is rendered as a **panel** with a horizontal MUI Stepper across four stages:
  **Simulated → Planned → In progress → Completed**.
- The active step is **derived from data** (kind + execution counts + status), never set manually.
- Sprays are listed below the stepper as a compact table with an **Executed checkbox** + executed date.
- Stage-appropriate primary actions surface only when actionable (no disabled controls):
  - From *Simulated*: **Commit to plan** (converts to a live planned plan).
  - When all sprays executed and plan not yet closed: **Confirm completed** with helper text "All sprays executed".
  - When completed: **Reopen** (secondary, neutral).
- **Add spray** (outlined) is always available while a plan is open.
- **New plan** creates a simulated plan by default.
- Empty state hides the toolbar entirely; the EmptyState CTA ("New spray plan") is the only action.

## Files

- `PlotDetailPage.tsx` — thin wrapper; passes `SprayPlansLifecycle` as the baseline's `TreatmentsContent`.
- `SprayPlansLifecycle.tsx` — list + panel rendering, step derivation, action wiring.
- `README.md` — this file.

## Data

All state from `data/spray-plans-data.ts` (`useSprayPlans`, `addPlan`, `addSpray`,
`convertToPlanned`, `markSprayExecuted`, `setPlanStatus`, `planProgress`, `suggestedStatus`).
No local state stored here beyond React component state.
