# V14 — Sample summary header

Forked from [V13 — Two-step sample creation](../v13-report-rows).

**Hypothesis:** on the per-sample page, the Sample card (name, date,
commodity, notes) just repeats what the "Create sample" popup already
collected — and it's rarely touched again after creation. Once a sample
has reports and results, the page's job is Reports/Results; the sample's
own identity (name, date, commodity) is more useful as a compact header
than a full card competing for space. Editing those fields is still
one click away, via the same popup used everywhere else instead of
inline fields — and the same idea applies to Reports: a report is
created once and rarely tweaked, so it's a read-only summary line with
Edit/Delete instead of always-open inline fields.

## What changes vs V13

| V13 | V14 |
|---|---|
| Per-sample page shows a full "Sample" card (name, date, commodity, comments) | Sample card is gone. Page title becomes `Sample name · Sample date · Commodity`, with a "View or edit" link that opens the same Create/Edit sample popup |
| Reports card is a growing list of always-editable Laboratory/ID/PDF rows, with a trailing blank row that appears automatically | Reports card is a **static one-line-per-report overview** (Laboratory · Lab report ID · PDF) with Edit/Delete icons. "Add report" and a row's Edit icon both open `AddReportDialog` — a single-purpose report form, independent from adding results. Edit pre-fills it with that report's existing data |
| A report pushed in via the lab's direct API connection renders as plain muted text, no border, no API badge | Locked (`managedBy`) report lines look like disabled input fields (bordered, greyed) and show the condensed API badge — desaturated to match the muted state — with the lock tooltip; no Edit/Delete icons |
| Section order: Results, then Reports | Section order: **Reports, then Results** |
| Page's Save button persists sample fields + `reports` + `residues` | Page's Save button only persists `residues` — sample fields save via their own popup, reports save immediately via `AddReportDialog`, which never touches residues |
| Results grid's empty state is AG-Grid's default "No Rows To Show" | Custom, muted-text empty state: "No analytes added yet." |
| Dummy data mixes filled and empty result cells (`Below LOQ` / `Trace` with no value) and reports with no PDF | Every seeded report has a PDF attached; every seeded result has a filled-in value — no empty-looking cells in the demo data |
| Editing an existing sample reuses the 2-step Create wizard (Sample details → Next → Choose laboratory) | Editing shows every field (details + laboratory) in one view with **Save**/Cancel — no stepper, no "Next". The 2-step wizard still applies when creating a new sample |
| Card-header CTAs (`Create sample` toolbar button vs. `Add report`/`Add analyte`) render at different heights (36px vs 40px) | All card-header/toolbar CTA buttons are a consistent 40px; every dialog's Cancel/primary pair is a consistent 36px |
| Report form: Laboratory on its own row, Lab report ID + PDF share a row, single-PDF only | Laboratory + Lab report ID share one row; PDF gets its own full-width click-or-drag-and-drop zone (`ReportFields.tsx`, shared) that accepts **multiple** PDFs, listed as removable chips below it |

**Two distinct report/results entry points — not one paired flow:**
- **Samples list** ("Samples & Reports" table + the post-creation success popup): the quick action is still a combined 2-step wizard, **Report → Next → Results → Save** (`AddReportAndResultsDialog.tsx`) — a fast one-shot way to set up both without opening the sample. Same as V13.
- **Individual sample page**: Reports and Results are two fully independent actions. "Add report" / a report row's Edit icon open `AddReportDialog.tsx` (single-step, Save only, never touches residues). "Add analyte" adds a row directly to the Results grid — no popup at all.

All other v13 behavior (per-report Laboratory field, always-visible
Results grid mounted from the start, condensed API tags, breadcrumb
current-page crumb, etc.) is unchanged.

## Results filter: All / Detected only

Added after the fact, independent of the V13 diff above. The Results card's
header now has a 2-pill segmented toggle — **All** / **Detected only** — next
to "Add analyte". "Detected" means `residueLevel` is `Residue` or `Trace`
(the same `isDetected` helper the plot-detail Lab results status line already
uses); `Below LOQ` / `Not analyzed` / unset all count as "not detected" and
are hidden by the "Detected only" pill.

This intentionally isn't a single on/off switch. An earlier version of this
same idea shipped in `v15-production-replica` as a "View below LOQ"
switch, and it reads ambiguous — it's not obvious from the label alone
whether checking it *adds* or *removes* rows. A segmented toggle removes that
translation step: whichever pill is highlighted *is* what you're looking at,
nothing to interpret.

Implementation note: `ResultsCard`'s grid is the real AG-Grid-backed
`LabResiduesGrid` (`EditableDataGrid` underneath), which captures its
`residues` prop as `initialData` once and ignores later updates — so the
toggle can't just filter the array in place. `ResultsCard` keys the grid on
`resultsFilter` (`key={resultsFilter}`) to force a clean remount with the
already-filtered array whenever the pill changes. Since every committed edit
is flushed into the parent's `residues` state immediately (not just on the
page's own Save), remounting never loses a saved edit — only a cell edit
that's mid-keystroke at the exact moment the filter flips, an accepted
trade-off matching how this repo's Treatments grid already remounts on
"Cancel changes".

**Not applied to v15's toggle in this pass** — this was scoped to giving V14
a clearer version, not revising v15's existing one. The same segmented
pattern would translate directly if that toggle also gets updated later.

## Files

| File | Role |
|---|---|
| `PlotDetailPage.tsx` | Wrapper — mounts `LabManagementContent` as the `SamplingContent` prop of `BaselinePlotDetailPage` |
| `LabManagementContent.tsx` | Samples & Reports tab body — table + empty state + create/edit flows + the "Add report & results" quick-add popup. Filters the shared seed down to this variant's 3-state story (no report/results yet, manual, API-imported) |
| `SamplesReportsTable.tsx` | Read-only table of samples with an "Add report & results" row action; row actions use the shared `RowActionButton` (design-system/grid/grid-shared) instead of ad hoc styles |
| `SampleFormDialog.tsx` | 2-step Create sample popup; single-step Save/Cancel form when editing an existing sample |
| `SampleCreatedDialog.tsx` | Confirmation popup shown after creating a sample; "Add report & results" link opens the combined wizard |
| `SampleReportPage.tsx` | Full per-sample page — no Sample card; title line + "View or edit"; Reports overview card then Results card |
| `ReportFields.tsx` | Shared report-fields layout (Laboratory + Lab report ID row, multi-file PDF drop zone + chip list) — single source used by both dialogs below |
| `AddReportDialog.tsx` | **Sample-page** single-purpose report popup — supports **create** (blank) and **edit** (`editingReport` prop). Never touches residues; adding results is a separate action on the Results card's own grid |
| `AddReportAndResultsDialog.tsx` | **Samples-list** 2-step Report → Results wizard (Next → Save) — the list's convenience quick-add, distinct from the sample page's independent actions |
| `LabAutocomplete.tsx` / `AddLaboratoryDialog.tsx` | Shared laboratory picker + "Add laboratory" mini dialog (unchanged from V13) |

## Reach

`/v/v14-sample-summary-header/plot/1` → **Samples & Reports** tab → open any sample
