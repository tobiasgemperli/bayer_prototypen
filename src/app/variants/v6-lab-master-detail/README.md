# v7 — Lab management (master–detail)

**Hypothesis:** Showing the 1 sample → N reports → results chain in a single two-pane screen —
no page-swap, no modal navigation — makes the relationship obvious and cuts the steps needed
to add a report in context.

## What changes vs baseline

| Baseline | v7 master–detail |
|---|---|
| Sampling tab = flat editable grid of samples | Sampling tab = two-pane: left list of samples, right pane of reports |
| Reports open on a separate route | Reports expand in place via accordions |
| No per-sample report management | Each accordion edits lab report ID, laboratory (select-or-create), attachments, residue results inline |
| Commodity/date managed in grid cells | Header fields in the right pane; editable with DatePicker + Select |
| No empty state for reports | Dashed empty state with "Add lab report" CTA per sample |
| Laboratory is a free text field | Laboratory is an Autocomplete with "+ Create new laboratory" |

## Files

| File | Role |
|---|---|
| `PlotDetailPage.tsx` | Wrapper — mounts `LabMasterDetail` as the `SamplingContent` prop of `BaselinePlotDetailPage` with tab label "Lab management" |
| `LabMasterDetail.tsx` | The two-pane component; exports `LabMasterDetail({ plotId })` |

## Reach

`/v/v7-lab-master-detail/plot/1` → **Lab management** tab
