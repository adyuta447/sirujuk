"""python bpjs.py "<.../Data Sampel Reguler Edisi 2025>" [--province 31 --seed-rows 1000]

Tests the BPJS Kesehatan 2025 sample (FKTP kapitasi + FKRTL, visits in 2024) and derives what the model can learn from it:
- models/bpjs_peer.json    peer baseline (NS/HHI per stratum) for `train.py --peer`. Aggregates only, safe to commit.
- models/bpjs_report.json  data checks, real vs synthetic peer, shadow scoring of real referrals. Aggregates only.
- data/bpjs/seed.json      row-level referrals for the backend (SEED_BPJS_FILE). Gitignored: the sample is under a
                           BPJS data-use agreement and this repo is public.

What the sample does NOT have, so it cannot train or validate the fraud model: fraud/audit labels, doctor IDs (the FKTP
facility stands in for the doctor), clinical narratives, SISRUTE, distance to the nearest facility.
Needs pyreadstat (requirements-train.txt). Run from ml-service/.
"""
import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
import pyreadstat

from app.ml import diagnosis
from app.ml.features import MIN_HHI, MIN_NS, doctor_history
from app.ml.model import peer_stats
from app.ml.synth import generate

VERSION = "bpjs-sampel-2025"
ID = r"^(\d+)(\d{2})(\d{2})[A-Z]\d+$"  # visit ID = <facility code><MM><YY><letter><seq>
FTYPE = {1: "puskesmas", 2: "klinik", 3: "mandiri", 4: "mandiri"}  # FKP08 jenis FKTP; anything else counts as klinik


def load(d):
    f, mf = pyreadstat.read_dta(f"{d}/202402_fktpkapitasi.dta", usecols=[
        "PSTV01", "PSTV15", "FKP02", "FKP03", "FKP05", "FKP06", "FKP08", "FKP11", "FKP13", "FKP15", "FKP15A", "FKP17", "FKP20", "FKP21"])
    l, ml = pyreadstat.read_dta(f"{d}/202403_fkrtl.dta", usecols=["FKP02", "FKL02", "FKL03", "FKL09", "FKL10", "FKL18", "FKL23"])
    return f, l, {**mf.variable_value_labels, **ml.variable_value_labels}


def checks(f, l):
    """Fails loudly if the sample is not shaped the way the rest of this script assumes."""
    ref = f[f.FKP13 == 2]  # 2 = RUJUK LANJUT
    rx = ref.FKP02.str.extract(ID)
    d = pd.to_datetime(ref.FKP03)
    fac = f.assign(fac=f.FKP02.str.extract(ID)[0]).dropna(subset=["fac"]).groupby("fac")
    c = {
        "fktp_visits": len(f), "fktp_referrals": len(ref), "visit_dates": [str(f.FKP03.min()), str(f.FKP03.max())],
        "referral_share": round(len(ref) / len(f), 4), "referral_share_weighted": round(float(ref.PSTV15.sum() / f.PSTV15.sum()), 4),
        "referral_id_parse_fail": round(float(rx[0].isna().mean()), 4),
        "referral_id_month_matches_visit": round(float(((rx[1].astype(int) == d.dt.month) & (rx[2].astype(int) == d.dt.year % 100)).mean()), 4),
        "facility_code_one_kabkota": round(float((fac.FKP06.nunique() == 1).mean()), 4),
        "facility_code_one_type": round(float((fac.FKP08.nunique() == 1).mean()), 4),
        "fkrtl_visits": len(l), "fkrtl_with_origin_referral": round(float((l.FKP02 != "").mean()), 4),
        "hospital_id_parse_fail": round(float(l.FKL02.str.extract(ID)[0].isna().mean()), 4),
    }
    assert c["referral_id_parse_fail"] == 0 and c["referral_id_month_matches_visit"] > 0.99, c
    assert c["facility_code_one_kabkota"] > 0.99 and c["facility_code_one_type"] > 0.99, "facility code in FKP02 is not a facility"
    assert c["hospital_id_parse_fail"] == 0, c
    return ref, c


def frame(ref, l, lab):
    """One row per FKTP referral in the model's column layout, linked to the first FKRTL visit that cites it."""
    h = l[l.FKP02 != ""].sort_values("FKL03").drop_duplicates("FKP02")
    r = ref.merge(h.assign(hosp=h.FKL02.str.extract(ID)[0]), on="FKP02", how="left")
    code = r.FKP15.str.split(" ").str[0].str.upper()
    idx = {c: diagnosis.resolve(c) for c in code.unique()}
    hidx = {c: diagnosis.resolve(c) for c in r.FKL18.dropna().unique()}
    kab = lab["FKP06"]
    # shortcut: an unlinked referral (no FKRTL visit in the sample) is grouped by destination kab/kota+type+poli, so HHI is
    # slightly overstated for those; use the real destination ID once the referral table has one.
    dest_key = np.where(r.hosp.notna(), "rs:" + r.hosp.fillna(""), "x:" + r.FKP17.astype(str) + "|" + r.FKP20.astype(str) + "|" + r.FKP21.astype(str))
    df = pd.DataFrame({
        "doc": r.FKP02.str.extract(ID)[0], "day": (pd.to_datetime(r.FKP03) - pd.Timestamp("2024-01-01")).dt.days,
        "icd": code, "diag": code.map(idx), "dest": pd.factorize(dest_key)[0], "dest_key": dest_key, "hosp": r.hosp,
        "stratum": np.where(r.FKP06.map(kab).str.startswith("KOTA"), "urban", "rural") + "|" + r.FKP08.map(FTYPE).fillna("klinik"),
        "prov": r.FKP05, "kab": r.FKP06.map(kab).str.title(), "jenis": r.FKP08.map(lab["FKP08"]), "poli": r.FKP21.map(lab["FKP21"]),
        "dest_type": np.where(r.hosp.notna(), r.FKL09.map(lab["FKL09"]), r.FKP20.map(lab["FKP20"])),
        "ugd": r.FKP11 == 4, "id": r.FKP02, "peserta": r.PSTV01.astype("int64").astype(str), "date": r.FKP03, "diag_name": r.FKP15A,
        # weak outcome proxy: the hospital also coded a non-specialist diagnosis, outpatient, INA-CBG severity I
        "hosp_simple": r.FKL18.map(hidx).between(0, diagnosis.N_NS - 1) & (r.FKL10 == 1) & (r.FKL23 == 1),
    }).sort_values(["day", "doc"], kind="stable").reset_index(drop=True)
    return doctor_history(df)


def describe(peer):
    return {s: {"ns_median": round(p["ns"][0], 3), "ns_mad": round(p["ns"][1], 3), "ns_p95": round(p["ns_p95"], 3),
                "hhi_median": round(p["hhi"][0]), "hhi_mad": round(p["hhi"][1])} for s, p in sorted(peer.items())}


def shadow(h, peer, model_path):
    """Scores the real referrals as the backend would send them: no narrative, SISRUTE unknown, nearest unknown."""
    m = joblib.load(model_path)
    m.peer = peer
    x = h.assign(narr="", reason="clinical", near=np.nan, sis_avail=0, sis_known=False, sis_age=0.0,
                 ns90=h.ns90.where(h.n90 >= MIN_NS), hhi180=h.hhi180.where(h.n180 >= MIN_HHI))  # backend sends null below min n
    X = m.terms(x)
    s = m.score(X)
    cat = m.category(s)
    rep = {"model": m.version, "cuts": {"yellow_from": round(m.cut[0], 2), "red_from": round(m.cut[1], 2)},
           "cat_share": {c: round(float((cat == c).mean()), 4) for c in ["green", "yellow", "red"]},
           "cat_share_by_stratum": {k: {c: round(float((g == c).mean()), 3) for c in ["green", "yellow", "red"]} for k, g in pd.Series(cat).groupby(h.stratum.values)},
           "note": "only the NS layer can fire on this data (no narrative, SISRUTE or distance); per the model card the cuts are not re-cut"}
    k = (X.is_ns & (h.n90 >= MIN_NS)).values  # NS applies and is measured
    yk, zk = h.hosp_simple.values[k], X.ns_z.values[k]
    if k.sum() > 100 and 0 < yk.mean() < 1:
        from sklearn.metrics import roc_auc_score
        rep["proxy_check"] = {
            "question": "for KNS referrals, does a higher facility NS predict that the hospital also coded a simple KNS case?",
            "n": int(k.sum()), "proxy_rate": round(float(yk.mean()), 3), "auc_ns_z": round(float(roc_auc_score(yk, zk)), 3),
            "caveat": "weak proxy, not a fraud label: Z09 follow-ups and coding habits dominate hospital diagnoses"}
    return rep, s, cat


def seed(h, s, cat, province, n):
    """Most recent n referrals of one province, with the point-in-time history the backend would have computed."""
    keep = np.where(h.prov.values == province)[0][-n:]
    out = []
    for i in keep:
        r = h.iloc[i]
        icd = r.icd if len(r.icd) <= 3 else r.icd[:3] + "." + r.icd[3:]
        out.append({
            "referral_id": r["id"], "patient_name": "Peserta " + r.peserta, "doctor_id": "fktp-" + r.doc,
            "origin_facility_id": f"{r.jenis.title()} {r.doc}", "origin_wilayah": r.kab,
            "destination_facility_id": f"RS {r.hosp}" if isinstance(r.hosp, str) else f"Belum tertaut ({r.dest_type})",
            "diagnosis_code": icd, "reason": f"Rujuk lanjut ke poli {str(r.poli).title()}: {r.diag_name}"[:200], "reason_category": "clinical",
            "clinical_narrative": "", "issued_at": f"{r.date}T08:00:00+07:00", "is_emergency": bool(r.ugd),
            "context": {"stratum": r.stratum, "n90": int(r.n90), "ns90": float(r.ns90) if r.n90 >= MIN_NS else None,
                        "n180": int(r.n180), "hhi180": float(r.hhi180) if r.n180 >= MIN_HHI else None,
                        "to_dominant_dest": bool(r.dest == r.dom_dest), "dest_is_nearest": None,
                        "sisrute_available": False, "sisrute_age_days": 0},
        })
    return out, {c: round(float((cat[keep] == c).mean()), 3) for c in ["green", "yellow", "red"]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data_dir")
    ap.add_argument("--province", type=int, default=31, help="seed rows come from this province (31 = DKI Jakarta)")
    ap.add_argument("--seed-rows", type=int, default=1000)
    ap.add_argument("--model", default="models/sirujuk.joblib")
    a = ap.parse_args()
    f, l, lab = load(os.path.join(a.data_dir, "data"))
    ref, rep = checks(f, l)
    h = frame(ref, l, lab)
    rep.update({
        "referrals_linked_to_fkrtl": round(float(h.hosp.notna().mean()), 4),
        "facilities": int(h.doc.nunique()), "hospitals": int(h.hosp.nunique()),
        "diagnosis_mapped_share": round(float((h["diag"] >= 0).mean()), 4),
        "diagnosis_kns_share": round(float(h["diag"].between(0, diagnosis.N_NS - 1).mean()), 4),
        "top_unmapped_icd": h[h["diag"] < 0].icd.value_counts().head(15).to_dict(),
        "history_sufficient_ns_share": round(float((h.n90 >= MIN_NS).mean()), 4),
        "history_sufficient_hhi_share": round(float((h.n180 >= MIN_HHI).mean()), 4),
        "stratum_share": h.stratum.value_counts(normalize=True).round(3).to_dict(),
        "sampling_note": "participant sample (PSTV15 = weight): per-facility counts are far below real volume, so n90/n180 "
                         "minimums are rarely met and HHI from few referrals is biased upward",
    })
    peer = peer_stats(h)
    synth = generate()
    rep["peer_real"] = describe(peer)
    rep["peer_synthetic"] = describe(peer_stats(doctor_history(synth)))
    out = {"version": VERSION, "source": "Data Sampel Reguler BPJS Kesehatan Edisi 2025 (kunjungan 2024)", "n_referrals": len(h), "peer": peer}
    os.makedirs("models", exist_ok=True)
    json.dump(out, open("models/bpjs_peer.json", "w"), indent=1)
    if os.path.exists(a.model):
        rep["shadow"], s, cat = shadow(h, peer, a.model)
        rows, rep["seed_cat_share"] = seed(h, s, cat, a.province, a.seed_rows)
        os.makedirs("data/bpjs", exist_ok=True)
        json.dump(rows, open("data/bpjs/seed.json", "w"))
        rep["seed"] = {"province": a.province, "rows": len(rows), "file": "data/bpjs/seed.json"}
    json.dump(rep, open("models/bpjs_report.json", "w"), indent=2, default=str)
    print(json.dumps(rep, indent=2, default=str))


if __name__ == "__main__":
    sys.exit(main())
