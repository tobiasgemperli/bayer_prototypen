# UX Copy Audit — MultipleTreatmentsModal (V1)

Based on NN/g Plain Language guidelines, Material 3 supporting-text spec, Atlassian Design voice & tone, and Mailchimp's writing principles.

## The core failure mode

The current modal correctly *detects* the date conflict but talks about it in technical, passive terms ("incompatible", "will be skipped"). The user reading it sees red and warning icons and thinks *"why are 3 plots in red? What did I do? What can I fix?"*

The fix is not visual. The fix is **plain-language copy that tells the user (a) what's wrong, (b) why it's wrong, (c) what they can do about it.**

### Three actionable principles guiding the rewrites

1. **No jargon at the surface.** "Incompatible", "applied treatments", "receiving these treatments" — drop them.
2. **Explain the constraint, not the symptom.** Don't say "3 plots are incompatible." Say "Plots planted *after* this treatment date can't receive it."
3. **Every error has a next step.** "They will be skipped" is not a next step. "Move the treatment date forward, or remove these plots" is.

---

## Per-element audit

### 1. Modal title

| | Copy | Issue |
|---|---|---|
| **Before** | `Add applied treatments to selected plots` | "applied" is industry jargon (= "actually used", not "queued"). "selected" is redundant — the user already selected them. 7 words for a sentence that should be 3. |
| **After** | `Apply treatments to plots` | Verb-first, plain, scannable. M3 dialog title spec: action-oriented headline-small. |

### 2. Subtitle / supporting text

| | Copy | Issue |
|---|---|---|
| **Before** | `Add one or more treatments below and select which plots they apply to.` | "below" is filler. "one or more" is corporate. 14 words. |
| **After (no conflict)** | `Add treatments, then pick the plots to apply them to.` | Verb-first, two clauses, 11 words. |
| **After (conflict detected)** | DYNAMIC: `Heads up — your earliest treatment is dated DD MMM YYYY. Plots planted after that date can't receive it.` | Surfaces the constraint at the top of the modal so the user reads it before they panic at the red chips. |

### 3. Section header above plot selector

| | Copy | Issue |
|---|---|---|
| **Before** | `Plots receiving these treatments` | Passive ("receiving"). 4 words. |
| **After** | `Apply to these plots` | Active, 4 words, mirrors the modal title. |

### 4. Plot selector placeholder

| | Copy | Issue |
|---|---|---|
| **Before** | `Select plots...` | Slightly empty. Doesn't tell the user they can search. |
| **After** | `Search plots…` | Verb-first, signals the typeahead capability. (Use `…` Unicode ellipsis, not three dots — M3 typography spec.) |

### 5. Plot chip — no conflict

| | Copy | Issue |
|---|---|---|
| **Before** | `North Field A · 05 Oct 2023` | What does the date mean? Could be lab date, treatment date, registration date. |
| **After** | `North Field A · Planted 5 Oct 2023` | The word "Planted" labels the date and removes ambiguity. Drop the leading zero on day (M3 readability). |

### 6. Plot chip — conflict (red border + warning icon stays)

| | Copy | Issue |
|---|---|---|
| **Before** | `⚠ North Field A · 05 Oct 2023` | Same ambiguity as #5 — and now WORSE because the user can't tell *why* it's red. |
| **After** | `⚠ North Field A · Planted 5 Oct 2023` | Same word treatment; the red border + ⚠ icon + tooltip do the conflict explanation. |

### 7. Conflict tooltip (on red chip hover)

| | Copy | Issue |
|---|---|---|
| **Before** | `Planted 05 Oct 2023 — after the earliest treatment date (Jun 4, 2020)` | Inverted structure. Reads backwards: "X — after Y" makes you parse twice. |
| **After** | `Planted 5 Oct 2023. Your earliest treatment is dated 4 Jun 2020 — a plot can't receive a treatment before it's planted.` | Two short sentences. First states the fact, second explains the rule. Tooltip can hold two lines per Material 3 tooltip spec. |

### 8. Dropdown option supporting text

| | Copy | Issue |
|---|---|---|
| **Before** | `Planted 05 Oct 2023 · conflict` | "conflict" is one word without context. |
| **After** | `Planted 5 Oct 2023 · Can't receive this treatment` | Surfaces the consequence at the point of choice. |

### 9. Inline conflict explanation (red text below the chips)

| | Copy | Issue |
|---|---|---|
| **Before** | `3 plots are incompatible: North Field A, South Field B, East Plot 12. They will be skipped.` | "incompatible" is jargon. "skipped" leaves the user without a fix. |
| **After** | `**3 plots were planted after your earliest treatment date (4 Jun 2020) and can't receive it.** To fix: either move the treatment date forward, or remove these plots from the list.` | Three pieces in order: (a) what's true, (b) why, (c) two ways to fix it. NN/g error-message spec: *describe + explain + recover*. |

### 10. CTA when ALL plots have conflicts

| | Copy | Issue |
|---|---|---|
| **Before** | `Apply to 0 plots (3 incompatible)` (button enabled, red) | Submitting an action that does nothing is an anti-pattern. The user clicks, nothing useful happens. |
| **After** | Button **disabled**, label `Resolve conflicts to apply` | Disabled state prevents the no-op. Label tells the user what to do, not what the system can't do. M3 button + state spec; NN/g "describe + recover". |

### 11. CTA when SOME plots have conflicts

| | Copy | Issue |
|---|---|---|
| **Before** | `Apply to 1 plot (2 incompatible)` | "incompatible" is jargon. |
| **After** | `Apply to 1 plot (skip 2)` | Plain English, shorter, equally accurate. |

### 12. CTA when all plots are valid

| | Copy | Issue |
|---|---|---|
| **Before** | `Apply to 3 plots` | Fine. |
| **After** | `Apply to 3 plots` | Unchanged. |

### 13. Toast on submit success (smart-skip)

| | Copy | Issue |
|---|---|---|
| **Before** | `Treatments added to 1 plot. 2 skipped (planting date conflict).` | "planting date conflict" reads as system error message. |
| **After** | `Treatments applied to 1 plot. 2 plots skipped — they were planted after the treatment date.` | Plain-language explanation; subject of the second clause is the plots, not the conflict. |

### 14. Toast on submit success (all valid)

| | Copy | Issue |
|---|---|---|
| **Before** | `Treatments added to 3 plots.` | "added" reads as data-entry verb. The user's mental model is *apply* / *spray*. |
| **After** | `Treatments applied to 3 plots.` | Matches the rest of the modal vocabulary. |

### 15. Toast on submit failure (all invalid — but disabled CTA prevents this from firing)

The disabled CTA from #10 makes this state unreachable, so the toast `All selected plots are incompatible…` is dead code. Remove it.

---

## Final copy summary (what the user sees end-to-end)

| State | Modal title | Subtitle | CTA label | CTA enabled? |
|---|---|---|---|---|
| No plots selected | Apply treatments to plots | Add treatments, then pick the plots to apply them to. | Apply treatments | no |
| Plots OK | Apply treatments to plots | Add treatments, then pick the plots to apply them to. | Apply to 3 plots | yes |
| Some conflicts | Apply treatments to plots | Heads up — your earliest treatment is dated 4 Jun 2020. Plots planted after that date can't receive it. | Apply to 1 plot (skip 2) | yes |
| All conflicts | Apply treatments to plots | Heads up — your earliest treatment is dated 4 Jun 2020. Plots planted after that date can't receive it. | Resolve conflicts to apply | no |

## Sources

- NN/g: *Plain Language: 6 Tips for Better Communication*; *Error-Message Guidelines* (describe + explain + recover).
- Material 3: *Dialogs* spec (headline-small title, body-medium supporting text); *Buttons* spec (action-oriented labels); *Tooltips* (max 2 lines).
- Atlassian Design: *Voice & Tone* (clear, confident, warm).
- Mailchimp Content Style Guide (verb-first, plain language, no jargon).
