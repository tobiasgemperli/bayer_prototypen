# Development Guidelines

## Component authoring
- Use MUI sx={{}} with theme tokens. Avoid magic numbers for colors, font sizes, or spacing.
- One component = one responsibility. Files over ~200 lines should be split.
- Named exports only — no anonymous default exports.
- Use forwardRef + displayName on components with imperative handles (see EditableDataGrid, AddPlotForm).

## State management
- All prototype state lives in data/ stores (useSyncExternalStore). Do not introduce Zustand, Jotai, Redux, or React Context for this purpose.
- Draft state is derived, not stored. Compute completeness from getPlotCompleteness / isTreatmentDraft.
- For mutations that trigger cross-component re-renders, use the version-counter pattern (see useTreatmentsVersion).

## Editable grid usage
- Pass only columnDefs + initialData to EditableDataGrid. The grid handles dirty tracking, validation, and selection.
- Use the ref handle for imperative actions (addRow, save, getDirtyRows) — never reach into AG-Grid API directly from parent.
- Use dateColumn(fieldKey, headerName) from grid-shared for date cells (wires MUI calendar editor automatically).
- Pass validators + nameField when the grid needs field-level validation on Save.

## Variant authoring
Every new variant must:
1. Live in src/app/variants/<id>/
2. Have a README.md with: Hypothesis, What changes vs baseline (table), Route/reach
3. Have a registry entry in variants/registry.ts
4. Have a version entry in variants/projects.ts under the correct project

Variants import from ../design-system/, ../lab-shared/, and ../main/. Never duplicate business logic or seed data.

## Empty states
Use EmptyState (illustration + title + body + ctaLabel + onCta) — never build a custom empty state. Illustration must be a 300x200 JPG from assets/empty-states/. When a list is empty, hide the toolbar and count bar entirely.

## Copy and terminology
Use product.md glossary vocabulary. Correct names: "Lab management" (tab), "Residue forecast" (tab), "Treatments" (tab). Avoid: "Sampling" (old name), "Lab results" (old name). Action-first labels: "Add treatment", "Get forecast", "Save changes", "Save as draft".

## Verification
Before marking any change complete:
1. npm run build — must exit 0 (catches broken imports and type errors)
2. Visual check in a separate browser session (never reload the user's active tab)
3. Test the variant in the navigator: open baseline, switch to variant, verify baseline is unchanged

## Adding a new empty-state illustration
- Size: 300 x 200 px, JPG format
- Place in src/app/assets/empty-states/
- Name pattern: <subject>-<version>.jpg (e.g. no-treatment-yet-v01.jpg)
- Import and pass as the illustration prop to EmptyState

## plots-database.ts (DEPRECATED)
Do not add new code to plots-database.ts. It is a legacy file with an older Plot interface (string dates, flat array, no reactivity) that pre-dates plots-data.ts. Its remaining usage in AddPlotForm.tsx should be migrated to plots-data.ts. See the @deprecated JSDoc in the file for migration steps.
