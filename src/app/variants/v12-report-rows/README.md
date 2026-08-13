# V12 — Report rows + unified results

Forked from [V11 — Samples & Reports page (copy)](../v11-sample-report-page).

**Hypothesis:** V10/V11 render one full card per lab report, each with its own
embedded results grid — there's no single place to see every result for a sample,
and no way to tell which report a given analyte came from. Splitting "Reports"
(the ID + PDF artifacts) from "Results" (the analyte data) into two focused cards,
with a shared results grid that says which report each row came from, turns the
page into an actual sample-wide summary instead of N disconnected report cards.

## What changes vs V11

| V11 | V12 |
|---|---|
| One card per lab report ("Lab report 1", "Lab report 2", …), each with its own ID + PDF + Notes + results grid | One "Reports" card holding a growing list of ID + PDF rows (two 50/50 columns); a new empty row appears automatically once the current last row has data |
| Row delete lives in each card's header | Delete icon appears at the end of a row once it has data |
| Results grid is per-report (no way to see all results at once) | One "Results" card, one shared grid for the whole sample, with a "Lab report" column (dropdown) saying which report each result belongs to |
| Recommended analyte chips disappear once clicked (no duplicates) | Chips stay visible and clickable — the same analyte can be added more than once, since results can come from different reports |
| Deleting a report has no orphan handling (each report owns its own residues) | Deleting a report row leaves its linked results in place; their "Lab report" cell shows a warning (no cascade delete, no data loss) |
| Table's "Add report & results" row action navigates to the full page | Same action opens a 3-step popup instead (Report → Results → Success), so a report can be added without leaving the table. The post-creation "Sample created" dialog's same-named button does the same. Clicking a sample row still opens the full page. |

## Files

| File | Role |
|---|---|
| `PlotDetailPage.tsx` | Wrapper — mounts `LabManagementContent` as the `SamplingContent` prop of `BaselinePlotDetailPage` |
| `LabManagementContent.tsx` | Samples & Reports tab body — table + empty state + create/edit flows + the quick-add popup |
| `SamplesReportsTable.tsx` | Read-only table of samples with an "Add report & results" row action |
| `SampleFormDialog.tsx` | Popup form for creating/editing a sample, with lab selection (API-connected labs tagged) |
| `SampleCreatedDialog.tsx` | Confirmation popup shown after creating a sample |
| `SampleReportPage.tsx` | Full per-sample page: Sample info, Reports card (row list), Results card (shared grid) |
| `AddReportResultsDialog.tsx` | 3-step popup: add a report (ID + PDF) → add its results → success screen (Close / Add another report) |

## Reach

`/v/v12-report-rows/plot/1` → **Samples & Reports** tab
