# v6 — Lab management (sample-first)

Same structure as v5, but the **flow and copy are tuned to ResiYou's strategic goal**:
nudge users to **start with a sample report** (register the sample, print the sheet,
send it with the physical sample to the lab) — without blocking the report-first user.

## Why sample-first
ResiYou wants more users to register the sample up front. That goal and the agronomist's
**traceability** concern are the same thing: a sample registered *before* it reaches the
lab gives a clean Plot → Sample → Report → Result chain, and the printed sheet (with a
**sample code**) lets the returning lab result be matched to the right sample.

## What's different from v5
- **Empty state = hierarchy, not two equal CTAs.** Sample-reports empty state:
  - Primary: **“Add sample report and send to lab”**
  - Secondary (subtle link): **“Already have results? Add a lab report”**
  (`EmptyState` gained optional `secondaryLabel` / `onSecondary`.)
- **Sample code is a visible column** (monospace) — it's what travels with the sample.
- **“Print & send”** is a first-class outlined button (was a quiet link), with a header
  tooltip explaining the print → send → auto-link loop.
- **Lab reports tab has its own “Add lab report”** button + a report-first empty state.
- **Lab report page = sample selector, not a fixed pick.** The `Sample` field is an
  Autocomplete: choose an existing sample **or “+ Create new sample”** (popup capturing
  the traceability minimum: type + date, name optional). `?sample=` pre-selects when you
  start from a sample row. A report still **requires** a sample to save.

## Two entry paths, one model
- **Sample-first (promoted):** Add sample report → lightweight create dialog (type + date)
  → **success modal** prompting to **Download the sample sheet** (shows the sample code)
  and send it with the sample. Stays on the Sample reports tab — no redirect.
- **Report-first (kept smooth):** Lab reports tab → Add lab report → choose/create the
  sample inline (same `CreateSampleDialog`, **no** success modal — you just continue with
  the results). The created sample shows up in the Sample reports tab (1 sample → N
  reports stays intact).

Both dialogs live in `SampleDialogs.tsx` (`CreateSampleDialog` + `SampleSuccessModal`),
shared between the tab and the lab-report page.

## Reuse
- Same shared `EditableDataGrid` / `grid-shared` as Treatments + v5.
- Same data helpers (`addLabReport` / `findLabReport` / …); `LabReport.residues?` carries
  per-report results.

## Compare
- v5: http://localhost:5174/v/v5-lab-management/plot/1
- v6: http://localhost:5174/v/v6-lab-management/plot/1

## Open questions
- Does the lab actually reference the printed sample code? (The auto-link promise only
  holds if it does.)
- Should an orphan-ish report (no type/date on its sample) be flagged “incomplete”?
