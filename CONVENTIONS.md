# Conventions

Read this before editing UI. These rules keep the prototype a single coherent app with a
clear SSOT, and keep the **main prototype** cleanly separated from **experiments**.

## 1. The design system is MUI + `design-system/`
- The app is **100% MUI**. The old shadcn `components/ui` kit and the `figma/` folder were
  unused and have been **deleted** — do not reintroduce a parallel component kit.
- Shared, cross-cutting primitives live in **`src/app/design-system/`** (EmptyState,
  ActionMenu, OptionsTrigger, BaseDialog, MapSelectionModal, and the `grid/` core).
- Lab-domain pieces shared across main + variants live in **`src/app/lab-shared/`**
  (LabReportForm, LabReportsTable, `format.ts`).

## 2. One editable table, one read-only table
- **Editable grid = `design-system/grid/EditableDataGrid`** (generic AG-Grid core; theme,
  editors, dropdown cell, CSS all in `grid/grid-shared`). Treatments and every Lab grid use it
  — pass `columnDefs`, nothing more. `TreatmentsGrid` is a thin wrapper over it.
- **Read-only tabular data** matches `main/PlotsTable` styling (clean header, no coloured bar).
  The lab-reports list is the shared `lab-shared/LabReportsTable`.
- **Never build a second table/form/empty-state from scratch.** If a third copy is about to
  appear, extract it first.

## 3. Main vs variants
- **`main/`** = the product. Treat it as the source of truth for the baseline flow.
- **`variants/<id>/`** = experiments. Each:
  - is registered in `variants/registry.ts` (id, name, and which `OverridableKey`s it overrides),
  - has its own `README.md` (hypothesis + what changed),
  - reuses `design-system/` + `lab-shared/` + `main/`; only forks a component when behaviour
    genuinely diverges (layout/flow/structure). Label-only changes → add an optional prop to the
    baseline component instead of forking (see `PlotDetailPage`'s `samplingTabLabel` / `SamplingContent` / `extraTabs` — the last lets a project inject a whole new tab, e.g. **Spray plans**, without forking the page).
- **Variants inherit the main prototype — only differ in their difference.** Never re-hardcode a
  baseline value (tab label, copy, layout) inside a variant; let it default so a change in `main/`
  propagates everywhere. Example: the lab tab label lives only in baseline `PlotDetailPage`
  (`'Lab management'`); v4/v5/v6 don't pass `samplingTabLabel`, so renaming it changes all variants at once.
- Navigation inside a variant uses `variants/variant-context`'s `useNavigate` (auto-prefixes `/v/<id>/`).
- **Add a variant:** create `variants/<id>/`, add its components + `README.md`, add a `VARIANTS`
  entry in `registry.ts`. Routes are variant-agnostic (`VariantRoute` resolves via the registry).
- **Promote a variant** to main: move its files into `main/` (+ `design-system`/`lab-shared`),
  delete the registry entry. **Discard:** delete the folder + registry entry.

## 4. Verifying changes (don't touch the user's browser)
- The dev server is the user's — they work in parallel. **Never reload their active tab.**
  Find the prototype tab by URL match; rely on Vite HMR.
- Verify with `npm run build` (Vite resolves every import — catches broken paths/types) and, for
  visuals, a **separate headless Chrome** (own profile/port, via DevTools Protocol) or `vite preview`
  on a different port — never the user's tab.

## 5. Inspiration boundary
- `/Users/lylepeterer/Desktop/CleanUp/_Protos/Regen-Ocp-Increments-260512` is **inspiration only**
  — never modify it. Its structure (docs discipline, `components/ui` = DS SSOT, `lib/copy`,
  in-app `documentation/` route) is what this layout is adapted from. Note: we work with
  **variations of one prototype**, not increments.

## 6. Data
- In-memory stores in `data/` (`useSyncExternalStore`). `LabReport.residues?` carries per-report
  results (v5/v6). Helpers: `addLabReport` / `updateLabReport` / `deleteLabReport` /
  `getLabReportsForPlot` / `findLabReport`. Treatment→analyte map is hardcoded in `lab-results-data`.
- **Demo content SSOT:** the signed-in demo persona (name / avatar initial / email) lives in
  `data/demo-content.ts` (`demoUser`); read it (e.g. the Header) instead of hardcoding. Seed
  plots/treatments/lab rows stay in `plots-database` / `plots-data` / `lab-results-data`.
- **Spray plans** → `data/spray-plans-data.ts` (`SprayPlan`: simulated→planned + Pending/Completed status; `PlannedSpray`: planned→executed; helpers `getPlansForPlot`, `planProgress`, `setPlanStatus`, `markSprayExecuted`).
- **Draft state is derived, not stored:** `getPlotCompleteness` / `isPlotDraft` (+ treatment equivalents) in `plots-data` decide Draft vs Complete from `PLOT_MANDATORY` / `TREATMENT_MANDATORY`; `updatePlot` completes a draft. Mutating treatments goes through **`updateTreatments(rows)`** which patches in place and bumps a version counter; subscribe via **`useTreatmentsVersion()`** so components re-render after edits land via dialogs (no per-treatment store needed). Seeded drafts: plots 9–10 (draft plots), plot 11 + treatments t7/t8 (complete plot with draft treatments — for the V5 forecast-gating flow), treatment t6 on plot 1 (mixed case).
- **Plot creation form is reusable.** The AddPlot form body lives in `main/AddPlotForm` (not just inside the page) and exposes `submit()` / `submitAsDraft()` via `forwardRef`. Mount it inside a page (`AddPlotPage`) or a dialog (`EditPlotDialog`); use `bordered={false}` to drop the `<Paper>` chrome when the dialog already provides one. Equivalent pattern for treatments: `CompleteTreatmentsDialog` wraps `TreatmentsGrid` and reads its rows on save via the new `getAllRows()` handle method.

## 7. Prototype navigator
- Floating control (bottom-right, `main/VariantPicker.tsx`). **Baseline** (the main prototype) is a
  standalone entry; each **project** is an **accordion folder** containing numbered **versions**
  (V1, V2 … + a bracketed description). The taxonomy lives in `variants/projects.ts`. A version
  either swaps a lab-management variant (`variantId`, resolved via the registry) or jumps into an
  app flow (`flow`). The navigator owns the auth/demo-mode switching — the Header doesn't.
- Adding a variant = register it in `variants/registry.ts` **and** add a version row to the
  relevant project in `variants/projects.ts`.
- **Projects:** Lab management (V1–V6), **Spray plans** (variants override `PlotDetailPage`, injecting a tab via `extraTabs`), **Draft state** (variants override `PlotsPage`), New onboarding flow. Full concept overview: `docs/concepts/index.html`; design process: `docs/ux-process.md`.

## 8. UX principles
- **Never show disabled controls — hide them until actionable.** Don't render a greyed-out button.
  Examples: the row-options `⋮` (`design-system/OptionsTrigger`, returns `null` when no selection);
  the Save changes control (only appears while there are unsaved edits).
- **Table toolbars: the "Add …" button is secondary (outlined).** The primary (filled red) emphasis
  is reserved for **saving edits**.
- **Editing a table shows a save bar** (`design-system/SaveBar`): a tinted box with **Save changes**
  (primary) + **Cancel** (neutral, no brand colour). It replaces the count bar while dirty, so it's
  unmistakable that there are changes to save or discard. Cancel discards by remounting the grid.
- **Empty list = empty state only.** When a list/table is empty, hide its toolbar (Add / search /
  options) and count bar — the empty state carries the single CTA. (Baseline `LabResultsContent`
  already does this; v5/v6 hide it per active sub-tab via `currentEmpty`.)
- **The logo always goes to the Plots list** (`main/Header.tsx`), keeping the current variant prefix.
