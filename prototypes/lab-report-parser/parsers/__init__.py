"""
Deterministic lab-report parsers, one per lab template.

Each parser module exposes:
    detect(pdf) -> bool        # is this PDF that lab's template?
    parse(path) -> dict        # {template, header, detected_residues, _validation}

route(path) tries each in turn and runs the first that matches. Detection keys
on the PDF generator metadata + a header anchor, so a report from an unknown
lab is rejected rather than parsed into confident garbage.
"""
import pdfplumber
from . import aqua, eurofins, orangedata

PARSERS = [aqua, eurofins, orangedata]

def route(path):
    pdf = pdfplumber.open(path)
    for p in PARSERS:
        if p.detect(pdf):
            return p.parse(path)
    meta = pdf.metadata or {}
    raise ValueError("No parser matches this report "
                     f"(producer={meta.get('Producer') or meta.get('Creator') or '?'})")
