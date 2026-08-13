# ResiYou Design Prototype — AI Context

## Project Identity
ResiYou (Bayer) is an AI-driven crop-protection residue management platform for fruit and vegetables. **This repo is a frontend-only design sandbox** — Vite + React 18 + MUI 7 + AG-Grid Enterprise 35. No backend. Data resets on reload; lab samples persist to localStorage for cross-tab access. Purpose: prototype and compare UI/UX interaction variants for the real ResiYou product.

## Product Context
**Three pillars:** Predict (residues at harvest per substance, ppm, % MRL, % ARfD) / Optimize (compare real vs simulated spray programs) / Comply (legal MRL + retailer/secondary limits). **Business model:** forecast credits — Easy/10, Professional/30, Platinum/100. **Crops covered:** strawberries, pome fruits, stone fruits. **Demo user:** Lyle Peterer (lyle.peterer@bayer.com).

**Domain vocabulary** (use in UI copy): Plot / Treatment-application / Active substance-analyte / Residue (mg/kg, ppm) / MRL, % MRL / ARfD, % ARfD / Secondary standard (retailer limit) / Residue forecast / Simulated plan / Sample, Lab report, Analytes, Residue levels / Sample sheet / Commodity (Fruit, Soil, Irrigation water, Leaf) / Forecast credit.

## Tech Stack
React 18 + TypeScript / MUI 7 (brand primary #d4183d, M3 type scale, Inter font) / AG-Grid Enterprise 35 / React Router 7 / Vite 6 / date-fns 3 + @mui/x-date-pickers / sonner 2 / Tailwind CSS 4 (configured but MUI sx is primary design system) / Path alias: @ -> ./src

## Architecture
```
src/app/
  App.tsx                  ThemeProvider + LocalizationProvider + Toaster + RouterProvider
  routes.tsx               baseline routes + /v/:variantId/* variant routes
  theme.ts                 MUI theme (brand tokens, M3 type scale, soft button variant)
  main/                    BASELINE product — source of truth for all variants
  design-system/           shared primitives: EmptyState, SaveBar, ActionMenu, BaseDialog,
                           OptionsTrigger, FormField, MapSelectionModal, PlotTabs, TableCard,
                           ReminderBar, AttachmentChip, PageLayout, status-colors
  design-system/grid/      AG-Grid core: EditableDataGrid, grid-shared (theme+editors),
                           validation, ErrorRowRenderer, draft-state
  lab-shared/              lab-domain shared: LabReportsGrid, LabReportsTable, LabReportForm,
                           LabResiduesGrid, format.ts
  variants/                experiments (each folder = one variant + README.md)
  variants/registry.ts     VARIANTS array (id, name, description, component overrides)
  variants/projects.ts     PROJECTS array (navigator accordion taxonomy)
  variants/variant-context.tsx  VariantProvider + variant-aware useNavigate
  data/                    in-memory reactive stores (useSyncExternalStore)
  assets/empty-states/     illustration JPGs for EmptyState components
  styles/                  index.css, fonts.css, tailwind.css, theme.css
```

## Data Layer
All stores use useSyncExternalStore with module-level mutable variables + listener Set.

| File | Stores | Notes |
|---|---|---|
| plots-data.ts | PlotData[], TreatmentData[] | SSOT. Completeness: getPlotCompleteness, isPlotDraft, PLOT_MANDATORY, TREATMENT_MANDATORY. Draft = derived, never stored. |
| lab-results-data.ts | LabSampleData[] | localStorage-persisted (resiyou:lab-samples:v3). LabReport, LabResidue types. Cross-tab for /sample-sheet/:sampleId. |
| spray-plans-data.ts | SprayPlan[] | PlanKind (simulated/planned), PlanStatus (pending/completed). |
| auth-state.ts | AuthPhase, DemoMode, OnboardingStep | Prototype navigation modes. |
| demo-content.ts | demoUser | Signed-in persona SSOT. Read by Header instead of hardcoding. |
| plots-database.ts | DEPRECATED Plot[] | Legacy flat array (string dates). Referenced in AddPlotForm. Being phased out. |

## Routes
```
/                            Plots list
/plot/:id                    Plot detail (tabs: Treatments, Residue forecast, Lab management)
/plot/:id/lab-results/new    Baseline lab sample editor (new)
/plot/:id/lab-results/:id    Edit existing sample
/add-plot                    Add plot form
/signup                      Register flow
/sample-sheet/:sampleId      Printable A4 sample sheet (new tab via window.open)
/explore/table-actions*      Standalone component demos (outside variant system)
/v/:variantId/...            Variant mirror of baseline routes
```

## Variant System
registry.ts defines 6 overridable slots: PlotsPage, PlotDetailPage, LabSamplePage, AddPlotPage, LabReportPage, SampleReportPage. A variant only declares the components it overrides — rest fall back to baseline. projects.ts controls the navigator accordion taxonomy.

**Add a variant:** create variants/<id>/ + README.md (hypothesis + what changes), add to VARIANTS in registry.ts, add version entry to PROJECTS in projects.ts.
**Promote to baseline:** move files to main/ (or design-system/lab-shared/), delete folder + registry entry.

## Active Design Projects
| Project | Navigator | Variant IDs | Overrides |
|---|---|---|---|
| Lab management | V1-V10 | v1-reports-table through v10-sample-report-page | PlotDetailPage, LabSamplePage, LabReportPage, SampleReportPage |
| Spray plans | V1-V5 | spray-plans-v1 through spray-plans-v5 | PlotDetailPage (via TreatmentsContent prop) |
| Draft state | V1-V6 | draft-state-v1 through draft-state-v6 | PlotsPage, AddPlotPage, PlotDetailPage |
| Multiple treatments | V1 | multiple-treatments-v1 | PlotsPage, PlotDetailPage |
| Onboarding | V1-V2 | flow:'register'/'onboarding' | Auth mode switch only |
| Table actions | V1-V3 | Standalone /explore/* routes | Outside variant system |

## Key Conventions
- **MUI only** — no shadcn/Radix (deleted). Do not reintroduce a parallel component kit.
- **Never show disabled controls** — hide until actionable (menu only with selection, Save only while dirty).
- **Empty list = empty state only** — hide toolbar + count bar; empty state carries the single CTA.
- **Add buttons = secondary (outlined).** Primary (filled red) is reserved for Save.
- **Editing shows SaveBar** (Save primary + Cancel neutral) — replaces count bar while dirty.
- **Reuse-first SSOT** — never build a second table/form/empty-state; extract first.
- **Variants inherit baseline** — fork only for genuine behavioral divergence; label changes add optional props instead.
- **Verify without hijacking** — never reload the user's tab; verify via npm run build + separate headless Chrome.

## PlotDetailPage Extension Points
- samplingTabLabel — rename the Lab management tab
- SamplingContent — replace lab management content
- ForecastContent — replace residue forecast content
- TreatmentsContent — replace entire Treatments tab body (spray-plans variants use this)
- extraTabs — inject additional tabs (additive, spray-plans formerly used this)
- treatmentsCustomization — add columns/filters/sort/toolbar elements without replacing the tab
- TreatmentModalComponent — replace the bulk-copy treatment modal

## EditableDataGrid Imperative Handle
addRow / deleteRow / save / getAllRows / getDirtyIds / getDirtyRows / setFilter / getSelectedRows / getRow / triggerValidation(mode) / clearValidation / markPending

## Seed Data
12 plots: 1-8 complete, 9-10 draft (missing fields), 11 complete plot + draft treatments (t7/t8), 12 V6 demo (dates missing). 3 spray plans on plots 1-2. Per plot: 2 seeded lab samples (1 complete + 1 draft).

## Known Gaps
Comply pillar: no retailer/secondary-limit calendar UI. Compare tab: placeholder. Forecast credits: no-credits modal + balance display not built. Lab traceability: sheet code auto-match is conceptual. Mobile: desktop-first only.
