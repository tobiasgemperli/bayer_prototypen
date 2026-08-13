# V16 — Multi-report

**Built on v15, not from scratch.** V15 (`v15-production-replica`) is a
faithful rebuild of the live production app; production's own "New/Edit
Sample" flow only ever supports **one** lab report per sample (a single
Laboratory / Lab report ID / Attachments form on the "Lab Report" tab). This
variant asks: what's the lowest-effort way to add three real product needs
production doesn't have yet — **multiple reports per sample**, **creating
additional ones**, and **distinguishing API-imported reports from manually
entered ones** — without rebuilding UI that v14-sample-summary-header already
solved for exactly this?

**Answer: reuse v14's components directly, don't rebuild them.** v14 already
has a Reports list (locked/API rows, Edit/Delete, bulk actions) and a
single-purpose "Add report" popup, both built against the same generic
`LabSampleData.reports: LabReport[]` field this repo's data layer already
exposes. There's precedent for this kind of cross-variant reuse in this repo
(v8-progressive-tabs and v9-sample-form both import grid components straight
from v7-reports-table) — this variant follows the same pattern.

## What changed vs. v15

| Tab | v15 | v16 |
|---|---|---|
| Sample | — | **Unchanged.** Reused byte-for-byte (`SampleTab`, exported from v15's `LabSamplePage.tsx`) — Sample Code panel + analytical-method table included. |
| Lab Report(s) | Single Laboratory / Lab report ID / Attachments form (`LabReportForm`), one report per sample | Renamed **"Lab Reports"** (plural, since it now holds more than one). Body is v14's `ReportsCard` (imported from `v14-sample-summary-header/SampleReportPage.tsx`) — a read-only table of reports with an "Add report" button, per-row Edit/Delete, and bulk delete. Locked/API-managed reports (`report.managedBy` set) render exactly as v14 built them: disabled checkbox, muted text, a desaturated `ApiConnectionChip` badge when the lab also has a live API connection, no Edit/Delete icons, and a tooltip explaining why. "Add report" and each row's Edit icon open v14's `AddReportDialog` (imported directly) — a single-purpose popup (Laboratory + Lab report ID + drag-and-drop multi-file attachments) that only ever writes to `sample.reports`, never touches residues. |
| Report results | — | **Unchanged.** Reused byte-for-byte (`ReportResultsTab`, already exported from v15) — same required "Analytes as a result of the treatments reported" modal, same Below-LOQ confirm warning, same results table, same never-reachable-empty-state invariant. |

Nothing about the Sample tab's gating, the Report results tab's modal/warning
logic, or the plot-level Lab results list changed — this variant is scoped
entirely to the "how do reports work" question.

## Where the reused pieces come from

| Component | Source | Why it just works here |
|---|---|---|
| `SampleTab` | `v15-production-replica/LabSamplePage.tsx` (exported for this) | No changes needed — Sample Code panel and the analytical-method table are unrelated to reports. |
| `ReportResultsTab` | `v15-production-replica/LabSamplePage.tsx` | Already exported; residues are independent of how many reports exist. |
| `LabResultsContent` (Lab results tab / samples list) | `v15-production-replica/LabResultsContent.tsx` | Unrelated to the per-sample report count. |
| `ReportsCard` | `v14-sample-summary-header/SampleReportPage.tsx` | Generic over `LabReport[]` — reads/writes nothing v14-specific. |
| `AddReportDialog` | `v14-sample-summary-header/AddReportDialog.tsx` | Writes to `sample.reports` via the shared `updateLabSample` — no v14-specific coupling. |

The only genuinely new code is `ReportsTab` in this variant's own
`LabSamplePage.tsx` — a thin ~30-line wrapper that wires `ReportsCard` +
`AddReportDialog` together for this sample and filters out empty leftover
seed reports (same rationale v14 uses for the same shared seed data).

## See it with real data already in the seed

No new seed data was needed — the shared demo seed
(`data/lab-results-data.ts`) already includes samples with multiple reports,
including a locked/API-managed one:

- Plot 1's `Fruit Screen Q2 2026` sample (`ls-api-demo-1`) has **two** reports,
  both pushed in via Eurofins Schweiz AG's live API connection — open it to
  see the locked-row treatment and the `ApiConnectionChip` badge together.
- Every plot's `ls-demo-<plotId>` sample has a saved report, a draft report
  (filtered out, per the table above), and one managed report — a mixed-state
  example of the same list.

## Reach

`/v/v16-multi-report/plot/1` → **Lab results** tab → **Fruit Screen Q2 2026**
→ **Lab Reports** tab
