// Aqua / Tentamus "INFORME DE ENSAYO / TEST REPORT" (ES + EN). Port of aqua.py.
import {
  Doc, ParseResult, Residue, Word, wordRows, lines, page0Text,
  gapCells, numComma, cellNum,
} from './core';

export function detect(doc: Doc): boolean {
  const prod = doc.producer.toLowerCase();
  if (prod.includes('aqua esolutions') || prod.includes('aqua ebs')) return true;
  const first = page0Text(doc);
  return (first.includes('INFORME DE ENSAYO') || first.includes('TEST REPORT'))
    && (first.includes('Nº Muestra / Informe') || first.includes('LAB-Ref.'));
}

const HEADER_MAP: Record<string, string> = {
  // Spanish
  'Código cliente': 'client_code',
  'Referencia cliente': 'client_reference',
  'Tipo de muestra': 'sample_type',
  'Descripción LAB': 'lab_description',
  'Peso muestra (Kg)': 'weight_kg',
  'Nº Piezas': 'pieces',
  'Estado de la muestra': 'sample_condition',
  'Punto de toma de muestra': 'sampling_point',
  'Lugar toma de muestra': 'sampling_point',
  'Fecha / Hora toma de muestra': 'sampling_datetime',
  'Fecha / Hora de recepción': 'reception_datetime',
  'Fecha inicio ensayo': 'analysis_start',
  'Fecha fin ensayo': 'analysis_end',
  'Fecha emisión informe': 'report_date',
  // English
  'Customer Code': 'client_code',
  'Customer Ref.': 'client_reference',
  'Sample type': 'sample_type',
  'LAB Description': 'lab_description',
  'Sample weight (Kg)': 'weight_kg',
  'Pieces No.': 'pieces',
  'Condition of sample': 'sample_condition',
  'Sample location': 'sampling_point',
  'Date / Time sampling': 'sampling_datetime',
  'Reception date / time': 'reception_datetime',
  'Test start date': 'analysis_start',
  'Test completion date': 'analysis_end',
  'Report date': 'report_date',
};
const SAMPLE_ID_ANCHORS = new Set(['Nº Muestra / Informe', 'LAB-Ref.:']);
const CLIENT_ANCHORS = new Set(['Identificación del cliente', 'Customer identification']);
const DETECTED_ANCHOR = /(resultados\s+detectados|results\s+detected)/i;
const METHOD_HEADER = /LAB\s*\d+-\d+-\d+/;
const SKIP_ROW = /(Nº Muestra|LAB-Ref|Página|Page:|INFORME DE ENSAYO|TEST REPORT)/;

interface Col { x0: number; x1: number; key: string }

function hdrKey(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('parámetro') || t.includes('parameter')) return 'name';
  if (t.includes('result')) return 'result';
  if (t.includes('lmr') || t.includes('mrl')) {
    if (t.includes('uk')) return 'mrl_uk';
    if (t.includes('ue') || t.includes('eu')) return 'mrl_eu';
  }
  if (/\bl[cq]\b/.test(t)) return 'loq';
  if (t.includes('técnica') || t.includes('tecnica') || t.includes('techni')) return 'technique';
  return null;
}

function columnsFromHeader(words: Word[]): Col[] {
  const cols: Col[] = [];
  for (const cell of gapCells(words, 9)) {
    const key = hdrKey(cell.map((w) => w.text).join(' '));
    if (key) {
      cols.push({
        x0: Math.min(...cell.map((w) => w.x0)),
        x1: Math.max(...cell.map((w) => w.x1)),
        key,
      });
    }
  }
  return cols;
}

function assign(cols: Col[], x: number): string {
  const dist = (c: Col) => (c.x0 <= x && x <= c.x1 ? 0 : Math.min(Math.abs(c.x0 - x), Math.abs(c.x1 - x)));
  return cols.reduce((best, c) => (dist(c) < dist(best) ? c : best)).key;
}

function detectedResidues(doc: Doc): Residue[] {
  const out: Residue[] = [];
  let cols: Col[] | null = null;
  let inBlock = false;
  for (const { text, words } of wordRows(doc)) {
    const s = text.trim();
    if (DETECTED_ANCHOR.test(s)) { inBlock = true; continue; }
    if (!inBlock) continue;
    if (METHOD_HEADER.test(s)) break;
    if (SKIP_ROW.test(s)) continue;
    if (s.startsWith('Parámetro') || s.startsWith('Parameter')) {
      if (cols === null) cols = columnsFromHeader(words);
      continue;
    }
    if (cols === null) continue;

    const rec: Record<string, string> = {};
    for (const w of [...words].sort((a, b) => a.x0 - b.x0)) {
      const key = assign(cols, w.x0);
      rec[key] = ((rec[key] || '') + ' ' + w.text).trim();
    }
    const name = (rec.name || '').trim();
    const [result, rqual] = cellNum((rec.result || '').split('±')[0]);
    if (!name || result === null) continue;
    const unc = (rec.result || '').includes('±') ? cellNum(rec.result.split('±')[1])[0] : null;
    const eu = cellNum(rec.mrl_eu || '')[0];
    const uk = cellNum(rec.mrl_uk || '')[0];
    const row: Residue = {
      analyte: name,
      result_mgkg: result, result_qualifier: rqual,
      uncertainty_mgkg: unc,
      mrl_eu_mgkg: eu, mrl_uk_mgkg: uk,
      loq_mgkg: cellNum(rec.loq || '')[0],
    };
    if (eu === null && (rec.mrl_eu || '').trim()) row.mrl_eu_note = rec.mrl_eu.trim();
    if (uk === null && (rec.mrl_uk || '').trim()) row.mrl_uk_note = rec.mrl_uk.trim();
    if (rec.technique) row.technique = rec.technique.trim();
    out.push(row);
  }
  return out;
}

export function parse(doc: Doc): ParseResult {
  const ls = lines(doc);
  const header: Record<string, string | number | null> = { sample_id: null, client_name: null };

  ls.forEach((ln, i) => {
    const s = ln.trim();
    if (header.sample_id === null && SAMPLE_ID_ANCHORS.has(s) && i + 1 < ls.length) header.sample_id = ls[i + 1].trim();
    if (header.client_name === null && CLIENT_ANCHORS.has(s) && i + 1 < ls.length) header.client_name = ls[i + 1].trim();
    const m = ln.match(/^\s*([^:]+?):\s*(.+?)\s*$/);
    if (m) {
      const key = HEADER_MAP[m[1].trim()];
      if (key && !header[key]) header[key] = m[2].replace(/\s*\(#\)\s*$/, '').trim();
    }
  });
  if (header.weight_kg) header.weight_kg = numComma(String(header.weight_kg))[0];

  const detected = detectedResidues(doc);

  const errors: string[] = [];
  if (!header.sample_id) errors.push('missing sample_id');
  if (!header.sample_type) errors.push('missing sample_type');
  for (const r of detected) if (r.result_mgkg === null) errors.push(`unparsed result for ${r.analyte}`);

  return {
    template: 'aqua-informe-de-ensayo',
    header,
    detected_residues: detected,
    _validation: { ok: errors.length === 0, errors, detected_count: detected.length },
  };
}
