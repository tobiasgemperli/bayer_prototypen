/** Short date format used across the lab views. */
export function fmtDate(v: unknown): string {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v as string);
  return isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}
