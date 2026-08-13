# v2 — Reports table (plots pattern)

## Hypothesis
One sample can be sent to multiple labs / re-analysed multiple times. The Lab Report tab should support N reports per sample. Reuse the familiar "plots table → click row → edit form" interaction so users don't need to learn anything new.

## What's different from baseline
- **Lab Report tab is a table**, not a single form.
  - Columns: Lab name · Lab report ID · Attachments · Actions
  - "+ Add lab report" button above the table.
  - Empty state with sad-box icon + "Add lab report" CTA — same visual language as the Sampling empty state.
- **Click "Add" or a row** → tab content swaps to the edit form (Laboratory + Lab report ID + Attachments) with a back chevron.
- **Save** returns to the table view; row reflects the saved data.
- **Delete** action per row.

## Why a search param instead of a deep route
Routes are statically declared at the app level. Using a `?report=new|<id>` search param keeps the swap inside `LabSamplePage` without touching the global route tree — leanest for FE. URL still updates so browser back works.

## Files overridden
- `LabSamplePage.tsx` — replaces the Lab Report tab's content. Sample tab and Report results tab are reused from baseline.

## Compare side-by-side
- Baseline: http://localhost:5173/plot/1/lab-results/<sampleId>
- v2: http://localhost:5173/v/v2-reports-table/plot/1/lab-results/<sampleId>

## FE/BE effort estimate
- **FE**: Medium. Needs a list-detail toggle within the tab, route-state preservation, per-row delete confirmation.
- **BE**: Medium. New endpoints `POST/GET/PUT/DELETE /samples/:id/reports/:reportId` (RESTful). Migration: existing single-report fields become first row.
