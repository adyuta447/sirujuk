"""Generate 80 variatif nama pasien Indonesia ke testdata/pasien.json.

Usage (one-off dev tool, bukan runtime service):
    pip install indofaker==0.1.1
    python backend-go/internal/seed/generate_pasien.py

Output: backend-go/internal/seed/testdata/pasien.json
Shape: {"pasien": [{"nama": str, "gender": str, "suku": str, "agama": str}]}
"""

import json
import random
import sys
import types
from pathlib import Path

# Workaround: indofaker 0.1.1 wheel is broken, __init__.py imports
# .adress.generate_address which is not shipped. Bypass the package
# init by stubbing the parent package, then import submodules directly.
# Data, enums, and generate_name logic still come from the library.
import importlib.util


def _indofaker_spec_path() -> str:
    spec = importlib.util.find_spec("indofaker")
    paths = (spec.submodule_search_locations or []) if spec else []
    if not paths:
        raise ImportError("indofaker package not found, run: pip install indofaker")
    return str(paths[0])


_stub = types.ModuleType("indofaker")
_stub.__path__ = [_indofaker_spec_path()]
sys.modules.setdefault("indofaker", _stub)

from indofaker.name.gender import Gender
from indofaker.name.generate_name import generate_name
from indofaker.name.religion import Religion
from indofaker.name.tribe import Tribe

TOTAL = 80
SEED = 42

# Library data only ships family names for JAVA and BATAK, and the BATAK
# filter requires an exact religion match (only MOUSLEM has one entry:
# Nasution). Other tribes have no family names, so generate_name crashes
# for them. Stratify within supported combos: JAVA cycles all 6 religions,
# BATAK uses MOUSLEM. Suku variety is therefore Java/Batak, which is all
# the library can authentically produce.
TRIBE_CYCLE = [
    Tribe.JAVA,
    Tribe.JAVA,
    Tribe.BATAK,
]

RELIGIONS = [
    Religion.MOUSLEM,
    Religion.CHRISTIAN,
    Religion.CATHOLIC,
    Religion.HINDUISM,
    Religion.BUDHIST,
    Religion.KONGHUCU,
]


def _val(enum_member) -> str:
    value = enum_member.value
    return value[0] if isinstance(value, tuple) else value

OUT_PATH = Path(__file__).resolve().parent / "testdata" / "pasien.json"


def main() -> None:
    random.seed(SEED)
    seen: set[str] = set()
    patients: list[dict[str, str]] = []

    i = 0
    java_count = 0
    guard = 0
    while len(patients) < TOTAL and guard < TOTAL * 50:
        guard += 1
        gender = Gender.MALE if i % 2 == 0 else Gender.FEMALE
        tribe = TRIBE_CYCLE[i % len(TRIBE_CYCLE)]
        if tribe == Tribe.BATAK:
            religion = Religion.MOUSLEM
        else:
            religion = RELIGIONS[(java_count + java_count // len(RELIGIONS)) % len(RELIGIONS)]
            java_count += 1

        name = generate_name(gender=gender, tribe=tribe, religion=religion)
        if name in seen:
            i += 1
            continue
        seen.add(name)
        patients.append(
            {
                "nama": name,
                "gender": _val(gender),
                "suku": _val(tribe),
                "agama": _val(religion),
            }
        )
        i += 1

    assert len(patients) == TOTAL, f"hanya dapat {len(patients)} nama unik"
    assert {p["gender"] for p in patients} == {"male", "female"}
    assert {p["suku"] for p in patients} == {"Javanese", "Batak"}
    assert len({p["agama"] for p in patients}) == len(RELIGIONS)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps({"pasien": patients}, ensure_ascii=False, indent=4) + "\n",
        encoding="utf-8",
    )

    from collections import Counter

    print(f"wrote {OUT_PATH} ({len(patients)} nama)")
    print("gender:", dict(Counter(p["gender"] for p in patients)))
    print("suku:", dict(Counter(p["suku"] for p in patients)))
    print("agama:", dict(Counter(p["agama"] for p in patients)))


if __name__ == "__main__":
    main()
