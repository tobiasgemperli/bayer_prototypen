// Environment-agnostic core for the deterministic lab-report parsers.
// Mirrors the Python reference (pdfplumber) word/row model so the browser
// (pdf.js) and Node verification paths share identical parsing logic.

export interface Word { text: string; x0: number; x1: number; top: number }
export type Page = Word[];

/** A parsed report: header fields + detected residues + validation. */
export interface ParseResult {
  template: string;
  header: Record<string, string | number | null>;
  detected_residues: Residue[];
  _validation: { ok: boolean; errors: string[]; detected_count: number };
}

export interface Residue {
  analyte: string;
  result_mgkg: number | null;
  result_qualifier?: string | null;
  uncertainty_mgkg?: number | null;
  mrl_eu_mgkg?: number | null;
  mrl_uk_mgkg?: number | null;
  loq_mgkg?: number | null;
  mrl_eu_note?: string;
  mrl_uk_note?: string;
  technique?: string | null;
  flag?: string | null;
  arfd?: number | null;
  pct_arfd?: number | null;
}

/** A PDF reduced to what the parsers need: generator + positioned words. */
export interface Doc { producer: string; pages: Page[] }

/**
 * Convert one page's pdf.js text items into pdfplumber-style words.
 * pdf.js emits runs (sometimes multi-word); we split on whitespace and estimate
 * each word's x by proportion of the run width. `top` is measured from the page
 * top so row clustering matches the Python (pdfplumber) reference.
 */
export function itemsToWords(items: any[], pageHeight: number): Word[] {
  const out: Word[] = [];
  for (const it of items) {
    const s: string = it?.str ?? '';
    if (!s || !s.trim()) continue;
    const tr = it.transform as number[];
    const x = tr[4];
    const top = pageHeight - tr[5];
    const width: number = it.width ?? 0;
    const charW = s.length ? width / s.length : 0;
    let idx = 0;
    for (const token of s.split(/(\s+)/)) {
      if (token === '' ) continue;
      if (/^\s+$/.test(token)) { idx += token.length; continue; }
      out.push({ text: token, x0: x + idx * charW, x1: x + (idx + token.length) * charW, top });
      idx += token.length;
    }
  }
  return out;
}

/** Cluster a page's words into visual rows by top (tolerance), each sorted by x0. */
export function clusterRows(page: Page, yTol = 5): Word[][] {
  const words = [...page].sort((a, b) => a.top - b.top || a.x0 - b.x0);
  const rows: Word[][] = [];
  let cur: Word[] = [];
  let base: number | null = null;
  for (const w of words) {
    if (base === null || Math.abs(w.top - base) <= yTol) {
      cur.push(w);
      if (base === null) base = w.top;
    } else {
      rows.push(cur);
      cur = [w];
      base = w.top;
    }
  }
  if (cur.length) rows.push(cur);
  for (const r of rows) r.sort((a, b) => a.x0 - b.x0);
  return rows;
}

/** (joinedText, words) per visual row, across all pages — like Python _word_rows. */
export function wordRows(doc: Doc): Array<{ text: string; words: Word[] }> {
  const out: Array<{ text: string; words: Word[] }> = [];
  for (const page of doc.pages) {
    for (const r of clusterRows(page)) {
      out.push({ text: r.map((w) => w.text).join(' '), words: r });
    }
  }
  return out;
}

/** Joined text lines across all pages — like Python _lines. */
export function lines(doc: Doc): string[] {
  return wordRows(doc).map((r) => r.text);
}

/** First-page text (for detect anchors). */
export function page0Text(doc: Doc): string {
  if (!doc.pages.length) return '';
  return clusterRows(doc.pages[0]).map((r) => r.map((w) => w.text).join(' ')).join('\n');
}

/** Cluster a row's words left-to-right into cells separated by x-gaps > gap. */
export function gapCells(words: Word[], gap: number): Word[][] {
  const ws = [...words].sort((a, b) => a.x0 - b.x0);
  if (!ws.length) return [];
  const cells: Word[][] = [];
  let cur: Word[] = [ws[0]];
  for (let i = 1; i < ws.length; i++) {
    if (ws[i].x0 - cur[cur.length - 1].x1 > gap) {
      cells.push(cur);
      cur = [ws[i]];
    } else {
      cur.push(ws[i]);
    }
  }
  cells.push(cur);
  return cells;
}

/** Strict: whole string is one decimal-comma/dot number -> [value, qualifier]. */
export function numComma(s: string | null | undefined): [number | null, string | null] {
  if (s == null) return [null, null];
  const m = s.trim().match(/^([<>]?)\s*([\d.]*\d(?:,\d+)?)$/);
  if (!m) return [null, null];
  return [parseFloat(m[2].replace(/\./g, '').replace(',', '.')), m[1] || null];
}

/** Loose: first number in a cell that may carry units, e.g. "0,005 mg/kg". */
export function cellNum(s: string | null | undefined): [number | null, string | null] {
  if (!s) return [null, null];
  const m = s.match(/([<>]?)\s*(\d[\d.]*(?:,\d+)?)/);
  if (!m) return [null, null];
  return [parseFloat(m[2].replace(/\./g, '').replace(',', '.')), m[1] || null];
}

/** Dot-decimal number (Eurofins uses "0.070", "10"). */
export function numDot(s: string | null | undefined): number | null {
  if (s == null) return null;
  const m = s.match(/^\s*(\d[\d.]*)\s*$/);
  return m ? parseFloat(m[1]) : null;
}

/** Comma- or dot-decimal (orange-data: "0,051", "5,0"). */
export function numAny(s: string | null | undefined): number | null {
  if (s == null) return null;
  const t = s.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(t)) return null;
  return t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t);
}
