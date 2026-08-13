# Editable Table — Acceptance Criteria (Source of Truth)

The editable table is one component (`EditableDataGrid`) wrapping AG‑Grid. Four
production grids (Treatments, Samples, Lab reports, Results) feed it
column definitions, validators, a nameField, and row data. Every behavior below
is *required* in every grid. Any deviation is a bug.

The original demo (V2 of the "Table actions" project) is a *mirror* of this
behavior; it never invents new rules.

---

## 1. Row state model

A data row is in exactly one of four visual states:

| State | When | Marker | Opacity |
|---|---|---|---|
| **Clean** | Grid has no dirty rows | none | 1.0 |
| **Untouched** | Grid has dirty rows AND this row is not dirty | none | 0.5 |
| **Modified / new** | This row is in the dirty set | 4 px brand-red inset on the first cell (`box-shadow`) | 1.0 |
| **Errored** | Modified/new AND at least one cell has an active validation error | 4 px brand-red inset + 1 px red border on every errored cell + a synthetic error row below | 1.0 |

**AC‑1.1** Touching (editing/clearing/adding/duplicating) a row flips it to
Modified within the same paint cycle.

**AC‑1.2** All other rows in the same grid simultaneously flip to Untouched.

**AC‑1.3** On Save (changes or draft) the grid returns to Clean. Untouched and
Modified both return to opacity 1, marker removed.

**AC‑1.4** On Cancel the grid returns to Clean. Edits in-grid are discarded by
remounting the grid.

**AC‑1.5** When a dirty row is deleted the dirty set is updated. If it was the
last dirty row, every remaining row returns to Clean (opacity 1).

---

## 2. Validation model

Each grid declares per‑field rules:

```ts
type Validators = Record<string, {
  format?:   (value, row) => string | null;  // live, malformed-only
  required?: (value, row) => string | null;  // on Save changes
}>;
```

Plus exactly one `nameField` (the entity's identifier). The ResiYou rule is:
*only the name is mandatory to Save as draft.*

| Trigger | Runs |
|---|---|
| Cell value change | `format` for the changed field (live); plus `required` if `triggeredRef.current` is true |
| Save changes | `format` + `required` on every field of every dirty row |
| Save as draft | `format` on every field + `required` only on `nameField` |
| Cancel | `clearValidation()` (cells un-red, error rows removed, dirty + errors cleared) |

**AC‑2.1** `format` errors apply *live* without a save click; they reflect that
the input value is malformed regardless of intent.

**AC‑2.2** Empty values never produce a `format` error.

**AC‑2.3** `required` errors apply on Save attempts only — they reflect that the
user has chosen to commit incomplete data.

**AC‑2.4** Save changes blocks if **any** dirty row has any error after running
format+required on every field. The handler returns early — no store writes,
no `save()`, no toast.

**AC‑2.5** Save as draft blocks if **any** dirty row's nameField is empty
*or* has a format error. Otherwise it succeeds, even if other required fields
are empty (those rows keep `isDraft: true`).

**AC‑2.6** Cross-field validators (e.g. residueValue required *when*
residueLevel === 'Residue') re-run on the dependent field's cell change so the
error clears the instant the *other* field is fixed.

**AC‑2.7** Validation is scoped to dirty rows only. Untouched rows are treated
as already‑saved and never produce errors.

**AC‑2.8** Rows added through the parent (e.g. empty-state CTAs that bypass the
grid handle's `addRow`) must still be marked dirty before any Save runs.
Equivalent contract: *every row that exists in the grid before the first paint
cycle following a user action must be either Untouched or Modified — never an
unmarked phantom.*

---

## 3. Error rendering

**AC‑3.1** An errored cell carries the `.cell-errored` class — same chrome as
the blue inline-editing tint, in brand red: `bgcolor: rgba(211,47,47,0.06)`,
`border: 1px solid rgba(211,47,47,0.45)`. **The cell layout is unchanged.**

**AC‑3.2** Error messages render in their own full-width row directly below the
data row (AG‑Grid `isFullWidthRow`). Never inside the data row's cells.

**AC‑3.3** The synthetic error row hugs its content:
- 1 line of wrapped text → row is 32 px tall.
- 2 lines → 48 px.
- Hard cap: 2 lines + ellipsis. Longer messages truncate.

**AC‑3.4** Inside each column slot of the error row: `pl: 0`, `pr: 8 px`,
`py: 8 px`. Text is left + top aligned. The row has **no bottom border** (AG-
Grid's data row below already draws the separator).

**AC‑3.5** Long messages that would exceed 2 lines truncate with `…` and become
hover-able. The tooltip wraps in the *standard* MUI tooltip with one override:
`slotProps={{ tooltip: { sx: { maxWidth: 400 } } }}`. Placement: `bottom-start`
so it never hides the row above.

**AC‑3.6** Cursor on a truncated cell becomes `help`; on non-truncated cells it
stays `default`.

**AC‑3.7** Live un-error: editing a cell re-runs its validator(s). When the
error clears, the cell's `.cell-errored` drops, and the message is removed
from the synthetic row. If the row's error count reaches zero, the synthetic
row is removed entirely.

**AC‑3.8** On Save success (`grid.save()`): `errorsRef` cleared, `triggeredRef`
reset, synthetic error rows removed, cell red tints dropped, dirty + untouched
classes dropped.

---

## 4. SaveBar

Identical across all four editable tables.

**AC‑4.1** Visible only when at least one row is dirty.

**AC‑4.2** Layout: message left (`You have unsaved changes`), three buttons
right: **Cancel** (text, primary red) · **Save as draft** (soft) · **Save
changes** (contained, primary, no icon).

**AC‑4.3** All three are identical labels everywhere — no entity-specific
variants like "Create sample" or "Create lab report". The bar describes a
generic commit, not a record type.

**AC‑4.4** No icon on the primary button (Material 3 contextual-bar rule).

**AC‑4.5** Save changes routes to `handleCreateX` which calls
`triggerValidation('full')` first; returns early on `false` *without* calling
`save()` and *without* toasting.

**AC‑4.6** Save as draft routes to `handleSaveXDraft` which calls
`triggerValidation('name-only')` first; same return-early rule.

**AC‑4.7** Cancel routes to `handleCancel` → `clearValidation()` on the active
grid + remount via grid key bump + dirty=false on the parent. Toasts
"Changes discarded".

---

## 5. Tooltips

One style. Everywhere.

**AC‑5.1** Default MUI `<Tooltip>` with `arrow placement="top" enterDelay={150}`.
No custom card styling. No background/border overrides. Default dark MUI
tooltip.

**AC‑5.2** Exception: the validation-message tooltip (long error overflow) sets
`slotProps={{ tooltip: { sx: { maxWidth: 400 } } }}` and uses
`placement="bottom-start"`. Otherwise identical defaults.

**AC‑5.3** Info icons in column headers (`InfoOutlined`) use `fontSize: 14`,
`color: 'text.disabled'`, `cursor: 'help'`. Same wrapping tooltip props as
AC-5.1.

**AC‑5.4** Row-action icon buttons (Duplicate / Delete / Download / etc.) use
`placement="top"` everywhere. Legacy variants on other placements
(`'left'`) are realigned.

---

## 6. Row-action CTAs

Pattern from the V1 demo, applied identically.

**AC‑6.1** Few common actions (Duplicate, Delete, etc.): inline `IconButton`s
with tooltips per AC‑5.4. Icons are **uncolored** (default
`color: 'inherit'`).

**AC‑6.2** Special row CTAs (Open PDF, Upload, Add lab report, Copy to plots,
Send to lab): styled `<Button variant="soft">` with:
- `bgcolor: 'grey.100'`
- `color: 'text.secondary'`
- hover `bgcolor: 'grey.200'`
- `textTransform: 'none'`
- `borderRadius: '8px'`
- `height: 30` (Pattern 2/3 row actions) or `height: 32` (V1 Send-to-lab demo).
- No `fontWeight: 600` — regular weight.
- `startIcon` size 16 px.

**AC‑6.3** Pattern 1 (many actions → menu): `IconButton` with `MoreVert` and
tooltip "Options". Menu items use the default text color; *no* item is colored
red — including destructive actions like "Delete plot". (User rule: red is
reserved for SaveBar primary CTA.)

---

## 7. Column widths

**AC‑7.1** `defaultColDef.minWidth = 140` — every data column has room to wrap
short error messages on one line.

**AC‑7.2** Action / select / sheet columns override with their own
`minWidth` matching their `width`. Action columns at 108 must set
`minWidth: 108`; checkbox at 52 sets `minWidth: 52`.

**AC‑7.3** `selectColumn` and `rowActionColumn` shared defs in `grid-shared.tsx`
must declare both `width` and `minWidth`.

---

## 8. Draft chip

**AC‑8.1** The DRAFT chip lives on the `nameField` column for each entity —
not on the first column.
- Treatments: `product` (not `date`).
- Samples: `sampleName`.
- Reports: `labReportId`.
- Results: `analyte`.

**AC‑8.2** Chip displays based on `row.isDraft === true`. A brand-new row that
has never been saved is **NOT** a draft — the 4 px red row marker alone
communicates "this is new and unsaved". `isDraft` only flips to `true` when
the user explicitly commits an incomplete row via **Save as draft**. Save
changes always clears `isDraft`. The Save-as-draft handler sets `isDraft`
per dirty row based on completeness (incomplete → `true`, complete →
`false`).

---

## 9. Data lifecycle

**AC‑9.1** Every row that appears in the grid must be created via the grid's
imperative `addRow()` so it's marked dirty. Empty-state CTAs that need to
create a row when the grid is unmounted must coordinate with the parent to
mark dirty after the grid mounts (or persist with `isDraft: true` immediately
and have the parent's first paint show the SaveBar via dirty state injection).

**AC‑9.2** New rows (id starting with `new-` or `dup-`) are persisted *via the
store's insert path*, not via update-by-id. `updateTreatments` must accept
either patches (existing ids) or full rows (new ids) and route accordingly.

**AC‑9.3** Cell-renderer-driven mutations (e.g. AttachmentsCell upload) write
through `onCellChange`, *not* by calling `coreRef.save()`. Calling `save()`
from a renderer wipes other rows' dirty state and is forbidden.

**AC‑9.4** Cross-entity moves (ReportsGrid sample reassignment, ResultsGrid
report reassignment) must `node.setData(...)` the updated row so AG-Grid's
view matches the store. Buffered patches in `pendingRef` are migrated.

**AC‑9.5** Save handlers act on dirty rows only. Untouched rows must not have
their `isDraft` flipped.

**AC‑9.6** Cancel restores all buffered edits by remounting (`bumpKey`). It
*cannot* undo immediate persistence — so rows must not be persisted before
Save except in the narrow case of new-row provisioning that the user
explicitly opted into (empty-state CTAs).

---

## 10. Imperative handles

**AC‑10.1** Every grid wrapper (Samples, Reports, Results, Treatments) exposes
the same shape on its handle:

```ts
{
  addRow, deleteRow(s), save, setFilter,
  getSelectedRows, getRow, getAllRows,
  getDirtyIds, getDirtyRows,
  triggerValidation(mode), clearValidation,
}
```

Anything else (e.g. `duplicateRow`) is opt-in per grid but documented.

**AC‑10.2** `triggerValidation` returns a boolean (`true` = no errors).
Defensive default when `coreRef` is null is **`false`** (fail closed), not
true.

---

## 11. Constants and helpers (SSOT)

**AC‑11.1** All shared constants live in `validation.tsx`:

```ts
ERROR_ROW_PREFIX, ERROR_ROW_HEIGHT_BASE (32),
ERROR_ROW_LINE_HEIGHT (16), ERROR_ROW_V_PAD (16),
ERROR_ROW_H_PAD (8), ERROR_ROW_AVG_CHAR (6.2),
ERROR_ROW_MAX_LINES (2).
```

**AC‑11.2** `isErrorRowId(id: string): boolean` helper exported from
`validation.tsx` and used everywhere instead of inline `id.startsWith?.(...)`.

**AC‑11.3** `ErrorRowRenderer` and `computeErrorRowHeight` import the constants
from `validation.tsx`. The two never disagree on padding or line height math.

**AC‑11.4** The four soft-grey row CTAs share one factored component:
`RowActionButton` in `design-system/grid/grid-shared.tsx`. Single source.

---

## 12. Known gaps from audit — added to AC

The deep audit surfaced these missing behaviors. They become part of the AC:

**AC‑12.1** `handleDelete` calls `syncErrorRows()` after dropping the deleted
row's errorsRef entry, so its synthetic error row is removed.

**AC‑12.2** `handleModelUpdated` (which fires `onRowCountChange`) filters out
synthetic error rows before counting.

**AC‑12.3** A row whose error message text *changes* (without flipping
presence) still triggers a re-render of the synthetic row's content. The
React renderer must read fresh `errors.get(field)` on every paint.

**AC‑12.4** Newly-added rows added via the toolbar `+ Add` button are
focused for editing on their `nameField`, not on the first data column.

**AC‑12.5** Duplicated rows are treated as new rows (id prefix `dup-`). The
store insert path accepts them. They start with `isDraft: false` (per
AC‑8.2 — a brand-new row is never a draft until explicitly saved as one).
Any inherited `isDraft` from the source row is stripped so the chip does not
carry over.

**AC‑12.6** Bulk delete fires exactly one toast describing the count, not one
per row.

**AC‑12.7** Cell-level help cursor (`cursor: 'help'`) on truncated error
messages only. Non-truncated stays `default`.

---

## Pre-flight checklist (every PR touching the editable table)

- [ ] All four grids' handles match AC-10.1.
- [ ] All four grids declare validators with `{format?, required?}` per field.
- [ ] All four parents call `triggerValidation('full')` on Save changes and
  `triggerValidation('name-only')` on Save as draft.
- [ ] All four parents return early on validation failure without calling
  `save()` or toasting.
- [ ] DRAFT chip is on the `nameField` column for the entity.
- [ ] No `coreRef.save()` calls inside cell renderers.
- [ ] All tooltips use defaults (AC-5.1) unless legitimately overriding for
  the validation overflow case (AC-5.2).
- [ ] No menu items colored red (AC-6.3).
- [ ] Row CTAs use shared `RowActionButton` styling (AC-6.2).
- [ ] No magic numbers — constants live in `validation.tsx` (AC-11.1).
