from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
base = dict(referral_id="r1", diagnosis_code="D3", reason="equipment", issued_at="2026-01-01T00:00:00",
            clinical_narrative="pasien datang dengan keluhan, mohon dirujuk untuk penanganan lebih lanjut")
bad = c.post("/v1/predict", json=dict(base, sisrute_available=True, n90=60, ns90=0.6, n180=80, hhi180=6000,
                                      to_dominant_dest=True, dest_is_nearest=False)).json()
cold = c.post("/v1/predict", json=dict(base, reason="clinical", clinical_narrative="demam3 nyeri3 sesak3 pusing3 hari")).json()
print(bad["category"], round(bad["score"], 1), [r["code"] for r in bad["reasons"]])
print(cold["category"], round(cold["score"], 1), [r["code"] for r in cold["reasons"]])
assert bad["score"] > cold["score"] and "INSUFFICIENT_HISTORY" in [r["code"] for r in cold["reasons"]]
