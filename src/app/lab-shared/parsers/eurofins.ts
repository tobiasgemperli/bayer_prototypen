// Eurofins "Food Testing Lisboa" ("Relatório de ensaio", PT). Port of eurofins.py.
import { Doc, ParseResult, Residue, lines, page0Text, numDot } from './core';

export function detect(doc: Doc): boolean {
  const txt = page0Text(doc);
  return txt.includes('Relatório de ensaio')
    && (txt.includes('Food Testing Lisboa') || txt.toLowerCase().includes('eurofins'));
}

const HEADER_PATTERNS: Record<string, RegExp> = {
  sample_id: /Código da amostra\s+(\S+)/,
  report_date: /Data do relatório de ensaio\s+(\d{2}\/\d{2}\/\d{4})/,
  report_number: /Relatório de ensaio nº\s+(.+?)\s*$/,
  sample_type: /Tipo de amostra\s+(.+?)\s*$/,
  reception_date: /Data da receção da amostra\s+(\d{2}\/\d{2}\/\d{4})/,
  analysis_start: /Data de início do\(s\) ensaio\(s\)\s+(\d{2}\/\d{2}\/\d{4})/,
  analysis_end: /Data de conclusão do\(s\) ensaio\(s\)\s+(\d{2}\/\d{2}\/\d{4})/,
  sampling_date: /Data de amostragem\s+(\d{2}\/\d{2}\/\d{4})/,
  client_reference: /Referência do cliente\s*:\s*(.+?)\s*$/,
  lab_description: /Amostra descrita como\s*:\s*(.+?)\s*$/,
};

const ROW_RE = /^(?:\((?<flag>[a-z*])\)\s*)?(?<name>.+?)\s+(?<result>\d[\d.]*)\s+mg\/kg\s+(?<spec>[\d.]+)\s*$/;
const METHOD_RE = /por\s+([A-Z]+-MS\/MS)/;
const SKIP_RESULT = /^(XVP|V0\d|Other screened|Screened pesticides|Food Testing Lisboa|Química Resultados)/;

export function parse(doc: Doc): ParseResult {
  const ls = lines(doc);

  // header
  const header: Record<string, string | number | null> = {};
  for (const ln of ls) {
    for (const [key, pat] of Object.entries(HEADER_PATTERNS)) {
      if (key in header) continue;
      const m = ln.match(pat);
      if (m) header[key] = m[1].trim();
    }
  }
  // client name: line after the "Relatório de ensaio nº" line, minus garbled token
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].startsWith('Relatório de ensaio nº') && i + 1 < ls.length) {
      header.client_name = ls[i + 1].replace(/^\S*[ÍÂÎ]\S*\s+/, '').trim() || null;
      break;
    }
  }

  // detected residues
  const detected: Residue[] = [];
  let inBlock = false;
  let technique: string | null = null;
  for (const ln of ls) {
    const s = ln.trim();
    if (s.startsWith('Química Resultados')) { inBlock = true; continue; }
    if (!inBlock) continue;
    if (s.startsWith('Food Testing Lisboa') || s.startsWith('Conclusão') || s.startsWith('Lista de substâncias')) break;
    const mth = METHOD_RE.exec(s);
    if (mth) technique = mth[1];
    if (SKIP_RESULT.test(s)) continue;
    const m = ROW_RE.exec(s);
    if (m && m.groups) {
      detected.push({
        analyte: m.groups.name.trim(),
        result_mgkg: numDot(m.groups.result),
        mrl_eu_mgkg: numDot(m.groups.spec),
        mrl_uk_mgkg: null,
        loq_mgkg: null,
        technique,
        flag: m.groups.flag ?? null,
      });
    }
  }

  // UK MRLs from the HSE section, merged by analyte name
  const uk: Record<string, number | null> = {};
  let inHse = false;
  for (const ln of ls) {
    if (ln.includes('Health and Safety Executive')) { inHse = true; continue; }
    if (!inHse) continue;
    const t = ln.trim();
    if (t.startsWith('Assinatura') || t.startsWith('Esta informação') || !t) {
      if (Object.keys(uk).length) inHse = false;
      continue;
    }
    const m = t.match(/^(?:Pesticida\s+)?(?<name>.+?)\s*[-–]?\s*(?<val>\d[\d.]*)\s*$/);
    if (m && m.groups) uk[m.groups.name.trim().toLowerCase()] = numDot(m.groups.val);
  }
  for (const r of detected) {
    const n = r.analyte.toLowerCase();
    for (const [hseName, val] of Object.entries(uk)) {
      if (n.startsWith(hseName) || hseName.startsWith(n)) { r.mrl_uk_mgkg = val; break; }
    }
  }

  const errors: string[] = [];
  if (!header.sample_id) errors.push('missing sample_id');
  if (!header.sample_type) errors.push('missing sample_type');
  for (const r of detected) if (r.result_mgkg === null) errors.push(`unparsed result for ${r.analyte}`);

  return {
    template: 'eurofins-relatorio-de-ensaio',
    header,
    detected_residues: detected,
    _validation: { ok: errors.length === 0, errors, detected_count: detected.length },
  };
}
