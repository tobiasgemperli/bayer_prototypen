# Draft state V4 — Status + side-panel

**Route:** `/v/draft-state-v4/`

## Hypothesis

An editorial-workflow "Status" column makes draft/complete state immediately scannable across all plots. Clicking a Draft pill opens a focused right side-panel with a checklist of only the missing fields — keeping the user in context while completing the record. When all checklist items are filled and saved, the pill flips to Complete in place, giving instant feedback with zero navigation.

Cross-record consistency: a top-of-page info chip surfaces any draft treatments, with a link chip per plot that navigates directly to that plot's Treatments tab — so the draft signal propagates beyond just plots.

## What changes vs baseline

| Area | Baseline | V4 |
|---|---|---|
| Status visibility | None | "Status" column: Draft (warning) / Complete (success) pills on every row |
| Draft completion | Navigate away or no path | Click Draft pill → right Drawer with missing-field checklist; fill + save in place |
| Success state | n/a | Checklist flips to success state; pill updates to Complete |
| Complete rows | Click → navigate to plot detail | Click → navigate to plot detail (read-only, no panel) |
| Treatment drafts | No signal | Info chip: "{k} treatments need info" with per-plot link chip → Treatments tab |
| Filters / search | Season, crop, search, Add plot | All kept identical |

## Key interactions

- **Draft pill click** — opens right Drawer with record summary + missing-field checklist (inline inputs, DatePicker for plantingDate)
- **Complete pill / complete row click** — navigates to the plot detail page (no panel, no disabled state)
- **"Mark as complete" button** — enabled only when all checklist inputs are filled; calls `updatePlot`, shows toast, flips pill to Complete with success banner
- **Treatment hint chip** — per-plot chip with external-link icon navigates to `/plot/:id` with `{ state: { activeTab: 0 } }`
