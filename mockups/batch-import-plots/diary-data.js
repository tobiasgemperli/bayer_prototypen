// Turkish spray diary sample data — shared by batch-import.html and import-chat.html.
// ── Turkish spray diary (İlaçlama kayıt defteri) ────────────────────────
// Transcribed from two real inputs: an Excel diary (diary-xlsx.png) and a
// handwritten scan (diary-scan.png). Rows list SEVERAL parcels in shorthand
// ("A5-6-7-B1-Kanal altı"), or relative areas ("tüm alan" = whole area,
// "kalan kısım" = the rest). 29 rows contain only a few dozen distinct
// values: step 1 matches each once, step 2 shows rows expanded per plot.
const DIARY_PLOTS = [
  ['A1', 1.1], ['A2', 0.9], ['A3', 1.2], ['A4', 0.8], ['A5', 1.0], ['A6', 0.9], ['A7', 1.3], ['A8', 1.1], ['A9', 0.7], ['A10', 1.0],
  ['B1', 2.12], ['B2', 0.8], ['B3', 0.9], ['B4', 1.0], ['B5', 0.7], ['B6', 0.9], ['B7', 1.1],
].map(([name, area]) => ({ name, crop: 'Cherry', area }));
const NEW_PLOT = '__new', ALL_PLOTS = '__all', REST_PLOTS = '__rest';
// Variants the assistant can set: same as above, but leaving out the Organik block.
const ALL_NO_ORG = '__all_no_org', REST_NO_ORG = '__rest_no_org';
const SKIP = 'Skip — not a crop-protection product';
const DIARY_PRODUCTS = {
  'Hektaş Bordo Bulamacı': 'Copper sulphate + calcium hydroxide · Fungicide',
  'Hektaş Göztaşı': 'Copper sulphate · Fungicide',
  'Koruma Captan 50 WP': 'Captan · 50% · Fungicide',
  'Yarda 400 SC': 'Fluopyram + Tebuconazole · Fungicide',
  'Lusen': 'Fluopyram 250 g/l + Trifloxystrobin 250 g/l · Fungicide',
  'Lamdex 50 CS': 'Lambda-cyhalothrin · Insecticide',
  'Decis 25 EC': 'Deltamethrin 25 g/l · Insecticide',
  'Decis 100 EC': 'Deltamethrin 100 g/l · Insecticide',
  'Mospilan 20 SP': 'Acetamiprid · 20% · Insecticide',
  'Delegate 250 WG': 'Spinetoram · 25% · Insecticide',
  'Exirel 100 SE': 'Cyantraniliprole · Insecticide',
};
// Normalised key: case, spaces and punctuation don't matter ("YARDA 400SC" = "Yarda 400 SC").
// Turkish lower-casing turns "I" into dotless "ı" (EXIREL → exırel), so fold ı → i too.
const nk = (s) => String(s).toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/[\s.,%\-]/g, '');
const byKey = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [nk(k), v]));
// Normalised raw value → [match, how, why].
const PRODUCT_ALIASES = {
  'hektaşbordo': ['Hektaş Bordo Bulamacı', 'auto', 'Trade name in the Turkish product register'],
  'hektaşgöztaşı': ['Hektaş Göztaşı', 'auto', '“Göztaşı” = bluestone (copper sulphate) · active substance column agrees'],
  'korumacaptan50wp': ['Koruma Captan 50 WP', 'auto', 'Exact trade name'],
  'yarda400sc': ['Yarda 400 SC', 'auto', 'Exact trade name'],
  'lusen': ['Lusen', 'auto', 'Active substances in the file (“fluopram… trifioxstrobin…”, misspelt) agree'],
  'lamdex': ['Lamdex 50 CS', 'auto', 'Trade name · one formulation registered'],
  'lamdex50cs': ['Lamdex 50 CS', 'auto', 'Exact trade name'],
  'decis': ['', '', '2 registered products — Decis 25 EC or Decis 100 EC? The file only says “decis”'],
  'mospilan20sp': ['Mospilan 20 SP', 'auto', 'Exact trade name'],
  'delegate': ['Delegate 250 WG', 'suggested', 'File says “spinetorom %25 wp” — Delegate is registered as 250 WG'],
  'delegate250wg': ['Delegate 250 WG', 'auto', 'Exact trade name'],
  'exirel100se': ['Exirel 100 SE', 'auto', 'Exact trade name'],
};
const METHOD_ALIASES = { 'püskürtme': ['Foliar spray', 'Turkish for spraying'] };
const REL_PARCELS = {
  'tümalan': ['', 'Turkish for “whole area” — the assistant is asking you about this'],
  'kalankısım': ['', 'Turkish for “remaining part” — the assistant is asking you about this'],
};
const DOSE_UNIT_OPTS = [['g/100 l', 'g per 100 l'], ['ml/100 l', 'ml per 100 l']];
const WATER_UNITS = [['t', 'Tonnes for the whole row'], ['l', 'Litres for the whole row'], ['lda', 'Litres per dekar'], ['lha', 'Litres per hectare']];
const DATE_ORDERS = [['mdy', 'Month first (2/25/26 = 25 Feb)'], ['dmy', 'Day first (2/25/26 = invalid)']];

// Excel diary — page 1 as in the screenshot (row y-bounds are for the source preview).
const G1 = 'A5-6-7-8-9-10-B7-B1-A2-4-6-Kanal altı-A1-3';
const ORG = 'B1-2-3-4-5-Organik-20da-55da-40 da-';
const LUSEN_AI = 'fluopram250g/l trifioxstrobin250g/l';
const XLSX = [
  // parcels, date, active ingredient, trade name, dose, PHI, water, [y0, y1]
  [G1, '2/25/26', '', 'hektaş bordo', '2000', 21, 25, [163, 218]],
  ['kalan kısım', '2/25/26', '', 'hektaş bordo', '1000', 21, 35, [218, 258]],
  [G1, '3/28/26', LUSEN_AI, 'LUSEN', '25ml/100l', 3, 25, [258, 312]],
  ['kalan kısım', '3/31/26', LUSEN_AI, 'LUSEN', '25ml/100l', 3, 35, [312, 350]],
  [G1, '4/7/26', LUSEN_AI, 'LUSEN', '25ml/100l', 3, 25, [350, 405]],
  ['kalan kısım', '4/9/26', LUSEN_AI, 'LUSEN', '25ml/100l', 3, 35, [405, 443]],
  ['tüm alan', '4/18/26', 'lambda-cyhalothrin', 'lamdex', '50cc/100l', 14, 60, [443, 480]],
  ['tüm alan', '4/25/26', 'deltametrin', 'decis', '25ml/100l', 3, 60, [480, 516]],
  ['tüm alan', '4/25/25', 'acetamiprid%20', 'mospilan 20sp', '25gr/100l', 7, 60, [516, 553]],
  ['tüm alan', '5/4/26', 'deltametrin', 'decis', '25ml/100l', 3, 60, [553, 590]],
  ['tüm alan', '5/4/26', 'acetamiprid%20', 'mospilan 20sp', '25gr/100l', 7, 60, [590, 626]],
  ['tüm alan', '5/16/26', 'lambda-cyhalothrin', 'lamdex', '50cc/100l', 14, 60, [626, 662]],
  ['tüm alan', '5/24/26', 'spinetorom %25 wp', 'delegate', '20gr/100l', 3, 60, [662, 694]],
  ['tüm alan', '6/1/26', 'spinetorom %25 wp', 'delegate', '20gr/100l', 3, 60, [694, 726]],
  [G1, '6/1/26', LUSEN_AI, 'LUSEN', '25ml/100l', 3, 30, [726, 782]],
  [ORG, '6/10/26', 'spinetorom %25 wp', 'delegate', '20gr/100l', 3, 30, [782, 852]],
  [ORG, '6/14/26', 'spinetorom %25 wp', 'delegate', '20gr/100l', 3, 30, [852, 920]],
];
// Handwritten scan — 12 rows, all on parcel "B C/A 21,2 da" (spelling varies).
const SCAN = [
  // parcels, date, active ingredient, trade name, dose, PHI, harvest date, reason, [y0, y1]
  ['B C/A 21,2 da', '10.03.2026', 'Bakır Sülfat', 'Hektaş Göztaşı', '1000g/100lt', 21, '22.03.2026', 'Genel Koruma', [220, 290]],
  ['B C/A 21.2 da', '10.04.2026', 'Captan 50% WP', 'Koruma Captan 50 WP', '300g/100lt', 14, '25.04.2026', 'Monilinia laxa', [290, 360]],
  ['BC/A 21.2 da', '25.04.2026', 'Fluopyram Tebuconazole', 'YARDA 400SC', '25g/100l', 3, '29.04.2026', 'Monilinia', [360, 432]],
  ['BC/A 21.2 da', '10.05.2026', 'Acetamiprid', 'Mospilan 20SP', '25g/100l', 7, '18.05.26', 'Kiraz sineği', [432, 503]],
  ['BC/A 21.2 da', '10.05.2026', 'Lambda-cyhalothrin', 'LAMDEX 50 CS', '50ml/100l', 14, '25.05-26', 'Kiraz sineği', [503, 572]],
  ['BC/A 21.2 da', '11.05.2026', 'Captan', 'Koruma Captan 50 WP', '300g/100lt', 14, '26.05.26', 'Monilinia', [572, 643]],
  ['BC/A 21.2 da', '15.05.2026', '%25 Spinetoram', 'Delegate 250 WG', '20g/100lt', 3, '19.05.26', 'Kiraz sineği', [643, 715]],
  ['BC/A 21.2 da', '15.05.2026', 'Fluopyram Tebuconazole', 'YARDA 400 SC', '25g/100lt', 3, '19.05.26', 'Monilinia', [715, 785]],
  ['BC/A 21.2 da', '18.05.2026', 'Cyantraniliprole', 'EXIREL 100 SE', '100ml/100l', 3, '22.05.2026', 'Kiraz sineği', [785, 855]],
  ['BC/A 21.2 da', '18.05.2026', 'Fluopyram Trifloxystrobin', 'LUSEN', '25cc/100lt', 3, '22.05.2026', 'Monilinia', [855, 937]],
  ['BC/A 21.2 da', '22.05.2026', '%25 Spinetoram', 'Delegate 250 WG', '20g/100lt', 3, '26.05.2026', 'Kiraz sineği', [937, 1008]],
  ['BC/A 21.2 da', '22.05.2026', 'Fluopyram Trifloxystrobin', 'LUSEN', '25cc/100lt', 3, '26.05.2026', 'Monilinia', [1008, 1092]],
];
const DIARY_ROWS = [
  ...XLSX.map(([parcels, date, ai, trade, dose, phi, water, y], i) =>
    ({ src: 'xlsx', line: i + 1, parcels, date, ai, trade, dose, phi, water, y, method: 'püskürtme', include: true })),
  ...SCAN.map(([parcels, date, ai, trade, dose, phi, harvest, reason, y], i) =>
    ({ src: 'scan', line: i + 1, parcels, date, ai, trade, dose, phi, harvest, reason, y, water: '', method: 'Püskürtme', include: true })),
];
// Source previews: [file, natural size in the 2000-wide reference, header band].
const SOURCES = {
  xlsx: { img: 'diary-xlsx.png', h: 940, head: [18, 162], file: 'İlaçlama defteri 2026.xlsx' },
  scan: { img: 'diary-scan.png', h: 1112, head: [0, 218], file: 'ilaclama-kaydi.pdf' },
};

const lc = (s) => String(s).trim().toLocaleLowerCase('tr');
const productKey = (r) => (r.trade || r.ai).trim();

// "A5-6-7-B1-A2-4-Kanal altı" → A5 A6 A7 B1 A2 A4 "Kanal altı": bare numbers
// inherit the last letter, repeats are dropped, "20da"/"21,2 da" are areas.
function parseParcels(raw) {
  let s = raw.trim(); const areas = [];
  const m = s.match(/\s*(\d+[.,]\d+)\s*da$/i);
  if (m) { areas.push(m[1].replace(',', '.')); s = s.slice(0, m.index).trim(); }
  if (!/^[A-Z]+\d/.test(s)) return { tokens: [s], dupes: [], areas };
  let prefix = ''; const tokens = [], dupes = [];
  s.split('-').map(t => t.trim()).filter(Boolean).forEach(t => {
    if (/^\d+\s*da$/i.test(t)) { areas.push(t); return; }
    let code = t;
    const a = t.match(/^([A-Z]+)\d+$/);
    if (a) prefix = a[1]; else if (/^\d+$/.test(t) && prefix) code = prefix + t;
    if (tokens.includes(code)) dupes.push(code); else tokens.push(code);
  });
  return { tokens, dupes, areas };
}

function autoPlot(code, areas) {
  const rel = byKey(REL_PARCELS)[nk(code)];
  if (rel) return { value: rel[0], how: rel[0] ? 'auto' : '', note: rel[1] };
  if (DIARY_PLOTS.some(p => p.name === code)) return { value: code, how: 'exact' };
  if (areas.length === 1 && areas[0].includes('.')) {
    const ha = Number(areas[0]) / 10;
    const p = DIARY_PLOTS.find(x => Math.abs(x.area - ha) < 0.05);
    if (p) return { value: p.name, how: 'suggested', note: `Suggested from the area next to it: ${areas[0].replace('.', ',')} da ≈ ${p.name} (${p.area} ha)` };
  }
  return { value: '', how: '', note: 'Not one of your plots' };
}

// Dose cell → { n, unit spelling }. "1000g/100lt" → 1000, "g"; "2000" → 2000, "".
const parseDose = (raw) => { const m = String(raw).match(/^\s*([\d.,]+)\s*([a-zA-Z]*)/); return { n: parseFloat(m[1]), u: lc(m[2]) }; };
const UNIT_ALIASES = {
  '': ['g/100 l', 'No unit in the cell — taken from the column header “(g / 100 l)”'],
  'g': ['g/100 l', ''], 'gr': ['g/100 l', '“gr” = grams'],
  'ml': ['ml/100 l', ''], 'cc': ['ml/100 l', '“cc” = ml'],
};
