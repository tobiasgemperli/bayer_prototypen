# V13 — Two-step sample creation (lab as step 2)

Forked from [V12 — Report rows + unified results](../v12-report-rows).

**Hypothesis:** the "Create sample" popup asked for the lab in the same
breath as the sample's own details, so the sample-vs-lab framing got lost.
Splitting it into two steps — **Sample** (name, date, commodity, notes) then
**Laboratory** ("where do you plan to send this sample?") — makes the lab
choice its own decision, and sets up a clear payoff: the very next screen
(the existing post-creation success dialog) already tells the user what
happens next depending on that choice.

## What changes vs V12

| V12 | V13 |
|---|---|
| `SampleFormDialog` is a single screen: name, date, commodity, lab, notes, then "Create sample" | `SampleFormDialog` is a 2-step stepper (`Sample` → `Laboratory`, same `Stepper`/`StepLabel` pattern as `AddReportResultsDialog`). Step 1 collects name/date/commodity/notes; step 2 is just the lab picker, framed as "Where do you plan to send this sample?" with a Back/Continue → Create sample flow |
| — | Step 2 shows an inline hint under the lab field once an API-connected lab is chosen ("results will import automatically") |
| Success screen after creation | **Unchanged** — `SampleCreatedDialog` already branched on `labHasApiConnection`: API labs get "We will take care from here… you'll be notified by email", non-API labs get "Download the sample sheet… once you have the report back, add the results directly." V13 just makes the lab choice that drives this branch its own step. |

## What changes vs V11 (inherited from V12, unchanged so far)

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
| `SampleFormDialog.tsx` | 2-step popup: **Sample** (name/date/commodity/notes) → **Laboratory** (lab picker, API-connected labs tagged) |
| `SampleCreatedDialog.tsx` | Confirmation popup shown after creating a sample |
| `SampleReportPage.tsx` | Full per-sample page: Sample info, Reports card (row list), Results card (shared grid) |
| `AddReportResultsDialog.tsx` | 3-step popup: add a report (ID + PDF) → add its results → success screen (Close / Add another report) |

## Reach

`/v/v13-report-rows/plot/1` → **Samples & Reports** tab
