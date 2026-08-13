# design-system/

SSOT for shared, cross-cutting UI primitives (MUI-based). Reused by `main/` **and** `variants/`.
If two screens need the same building block, it belongs here — never copy it.

- `EmptyState` — illustration + title + body + CTA (+ optional secondary link). No Tips & Tricks. **Self-centring** regardless of parent layout (uses `height: 100%` + `minHeight: 400` + `flexGrow: 1` together, so it works inside flex columns *and* plain `<Box>` / overflow-auto wrappers).
- `ActionMenu`, `OptionsTrigger` — the row/bulk options menu + its trigger button.
- `BaseDialog`, `MapSelectionModal` — shared dialogs. Use `BaseDialog` for confirmation-style modals (title + body + Cancel/Confirm); the V5 "Complete your plot first" gate is an example.
- `grid/EditableDataGrid` — the **one** editable table core (AG-Grid). Driven entirely by `columnDefs`. Handle methods: `addRow`, `deleteRow`, `duplicateRow`, `save`, `setFilter`, `getSelectedRows`, `getRow`, **`getAllRows`** (read every row's current data — used by dialogs that mount the grid and need to persist on save, e.g. `main/CompleteTreatmentsDialog`).
- `grid/grid-shared` — theme, CSS, editors (Dropdown/Date), header, select-all + row checkbox, dropdown cell.

The app is MUI-only; there is no shadcn kit.
