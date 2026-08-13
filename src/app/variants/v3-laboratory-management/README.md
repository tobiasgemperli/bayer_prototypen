# v4 — Laboratory Management

Cleanup + restructure variant. Bigger scope than v2/v3 — covers terminology, layout, and the flow between sub-tabs.

## Hypothesis
The current "Sampling" naming is unclear, the sample form is cramped, and the user has to jump back to the table after every save. A progressive flow (Samples → Laboratory reports → Lab results) with each step advancing to the next on save feels lighter and matches the user's mental model of "filling in lab data as it arrives".

## What's different from baseline

### Terminology
| Baseline | v4 |
|---|---|
| `Sampling` tab in PlotDetailPage | **`Laboratory Management`** |
| `Add lab result` button | **`Add laboratory report`** |
| `New/Edit Sample` page title | **`Laboratory report`** |
| Sub-tabs `Sample / Lab Report / Report results` | **`Samples / Laboratory reports / Lab results`** |
| Field `Commodity` | **`Sample type`** (less technical) |
| Field `Comments/Notes` | **`Notes (optional)`** |

### Layout (Samples tab)
- Centered card, `maxWidth: 680`, same shell as AddPlotPage
- Pinned bottom action bar with `Cancel` + `Save and continue`
- Working MUI `DatePicker` (was a plain text input)

### Flow
- **Samples → Save** advances to **Laboratory reports** tab (was: navigate back to plot)
- **Laboratory reports → Save and continue** advances to **Lab results** tab
- **Lab results → Save** stays on tab, shows success toast

### Laboratory reports tab
- Editable table (treatments-style)
- Columns: `Laboratory · Lab report ID · Attachments · Action`
- `Laboratory` is an `Autocomplete` with `+ Create laboratory` option (mirrors AddPlotPage's season selector)
- Pre-seeded with common testing labs (Eurofins, SGS, ALS, Bureau Veritas, Intertek)

### Lab results tab
- Editable table (treatments-style)
- Columns: `Analyte · Residue level · Residue (mg/kg) · Method LOQ (mg/kg)`
- `Residue level` is a dropdown (Residue / Trace / Below LOQ / Not analyzed)
- `Residue (mg/kg)` only editable when level = `Residue`

## Files overridden
- `PlotDetailPage.tsx` — only to rename the Sampling tab label
- `LabResultsContent.tsx` — only to rename CTA + empty state copy (rendered inside the variant's PlotDetailPage)
- `LabSamplePage.tsx` — full rewrite with new sub-tabs, layout, and editable tables

## Compare side-by-side
- Baseline: http://localhost:5173/plot/1
- v4: http://localhost:5173/v/v4-laboratory-management/plot/1

## Open questions for next iteration
- `Sample type` options — keep `Fruit / Soil / Irrigation water / Leaf` or expand?
- Should the Laboratory autocomplete persist created labs across the session (currently in-memory only)?
- Should each row's saved-state be visible (e.g., a green check), or implicit?
