/** Two-tier validation per field.
 *
 *   format   — runs LIVE on every cell change. Empty values pass; only catches
 *              malformed input (negative number, invalid date, etc.). Errors
 *              surface immediately, no Save click needed.
 *   required — runs on Save. Empty values fail. Save changes runs `required`
 *              on every field; Save as draft runs `required` only on the
 *              entity's `nameField` (ResiYou rule: only the name is mandatory
 *              for a draft).
 *
 * Validators return `null` for valid, or a user-facing message for invalid.
 * Both are optional per field; omit `format` if there are no format rules,
 * omit `required` if the field isn't part of the required set. */
export interface FieldRules<TRow = any> {
  format?: (value: unknown, row: TRow) => string | null;
  required?: (value: unknown, row: TRow) => string | null;
  /** Field ids whose values this validator depends on. When any of these
   *  fields changes in `handleCellValueChanged`, this field's validators are
   *  re-run so stale cross-field errors (e.g. residueValue required when
   *  residueLevel === 'Residue') clear without waiting for the next Save
   *  click. AC-2.6. */
  dependsOn?: string[];
}

export type Validators<TRow = any> = Record<string, FieldRules<TRow>>;

/** Back-compat alias used in older imports while the migration ripples through. */
export type FieldValidators<TRow = any> = Validators<TRow>;

/** Shape pushed onto AG-Grid's `context` by EditableDataGrid so the synthetic
 *  error row can read the current state. Always present when the grid was
 *  constructed with validators. */
export interface ValidationContext {
  errors: Map<string, Map<string, string>>;
  triggered: boolean;
}

export type ValidationMode = 'full' | 'name-only';

// ─────────────────────────────────────────────────────────────────────────────
// AC‑11.1 Shared constants — single source of truth for the editable table.
// ─────────────────────────────────────────────────────────────────────────────

/** Prefix used on synthetic error-row ids so AG-Grid's full-width detection
 *  and downstream helpers can distinguish them from real data rows. */
export const ERROR_ROW_PREFIX = '__err__';

/** Base height (1 line of wrapped text) of the synthetic error row. */
export const ERROR_ROW_HEIGHT_BASE = 32;

/** Line-height used inside the synthetic error row for height math. */
export const ERROR_ROW_LINE_HEIGHT = 16;

/** Combined vertical padding (top + bottom) of the synthetic error row. */
export const ERROR_ROW_V_PAD = 16;

/** Horizontal padding applied inside each column slot of the error row. */
export const ERROR_ROW_H_PAD = 8;

/** Average character width (px) used to estimate wrap count for error text. */
export const ERROR_ROW_AVG_CHAR = 6.2;

/** Hard cap on wrapped lines before the message truncates with an ellipsis. */
export const ERROR_ROW_MAX_LINES = 2;

/** Default height (px) of a data row across every editable grid. */
export const ROW_HEIGHT = 52;

/** Default `minWidth` (px) for every data column — keeps short error
 *  messages on a single line (AC‑7.1). */
export const ROW_MIN_COL_WIDTH = 140;

// ─────────────────────────────────────────────────────────────────────────────
// AC‑11.2 Shared helpers.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when the given row id belongs to a synthetic error row.
 *  Replace inline `id.startsWith?.('__err__')` checks with this helper so the
 *  prefix lives in exactly one place. */
export function isErrorRowId(id: string): boolean {
  return typeof id === 'string' && id.startsWith(ERROR_ROW_PREFIX);
}
