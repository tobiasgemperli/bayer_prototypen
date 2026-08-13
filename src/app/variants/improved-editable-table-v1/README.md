# Improved editable table V1

Forked from [V17 — Design-system parity checkpoint](../v17-design-system-parity)
as the starting point for a project focused on improving the editable table
experience app-wide — not limited to Samples & Reports.

## What's changed since the V17 fork

- **Results grid (Samples & Reports) brought to interaction-design parity
  with the Treatments grid** — see `productAvailability.ts`'s sibling changes
  in `lab-shared/LabResiduesGrid.tsx`: two-tier format/required validation on
  Save (previously none), a "Search results…" box wired to the grid's quick
  filter (previously unwired), and a persistent "N total results" bar.
- **Product/Application-date cross-validation on the Treatments grid**
  (`productAvailability.ts`, wired via `treatmentsCustomization` on
  `PlotDetailPage.tsx`): the Product dropdown only offers products available
  on the row's selected date; the date picker disables dates unavailable for
  the row's selected product (with a tooltip); a paste (or any other
  interaction that bypasses both pickers) that leaves an invalid pair falls
  back to an error toast, fired only once Save actually commits
  (`treatmentsCustomization.onAfterSave`) — never on the intermediate cell
  commit itself. Copy:
  - Empty product dropdown: "No matching products for [DATE]. Only products
    allowed for this application date are shown. Change the date or search
    again."
  - Disabled date tooltip (per disabled day, not just per product):
    "[PRODUCT] can't be used on [DATE] due to product use restrictions.
    Choose another date or product."
  - Paste-fallback toast: "[PRODUCT] can't be used on [DATE] due to product
    use restrictions. Change the product or application date."
  - Demo setup: Plot 1's first treatment row (`t1` in `plots-data.ts`) uses
    Copper oxychloride, registered only through Mar 6, 2024 — open its date
    picker to see every later date disabled, or paste a later date in to
    trigger the fallback toast on Save.

- **Treatments' SaveBar corrected to match its own chrome, and drops "Save as
  draft"** — SaveBar previously rendered identically everywhere (rounded,
  margined), which reads wrong inside Treatments' otherwise edge-to-edge
  toolbar/count-bar layout. `SaveBar` gained an opt-in `variant: 'edge'`
  (square corners, bottom border, no margin — vs. the default `'rounded'`
  every other usage keeps); this project's Treatments tab uses it via
  `treatmentsCustomization.saveBarVariant`. Results' SaveBar stays
  `'rounded'` — it lives inside a card/accordion, a different layout.
  `treatmentsCustomization.hideSaveDraft` drops the "Save as draft" action
  from this project's Treatments tab specifically.

These features live in this variant's own files (plus small additive,
backward-compatible extensions to shared grid infrastructure —
`DropdownEditor`'s `noOptionsText`, `DateEditor`'s `shouldDisableDate` /
`disabledDateTooltip`, `TreatmentsGrid`'s `productColumn` /
`dateColumnOverride`, `PlotDetailPage`'s `treatmentsCustomization.onAfterSave`,
`SaveBar`'s `variant`) — baseline and every other variant are unaffected
unless they opt in. The one exception is `t1`'s seed product/date in
`data/plots-data.ts` (shared, global seed data — see demo setup above),
which now shows everywhere Plot 1's Treatments tab renders, not just here.

## Files

| File | Role |
|---|---|
| `PlotDetailPage.tsx` | Mounts `LabManagementContent` as `SamplingContent`; wires product/date validation into the Treatments grid via `treatmentsCustomization` |
| `productAvailability.ts` | Demo product↔date availability data + `isProductAvailableOnDate` / `availableProductsForDate` |
| `LabManagementContent.tsx` | Samples & Reports tab body — table + empty state + create/edit flows |
| `SamplesReportsTable.tsx` | Reports table (row/header height + checkbox width pixel-parity with the AG-Grid) |
| `SampleFormDialog.tsx` | Popup form for creating/editing a sample, with lab selection (API-connected labs tagged) |
| `SampleCreatedDialog.tsx` | Confirmation popup shown after creating a sample |
| `SampleReportPage.tsx` | Dedicated per-sample page: summary header, Reports, editable Results grid, save-confirmation dialog |
| `ReportFields.tsx` | Shared report form fields |
| `AddReportDialog.tsx` / `AddReportAndResultsDialog.tsx` / `AddResultsDialog.tsx` | Report/results creation popups |
| `LabAutocomplete.tsx` / `AddLaboratoryDialog.tsx` | Lab selection + inline lab creation |
| `AnalyteImportStatus.tsx` | Import-status indicator for API-connected labs |
| `ConfirmActionDialog.tsx` | Generic Yes/No confirmation dialog |

## Reach

- `/v/improved-editable-table-v1/plot/1` → **Treatments** tab → add/edit a
  row to see the product/date validation
- `/v/improved-editable-table-v1/plot/1` → **Samples & Reports** tab → open
  any sample → **Results**
