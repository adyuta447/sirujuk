"""Diagnosis table: the 144 non-specialist (KNS, competence 4A) list + specialist diagnoses, with PPK reference text.

Provenance: KNS ICD-10 codes come from a secondary source (medminutes.io, 2026-05) that cites the Permenkes 5/2014
appendix. That regulation was revoked by Permenkes 4/2026 (no successor list), so the list has no current legal
basis: choose and cite an authority, and have a physician validate it, before production.
PPK texts are drafts written for this PoC and MUST be reviewed by a physician before use.
"""
import re
from pathlib import Path

DATA = Path(__file__).parent / "data"
VERSION = "kns144-sekunder-2026.05+ppk-draft-v1"


def _load(name: str, ns: bool):
    rows = []
    for line in (DATA / name).read_text().splitlines():
        codes, title, group, ppk = line.split("|")
        rows.append(dict(prefixes=[c.replace(".", "").upper() for c in codes.split(",")], icd=codes.split(",")[0],
                         name=title, group=group, ppk=f"{title}. {ppk}", ns=ns))
    return rows


ENTRIES = _load("kns144.tsv", True) + _load("specialist.tsv", False)
N_NS = sum(e["ns"] for e in ENTRIES)   # entries 0..N_NS-1 are non-specialist; the rest are specialist
N_DIAG = len(ENTRIES)
_STOP = set("dan atau yang dengan pada di ke dari untuk bila saat setelah karena tidak ada sebagai oleh dalam".split())


def resolve(code: str) -> int:
    """ICD-10 -> entry index by longest prefix; -1 = not in the table (neither KNS nor a known specialist diagnosis)."""
    c = re.sub(r"[^A-Z0-9]", "", code.upper())
    best, blen = -1, 0
    for i, e in enumerate(ENTRIES):
        for p in e["prefixes"]:
            if c.startswith(p) and len(p) > blen:
                best, blen = i, len(p)
    return best


def template(i: int) -> str:
    return ENTRIES[i]["ppk"]


def keywords(i: int) -> list[str]:
    return sorted({w for w in re.findall(r"[a-z]{4,}", template(i).lower()) if w not in _STOP})
