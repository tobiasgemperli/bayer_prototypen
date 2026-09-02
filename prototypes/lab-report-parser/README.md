# Lab-report parser (deterministic, no LLM)

Prototype for extracting residue results from lab-report PDFs into structured
JSON **deterministically** — no LLM, no OCR. The reports are digitally-born
(real text layer), come from a small set of labs, and carry regulatory numbers
(residue values, MRLs) where a hallucinated figure is unacceptable. So we parse
one template per lab with `pdfplumber` and validate every extraction.

## Why not an LLM
Every bug we hit produced a *plausible* wrong answer (e.g. a report with residues
reported as a "clean sample"). Those are invisible without deterministic checks.
An LLM is a reasonable fallback for an unrecognized layout, but for known
templates a parser is auditable, cheap, and cannot invent a number.

## Layout
```
parsers/
  __init__.py   route(path): try each parser's detect(), run the first match
  aqua.py       Aqua / Tentamus "INFORME DE ENSAYO / TEST REPORT" (ES + EN)
server.py       tiny local demo backend (drop a PDF -> JSON)
index.html      drag-and-drop UI; POSTs the file to /parse and renders results
```

Each parser exposes `detect(pdf) -> bool` and `parse(path) -> dict`:
`{template, header, detected_residues[], _validation}`. Detection keys on the
PDF generator metadata plus a header anchor, so an unknown lab is rejected
rather than mis-parsed.

## Aqua parser notes
Handles, from one template: Spanish + English variants; the optional
`± uncertainty` column (ES has it, EN omits it); fruit vs **soil** layouts
(soil has no MRL columns but a Technique column); phrase-valued MRLs
(`"It doesn't require"`, `"Ver Suma"`, preserved as notes); multi-word analyte
names; and detected tables that span a page break. It extracts only the
**detected-results summary**, never the full screening panel.

The table extractor is schema-driven: it reads the column-header row to discover
which columns exist and their x-ranges, then assigns each word to the nearest
column — robust to right-aligned numbers and layout differences between labs.

## Run
```bash
python -m venv venv && ./venv/bin/pip install -r requirements.txt
./venv/bin/python server.py          # open http://localhost:8770
```
Drop a report PDF, or append `?demo=<filename>` to auto-load a bundled sample.

## Status
All 10 sample reports route to the correct parser and validate:
- **Aqua / Tentamus** (`aqua.py`) — 7 reports (ES + EN, fruit + soil).
- **Eurofins Lisboa** (`eurofins.py`) — 2 reports (PT "Relatório de ensaio").
- **Orange-data lab** (`orangedata.py`) — 1 report (EN "Analytical Report").

Known rough edges (prototype): a couple of header fields that wrap across a
line are captured only up to the break (Eurofins `client_name`, one
`client_reference`); Eurofins/orange-data don't expose a per-row LOQ in their
detected tables. None affect the residue values, which are the point.
