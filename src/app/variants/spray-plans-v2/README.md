# spray-plans-v2 — Planning board (Kanban)

## Hypothesis

A Kanban-style board gives the highest scan-and-update efficiency for spray plans: the three planning states (Simulations, Pending, Completed) are visible simultaneously, a card's execution progress is shown as a circular progress ring at a glance, and moving a plan between states requires a single menu action instead of multiple field edits.

## What changes vs baseline

The baseline Treatments tab has no spray plan lifecycle at all — simulations are throwaway what-ifs with no status and no execution tracking. This variant replaces the Treatments tab body (via `TreatmentsContent`) with a Kanban board that contains:

- **Three Kanban columns:** Simulations (kind=simulated), Pending (planned + pending), Completed (status=completed).
- **Plan cards** with a circular progress ring (executed/total), spray chips (product abbreviation + check icon when executed), and a column-appropriate Move menu (one action changes kind + status atomically).
- **Inline quick-add spray** on every non-completed card: `+ spray` appends a row with an editable product Select, dose unit Select, and a DatePicker toggle for the planned date.
- **Per-spray executed checkbox** calls `markSprayExecuted` directly on the card.
- **"All done — Complete" nudge** button appears on a card when all sprays are executed but the plan is not yet completed.
- **Empty board** (no plans for this plot) shows the shared `EmptyState` with a single CTA.

## How to reach it

1. Start the dev server: `npm run dev` from the project root.
2. Open `http://localhost:5173/v/spray-plans-v2/plot/1` (or navigate via the Prototype navigator → Spray plans → V2).
3. Click the **Treatments** tab in the plot detail page.
