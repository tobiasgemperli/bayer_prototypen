import { SprayStatus } from '../data/plots-data';

/** Notion-flavored soft palette: low-chroma background + readable dark text.
 *  Polaris-style — Draft uses an informational/neutral tone, not an alarming
 *  red, so the chip reads as a deliberate state, not an error.
 *
 *  Single source of truth for status colors across spray-plans, draft-state,
 *  and lab variants. Previously lived inside `variants/spray-plans-v5/` and
 *  was locked to one variant — promoted to `design-system/` so every chip,
 *  pill, badge and tone-aware component can read from one map. */
export const STATUS_COLORS: Record<SprayStatus, { bg: string; fg: string; border: string }> = {
  draft:    { bg: '#ebebe9', fg: '#5e5d59', border: '#d3d2cf' },
  planned:  { bg: '#dbe7f5', fg: '#1f4f9c', border: '#bdd0ea' },
  executed: { bg: '#d6ead9', fg: '#2c5a3e', border: '#bdd9c4' },
  removed:  { bg: '#f6d8d5', fg: '#7a2a2a', border: '#ecbfba' },
};
