# Changelog / decisions log

Chronological record of why the prototype looks the way it does. Newest first.

## Draft state V5 — Save anytime + gated forecast generation
- **V5 evolved past a simple "relax validation" experiment** into a separation between *saving* and *forecast-generation gating*. All fields still display as required (red asterisks), but the AddPlot footer becomes three buttons: **Cancel · Save as draft · Save**. Save = full validation; Save as draft = only Plot name required. Toasts distinguish the two paths.
- **Forecast tab branches into 3 states** based on data completeness (in `variants/draft-state-v5/PlotDetailPage.tsx::DraftForecastEmpty`):
  1. **Plot is a draft** → gate dialog → **`EditPlotDialog`** (Add-plot form rendered as a Dialog). Save updates the plot, navigates to Treatments tab.
  2. **Plot complete + draft treatments** → **`CompleteTreatmentsDialog`** preloaded with just the draft treatments. No Add button, no plot selector. CTA "Get forecast" persists via `updateTreatments()`.
  3. **All complete** → renders the real baseline `ResidueForecastContent` inline.
- **Reusable extractions (live in `main/`, not the variant folder):**
  - **`AddPlotForm`** — form body extracted from `AddPlotPage`. Imperative handle: `submit()` (full validation) + `submitAsDraft()` (plotName-only). `bordered?` prop for use inside dialogs. `onSubmit(values, {asDraft})` so the parent toast knows the path.
  - **`EditPlotDialog`** — modal wrapping `AddPlotForm` for finishing a draft plot. Adds cross-field rule: **planting date ≤ earliest treatment date** (inline error + `maxDate` on the DatePicker).
  - **`CompleteTreatmentsDialog`** — modal wrapping `TreatmentsGrid` for finishing draft treatments.
- **Data plumbing:** `data/plots-data.ts` gained `useTreatmentsVersion()` (useSyncExternalStore-based version counter) + `updateTreatments(rows)` (in-place patch + version bump). `EditableDataGrid` + `TreatmentsGrid` got `getAllRows()` on the handle so dialogs can read their grid state on save.
- **Empty-state copy aligned to canonical Lokalise keys** for the Residue forecast empty state: `plotPredictionDetail.noData.l1` → "Get your residue forecast" · `l2` → "Generate a forecast for this plot." · `plotDetails.getPredictions` → "Get forecast".
- **DS fix:** `design-system/EmptyState` now centres consistently regardless of parent layout (`height: 100%` + `minHeight: 400` + `flexGrow: 1`). Previously relied on the parent being a flex column.
- **New seed plot:** **plot 11 "Pilot Field (incomplete treatments)"** + draft treatments `t7`/`t8` — dedicated demo case for branch 2.

## New projects: Spray plans + Draft state · Lab V6 master–detail · concept deck · AI-design process
- **Two new projects, 4 real variants each:**
  - **Spray plans** (`spray-plans-v1…4`) — plan a programme with **Planning status** (Pending→Completed, user-managed) + a **simulate→commit→execute** lifecycle. Archetypes: Plan list (lean), **Planning board** (best — Kanban, status-by-move + inline sprays), Lifecycle stepper, Calendar planner. New store `data/spray-plans-data.ts`; injected as a **Spray plans tab** via a new additive `extraTabs` prop on baseline `PlotDetailPage`.
  - **Draft state** (`draft-state-v1…4`) — **system-derived** Draft vs Complete (incomplete mandatory data). Archetypes: Badge + filter (lean), **Inline completion** (best — fill missing fields in place, autosave, live progress), Drafts tray, Status + side-panel. Completeness model in `plots-data` (`getPlotCompleteness`/`isPlotDraft`, `PLOT_MANDATORY`, `updatePlot`) + seeded drafts (plots 9–10, treatment t6); variants override `PlotsPage`.
- **Lab management V6 — Master–detail** (`v7-lab-master-detail`): two-pane samples ↔ their reports/results on one screen (the 1 sample → N reports chain); add-report inline (select/create lab).
- **Navigator** (`variants/projects.ts`) now: Lab management (V1–V6), Spray plans, Draft state, New onboarding flow.
- **New docs:** `docs/ux-process.md` (AI-driven design process: Research→Requirements→Ideation→Variations→Evaluation→Handoff), `docs/concepts/` (`SPEC.md`, per-project `*-discovery.md`, and a self-contained **concept-overview deck** `index.html`).
- Built largely via parallel sub-agents (each owning one `variants/<id>/` folder; registry/projects wired centrally). Verified: `vite build` green + headless-Chrome smoke over all 9 new variants + baseline (no runtime errors).

## Prototype navigator + demo SSOT + consistency pass
- The floating picker became the **Prototype navigator** — **Baseline** standalone at the top, then
  **accordion project folders** (`variants/projects.ts`): **Lab management** (V1…V5) and **New
  onboarding flow** (V1 Register flow, V2 Onboarding flow), versions numbered with a bracketed
  description. The prototype-mode switching moved here from the Header account menu; the Header
  "Demo data" chip was removed.
- Toolbar pass: top-right **Add … buttons are secondary**; the **options ⋮ hides until a row is
  selected** (UX principle "never show disabled controls"); editing a table shows a **SaveBar**
  (Save primary + Cancel neutral). MUI **calendar** in editable date cells.
- **"Sampling" tab renamed to "Lab management"** in the baseline default; v4/v5/v6 dropped their
  own label override so they **inherit** it — i.e. a baseline change now propagates to every variant.
- Removed the "Unsaved changes · click any cell…" hint from the treatments count bar.
- **Demo content SSOT** (`data/demo-content.ts`): signed-in persona = **Lyle Peterer**, read
  dynamically by the Header (was hardcoded "anita baranyi").
- Editable-grid **date cells use the MUI calendar** now (`DateEditor` + `dateColumn` in
  `design-system/grid/grid-shared`) instead of the native `<input type="date">`.

## Restructure → SSOT + clear main/variants split
- **Deleted dead code:** unused shadcn `components/ui` (48 files) + `figma/`, and stale
  `EditableTreatmentsTable` / `TreatmentsTable` / `TreatmentSummary` (0 imports).
- **New layered structure:** `design-system/` (shared SSOT) + `lab-shared/` (shared lab pieces)
  + `main/` (baseline product, was `components/`) + `variants/` (experiments). All imports updated.
- **Deduped tables:** the duplicated Lab-reports list table + `fmtDate` extracted to
  `lab-shared/` (`LabReportsTable`, `format.ts`) and used by v5 + v6.
- **Docs:** README + CONVENTIONS + this CHANGELOG replace the old monolithic `LAB_REPORTS.md`.

## v6 — sample-first variant
- Strategy: ResiYou wants users to **start with a sample** (register → print sheet → send with the
  physical sample). That goal == the agronomist's **traceability** need. So v6 steers sample-first
  while keeping report-first one click away.
- Empty state = hierarchy (primary "Add sample report" + subtle "Add a lab report"); visible
  **sample code** column; "Print & send" first-class.
- Sample-first create → **success modal** ("Download the sample sheet, send it with your sample").
- Report-first: lab-report page has a **Sample selector** + inline **"+ Create new sample"** popup
  (type + date minimum); **Laboratory** is likewise select-or-**"+ Create new laboratory"**.
- Sample type in the create dialog is a **card selector** (Fruit/Soil/Irrigation water/Leaf), not a dropdown.

## v5 — Lab management (treatments-style)
- No per-sample editor page. Sub-tabs **Sample reports** (directly-editable AG-Grid) + **Lab reports**
  (list). Per-sample "Add lab report" opens a full creation page combining report metadata + results.
- **SSOT win:** extracted `TreatmentsGrid`'s internals into `design-system/grid/` (`grid-shared`
  + generic `EditableDataGrid`); `TreatmentsGrid` is now a thin wrapper. All three tables identical.
- Data: `LabReport.residues?` + per-report CRUD helpers (additive, backwards-compatible).

## Empty states (all screens, all variants)
- New design: illustration + title + description + CTA, **Tips & Tricks removed**. `EmptyState`
  gained `illustration` + optional `secondaryLabel`/`onSecondary`. Always centered, white card on Plots.
- Applied to Plots, Treatments, and Lab results/Sampling (baseline + v4 + v5 + v6).

## Deletion + reachability
- Real bulk delete for plots + treatments (were no-op toasts). Treatments empty state shows when the
  grid empties (`onRowCountChange`). Plots empty state shows when the current view is empty.
- Plots **season selector** with "+ Create new season".

## v2 / v3 / v4 + variant infrastructure
- Variant system: `registry.ts` + variant-aware `useNavigate` + floating `VariantPicker` + parallel
  `/v/:variantId/...` routes.
- v2 (reports table), v3 (stacked report cards + Save-All), v4 (terminology cleanup, AddPlot-style
  layout, working DatePicker, progressive flow). Shared `LabReportForm` + `EmptyState` extracted.

## Baseline
- Built the Sampling tab from the real Bayer ResiYou screens: empty state → list → sample editor
  (Sample / Lab Report / Report results), treatment-derived analytes.
