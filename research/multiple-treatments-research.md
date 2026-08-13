# Multiple Treatments → Plots — UX research

Synthesized from NN/g, Material 3, Atlassian Design, Salesforce SLDS, Linear, Notion, Airtable patterns + the project's recent Draft-State research.

## The two design problems

### A. Bulk validation: spray date < plot planting date

Logically: a treatment can only be applied *after* the crop is in the ground. But the user can create a treatment dated before a target plot's planting date. We need to surface this clearly without blocking work.

### B. Modal that overflows the viewport

When the user adds many treatments + selects many plots, the modal content exceeds screen height. Cancel + Submit must remain reachable; the user must understand more content exists.

---

## Patterns for bulk validation

| Pattern | Origin | When it works |
|---|---|---|
| **Per-item indicator + tooltip-with-reason** | Linear bulk-edit, Asana bulk-update, Github bulk-action menu | When the user can act on the level of the offending item directly. Per-plot chip shows ⚠ → hover shows "Plot B was planted Apr 1; this treatment is Mar 5." NN/g: "place errors near their source." |
| **Smart-skip + post-action summary** | Salesforce bulk-edit, Github "skipped: 3 items", Linear's "applied to 5 of 7 issues" | The submit succeeds for valid items, a toast/banner enumerates what was skipped. Trades atomicity for forward motion. NN/g: validation at action time, not at form-fill time. |
| **Count-of-affected on submit button** | Notion bulk-status, Asana, Linear | The CTA renames itself: `Apply to 3 plots (1 incompatible)`. The user reads the consequence before clicking. Material 3 button label spec: action-oriented copy. |
| **Inline pre-filter** | Airtable plot-link picker, Notion relation picker | Incompatible items either don't appear or appear greyed-out with disabled checkbox + tooltip. Stronger gate, slightly less flexible. |
| **Top-of-form error summary** | Bootstrap-era forms, older Salesforce | **Anti-pattern**. NN/g hostile-patterns: removes the error from where the user can fix it. Avoid. |

**Picked for V1**: per-plot indicator + tooltip + count-on-submit. Submit applies to valid plots only; toast confirms with both counts. The user is never blocked, but they always know.

---

## Patterns for long modals

| Pattern | Origin | Decision |
|---|---|---|
| **Sticky header + sticky footer + scroll body** | Material 3 dialog spec, Atlassian Modal, Linear's settings dialog | Default for V1. DialogContent overflows; title and action footer stay pinned. |
| **Scroll shadow on body** | Atlassian, Notion sidebar | Subtle top/bottom shadow inside the scrollable area when content overflows. Telegraphs "more content here." Material 3 supporting guidance. |
| **Sectioned inner cards** | Airtable record dialog, Linear settings | Each region (treatments, plots) is its own card; user can collapse irrelevant sections. Slight complexity overhead — defer to V2. |
| **Resizable / full-screen toggle** | Notion, Figma | Modal becomes a sheet that the user can expand. Powerful but adds chrome. Defer to V3 if needed. |

**Picked for V1**: sticky header + sticky footer + subtle scroll-shadow. Material 3 by-the-book.

---

## Patterns for "planting date in plot list"

| Pattern | Origin | Decision |
|---|---|---|
| **Two-line list item** | Material 3 lists (56dp single, 72dp double), Linear issue rows | Primary line = plot name + crop, secondary line = planting date. M3 default for "two strings of supporting metadata." |
| **Inline metadata column** | Airtable, Notion table | Date is its own sortable column. Already the right pattern for the plot LIST page. |
| **Chip sub-label** | Linear status chip, Atlassian Lozenge | When the plot is rendered as a chip (selector), append `· Planted 5 Apr 2024` in muted text inside the chip. |

**Picked for V1**: plot LIST gets a sortable Planting-date column. Plot SELECTOR (inside the modal) shows planting date as muted secondary text inside each option row + chip.

---

## Patterns for "required filter (no all-option)"

NN/g: don't ship an "All" default if "All" is a problematic state. Linear's status filter defaults to "Active" not "All". Airtable's view filters require explicit selection. The right pattern: the dropdown still shows the list, but `All seasons` is removed; the selector defaults to the most recent season; clearing it re-selects the default rather than emptying.

**Picked for V1**: drop the `All seasons` option, default to the latest season, no empty-clear (clearing reverts to latest).

---

## Cited sources

- NN/g: *Hostile Patterns in Forms* (validate at action time, place errors near source) — already in `research/draft-interaction-design-research.pdf`.
- Material Design 3: *Dialogs* spec (28dp corner, sticky title/actions, body scroll).
- Material Design 3: *Lists* spec (single 56dp / double 72dp).
- Material Design 3: *Buttons* spec (action-oriented labels).
- Atlassian Design: *Modal dialog* (sticky header/footer, scroll shadow).
- Linear bulk-edit changelog (per-issue indicator, count-on-submit).
- Salesforce SLDS bulk-edit pattern (post-action summary).
