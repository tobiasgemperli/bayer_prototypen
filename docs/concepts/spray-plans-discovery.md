# Spray plans — discovery & requirements

> Stage 1–2 of [`../ux-process.md`](../ux-process.md) for the **Spray plans** project. Assumption-based
> (proto-persona + assumptions are hypotheses to **validate with real users**); the chosen options are built
> as variants and catalogued in [`SPEC.md`](./SPEC.md).

## Frame
The brief introduces **Spray plans** as a new entity: growers/agronomists plan a spray programme ahead, manage its **Planning status (Pending → Completed)** against the real-world operation, and evolve today's throwaway "alternative plans" into **simulations they can commit and then execute**. This sits on the **Optimize** pillar (plan & compare programmes to hit residue targets) and feeds **Predict** (planned sprays drive the forecast) — see [`../product.md`](../product.md).

## Proto-persona (validate)
**"Marco", independent agronomist** — advises several growers, manages ~40 plots. Plans the season's sprays before it starts, adjusts as weather/pressure changes, and needs to know at a glance *what's been applied vs. still planned*. Works on laptop in the office, phone in the field. **Pain today:** simulated plans are throwaway — no status, no record of what actually happened, so the plan and reality drift apart. **"Good" feels like:** one place where a plan goes from idea → committed → done, always reflecting reality.

## Jobs-to-be-Done
- When a new season starts, **plan the spray programme** so I can forecast residues and hit retailer limits.
- When I try a what-if, **compare/simulate** alternatives, then **commit** the one I'll run.
- As the season runs, **mark sprays executed** and **close out** the plan so status reflects the field.

## Assumptions (importance × evidence — test the top one first)
1. **(High importance / Low evidence)** Users will keep planning status in sync with reality if updating is near-zero-effort. → *riskiest; validate.*
2. (High / Med) The simulate → commit → execute lifecycle matches how growers actually think about plans.
3. (Med / Low) A calendar/time view is worth the extra build over a simple list for planning.
4. (Med / Med) "Pending/Completed" at the **plan** level (not only per-spray) is the status growers want to manage.

## How-Might-We
- *How might we let a grower commit a simulation and track execution so the plan always reflects reality — with the fewest taps?*

## Success metrics
- **North Star:** % of planned sprays **marked executed on time** (plan reflects reality).
- **HEART:** Task-success & time on "update plan status"; Adoption of "commit a simulation"; Engagement with planning ahead of season.

## Options explored (→ built as variants)
Spread across the archetype spectrum so we can trade effort vs. polish (detail in `SPEC.md`):
- **V1 Plan list (① Lean)** — ships fastest; validates whether explicit Pending/Completed + commit is enough.
- **V2 Planning board (④ Best)** — direct-manipulation status moves + inline spray entry; bet on assumption #1 (low-effort updates).
- **V3 Lifecycle stepper** — makes assumption #2 (the lifecycle model) explicit and testable.
- **V4 Calendar planner** — tests assumption #3 (time-first planning, overdue nudges).

## Validate with real users
- Does plan-level Pending/Completed match growers' mental model, or do they think only in per-spray "done"?
- Board (status-by-move) vs. calendar (time-first): which do agronomists reach for when planning 40 plots?
- Is "Simulated vs Planned" a clear, useful distinction in the field?
