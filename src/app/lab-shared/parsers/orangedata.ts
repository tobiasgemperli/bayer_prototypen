// orange-data "Analytical Report" (EN, eDocEngine). Port of orangedata.py.
import { Doc, ParseResult, Residue, lines, page0Text, numAny } from './core';

export function detect(doc: Doc): boolean {
  const prod = doc.producer.toLowerCase();
  const txt = page0Text(doc);
  return prod.includes('orange-data') || prod.includes('edocengine')
    || (txt.includes('Analytical Report') && txt.includes('Phytosanitary Results'));
}

const HEADER_PATTERNS: Record<string, RegExp> = {
  report_number: /Report Number\s+(\S+)/,
  report_date: /Report date\s+(\d{2}\/\d{2}\/\d{4})/,
  sample_type: /Sample description:\s*(.+?)\s*$/,
  reception_date: /Reception date:\s*(\d{2}\/\d{2}\/\d{4})/,
  analysis_start: /Analysis start date:\s*(\d{2}\/\d{2}\/\d{4})/,
  analysis_end: /Analysis end date:\s*(\d{2}\/\d{2}\/\d{4})/,
  customer_reference: /CUSTOMER REFERENCE\s+(.+?)\s*$/,
};

const ROW_RE = /^-?\s*(?<name>.+?)\s+(?<nums>\d+(?:[.,]\d+)?(?:\s+\d+(?:[.,]\d+)?){2,})\s*$/;

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
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].startsWith('Report Number') && i + 1 < ls.length) {
      header.client_name = ls[i + 1].trim();
      break;
    }
  }

  // detected residues
  const detected: Residue[] = [];
  let inBlock = false;
  let tech: string | null = null;
  for (const ln of ls) {
    const s = ln.trim();
    if (s.startsWith('Phytosanitary Results')) { inBlock = true; continue; }
    if (!inBlock) continue;
    if (s.includes('Technique:')) {
      const mt = /Technique:\s*([A-Za-z/–-]+MS\/MS)/.exec(s);
      if (mt) tech = mt[1];
      continue;
    }
    if (s.includes('(0,') || s.includes('(LOQ') || s.startsWith('Analysed Compound') || s.startsWith('mg/kg')) continue;
    const m = ROW_RE.exec(s);
    if (!m || !m.groups) continue;
    const nums = m.groups.nums.split(/\s+/).map(numAny);
    while (nums.length < 5) nums.push(null);
    detected.push({
      analyte: m.groups.name.replace(/^[\s-]+|[\s-]+$/g, ''),
      result_mgkg: nums[0],
      loq_mgkg: nums[1],
      mrl_eu_mgkg: nums[2],
      arfd: nums[3],
      pct_arfd: nums[4],
      technique: tech,
    });
  }

  const errors: string[] = [];
  if (!header.report_number) errors.push('missing report_number');
  if (!header.sample_type) errors.push('missing sample_type');
  for (const r of detected) if (r.result_mgkg === null) errors.push(`unparsed result for ${r.analyte}`);

  return {
    template: 'orangedata-analytical-report',
    header,
    detected_residues: detected,
    _validation: { ok: errors.length === 0, errors, detected_count: detected.length },
  };
}
