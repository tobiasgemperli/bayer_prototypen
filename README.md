# ResiYou — Lab Reports prototype

Frontend-only prototype for the ResiYou (Bayer) residue-management app, focused on the
**Lab Management / Sampling** flow. One **main prototype** plus several **variations** that
explore different designs of the same flow side-by-side, without disturbing the main one.

## Stack
- **Vite 6** + **React 18** + **TypeScript**
- **MUI 7** (`@mui/material`, `@mui/x-data-grid` isn't used — editable grids are **AG-Grid**) + **AG-Grid** for editable tables
- **react-router 7** (`createBrowserRouter`)
- No backend. All data is in-memory and resets on reload.

## Quick start
```bash
npm install        # first time only
npm run dev        # → http://localhost:5173 (or next free port)
npm run build      # production build (also the fastest way to typecheck — Vite resolves every import)
```

## Browser-tab convention (Chrome)

When verifying a change, **reload the existing project tab — do NOT open a new one each time.** Every `open -a "Google Chrome" <url>` creates a fresh tab and clutters the workspace.

Use `scripts/reload-app.sh` instead — it finds any open tab whose URL starts with `http://localhost:5174` and reloads it (or navigates it if a different URL is passed). Only when no project tab exists does it open a new one.

```bash
scripts/reload-app.sh                                  # reload the open project tab
scripts/reload-app.sh http://localhost:5174/v/foo/    # navigate the existing tab to a different URL
```

If Claude is editing this prototype, **always use this script** instead of `open -a "Google Chrome" …`.

## Folder structure
```
ResiYou-LabReports/
├── README.md          ← you are here (overview, structure, variant catalogue)
├── CONVENTIONS.md     ← the rules: SSOT design system, layers, reuse-first, chrome-tab, how to add a variant
├── CHANGELOG.md       ← decisions log (chronological)
└── src/app/
    ├── App.tsx, routes.tsx, theme.ts
    ├── data/            ← in-memory stores + types (plots, lab results, auth) + demo-content (demo persona SSOT)
    ├── design-system/   ← SSOT shared components, reused by main + variants
    │   ├── EmptyState, ActionMenu, OptionsTrigger, BaseDialog, MapSelectionModal
    │   └── grid/         ← EditableDataGrid (generic AG-Grid core) + grid-shared (theme/editors/CSS)
    ├── lab-shared/      ← shared lab building blocks (LabReportForm, LabReportsTable, format)
    ├── main/            ← THE MAIN PROTOTYPE (baseline product screens)
    └── variants/        ← EXPERIMENTS — one folder per variation, each with its own README
        ├── registry.ts          ← declares each variant + which components it overrides
        ├── variant-context.tsx  ← variant-aware useNavigate (auto-prefixes /v/<id>/)
        └── v2…v6/
```

## Two layers to know
1. **Design system = MUI + `design-system/`** (and `lab-shared/` for lab-specific shared pieces). There is exactly **one** editable table (`design-system/grid/EditableDataGrid`); Treatments and every Lab grid use it. Do not build a second table/form/empty-state — see `CONVENTIONS.md`.
2. **Main vs variants are separate.** `main/` is the product. `variants/` are throwaway-able experiments switched via the **Prototype navigator** (floating control, bottom-right) or `/v/<variant-id>/...`. In the navigator, **Baseline** is standalone at the top; each **project** is an accordion folder of numbered **versions** (V1, V2 … + bracketed description) — taxonomy in `variants/projects.ts`. Variants inherit the main prototype and only differ in their difference (see `CONVENTIONS.md`).

## Variant catalogue
| ID | Name | Overrides | Hypothesis |
|---|---|---|---|
| `v2-reports-table` | v2 — Reports table | `LabSamplePage` | One sample → N reports via a plots-style table + page-swap. |
| `v3-stacked-reports` | v3 — Stacked reports | `LabSamplePage` | N reports as stacked inline cards + one Save-All. |
| `v4-laboratory-management` | v4 — Laboratory Management | `PlotDetailPage`, `LabSamplePage` | Terminology cleanup, AddPlot-style layout, progressive Sample → Reports → Results. |
| `v5-lab-management` | v5 — Lab management | `PlotDetailPage`, `LabReportPage` | Treatments-style: sub-tabs + directly-editable grid; lab report = full page (metadata + results). |
| `v6-lab-management` | v6 — Lab management (sample-first) | `PlotDetailPage`, `LabReportPage` | Like v5, but steers to sample-first (register → print sheet → send), report-first kept one click away. |

## Projects (navigator) & new variants
Variants are grouped into **projects** (`variants/projects.ts`), shown as accordion folders in the navigator:
- **Lab management** — V1 Reports table · V2 Stacked · V3 Laboratory Management · V4 Treatments-grid · V5 Sample-first · **V6 Master–detail** *(new — `v7-lab-master-detail`)*
- **Spray plans** *(new project)* — V1 Plan list · V2 Planning board · V3 Lifecycle stepper · V4 Calendar planner (`spray-plans-v1…4`); each injects a **Spray plans** tab on the plot detail (via the baseline `extraTabs` prop). Domain store: `data/spray-plans-data.ts`.
- **Draft state** *(new project)* — V1 Badge + filter · V2 Inline completion · V3 Drafts tray · V4 Status + side-panel (`draft-state-v1…4`); each overrides the **Plots list** to surface Draft vs Complete records. Completeness model + seeded drafts: `data/plots-data.ts`.
- **New onboarding flow** — V1 Register · V2 Onboarding.

See **`docs/concepts/index.html`** for the full concept overview (flow diagram + what's-new per variant), **`docs/concepts/SPEC.md`** for the spec, and **`docs/ux-process.md`** for the design process behind it.

## Routes
- `/` — Plots · `/plot/:id` — plot detail (Treatments / Residue forecast / Compare / Lab tab)
- `/plot/:id/lab-results/new|:sampleId` — baseline/v2–v4 sample editor
- `/plot/:id/lab-report/new|:reportId` — v5/v6 lab report page
- `/v/<variant-id>/...` — the same routes under a variant

## Docs to read
- **`docs/`** — context for design work (read first if you're briefing a challenge):
  - `docs/product.md` — what ResiYou is, the problem, users, pillars, glossary.
  - `docs/flows.md` — the prototype's screens/flows + open design opportunities.
  - `docs/design-language.md` — reusable patterns + UX principles.
  - `docs/working-with-claude.md` — **how to brief me with a challenge** + how I respond.
  - `docs/research.md` — sources (ResiYou + AI-design practice).
- **`CONVENTIONS.md`** — read before editing UI (SSOT rules, layers, how to add/promote/discard a variant).
- **`CHANGELOG.md`** — why the prototype looks the way it does.
- Each `src/app/variants/<id>/README.md` — that variant's hypothesis + what it changes.
