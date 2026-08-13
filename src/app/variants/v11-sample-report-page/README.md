# V11 — Samples & Reports page (copy)

Exact copy of [V10 — Samples & Reports page](../v10-sample-report-page) used as the
starting point for further iteration. No behavioral changes yet.

## Files

| File | Role |
|---|---|
| `PlotDetailPage.tsx` | Wrapper — mounts `LabManagementContent` as the `SamplingContent` prop of `BaselinePlotDetailPage` |
| `LabManagementContent.tsx` | Samples & Reports tab body — table + empty state + create/edit flows |
| `SamplesReportsTable.tsx` | Read-only table of samples with an "Add report & results" row action |
| `SampleFormDialog.tsx` | Popup form for creating/editing a sample, with lab selection (API-connected labs tagged) |
| `SampleCreatedDialog.tsx` | Confirmation popup shown after creating a sample |
| `SampleReportPage.tsx` | Dedicated per-sample page: Sample info, Report upload, editable Results grid |

## Reach

`/v/v11-sample-report-page/plot/1` → **Samples & Reports** tab
