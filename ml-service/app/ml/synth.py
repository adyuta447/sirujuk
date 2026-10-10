"""Synthetic JKN referral generator with labelled anomaly scenarios A-E (ml-service-rules.md).

Evidence base: SYNTHETIC. Metrics prove the pipeline finds what was injected, not real-world performance.
"""
import numpy as np
import pandas as pd

from app.ml.diagnosis import ENTRIES, N_DIAG, N_NS, keywords

N_HOSP, DAYS, ACTIVE_FROM = 40, 360, 60
FILLER = ["pasien", "sejak", "hari", "disertai", "tidak", "membaik", "kontrol", "terapi", "riwayat", "belum", "obat"]
GENERIC = ["pasien datang dengan keluhan, mohon dirujuk untuk penanganan lebih lanjut",
           "keluhan sejak beberapa hari, dirujuk untuk pemeriksaan lanjutan",
           "pasien minta dirujuk, perlu evaluasi spesialis",
           "kondisi tidak membaik, rujuk ke rumah sakit",
           "mohon penanganan lebih lanjut di fasilitas yang lebih lengkap"]
PROSE = ("pasien datang dengan keluhan yang dirasakan sejak beberapa hari lalu dan sudah diberi terapi awal di faskes "
         "namun belum ada perbaikan sehingga dilakukan pemeriksaan lanjutan hasil terlampir mohon evaluasi dan tata laksana "
         "sesuai indikasi klinis kontrol ulang keluarga setuju").split()
_KW = [keywords(i) for i in range(N_DIAG)]
_rank = np.random.default_rng(7).permutation(N_DIAG)


def _zipf(r, lo, hi):
    """Common diagnoses dominate: weight 1/(rank+1) within [lo, hi)."""
    w = 1 / (_rank[lo:hi] + 1.0)
    return lo + r.choice(hi - lo, p=w / w.sum())


def specific_narrative(r, d, short=False):
    """Three writing styles so the cosine distribution is realistic: terse, keyword-dense, and long diluted prose."""
    style = "terse" if short else r.choice(["terse", "dense", "prose"], p=[.2, .4, .4])
    k = {"terse": 3, "dense": 6, "prose": int(r.integers(3, 7))}[style]
    toks = list(r.choice(_KW[d], size=min(k, len(_KW[d])), replace=False))
    toks += list(r.choice(FILLER, 3)) if style != "prose" else list(r.choice(PROSE, int(r.integers(15, 36))))
    if r.random() < 0.15:  # comorbidity / noise from another diagnosis
        toks += list(r.choice(_KW[r.integers(N_DIAG)], 2))
    r.shuffle(toks)
    if r.random() < 0.3:  # typos
        i = r.integers(len(toks)); toks[i] = toks[i][:-1]
    return " ".join(toks)


def generic_narrative(r, d):
    if r.random() < 0.3:  # long administrative prose with no clinical content
        return " ".join(r.choice(PROSE, int(r.integers(20, 40))))
    t = str(r.choice(GENERIC))
    return t + " " + " ".join(r.choice(_KW[d], 2)) if d >= 0 and r.random() < 0.4 else t  # 40% semi-generic


def unmapped_narrative(r):
    """Specialist diagnosis outside our table: still ordinary clinical prose, but no PPK template to compare against."""
    return " ".join(r.choice(PROSE, int(r.integers(5, 30)))) + " " + " ".join(r.choice(_KW[r.integers(N_DIAG)], 3))


def generate(seed=42, strength=1.0):
    """strength scales every injection rate (1.0 = default; 0.5 = subtler fraud, used for robustness checks)."""
    r = np.random.default_rng(seed)
    fac = pd.DataFrame({
        "fac": range(120), "rural": r.random(120) < 0.5,
        "ftype": r.choice(["puskesmas", "klinik", "mandiri"], 120, p=[.5, .3, .2]),
        "province": r.integers(0, 4, 120), "sis_lag": r.exponential(15, 120),
        "lost_equip": r.random(120) < 0.04,  # benign: truly lost equipment, SISRUTE not updated
    })
    fac["hosp"] = [list(r.choice(N_HOSP, size=r.integers(1, 3) if ru else r.integers(3, 6), replace=False)) for ru in fac.rural]
    docs = []
    for f in fac.itertuples():
        for _ in range(r.integers(2, 4)):
            role = r.choice(["N", "A", "B", "C", "D", "E"], p=[.90, .02, .02, .02, .02, .02])
            if role in "BE" and len(f.hosp) < 2:
                role = "N"
            sc = {"E": list(r.choice(list("ABCD"), size=r.integers(2, 4), replace=False))}.get(role, [role] if role != "N" else [])
            docs.append((f.fac, sc, r.random() < 0.1))  # 10%: terse-but-specific writers (benign)
    S = strength
    rows = []
    for did, (fid, sc, terse) in enumerate(docs):
        f = fac.iloc[fid]
        lam = 0.25 if f.rural else 0.5
        steer = f.hosp[1 + r.integers(len(f.hosp) - 1)] if len(f.hosp) > 1 else f.hosp[0]
        for day in range(DAYS):
            for _ in range(r.poisson(lam)):
                act = day >= ACTIVE_FROM
                fraud, tag = 0, "N"
                if r.random() < 0.10:
                    d = _zipf(r, 0, N_NS)
                else:  # 25% of specialist referrals use a diagnosis outside our table
                    d = -1 if r.random() < 0.25 else _zipf(r, N_NS, N_DIAG)
                if act and "A" in sc and r.random() < 0.4 * S:
                    d, fraud, tag = _zipf(r, 0, N_NS), 1, "A"
                dest = f.hosp[0] if r.random() < 0.7 else f.hosp[r.integers(len(f.hosp))]
                if act and "B" in sc and r.random() < 0.7 * S:
                    dest, fraud, tag = steer, 1, "B"
                reason = r.choice(["clinical", "equipment", "staff"], p=[.7, .2, .1]) if not 0 <= d < N_NS else "clinical"
                age = float(r.exponential(f.sis_lag))
                avail = int(r.random() < 0.05)  # data noise: SISRUTE says available while truly missing
                if f.lost_equip and reason != "clinical":
                    avail, age = 1, 60 + r.exponential(60)
                if act and "C" in sc and r.random() < 0.35 * S:
                    reason, avail, age, fraud, tag = "equipment", 1, float(r.uniform(0, 10)), 1, "C"
                generic = r.random() < 0.06  # benign lazy writers exist too
                if act and "D" in sc and r.random() < 0.6 * S:
                    generic, fraud, tag = True, 1, "D"
                if r.random() < 0.004:  # undetectable collusion
                    fraud, tag = 1, "X"
                if generic:
                    narr = generic_narrative(r, d)
                elif d < 0:
                    narr = unmapped_narrative(r)
                else:
                    narr = specific_narrative(r, d, terse)
                icd = ENTRIES[d]["icd"] if d >= 0 else "Z99"
                rows.append((did, fid, day, d, icd, dest, int(dest == f.hosp[0]), reason, avail, age, narr, fraud, tag, "".join(sc) or "N"))
    df = pd.DataFrame(rows, columns=["doc", "fac", "day", "diag", "icd", "dest", "near", "reason", "sis_avail", "sis_age", "narr", "fraud", "tag", "doc_role"])
    df = df.merge(fac[["fac", "rural", "ftype", "province"]], on="fac").sort_values(["day", "doc"], kind="stable").reset_index(drop=True)
    df["stratum"] = np.where(df.rural, "rural", "urban") + "|" + df.ftype
    return df
