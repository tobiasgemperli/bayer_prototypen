# Draft state V2 — Inline completion

## Hypothesis

Drafts stall because completing them requires leaving the list, losing context, and navigating back. If users can fill in only the missing fields directly in the row — with instant autosave and live progress feedback — completion friction drops to near zero and the list stays the single place of truth.

## What changes vs baseline

| Area | Baseline | This variant |
|---|---|---|
| Draft signal | None — all rows look identical | **Draft chip** + **3/5 meter** on every incomplete row |
| Overall readiness | Not shown | **"X of N plots ready to forecast"** banner with MUI LinearProgress |
| Completing a draft | Navigate to plot editor | **Click row / chevron → expands inline** — only the missing fields appear |
| Saving | Manual save action | **Autosave on blur / date change** — "Saved" hint fades in per field |
| Status update | Manual | **Draft chip flips to green "Complete"** live when all fields are filled; overall bar updates immediately |

## Interaction flow

`Plots list → see "X of N ready" banner → spot Draft chip on a row → click row → inline form expands (only missing fields) → fill in → autosaves on blur/change → chip turns Complete → banner count updates → zero navigation`

## Reach

`/v/draft-state-v2/`
