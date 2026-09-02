"""
Deterministic parser for the Eurofins "Food Testing Lisboa" residue report
("Relatório de ensaio", Portuguese). No LLM, no OCR.

    detect(pdf) -> bool
    parse(path) -> dict   # {template, header, detected_residues, _validation}

Structure differs a lot from the Aqua template:
  - header fields are inline "Label value" (often several per line), dot decimals
  - detected residues sit under "Química Resultados Especificações", grouped by
    analytical method (XVP03=LC-MS/MS, XVP04=GC-MS/MS), as:
        (a) <name> <result> mg/kg <EU-spec>
  - UK MRLs are listed separately in an HSE section and merged back by name
  - the full screening panel ("Lista de substâncias pesquisadas") is ignored
"""
import re, sys, json
import pdfplumber

def detect(pdf) -> bool:
    txt = pdf.pages[0].extract_text() or ""
    return "Relatório de ensaio" in txt and \
           ("Food Testing Lisboa" in txt or "eurofins" in txt.lower())

def _lines(pdf):
    out = []
    for pg in pdf.pages:
        out += (pg.extract_text() or "").split("\n")
    return out

def _numd(s):
    """Dot-decimal number -> float (Eurofins uses '0.070', '10')."""
    if s is None: return None
    m = re.match(r"^\s*(\d[\d.]*)\s*$", s)
    return float(m.group(1)) if m else None

# header label -> key ; value is the token(s) after the label on the same line
HEADER_PATTERNS = {
    "sample_id":        r"Código da amostra\s+(\S+)",
    "report_date":      r"Data do relatório de ensaio\s+(\d{2}/\d{2}/\d{4})",
    "report_number":    r"Relatório de ensaio nº\s+(.+?)\s*$",
    "sample_type":      r"Tipo de amostra\s+(.+?)\s*$",
    "reception_date":   r"Data da receção da amostra\s+(\d{2}/\d{2}/\d{4})",
    "analysis_start":   r"Data de início do\(s\) ensaio\(s\)\s+(\d{2}/\d{2}/\d{4})",
    "analysis_end":     r"Data de conclusão do\(s\) ensaio\(s\)\s+(\d{2}/\d{2}/\d{4})",
    "sampling_date":    r"Data de amostragem\s+(\d{2}/\d{2}/\d{4})",
    "client_reference": r"Referência do cliente\s*:\s*(.+?)\s*$",
    "lab_description":  r"Amostra descrita como\s*:\s*(.+?)\s*$",
}

# a detected-residue row:  [(flag)] name  result  mg/kg  EU-spec
ROW_RE = re.compile(
    r"^(?:\((?P<flag>[a-z*])\)\s*)?(?P<name>.+?)\s+"
    r"(?P<result>\d[\d.]*)\s+mg/kg\s+(?P<spec>[\d.]+)\s*$"
)
METHOD_RE = re.compile(r"por\s+([A-Z]+-MS/MS)")          # technique in method header
SKIP_RESULT = re.compile(r"^(XVP|V0\d|Other screened|Screened pesticides|"
                         r"Food Testing Lisboa|Química Resultados)")

def parse(path):
    pdf = pdfplumber.open(path)
    if not detect(pdf):
        raise ValueError("Not a Eurofins-template report")
    lines = _lines(pdf)

    # --- header ---
    header = {}
    for ln in lines:
        for key, pat in HEADER_PATTERNS.items():
            if key in header: continue
            m = re.search(pat, ln)
            if m: header[key] = m.group(1).strip()
    # client name: line after the "Relatório de ensaio nº" line, minus the
    # garbled barcode token that Eurofins prints at its start.
    for i, ln in enumerate(lines):
        if ln.startswith("Relatório de ensaio nº") and i + 1 < len(lines):
            nxt = re.sub(r"^\S*[ÍÂÎ]\S*\s+", "", lines[i + 1]).strip()
            header["client_name"] = nxt or None
            break

    # --- detected residues (between the results header and the footer) ---
    detected, in_block, technique = [], False, None
    for ln in lines:
        s = ln.strip()
        if s.startswith("Química Resultados"):
            in_block = True; continue
        if not in_block: continue
        if s.startswith("Food Testing Lisboa") or s.startswith("Conclusão") \
           or s.startswith("Lista de substâncias"):
            break
        mth = METHOD_RE.search(s)
        if mth: technique = mth.group(1)
        if SKIP_RESULT.match(s): continue
        m = ROW_RE.match(s)
        if m:
            detected.append({
                "analyte": m.group("name").strip(),
                "result_mgkg": _numd(m.group("result")),
                "mrl_eu_mgkg": _numd(m.group("spec")),
                "mrl_uk_mgkg": None,
                "loq_mgkg": None,          # not shown per-row in the results table
                "technique": technique,
                "flag": m.group("flag"),
            })

    # --- UK MRLs from the HSE section, merged by analyte name ---
    uk = {}
    in_hse = False
    for ln in lines:
        if "Health and Safety Executive" in ln:
            in_hse = True; continue
        if not in_hse: continue
        if ln.strip().startswith(("Assinatura", "Esta informação")) or not ln.strip():
            if uk: in_hse = False
            continue
        m = re.match(r"^(?:Pesticida\s+)?(?P<name>.+?)\s*[-–]?\s*(?P<val>\d[\d.]*)\s*$", ln.strip())
        if m: uk[m.group("name").strip().lower()] = _numd(m.group("val"))
    for r in detected:
        n = r["analyte"].lower()
        for hse_name, val in uk.items():
            if n.startswith(hse_name) or hse_name.startswith(n):
                r["mrl_uk_mgkg"] = val; break

    # --- validation ---
    errors = []
    if not header.get("sample_id"): errors.append("missing sample_id")
    if not header.get("sample_type"): errors.append("missing sample_type")
    for r in detected:
        if r["result_mgkg"] is None: errors.append(f"unparsed result for {r['analyte']}")

    return {
        "template": "eurofins-relatorio-de-ensaio",
        "header": header,
        "detected_residues": detected,
        "_validation": {"ok": not errors, "errors": errors, "detected_count": len(detected)},
    }

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print("=" * 70); print(p.split("/")[-1])
        try: print(json.dumps(parse(p), ensure_ascii=False, indent=2))
        except Exception as e: print("  ERROR:", e)
