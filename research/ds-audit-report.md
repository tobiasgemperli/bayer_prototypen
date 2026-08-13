# Design System Audit — ResiYou Variations 260522

**Method:** 10 parallel read-only audit agents, one per component category, MD3 spec as SSOT when in doubt. Each agent inventoried every instance across baseline + all variants, identified duplicates and inconsistencies, and proposed consolidations.

**TL;DR:** The codebase has a working set of SSOTs (`PageLayout`, `BaseDialog`, `ActionMenu`, `EmptyState`, `fieldSx`, `GridToolbar`/`GridSearchField`/`GridCountBar`) but **systematic non-adoption**. The same component is rebuilt next to its SSOT in 30+ places. Theme tokens exist but are overridden everywhere. Only the freshly built spray-plans-v5 chips/menu align with M3 — everything else is 1-2 weight steps heavier and 1-2 sizes smaller than spec.

---

## 1. The cross-cutting pattern (the bigger story)

Every audit independently surfaced the same three failure modes:

1. **SSOT exists → ignored.** `fieldSx` is redefined verbatim 8×. `FieldLabel` + `SectionLabel` are re-declared locally in 4 v4-v6 lab files. `GridToolbar`/`GridSearchField`/`GridCountBar` are used in 2 of 8 grids; the other 6 hand-roll the same shape. `PageLayout` is used in 2 of ~14 page headers; 12 pages hand-roll a custom `<Box>` with `<Breadcrumbs>` + title.
2. **Theme tokens defined → overridden.** Theme says `h5: 600` — every page-title overrides to `700`. Theme says `MuiOutlinedInput.borderRadius: 6px` — every `fieldSx` override forces `8px`. Theme says `button.fontWeight: 500` — every call-site forces `600`. The theme is dead code in the slots it tries to control.
3. **The same visual primitive coded in N parallel ways.** "Draft" badge: 5 implementations. "Section eyebrow uppercase": 4 implementations. "Table header sx": 30+ verbatim copies. "Primary tinted bg": 6 opacity variants for the same intent (M3 says one: 8%).

The architectural fix is not "build more SSOTs" — they exist. It's "make the theme own the visual choices end-to-end so call sites stop reaching into `sx`".

---

## 2. Findings by category (one line each)

| # | Category | Worst stat | Best opportunity |
|---|---|---|---|
| 1 | **Buttons** | ~131 instances, 7 different heights for "Add X" (28-44px), 21 copies of Cancel sx | 4 theme variants → kill all inline `fontWeight/textTransform/borderRadius/height/px` sx |
| 2 | **Form fields** | `fieldSx` redefined verbatim 8×, theme 6px ≠ fieldSx 8px | 4 wrappers (`TextInput`/`Combobox`/`DateInput`/`SelectInput`) + theme borderRadius → 8 |
| 3 | **Chips/Badges** | 6 heights, 3 radii, 5 font-sizes, 3 weights — for the SAME chip purpose | One `<StatusChip tone size variant>` + 2 wrappers (`<CountBadge>`, `<AttachmentChip>`) |
| 4 | **Dialogs/Modals** | 16 raw `<Dialog>` vs 4 BaseDialog. 8 "Create-X" duplicates with subtle drift | 3 siblings: `<ConfirmDialog>` + `<FormDialog>` + BaseDialog as XL-Grid |
| 5 | **Menus/Popovers** | 9 containers, 6 different corner-radii (4/8/10 mixed) | Extract `M3MenuPaper` + `M3MenuItem`; back ActionMenu + Header + Kanban-move + 2 v5 components |
| 6 | **Empty states** | 5 inline `TableCell` empties bypass SSOT; main/PlotsPage.tsx:184 is a filter-empty bug | Extend EmptyState with `tone: 'initial'/'filtered'/'inline-row'/'error'` |
| 7 | **Non-AG-Grid tables** | header sx tripled 50+ times, 3 sticky `calc(100vh - …)` magic numbers | `<DataTable>` wrapper + `<ListRow>` (for v7 card-list) |
| 8 | **Page layout/Toolbars** | PageLayout used 2× of 14; GridToolbar used 2× of 8 | Enforce existing SSOTs + add `<PageBreadcrumbs>` + `<ToolbarAddButton>` |
| 9 | **Typography** | **407 hardcoded `fontSize` in `sx`** + 109 `variant=`; theme defines only 2 typography slots | 10 M3 type tokens in theme + MuiTableCell head styleOverride |
| 10 | **Colors/Tokens/Spacing** | 6 opacity variants for "primary soft bg", 5 different greens for "success" | Complete palette + `palette.primary.softBg` + shape.borderRadius + shadows[2] |

---

## 3. Phased cleanup plan

### Phase 0 — Theme expansion (foundational, blocks everything else)

Touch only `src/app/theme.ts`. Every later phase reads from these tokens.

1. **Typography**: add 10 M3 tokens (`headlineSmall`, `titleLarge`, `titleMedium`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `labelLarge`, `labelMedium`, `labelSmall`). Drop the dead `h5: 600` override.
2. **Palette**: add `divider`, `error`, `success`, `info`, `warning`. Add `primary.softBg` (alpha 0.08) helper.
3. **Shape**: `shape.borderRadius: 8` (the de-facto value), per-component overrides for Button (6) and Dialog/Card (12).
4. **Shadows**: `shadows[2]` set to the M3 level-2 shadow that 6 papers already share.
5. **Component overrides**:
   - `MuiTableCell.styleOverrides.head` = `labelMedium + textTransform: uppercase + color: text.secondary` → kills 30+ table-header sx blocks.
   - `MuiButton.variants` = filled / tonal / text / destructive presets at 40dp + label-large.
6. **STATUS_COLORS migration**: move `variants/spray-plans-v5/spray-status-colors.ts` → `design-system/status-colors.ts` so v1–v4 + lab variants can drop hex literals.

### Phase 1 — SSOT enforcement (quick wins, low risk)

For each existing SSOT, replace verbatim duplicates and adopt where bypassed.

1. **Delete `fieldSx` re-declarations** in `SignUpPage.tsx`, `AccountCompletionModal.tsx`, `MapSelectionModal.tsx`, v4 `LabSamplePage.tsx`, v5/v6 `LabReportPage.tsx`, v6 `SampleDialogs.tsx`, v7 `LabMasterDetail.tsx` — import from `design-system/FormField`.
2. **Delete `FieldLabel`/`SectionLabel` re-declarations** in the 4 v4-v6 lab files — import from `design-system/FormField`.
3. **Delete byte-identical attachment chip** — extract `<AttachmentChip>` once, replace v2-reports-table + v6-lab-management copies.
4. **Fix `main/PlotsPage.tsx:184`** — filter-empty currently renders the full onboarding EmptyState (illustration + CTA); should drop both.
5. **Replace 5 inline `TableCell` empties** with `<EmptyState tone="inline-row" />` (PlotsTable, draft-v2, draft-v3, v4 LabSamplePage×2, spray-v2 Board).
6. **Adopt `GridToolbar`/`GridSearchField`/`GridCountBar`** in the 6 grid views that hand-roll them (PlotDetailPage, v5/v6 LabManagementContent, spray-plans-v1).
7. **Adopt `PageLayout`** in the 12 hand-rolled page headers (PlotsPage, PlotDetailPage, LabSamplePage, plus every variant lab/plot page).
8. **Spray-plans illustrations**: stop reusing `noTreatmentImg` in spray-plans-v3 (semantic mismatch); add or repurpose an illustration for spray-plans-v1/v2/v4 (currently no illustration).

### Phase 2 — New consolidated primitives

Where multiple call sites build the same thing differently, extract one component.

1. **`<StatusChip tone size variant>`** + `<CountBadge>` + `<AttachmentChip>` — kills the 5 draft-badge implementations, 3 plan-kind chips, 2 numeric-count badges.
2. **`<ConfirmDialog>`** (single message + Cancel/Next) — kills 5 "Create season" duplicates + 3 "Create lab" duplicates + 1 gate dialog = 9 modals collapsed.
3. **`<FormDialog>`** (form-content + Cancel/Save) — covers EditPlotDialog, CompleteDatesDialog, MapSelectionModal, the v1/v3 complete-plot variants, v6 CreateSampleDialog, spray-plans-v1/v4 new-plan.
4. **Form wrappers**: `<TextInput>`, `<Combobox>`, `<DateInput>`, `<SelectInput>` in `design-system/FormField/`. Subsume the ~40 raw TextField calls and the ~20 Autocomplete `renderInput` blocks.
5. **`<DataTable>`** wrapper — module-level `headerCellSx` + `bodyCellSx` + single `stickyMaxHeight` token + built-in checkbox column.
6. **`<ListRow>`** — for v7 SampleListItem and any future card-list pattern. 56dp min height, M3 state-layer hover/selected.
7. **`M3MenuPaper` + `M3MenuItem`** slot kit — back ActionMenu, SprayStatusChip menu, SprayFilter popover, Header account menu, Kanban move menu. Grid editor listbox stays separate (different visual contract — cell continuation).
8. **`<PageBreadcrumbs>`** — kills 9 copy-pasted breadcrumb spans.
9. **Button wrappers**: `<PrimaryButton>` / `<TonalButton>` / `<TextButton>` / `<DestructiveButton>` (backed by theme variants from Phase 0). Resolve the 40-vs-36-vs-other height drift.

### Phase 3 — M3 alignment migrations

Apply the spec to the now-shared primitives. Most of the work is one-line attribute changes once the theme + wrappers are in place.

1. **Chip**: 26-32dp height, 8dp corner, label-large 14/500 (currently 0.65-0.75rem / 500-700).
2. **Menu items**: 48dp height + 12dp horizontal padding + 8%/12% state layers (currently 36-38dp + 16dp + no state layer in ActionMenu, Header, Kanban).
3. **Dialogs**: 28dp corner + level-3 elevation + drop the close-X icon (M3 dialogs don't have one). Today everyone uses 12px corners.
4. **Buttons**: 40dp height + label-large 14/500 (currently 36 + 0.875/600).
5. **Typography hot spots**: replace 30+ table-header `fontWeight:700 / 0.75rem / text.secondary` sx with theme MuiTableCell head override. Replace 6 page-title `variant="h5" sx={{ fontWeight: 700 }}` with `variant="headlineSmall"`. Replace 3 field-label recipes with `variant="labelLarge"`.

### Phase 4 — Color/tint consolidation

1. Replace the 6 primary-tint opacities with a single `theme.palette.primary.softBg`.
2. Replace the 5 greens (`#4caf50`, `#68B713`, `#87D228`, `#d6ead9`, rgba) with theme `success.main` + `success.light`.
3. Migrate `grid-shared.tsx` (21 hardcoded literals — sits IN the design-system folder!), `SaveBar`, `FormField`, `OnboardingCoach`, `VariantPicker` to theme tokens.
4. Replace 3 `#fff5f5` error-field-bg literals with `palette.error.softBg` or similar.

---

## 4. Risk + execution notes

- **Phase 0** is the only phase that touches `theme.ts`. Every later phase is a series of focused refactors that read from it.
- **Phase 1** is mechanical and parallelizable (each call site is independent). Highest ROI — eliminates the ~80% of duplication that comes from non-adoption.
- **Phase 2** is the only phase that introduces new components. Each new primitive replaces N ad-hoc implementations; the net code count should go down.
- **Phase 3** is small (mostly one-line attribute changes) but requires the design call: does the brand want 40dp buttons + label-large, or does it keep the current 36dp + 600-weight as a deliberate deviation? Per project memory: M3 is SSOT when in doubt → 40dp + 500.
- **AG-Grid editable grids are exempt** per project memory. Skip in every phase.
- **Variant-only divergences are fine.** The point is not "make every variant identical" but "make every variant draw from the same tokens, so the variant axis is the ONLY axis of variation".

---

## 5. Quick wins (4-6 hours, if executed top-down)

In order of code reduction per minute spent:

1. Theme expansion (Phase 0) — half a day. Unblocks everything.
2. Delete 8 `fieldSx` re-declarations — minutes.
3. Delete `FieldLabel`/`SectionLabel` re-declarations — minutes.
4. Replace 5 inline `TableCell` empties with `EmptyState tone="inline-row"` — minutes after EmptyState extension.
5. Fix `PlotsPage.tsx:184` filter-empty bug — minutes.
6. Move `STATUS_COLORS` to `design-system/` — minutes (no logic change).
7. Adopt `GridToolbar`/`GridSearchField`/`GridCountBar` in the 6 hand-rolled grids — 1-2 hours.
8. Adopt `PageLayout` in the 12 hand-rolled page headers — 2-3 hours.
9. Extract `<AttachmentChip>` and replace the 2 byte-identical copies — 15 minutes.

That alone removes the majority of accidental duplication without introducing any new component design.

---

*Source agents per category: see `/private/tmp/claude-501/…/787384d1-…/tasks/a{7253c96, bb2066f, c4d709a, a3b3d67, 21726bd, ff1fcc6, bba3252, 5beae3c, 71764e3, e1cba03}*.output`.*
