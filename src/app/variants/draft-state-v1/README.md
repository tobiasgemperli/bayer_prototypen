# Draft state V1 — Badge + filter

**Reach:** `/v/draft-state-v1/`

## Hypothesis

Making draft/complete state visible at the list level — with a count banner, segmented filter chips, and a completeness score per row — is enough signal to surface incomplete records and motivate users to finish them without adding navigation friction.

## What changes vs baseline

| Area | Baseline | V1 |
|---|---|---|
| List signal | Every plot looks identical | **Draft** (warning) / **Complete** (success-outlined) chips on every row |
| Completeness | Not shown | **"3/5"** cell per row |
| Filter | Season + crop only | **All / Drafts / Complete** segmented control layered on top of existing filters |
| Banner | None | Warning alert: *"N plots need info to forecast"* + **Show drafts** shortcut |
| Completion | Navigate to plot editor (doesn't exist) | **Complete** button → dialog with **only the missing fields** (TextField or DatePicker per field); `updatePlot` on save |

## Seeded drafts

- **Plot 9** "New Orchard Block" — missing variety + planting date → **3/5**
- **Plot 10** "Trial Plot 3" — missing planting date → **4/5**

## Design decisions

- Filter chips (ToggleButtonGroup) sit left of the existing season/crop autocompletes so the mental model is "narrow by status first, then by season/crop".
- The banner's "Show drafts" action sets the filter to `drafts` — no separate route, no scroll, just a filter state change.
- The Complete dialog only renders the `missingKeys` derived from `getPlotCompleteness` — never shows already-filled fields, never renders disabled inputs.
- Draft chip clears immediately on save because `updatePlot` triggers the reactive store and `isPlotDraft` is derived on every render.
