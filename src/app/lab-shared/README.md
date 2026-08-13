# lab-shared/

Lab-domain building blocks shared across `main/` and the lab variants (v5, v6, …).
Generic primitives go in `design-system/`; anything lab-specific that's reused goes here.

- `LabReportForm` — Laboratory + Lab report ID + Attachments (baseline, v2, v3).
- `LabReportsTable` — read-only list of a plot's lab reports (PlotsTable-style); used by v5 + v6.
- `LabMultiSelect` — multi-select "Send sample to" laboratory picker (checkbox rows, closed-state
  shows placeholder / one name / "N selected") with the "+ Add laboratory" mini-dialog built in;
  used by v10 + v11.
- `format.ts` — `fmtDate` and other lab formatting helpers.
