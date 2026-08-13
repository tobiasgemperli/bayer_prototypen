# v5 — Lab management

Treats lab work exactly like the **Treatments** tab: no separate per-sample editor
page — everything lives in a directly-editable grid with sub-tabs.

## Hypothesis
Users already know the Treatments table (inline-editable AG-Grid). Reusing that exact
interaction for samples removes a whole navigation layer (the v4 Sample/Reports/Results
editor) and makes lab data feel like just another table to fill in. Lab reports, which
are heavier (metadata + results), get their own full creation page — like creating a plot.

## Structure
- 4th plot tab renamed **`Lab management`** (reuses baseline `PlotDetailPage` via its
  `samplingTabLabel` + `SamplingContent` props — no page fork).
- Two sub-tabs inside (treatments-style strip):
  - **Sample reports** — editable grid, columns:
    `Sample name · Sample type · Sample date · Notes · Print sample report · Add lab report`
    - `Print sample report` column header has an info tooltip explaining the printable PDF
      is attached to samples sent to the lab (to trace which sample → which report).
    - `Add lab report` is a **per-row** action → opens the lab report creation page for
      that sample.
    - Inline edits auto-persist to the sample store; `Save changes` mirrors the
      treatments dirty-indicator UX.
  - **Lab reports** — read-only list (PlotsTable-style) of every report on the plot,
    click a row to open/edit it.

## Lab report creation page (`/plot/:id/lab-report/new?sample=:sampleId`, `/:reportId` to edit)
- Full page in the AddPlotPage shell (breadcrumb + pinned action bar).
- Combines **lab report metadata** (Laboratory selector + Lab report ID + Attachments,
  with the linked sample shown) and **report results** in one place.
- Results are managed in the same editable grid as treatments
  (`Analyte · Residue level · Residue (mg/kg) · Method LOQ (mg/kg)`).
- A report always belongs to exactly one sample.

## Reuse / SSOT notes
- The Treatments AG-Grid was refactored into a shared core:
  - `components/grid/grid-shared.tsx` — theme, CSS, editors (Dropdown/Date), header,
    select-all + row checkbox, dropdown cell renderer, `selectColumn`.
  - `components/grid/EditableDataGrid.tsx` — generic editable grid (dirty tracking,
    add/delete/save/filter, clipboard) driven entirely by `columnDefs`.
  - `TreatmentsGrid` is now a thin wrapper over `EditableDataGrid`; v5's two grids use
    the same core, so all three tables look and behave identically.
- Data layer: `LabReport` gained an optional `residues?: LabResidue[]` (per-report
  results) plus `addLabReport / updateLabReport / deleteLabReport / getLabReportsForPlot /
  findLabReport`. Additive and backwards-compatible.

## Compare side-by-side
- Baseline: http://localhost:5174/plot/1
- v5: http://localhost:5174/v/v5-lab-management/plot/1

## Open questions
- Should `Save changes` be removed since sample edits auto-persist, or kept for parity?
- Should the Lab reports list be editable inline too, or stay click-to-open?
- Residue (mg/kg) is editable for all levels here — restrict to level = `Residue` like v4?
