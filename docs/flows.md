# Current prototype — IA, screens & flows

> What exists today, so a design proposal can build on real flows instead of re-deriving them.
> Engineering structure/rules live in `../CONVENTIONS.md`; this doc is the UX-level map.

## What this prototype is
A **frontend-only design sandbox** (Vite + React 18 + MUI 7 + AG-Grid) that mirrors ResiYou's screens — focused on the **Sampling / Lab management** area and its surrounding shell — so we can try **interaction-design variations** against the real product. No backend; in-memory data resets on reload. It is **not** the production app.

## How the prototype maps to the real product (see `product.md`)
| Real ResiYou pillar / concept | Prototype surface |
|---|---|
| **Predict** residues at harvest | `Residue forecast` tab — predicted substances, % MRL, % ARfD, timeline |
| **Optimize** (simulate & compare) | `Compare` tab + `+ New simulated plan` (real vs simulated spray programs) |
| **Comply** (legal + retailer limits) | % MRL coloring; retailer/secondary limits = a known gap to design |
| Spray-data input | `Treatments` tab — editable grid (date · method · product · dose · water) |
| "Reduced lab analysis" / verification | `Lab management` tab — samples + lab reports |
| Forecast **credits** | "Get forecast" action + no-credits modal (per pricing tiers) |
| Crop-protection decision maker | the signed-in persona (`data/demo-content.ts`, currently Lyle Peterer) |

## Information architecture
```
/                         Plots list
/plot/:id                 Plot detail — tabs: Treatments · Residue forecast · Compare · Lab management
/plot/:id/lab-results/... baseline & v2–v4 sample editor
/plot/:id/lab-report/...  v5/v6 lab-report creation/edit page
/add-plot                 Add plot (centered form)
/signup                   Register flow
/v/<variant-id>/...       the same tree under a variant
```

## Screens & flows (current state)

### App shell (`main/Header.tsx`)
- **Logo → Plots list** (keeps current variant prefix). Notifications + Help (hidden during onboarding). Account menu (Lyle Peterer).
- **Prototype navigator** (bottom-right, `main/VariantPicker.tsx`): Baseline (standalone) + accordion **project folders** with numbered **versions**. Also switches app modes (Register / Onboarding flows). See `working-with-claude.md` for how proposals become versions.

### Plots (`main/PlotsPage.tsx`)
- `PlotsTable` (clean, sortable, bulk-select). Season filter with **"+ Create new season"**; crop filter; search; **Add plot** (secondary). Bulk delete via the ⋮ options menu (only shown when rows selected).
- **Empty state** when the current view has no plots (delete all, or pick an empty season).

### Plot detail (`main/PlotDetailPage.tsx`)
- **Treatments** — editable AG-Grid (`TreatmentsGrid` → `EditableDataGrid`): date = **MUI calendar**, method/product/units = dropdown editors, row Action menu (duplicate/copy/delete). Sub-tabs **Real / + New simulated plan**. Toolbar: **Add treatment** (secondary) + search + options ⋮ (on selection). Editing shows the **SaveBar** (Save primary + Cancel). Empty state when no treatments (onboarding path).
- **Residue forecast** — the Predict view: timeline (rows *Plot risk · Treatments · Lab analysis*), substance table (Prediction ppm · % MRL · % ARfD), traces / not-supported / not-relevant footer. (Currently illustrative/static.)
- **Compare** — placeholder for comparing plans (the Optimize pillar).
- **Lab management** — the focus area; baseline + 5 variant designs (below).

### Lab management (the area we iterate on most)
- **Baseline** (`main/LabResultsContent.tsx` + `main/LabSamplePage.tsx`): a samples list → a 3-sub-tab sample editor (Sample · Lab report · Results).
- **Variants V1–V5** (in the navigator's *Lab management* folder; ids in `variants/projects.ts`):
  - **V1 (Reports table)** `v2-reports-table` — one sample → N reports via a plots-style table.
  - **V2 (Stacked reports)** `v3-stacked-reports` — N reports as stacked cards + Save-All.
  - **V3 (Laboratory Management)** `v4-laboratory-management` — terminology cleanup, AddPlot-style layout, progressive Sample → Reports → Results.
  - **V4 (Treatments-style grid)** `v5-lab-management` — sub-tabs (Sample reports | Lab reports) + a directly-editable grid; lab reports created per sample on a full page.
  - **V5 (Sample-first)** `v6-lab-management` — like V4 but steers to *register sample → print sheet → send → results link back*; report-first kept one click away (choose/create sample inline). Lab uses a card sample-type picker, select-or-create Laboratory, and a success modal after registering a sample.

### Auth / onboarding (the "New onboarding flow" project)
- **Register flow** (`/signup`, `main/SignUpPage.tsx`) → empty account → leads into onboarding.
- **Onboarding flow** (guided): create plot → add treatment → see forecast. Driven by `data/auth-state.ts`; the navigator switches modes.

## Known gaps / open design opportunities (good brief candidates)
- **Comply**: no real retailer/secondary-limit comparison UI yet (calendar of "which plots meet which supermarket on which date").
- **Compare**: the Optimize side-by-side is a placeholder.
- **Forecast credits**: "Get forecast" tooltip + no-credits modal + "Get credits" action are speced but not built; the credits balance isn't surfaced.
- **Lab traceability loop**: the printed sample-sheet code → lab → auto-match is conceptual; needs the real matching UX.
- **Mobile**: everything is desktop-first today.
