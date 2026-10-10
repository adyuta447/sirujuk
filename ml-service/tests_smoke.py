"""Run with the trained model present: python tests_smoke.py"""
import sys
from fastapi.testclient import TestClient
from app.ml import diagnosis
from app.main import app

with TestClient(app) as c:
    # ICD resolution (real table, no hashing)
    assert diagnosis.N_NS == 144, diagnosis.N_NS
    assert diagnosis.ENTRIES[diagnosis.resolve("I10")]["ns"] and diagnosis.ENTRIES[diagnosis.resolve("J45.9")]["name"] == "Asma Bronkial"
    assert diagnosis.resolve("E11.6") == diagnosis.resolve("E11") >= 0 and not diagnosis.ENTRIES[diagnosis.resolve("I21.0")]["ns"]
    assert diagnosis.resolve("K30") == -1 and diagnosis.resolve("X99.9") == -1

    info = c.get("/v1/model").json()
    base = dict(referral_id="r1", diagnosis_code="I10", reason="equipment", issued_at="2026-01-01T00:00:00",
                clinical_narrative="pasien datang dengan keluhan, mohon dirujuk untuk penanganan lebih lanjut")
    bad = c.post("/v1/predict", json=dict(base, sisrute_available=True, sisrute_age_days=2, n90=60, ns90=0.6, n180=80, hhi180=6000,
                                          to_dominant_dest=True, dest_is_nearest=False)).json()
    cold = c.post("/v1/predict", json=dict(base, reason="clinical", clinical_narrative="tekanan darah tinggi sakit kepala tengkuk pusing hipertensi")).json()
    unk = c.post("/v1/predict", json=dict(base, diagnosis_code="K30", reason="clinical", n180=80, hhi180=6000, n90=60, ns90=0.1,
                                          to_dominant_dest=True)).json()
    codes = lambda r: [x["code"] for x in r["reasons"]]
    print(info)
    for n, r in [("bad", bad), ("cold", cold), ("unmapped", unk)]:
        print(n, r["category"], round(r["score"], 1), codes(r))
    assert bad["score"] > cold["score"] and bad["category"] == "red"
    assert bad["yellow_from"] == info["yellow_from"] and bad["indicators"]["ns"]["applies"] and bad["indicators"]["ns"]["peer_p95"] > 0
    assert "INSUFFICIENT_HISTORY" in codes(cold)
    assert "DIAGNOSIS_UNMAPPED" in codes(unk) and "HHI_NEAREST_UNKNOWN" in codes(unk) and unk["nlp_similarity"] == 0.0
    # narrative-only: with no doctor history, no SISRUTE signal, a vague or unmatched narrative may be yellow but never red
    rows = [l.split("|", 2) for l in open("tests/narrative_benchmark.tsv").read().splitlines()]
    cats = {1: [], 0: []}
    for lab, icd, txt in rows:
        r = c.post("/v1/predict", json=dict(base, diagnosis_code=icd, reason="clinical", clinical_narrative=txt)).json()
        cats[int(lab)].append(r["category"])
    assert "red" not in cats[1] + cats[0], cats
    share = lambda v: round(sum(x != "green" for x in v) / len(v), 2)
    print("narrative-only flagged: specific", share(cats[1]), "generic", share(cats[0]))
    assert share(cats[0]) > share(cats[1])
    print("ok")
