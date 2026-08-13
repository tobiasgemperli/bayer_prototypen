# Draft state — discovery & requirements

> Stage 1–2 of [`../ux-process.md`](../ux-process.md) for the **Draft state** project. Assumption-based;
> options built as variants in [`SPEC.md`](./SPEC.md).

## Frame
The brief introduces a **system-managed Draft state**: a record saved with mandatory data still missing (a plot with no planting date/variety; a treatment with no product/method/date) is a **Draft**; once mandatory fields are complete it's **Complete**. The system decides this from the data — it is *not* a manual toggle. This serves **Predict** (the residue forecast is only trustworthy on complete data) and **Comply** (traceability needs complete records) — see [`../product.md`](../product.md).

## Proto-persona (validate)
**"Lena", grower** — enters plots and treatments quickly, often on her phone in the field between tasks. She starts records she can't finish on the spot (the planting date is on a note at home; the product label is in the shed). **Pain today:** the app treats half-entered and complete records identically, so incomplete plots silently produce weak/blocked forecasts and she can't tell which records still need work. **"Good" feels like:** the app clearly shows *what's missing* and lets her finish it in seconds when she's back at her desk.

## Jobs-to-be-Done
- When I'm interrupted mid-entry, **save what I have** without losing it — and have the app remember it's unfinished.
- When I'm back at my desk, **see exactly which records need info** and **finish them fast**.
- Before I rely on a forecast, **know my data is complete** (trustworthy).

## Assumptions (importance × evidence — test the top first)
1. **(High / Low)** Users want to finish drafts **in place** (inline) rather than reopening a full editor. → *riskiest; validate.*
2. (High / Med) Surfacing "what's missing" explicitly increases completion (vs. silent incompleteness).
3. (Med / Low) Separating drafts into their own tray helps more than badging in-line.
4. (Med / Med) System-derived Draft (not a manual flag) matches users' expectations.

## How-Might-We
- *How might we make a half-entered record obviously unfinished and trivially completable, so forecasts run on trustworthy data?*

## Success metrics
- **North Star:** % of records **forecast-ready (Complete)** — and median time from Draft → Complete.
- **HEART:** Task-success & time on "complete a draft"; Adoption of the completion affordance; reduced Drafts left stale.

## Options explored (→ built as variants)
- **V1 Badge + filter (① Lean)** — fastest; validates assumption #2 (explicit "what's missing" + findability).
- **V2 Inline completion (④ Best)** — fill missing fields in place with autosave + live progress; bet on assumption #1.
- **V3 Drafts tray** — separates WIP from ready records; tests assumption #3.
- **V4 Status + side-panel** — workflow status pills + checklist side-panel; extends the Draft signal to **treatments** for consistency.

## Validate with real users
- Inline (V2) vs. tray (V3) vs. side-panel (V4): which gets stale drafts actually finished?
- Are the chosen mandatory fields the right definition of "complete enough to forecast"?
- Does a visible Draft state feel helpful or nagging? (tune copy/colour accordingly)
