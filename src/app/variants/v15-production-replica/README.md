# V15 — Production replica

**Not a design exploration.** Every other variant in this project proposes a
change; V15 deliberately proposes nothing — it's a faithful rebuild of the
**live production ResiYou app's** Lab results / sample-creation flow, built
directly from screenshots of resiyou.com (see
`research/production-lab-results-flow-analysis.txt` for the full annotated
analysis this was built from). Its purpose is to give the other variants
(and future ones) a ground-truth baseline actually running in this
prototype, instead of only a static screenshot/text description.

**Scope.** Per an explicit scoping decision, this replicates the Lab results
tab + New/Edit Sample wizard in detail — the part of production that was
screenshotted and analyzed step by step. It does **not** fork the plot
detail page's tab bar/chrome (production's 4-tab order with a top-level
"Compare plans" tab and a tab-bar-level "Predictions up to date" chip) —
that would require diverging from the `PlotDetailPage` extension-point
architecture every other variant shares, and wasn't part of the documented
flow this variant targets.

## What this replicates

- **Lab results tab (empty state):** unlike this repo's own "hide toolbar +
  count bar on empty" convention, production keeps the full toolbar
  (Add lab result / Search / Options) visible even with zero samples. Copy
  matches production exactly ("Complete your residue predictions with lab
  results…"), plus the "Tips & Tricks — Lab details and attachments can be
  added later" callout production shows below the CTA.
- **New/Edit Sample — 3-tab wizard** (`LabSamplePage.tsx`), gated exactly like
  production: Lab Report and Report results stay disabled until Sample name +
  Date of sample + Commodity are filled in.
  - **Sample tab:** once valid, a right-hand **Sample Code** panel appears —
    "Sample label" print button (wired to the app's real `/sample-sheet/:id`
    route, since production's screenshots implied a real printable sheet) plus
    the substance → analytical-method reference table (already present as
    `SUBSTANCE_ANALYTICAL_METHODS` in `data/lab-results-data.ts` — this is the
    first variant to actually render it).
  - **Lab Report tab:** unchanged reuse of the shared `LabReportForm` — it was
    already a near-exact match for production's Laboratory / Lab report ID /
    attachment-list-with-delete-icons layout and copy (including the
    ".pdf, .csv, .xlsx, .docx" / "Maximum file size accepted - 5MB" notes and
    the "File uploaded successfully" toast), so no changes were needed there.
  - **Report results tab:** the one tab baseline didn't have an equivalent
    for. Opening it for the first time on a fresh sample shows the required
    **"Analytes as a result of the treatments reported"** modal, pre-filled
    with the plot's treatment-derived analytes (Residue level / Residue
    (mg/kg) / Method LOQ (mg/kg) per row). Saving with any row still unset
    triggers the **"Warning! … reported as Below LOQ"** confirm dialog
    (Cancel & Review / Continue) before committing. The resulting table has
    production's toolbar (Add Residue / Search / **View below LOQ** toggle,
    default on / Options) and a per-row edit icon under "More" instead of an
    always-editable grid.

    **Invariant: there is no reachable "no results" state while the plot has
    treatment-derived analytes.** The completion modal can't be bypassed into
    an empty grid — it re-triggers any time `residues` drops back to zero
    (initial visit, or bulk-deleting every row) as long as
    `getAnalytesForPlot` returns at least one analyte, and its Cancel exits
    back to the Sample tab rather than closing into a blank Report results
    view. The empty "No analytes added yet." state only exists for the case
    where the plot genuinely has no treatment-derived analytes to seed from —
    there the modal never appears and analytes are added manually via "Add
    Residue".

## Known assumptions (production didn't show these)

- **Residue level dropdown options:** never visible in the screenshots (only
  the "Choose an option" placeholder was). Reuses this repo's existing
  `ResidueLevel` vocabulary (`Residue` / `Trace` / `Below LOQ` / `Not
  analyzed`) with production-style display labels (`Residue` → "Detected").
- **LOD vs. LOQ terminology, corrected rather than replicated:** production's
  own confirm dialog says values will be "reported as Below LOQ", but its
  results grid then displayed "Not detected (below LOD)" for those same rows —
  a real production copy inconsistency (LOD and LOQ are different analytical
  thresholds). Unlike the rest of this variant, that inconsistency is not
  reproduced here — the grid's dropdown and "View below LOQ" toggle both say
  LOQ, matching the confirm dialog and this repo's own `ResidueLevel` value
  (`'Below LOQ'`, never `'Below LOD'`).
- **Visual chrome deliberately matches v14, not production's literal pixels.**
  Per an explicit follow-up request, every table and popup here is built from
  the same component vocabulary v14-sample-summary-header uses, so the two
  variants read as one design system:
  - Read-only tables (the samples list in `LabResultsContent.tsx` and the
    Report results table in `LabSamplePage.tsx`) use `TableCard` +
    the shared `Th` header cell (same component v14's `SamplesReportsTable.tsx`
    exports — re-declared here and imported into `LabSamplePage.tsx` so both
    tables render identical headers) + `RowActionButton` / `RowIconButton`
    (`design-system/grid/grid-shared`) for row actions, instead of hand-rolled
    `TableSortLabel`/`TableCell` markup.
  - Every popup (the completion modal, the single-residue Add/Edit dialog)
    follows v14's exact dialog chrome: `borderRadius: '12px'` +
    `boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)'`, a `DialogTitle` with an
    `h6`/700-weight/1.125rem title plus a top-right close `IconButton`, an
    intro `body2` sentence, and `DialogActions` with a 36px-tall text Cancel +
    36px-tall contained/8px-radius primary button (v14's `AddReportDialog`
    pattern). The nested "Warning! … Below LOQ" confirm keeps its own
    centered two-text-button layout (that's production's own distinct style,
    not one v14 has an analog for) but picked up the same rounded-corner +
    shadow treatment for consistency.
  - Toolbar/card-header CTAs (Add lab result, Add Residue, the search fields
    next to them) are a consistent 40px tall, matching v14's own stated
    convention ("All card-header/toolbar CTA buttons are a consistent 40px").
  None of this changed any gating, validation, defaulting, or copy — only the
  markup/components producing the same behavior.

## Files

| File | Role |
|---|---|
| `PlotDetailPage.tsx` | Wrapper — renames the tab "Lab results" and mounts `LabResultsContent` |
| `LabResultsContent.tsx` | Lab results tab body — toolbar-always-visible empty state + samples table |
| `LabSamplePage.tsx` | The full 3-tab Sample / Lab Report / Report results wizard described above |

## Reach

`/v/v15-production-replica/plot/1` → **Lab results** tab → **Add lab result**
