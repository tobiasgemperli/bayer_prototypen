# Spray plans V5 — Status column on the baseline grid

**Reach:** `/v/spray-plans-v5/plot/1` → **Treatments** tab

## Hypothesis

The baseline editable Treatments grid already does almost everything spray plans need — dates, methods, products, dose, water volume, in-place editing, dirty-state save bar, options menu. The only thing missing is **lifecycle state**. V5's job is to add that with the lightest possible footprint: a single Status column up front, a filter button in the toolbar, and a status-aware sort. No forked grid, no MUI Table, no extra tab. The user edits the same cells they always did; status is just one more cell — a Notion-flavored chip that opens a small menu.

## What changes vs baseline Treatments tab

| | Baseline | V5 |
|---|---|---|
| First column | Select checkbox | Select checkbox · **Status chip** |
| Toolbar (left) | Real / + New simulated plan sub-tabs | unchanged |
| Toolbar (right) | Add treatment · Search · Options | **Filter** · Add treatment · Search · Options |
| Sort | none by default | **Status group → date asc, nulls last** |
| Row filter | search-only | search + status filter |

Everything else — AG-Grid inline editing, the dirty-state Save bar, the action menu, the unsaved-changes flow — is the baseline. V5 does not fork the grid.

## The four statuses

| Status | Color | Meaning |
|---|---|---|
| **Draft** | light grey (`#ebebe9` / `#5e5d59`) | Just added, missing data, not ready to commit |
| **Planned** | soft blue (`#dbe7f5` / `#1f4f9c`) | Complete plan, scheduled for the future |
| **Executed** | soft green (`#d6ead9` / `#2c5a3e`) | Actually carried out — gated by completeness |
| **Removed** | soft red (`#f6d8d5` / `#7a2a2a`) | Was planned, cancelled — kept for audit |

Soft Notion palette (desaturated background + dark readable text). Polaris/SLDS-aligned: Draft is informational, not alarming.

## Sort

Two-level sort, applied by AG Grid via the status column comparator (`sort: 'asc'`, `sortIndex: 0`):

1. **Primary:** `STATUS_ORDER` index → `Draft → Planned → Executed → Removed`. Draft surfaces first so the user notices what needs attention.
2. **Secondary tiebreaker:** date ascending, nulls last.

The user can still click any column header to override.

## The Executed gate

Setting a row to **Executed** requires every required field to be filled (date, method, product, dose value + unit, water volume + unit). The gate lives in `setTreatmentStatus()` (data layer) AND in `TreatmentStatusCell` (UI). On failure the status does not change and a toast names the missing fields. Any other transition is free.

## Filter

A single button — `Filter` — opens a popover with four checkboxes, one per status, each labeled with its own colored chip. Multi-select. Default = all checked. Button label shows the active count (`Filter (3)`) when narrowed. "Show all" reset visible when narrowed.

The filter applies at the data layer (baseline `PlotDetailPage` re-computes `treatments` whenever `rowFilter` changes). Grid remounts on filter change — pending unsaved edits are lost. Acceptable for a prototype.

## Architecture / files

| File | Role |
|---|---|
| `data/plots-data.ts` | `SprayStatus` type, `STATUS_ORDER`, `STATUS_LABEL`, optional `status` field on `TreatmentData`, `setTreatmentStatus()` with gate, `getMissingTreatmentFields()` |
| `main/PlotDetailPage.tsx` | New `treatmentsCustomization` prop: `extraColumns`, `toolbarExtras`, `rowFilter`, `sort` |
| `main/TreatmentsGrid.tsx` | New `prependColumns` prop, inserts after select column |
| `variants/spray-plans-v5/PlotDetailPage.tsx` | Wires up the status column + filter button + sort |
| `variants/spray-plans-v5/SprayStatusChip.tsx` | Presentational chip — receives `status` + `onSelect`, opens MUI Menu |
| `variants/spray-plans-v5/TreatmentStatusCell.tsx` | AG Grid cell renderer wrapping the chip; runs the gate, persists via `setTreatmentStatus`, syncs grid model via `node.setData()` |
| `variants/spray-plans-v5/SprayFilter.tsx` | Button + Popover + 4 checkboxes |
| `variants/spray-plans-v5/spray-status-colors.ts` | Notion-flavored color palette per status |

Other spray-plans variants (v1–v4) still use `TreatmentsContent` to fully replace the Treatments body. V5 alone uses the lighter `treatmentsCustomization` extension.

## Seed data (Plot 1)

| ID | Status | Date | Notes |
|---|---|---|---|
| t1 | Executed | 2024-03-10 | DECIS FLUX® |
| t2 | Executed | 2024-03-05 | Roundup |
| t4 | Executed | 2024-02-20 | Confidor |
| t6 | Draft | 2024-04-02 | All fields empty |
| t9 | Planned | 2026-06-10 | Bumper 25 EC |
| t10 | Planned | 2026-07-01 | Confidor |
| t11 | Removed | 2026-05-27 | Karate Zeon |

Other variants ignore the `status` field — these rows look like normal treatments to them.
