"""
Deterministic parser for the Aqua / Tentamus 'INFORME DE ENSAYO / TEST REPORT'
crop-residue lab report (Spanish + English variants of the same template).

No LLM, no OCR. Requires a text-layer PDF (all sample files have one).

    detect(pdf) -> bool     # is this the Aqua template?
    parse(path) -> dict     # {template, header, detected_residues, _validation}

The 'detected residues' are the quantified findings in the
'Resumen Resultados Detectados' / 'RESULTS DETECTED' summary block — NOT the
full multi-residue screening panel (hundreds of '<0,01' rows) that follows.
Every detected row carries a '± uncertainty', which is what separates it from
the screening panel.
"""
import re, sys, json
import pdfplumber

# ---- type detection -------------------------------------------------------
def detect(pdf) -> bool:
    meta = pdf.metadata or {}
    producer = (meta.get("Producer", "") + " " + meta.get("Creator", "")).lower()
    if "aqua esolutions" in producer or "aqua ebs" in producer:
        return True
    first = pdf.pages[0].extract_text() or ""            # anchor fallback
    return ("INFORME DE ENSAYO" in first or "TEST REPORT" in first) and \
           ("Nº Muestra / Informe" in first or "LAB-Ref." in first)

# ---- line reconstruction from word coordinates ----------------------------
# pdfplumber's default line grouping is too tight: it splits a label from its
# value when they sit at slightly different y (label top 220.4 vs value 223.3).
# Regroup words into visual rows with a y-tolerance, then join left-to-right.
def _lines(pdf, y_tol=5):
    out = []
    for pg in pdf.pages:
        words = pg.extract_words(use_text_flow=False)
        words.sort(key=lambda w: (w["top"], w["x0"]))
        rows, cur, base = [], [], None
        for w in words:
            if base is None or abs(w["top"] - base) <= y_tol:
                cur.append(w); base = w["top"] if base is None else base
            else:
                rows.append(cur); cur, base = [w], w["top"]
        if cur: rows.append(cur)
        for r in rows:
            out.append(" ".join(w["text"] for w in sorted(r, key=lambda x: x["x0"])))
    return out

def _word_rows(pdf, y_tol=5):
    """Like _lines, but yields (joined_text, [words]) per visual row, per page."""
    for pg in pdf.pages:
        words = pg.extract_words(use_text_flow=False)
        words.sort(key=lambda w: (w["top"], w["x0"]))
        rows, cur, base = [], [], None
        for w in words:
            if base is None or abs(w["top"] - base) <= y_tol:
                cur.append(w); base = w["top"] if base is None else base
            else:
                rows.append(cur); cur, base = [w], w["top"]
        if cur: rows.append(cur)
        for r in rows:
            r.sort(key=lambda x: x["x0"])
            yield (" ".join(w["text"] for w in r), r)

# ---- spanish/english label -> canonical key -------------------------------
HEADER_MAP = {
    # Spanish
    "Código cliente": "client_code",
    "Referencia cliente": "client_reference",
    "Tipo de muestra": "sample_type",
    "Descripción LAB": "lab_description",
    "Peso muestra (Kg)": "weight_kg",
    "Nº Piezas": "pieces",
    "Estado de la muestra": "sample_condition",
    "Punto de toma de muestra": "sampling_point",
    "Lugar toma de muestra": "sampling_point",
    "Fecha / Hora toma de muestra": "sampling_datetime",
    "Fecha / Hora de recepción": "reception_datetime",
    "Fecha inicio ensayo": "analysis_start",
    "Fecha fin ensayo": "analysis_end",
    "Fecha emisión informe": "report_date",
    # English
    "Customer Code": "client_code",
    "Customer Ref.": "client_reference",
    "Sample type": "sample_type",
    "LAB Description": "lab_description",
    "Sample weight (Kg)": "weight_kg",
    "Pieces No.": "pieces",
    "Condition of sample": "sample_condition",
    "Sample location": "sampling_point",
    "Date / Time sampling": "sampling_datetime",
    "Reception date / time": "reception_datetime",
    "Test start date": "analysis_start",
    "Test completion date": "analysis_end",
    "Report date": "report_date",
}
SAMPLE_ID_ANCHORS = {"Nº Muestra / Informe", "LAB-Ref.:"}
CLIENT_ANCHORS = {"Identificación del cliente", "Customer identification"}
DETECTED_ANCHOR = re.compile(r"(resultados\s+detectados|results\s+detected)", re.I)

# The detected-residues table has several column layouts within this template:
#   - fruit/commodity: Name | Result(±Unc) | MRL-EU | MRL-UK | LOQ
#   - soil:            Name | Result(±Unc) | LOQ | Technique      (no MRLs)
#   - Spanish prints "Result ± Uncertainty"; English omits the ± column
#   - MRL cells can hold a phrase ("It doesn't require", "Ver Suma") not a number
# Rather than hard-code x-positions, we read the column header row to discover
# which columns exist and where, then assign each data cell to the nearest one.
# a method-block header (e.g. "UPLC-MS/MS. LAB 1-01-131") ends the summary and
# starts the full screening panel — stop there so we never ingest the panel.
METHOD_HEADER = re.compile(r"LAB\s*\d+-\d+-\d+")
# page furniture to skip if the summary happens to span a page break
SKIP_ROW = re.compile(r"(Nº Muestra|LAB-Ref|Página|Page:|INFORME DE ENSAYO|TEST REPORT)")

def _gap_cells(words, gap):
    """Cluster a row's words left-to-right into cells separated by x-gaps > gap."""
    words = sorted(words, key=lambda w: w["x0"])
    if not words: return []
    cells, cur = [], [words[0]]
    for w in words[1:]:
        if w["x0"] - cur[-1]["x1"] > gap:
            cells.append(cur); cur = [w]
        else:
            cur.append(w)
    cells.append(cur)
    return cells

def _hdr_key(text):
    """Map a header cell's text to a canonical column key."""
    t = text.lower()
    if "parámetro" in t or "parameter" in t: return "name"
    if "result" in t:                        return "result"   # Resultado / Result
    if "lmr" in t or "mrl" in t:
        if "uk" in t: return "mrl_uk"
        if "ue" in t or "eu" in t: return "mrl_eu"
    if re.search(r"\bl[cq]\b", t):           return "loq"      # LC / LQ
    if "técnica" in t or "tecnica" in t or "techni" in t: return "technique"
    return None

def _columns_from_header(words):
    """Discover [{x0, x1, key}] columns (full x-span) from the table header row."""
    cols = []
    for cell in _gap_cells(words, gap=9):
        key = _hdr_key(" ".join(w["text"] for w in cell))
        if key:
            cols.append({"x0": min(w["x0"] for w in cell),
                         "x1": max(w["x1"] for w in cell), "key": key})
    return cols

def _assign(cols, x):
    """Column key for a word at x0=x: the column whose header x-range is nearest
    (0 distance if x is inside it). Robust to right-aligned numbers that start
    just left of their header label, and to wide 'result ± unc' cells."""
    def dist(c):
        return 0 if c["x0"] <= x <= c["x1"] else min(abs(c["x0"] - x), abs(c["x1"] - x))
    return min(cols, key=dist)["key"]

def _num(s):
    """Strict: whole string is one decimal-comma/dot number -> (float|None, qual)."""
    if s is None: return (None, None)
    m = re.match(r"^([<>]?)\s*([\d.]*\d(?:,\d+)?)$", s.strip())
    if not m: return (None, None)
    return (float(m.group(2).replace(".", "").replace(",", ".")), m.group(1) or None)

def _cellnum(s):
    """Loose: first number in a cell that may carry units, e.g. '0,005 mg/kg'."""
    if not s: return (None, None)
    m = re.search(r"([<>]?)\s*(\d[\d.]*(?:,\d+)?)", s)
    if not m: return (None, None)
    return (float(m.group(2).replace(".", "").replace(",", ".")), m.group(1) or None)

def _detected_residues(pdf):
    """Extract the 'detected results' summary table.

    Reads the column header to discover the schema (fruit has MRL columns, soil
    has a Technique column instead), clusters each data row into cells by x-gap,
    and assigns each cell to the nearest header column. Robust to ES/EN, the
    optional ± uncertainty, phrase-valued MRLs, and multi-word analyte names.
    Stops at the first method-block header so the screening panel is not ingested.
    """
    out, cols, in_block = [], None, False
    for text, words in _word_rows(pdf):
        s = text.strip()
        if DETECTED_ANCHOR.search(s):           # start, or "Continuación..." page
            in_block = True; continue           # keep cols across continuations
        if not in_block:
            continue
        if METHOD_HEADER.search(s):            # screening panel begins -> done
            break
        if SKIP_ROW.search(s):
            continue                            # page furniture across a break
        if s.startswith(("Parámetro", "Parameter")):
            if cols is None:                    # lock schema from the FIRST header
                cols = _columns_from_header(words)  # (continuation headers can be
            continue                            #  shifted vs their own data)
        if cols is None:
            continue                            # data before any header — ignore
        # data row: assign each word to the nearest header column, join per column
        rec = {}
        for w in sorted(words, key=lambda w: w["x0"]):
            key = _assign(cols, w["x0"])
            rec[key] = (rec.get(key, "") + " " + w["text"]).strip()

        name = rec.get("name", "").strip()
        result, rqual = _cellnum(rec.get("result", "").split("±")[0])
        if not name or result is None:
            continue                            # not a valid data row
        unc = _cellnum(rec["result"].split("±")[1])[0] if "±" in rec.get("result", "") else None
        eu, uk = _cellnum(rec.get("mrl_eu", ""))[0], _cellnum(rec.get("mrl_uk", ""))[0]
        row = {
            "analyte": name,
            "result_mgkg": result, "result_qualifier": rqual,
            "uncertainty_mgkg": unc,
            "mrl_eu_mgkg": eu, "mrl_uk_mgkg": uk,
            "loq_mgkg": _cellnum(rec.get("loq", ""))[0],
        }
        # preserve non-numeric MRL text (e.g. "It doesn't require", "Ver Suma")
        if eu is None and rec.get("mrl_eu", "").strip(): row["mrl_eu_note"] = rec["mrl_eu"].strip()
        if uk is None and rec.get("mrl_uk", "").strip(): row["mrl_uk_note"] = rec["mrl_uk"].strip()
        if rec.get("technique"): row["technique"] = rec["technique"].strip()
        out.append(row)
    return out

def parse(path):
    pdf = pdfplumber.open(path)
    if not detect(pdf):
        raise ValueError("Not an Aqua-template report")
    lines = _lines(pdf)

    header = {"sample_id": None, "client_name": None}
    for i, ln in enumerate(lines):
        s = ln.strip()
        if header["sample_id"] is None and s in SAMPLE_ID_ANCHORS and i + 1 < len(lines):
            header["sample_id"] = lines[i + 1].strip()
        if header["client_name"] is None and s in CLIENT_ANCHORS and i + 1 < len(lines):
            header["client_name"] = lines[i + 1].strip()
        m = re.match(r"^\s*([^:]+?):\s*(.+?)\s*$", ln)
        if m:
            key = HEADER_MAP.get(m.group(1).strip())
            if key and not header.get(key):
                header[key] = re.sub(r"\s*\(#\)\s*$", "", m.group(2)).strip()
    if header.get("weight_kg"):
        header["weight_kg"] = _num(header["weight_kg"])[0]

    # detected residues (column-based; handles ES/EN + phrase MRLs)
    detected = _detected_residues(pdf)

    errors = []
    if not header.get("sample_id"): errors.append("missing sample_id")
    if not header.get("sample_type"): errors.append("missing sample_type")
    for r in detected:
        # a detected residue must have a numeric result; MRLs are absent for
        # soil and may legitimately be a phrase ("Ver Suma"), so not required.
        if r["result_mgkg"] is None:
            errors.append(f"unparsed result for {r['analyte']}")

    return {
        "template": "aqua-informe-de-ensayo",
        "header": header,
        "detected_residues": detected,
        "_validation": {"ok": not errors, "errors": errors, "detected_count": len(detected)},
    }

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print("=" * 70); print(p.split("/")[-1])
        try:
            print(json.dumps(parse(p), ensure_ascii=False, indent=2))
        except Exception as e:
            print("  ERROR:", e)
