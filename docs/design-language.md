# Design language & interaction patterns

> The vocabulary of components and interactions to reuse when proposing/ building UI.
> Build-level rules (folders, SSOT, how to add a variant) are in `../CONVENTIONS.md`.

## Foundations
- **MUI 7** is the design system (not shadcn — the unused shadcn kit was deleted). Theme/tokens in `src/app/theme.ts`. Brand **primary = red**; success = green.
- **SSOT components** live in `design-system/` (generic) and `lab-shared/` (lab-domain). Reuse; never build a second table / form / empty-state / dialog from scratch.

## Reusable patterns (prefer these in proposals)
| Need | Use | Where |
|---|---|---|
| Editable table | `EditableDataGrid` (AG-Grid core) | `design-system/grid/` |
| Date cell | MUI calendar via `dateColumn(...)` | `design-system/grid/grid-shared` |
| Dropdown / searchable cell | shared editors + `DropdownCellRenderer` | `design-system/grid/grid-shared` |
| Read-only tabular data | PlotsTable styling · `LabReportsTable` | `main/`, `lab-shared/` |
| Empty state | `EmptyState` (illustration + title + body + primary CTA + optional secondary link) | `design-system/` |
| Unsaved-edits affordance | `SaveBar` (Save primary + Cancel neutral) | `design-system/` |
| Pick existing or create | Autocomplete + "+ Create new …" popup | seasons, samples, laboratories |
| Single-select small set | card selector (icon + label, radio semantics) | sample type (v6) |
| Row/bulk actions | `OptionsTrigger` (⋮) + `ActionMenu` | `design-system/` |
| Prototype switching | `VariantPicker` (accordion, fixed bottom-right) | `main/` |

## UX principles (hold these in every proposal)
1. **Never show disabled controls** — hide until actionable (e.g. ⋮ only with a selection; Save only while dirty).
2. **Empty list = empty state only** — hide the toolbar (Add / search / options) and the count bar; the empty state carries the single CTA.
3. **Add buttons in table toolbars are secondary (outlined)** — the filled-red **primary** is reserved for **saving edits** (the SaveBar).
4. **Editing is unmistakable** — the SaveBar replaces the count bar while dirty: Save (primary) + Cancel (neutral, no brand colour).
5. **Empty states**: real illustration (300×200, in `assets/empty-states/`), centered, concise title + body + CTA, **no Tips & Tricks**.
6. **Reuse-first, one app** — match existing styling; extract before a third copy appears.
7. **Variants inherit the main prototype** — only differ in their actual difference; don't re-hardcode baseline values (e.g. the "Lab management" tab label lives once in baseline).
8. **Traceability is real** — a lab report always belongs to a sample (sample → report chain); honour the compliance reality from `product.md`.
9. **Verify without hijacking** — never reload the user's tab; verify via `npm run build` + a separate headless Chrome / `vite preview`.

## Tone of copy
- Concise, action-first, no jargon dumps. Brackets for short descriptors. Match the residue/forecast vocabulary in `product.md`'s glossary. Avoid disabled-looking hints; prefer showing the right control at the right moment.
