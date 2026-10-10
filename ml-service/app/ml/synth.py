"""Synthetic JKN referral generator with labelled anomaly scenarios A-E (ml-service-rules.md).

Evidence base: SYNTHETIC. Metrics prove the pipeline finds what was injected, not real-world performance.
"""
import numpy as np
import pandas as pd

N_DIAG, N_NS = 30, 12          # first 12 diagnoses stand in for the 144 non-specialist list
N_HOSP, DAYS, ACTIVE_FROM = 40, 360, 60
STEMS = ["demam", "batuk", "nyeri", "mual", "ruam", "sesak", "pusing", "lemas", "bengkak", "diare",
         "gatal", "sendi", "luka", "mata", "telinga", "gigi", "dada", "perut", "kepala", "kulit"]
GENERIC = "pasien datang dengan keluhan, mohon dirujuk untuk penanganan lebih lanjut"


def ppk_terms(rng_seed=7):
    r = np.random.default_rng(rng_seed)
    return [[f"{STEMS[r.integers(len(STEMS))]}{d}{k}" for k in range(8)] for d in range(N_DIAG)]


PPK = ppk_terms()


def ppk_template(d):
    return " ".join(PPK[d])


def specific_narrative(r, d, short=False):
    k = 3 if short else 6
    toks = list(r.choice(PPK[d], size=k, replace=False)) + list(r.choice(["pasien", "sejak", "hari", "disertai", "tidak", "membaik"], 3))
    r.shuffle(toks)
    if r.random() < 0.3:  # typos
        i = r.integers(len(toks)); toks[i] = toks[i][:-1]
    return " ".join(toks)


def generate(seed=42):
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
    rows = []
    for did, (fid, sc, terse) in enumerate(docs):
        f = fac.iloc[fid]
        lam = 0.25 if f.rural else 0.5
        steer = f.hosp[1 + r.integers(len(f.hosp) - 1)] if len(f.hosp) > 1 else f.hosp[0]
        for day in range(DAYS):
            for _ in range(r.poisson(lam)):
                act = day >= ACTIVE_FROM
                fraud, tag = 0, "N"
                d = r.integers(N_NS) if r.random() < 0.10 else N_NS + r.integers(N_DIAG - N_NS)
                if act and "A" in sc and r.random() < 0.4:
                    d, fraud, tag = r.integers(N_NS), 1, "A"
                dest = f.hosp[0] if r.random() < 0.7 else f.hosp[r.integers(len(f.hosp))]
                if act and "B" in sc and r.random() < 0.7:
                    dest, fraud, tag = steer, 1, "B"
                reason = r.choice(["clinical", "equipment", "staff"], p=[.7, .2, .1]) if d >= N_NS else "clinical"
                age = float(r.exponential(f.sis_lag))
                avail = int(r.random() < 0.05)  # data noise: SISRUTE says available while truly missing
                if f.lost_equip and reason != "clinical":
                    avail, age = 1, 60 + r.exponential(60)
                if act and "C" in sc and r.random() < 0.35:
                    reason, avail, age, fraud, tag = "equipment", 1, float(r.uniform(0, 10)), 1, "C"
                generic = r.random() < 0.06
                if act and "D" in sc and r.random() < 0.6:
                    generic, fraud, tag = True, 1, "D"
                if r.random() < 0.004:  # undetectable collusion
                    fraud, tag = 1, "X"
                narr = GENERIC if generic else specific_narrative(r, d, terse)
                rows.append((did, fid, day, d, dest, int(dest == f.hosp[0]), reason, avail, age, narr, fraud, tag, "".join(sc) or "N"))
    df = pd.DataFrame(rows, columns=["doc", "fac", "day", "diag", "dest", "near", "reason", "sis_avail", "sis_age", "narr", "fraud", "tag", "doc_role"])
    df = df.merge(fac[["fac", "rural", "ftype", "province"]], on="fac").sort_values(["day", "doc"], kind="stable").reset_index(drop=True)
    df["stratum"] = np.where(df.rural, "rural", "urban") + "|" + df.ftype
    return df
