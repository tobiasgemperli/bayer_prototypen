# v3 — Stacked reports (inline cards)

## Hypothesis
Most samples have 1-3 lab reports. Forcing a table + page-transition pattern adds clicks for the common case. Showing all reports stacked inline lets users see and edit everything at a glance, with one Save action for all.

## What's different from baseline
- **Lab Report tab is a vertical stack** of report cards.
  - First card = first report (auto-created on tab open if none exists, seeded from legacy fields if available).
  - "+ Add another lab report" button at the top adds a new card.
  - Each card has a small "Report N" header with a delete (✕) button.
  - Cards contain the same form fields as baseline (Laboratory / Lab report ID / Attachments).
- **Single Save button at the bottom** persists all reports at once.
- **No page transition**, no URL change — everything visible in one scroll.

## Files overridden
- `LabSamplePage.tsx` — replaces the Lab Report tab. Sample tab and Report results tab are reused from baseline.

## Compare side-by-side
- Baseline: http://localhost:5173/plot/1/lab-results/<sampleId>
- v3: http://localhost:5173/v/v3-stacked-reports/plot/1/lab-results/<sampleId>
- v2 (table): http://localhost:5173/v/v2-reports-table/plot/1/lab-results/<sampleId>

## FE/BE effort estimate vs v2
- **FE**: Lighter. No nested routing, no list-detail toggle, no URL state. Just an array of editable cards.
- **BE**: Lighter. Save endpoint accepts the full reports array on the sample (`PUT /samples/:id` with `reports`). No per-report endpoints needed.
- **Scaling**: At ~5+ reports the stack gets long. v2 handles that case better.

## Recommendation
- Default to **v3** unless lab reports per sample are typically >3.
- Promote v2 if user testing shows reports-per-sample averages high.
