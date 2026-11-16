"""Run with the trained model present: python tests_smoke.py"""
import os
import sys
import numpy as np
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
    # the NS reason says "vs peer P95" only when the doctor really is above it; above the median alone is worded as such
    mid = c.post("/v1/predict", json=dict(base, n90=36, ns90=0.14, n180=60, hhi180=900, to_dominant_dest=False, dest_is_nearest=True)).json()
    detail = next(x["detail"] for x in mid["reasons"] if x["code"] == "NS_ABOVE_PEER_P95")
    assert "median sejenis" in detail and "vs peer P95" not in detail, detail
    assert "vs peer P95" in next(x["detail"] for x in bad["reasons"] if x["code"] == "NS_ABOVE_PEER_P95")
    assert "DIAGNOSIS_UNMAPPED" in codes(unk) and "HHI_NEAREST_UNKNOWN" in codes(unk) and unk["nlp_similarity"] == 0.0
    # a code that is not ICD-10 at all is never green; a real ICD-10 code outside the table (K30) is scored as usual
    junk = c.post("/v1/predict", json=dict(base, diagnosis_code="ZZZ.99", reason="clinical")).json()
    assert junk["category"] == "yellow" and "DIAGNOSIS_INVALID" in codes(junk) and "DIAGNOSIS_INVALID" not in codes(unk), junk
    # wire score: the model's own cuts sit at 50 (yellow) and 80 (red), so the number agrees with the colour
    assert (bad["yellow_from"], bad["red_from"], info["yellow_from"]) == (50, 80, 50)
    assert bad["score"] > 80 and cold["score"] < 50 and 0 < cold["fraud_score"] < cold["score"] / 100, (bad, cold)
    # empty narrative (historical import) = layer not run, never "generic"
    blank = c.post("/v1/predict", json=dict(base, reason="clinical", clinical_narrative="")).json()
    assert "NARRATIVE_UNAVAILABLE" in codes(blank) and "NARRATIVE_GENERIC" not in codes(blank) and blank["indicators"]["narrative"]["similarity"] is None
    # SISRUTE: null = not connected (layer off, and the verifier is told); false = checked, not available (no warning)
    eq = dict(base, n90=60, ns90=0.6, n180=80, hhi180=6000, to_dominant_dest=True, dest_is_nearest=False)
    s_null, s_false, s_true = (c.post("/v1/predict", json=dict(eq, **kw)).json() for kw in
                               ({}, dict(sisrute_available=False, sisrute_age_days=2), dict(sisrute_available=True, sisrute_age_days=2)))
    assert "SISRUTE_UNKNOWN" in codes(s_null) and "SISRUTE_UNKNOWN" not in codes(s_false) + codes(s_true)
    assert s_null["indicators"]["sisrute"]["known"] is False and s_false["indicators"]["sisrute"]["known"] is True
    assert s_null["score"] == s_false["score"] < s_true["score"]  # unknown never adds or removes risk
    assert "SISRUTE_UNKNOWN" not in codes(c.post("/v1/predict", json=dict(eq, reason="clinical")).json())
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

    # gRPC (what the backend calls in production) returns what HTTP returns, unknowns included
    import json
    from concurrent import futures
    import grpc
    from google.protobuf.timestamp_pb2 import Timestamp
    from app.grpc_server import Inference
    from sirujuk.ml.v1 import inference_pb2 as pb, inference_pb2_grpc as pb_grpc
    srv = grpc.server(futures.ThreadPoolExecutor(max_workers=2))
    pb_grpc.add_InferenceServicer_to_server(Inference(), srv)
    port = srv.add_insecure_port("127.0.0.1:0")
    srv.start()
    stub = pb_grpc.InferenceStub(grpc.insecure_channel(f"127.0.0.1:{port}"))
    ts = Timestamp(seconds=1767225600)  # 2026-01-01T00:00:00Z
    rpc_base = dict(referral_id="r1", diagnosis_code="I10", reason="equipment", clinical_narrative=base["clinical_narrative"], issued_at=ts)
    for http, kw in [(bad, dict(sisrute_available=True, sisrute_age_days=2, n90=60, ns90=0.6, n180=80, hhi180=6000, to_dominant_dest=True, dest_is_nearest=False)),
                     (s_null, dict(n90=60, ns90=0.6, n180=80, hhi180=6000, to_dominant_dest=True, dest_is_nearest=False))]:
        g = stub.Predict(pb.PredictRequest(**rpc_base, **kw))
        assert (g.score, g.category, [x.code for x in g.reasons]) == (http["score"], http["category"], codes(http)), g
        assert json.loads(g.indicators_json) == http["indicators"]
    try:
        stub.Predict(pb.PredictRequest(**dict(rpc_base, reason="bribe")))
        raise AssertionError("invalid reason accepted")
    except grpc.RpcError as e:
        assert e.code() == grpc.StatusCode.INVALID_ARGUMENT and base["clinical_narrative"] not in e.details(), e.details()
    # an invalid request is refused naming the fields only, never echoing the input (the narrative is clinical text), on both transports
    secret = "NIK-3173-RAHASIA " * 400  # over the 4000-character limit
    refused = c.post("/v1/predict", json=dict(base, clinical_narrative=secret, reason="bribe"))
    assert refused.status_code == 422 and "RAHASIA" not in refused.text and refused.json() == {"detail": "invalid fields: reason, clinical_narrative"}, refused.text[:200]
    assert c.post("/v1/predict", content=b'{"referral_id": ', headers={"Content-Type": "application/json"}).status_code == 422
    try:
        stub.Predict(pb.PredictRequest(**dict(rpc_base, clinical_narrative=secret, reason="bribe")))
        raise AssertionError("invalid narrative accepted")
    except grpc.RpcError as e:
        assert e.code() == grpc.StatusCode.INVALID_ARGUMENT and "RAHASIA" not in e.details() and e.details() == refused.json()["detail"], e.details()  # the same message on both transports
    # strict parity: the reply over HTTP and over gRPC carry the same fields with the same values, not just the headline ones
    proto_fields = {("indicators" if f.name == "indicators_json" else f.name) for f in pb.PredictResponse.DESCRIPTOR.fields}
    parity_cases = [
        (bad, dict(sisrute_available=True, sisrute_age_days=2, n90=60, ns90=0.6, n180=80, hhi180=6000, to_dominant_dest=True, dest_is_nearest=False)),
        (cold, dict(reason="clinical", clinical_narrative="tekanan darah tinggi sakit kepala tengkuk pusing hipertensi")),
        (unk, dict(diagnosis_code="K30", reason="clinical", n180=80, hhi180=6000, n90=60, ns90=0.1, to_dominant_dest=True)),
        (blank, dict(reason="clinical", clinical_narrative="")),
        (junk, dict(diagnosis_code="ZZZ.99", reason="clinical")),
    ]
    for http, kw in parity_cases:
        assert set(http) == proto_fields, (set(http) ^ proto_fields)  # a field added to one side only would drift silently
        g = stub.Predict(pb.PredictRequest(**dict(rpc_base, **kw)))
        for k in proto_fields - {"reasons", "indicators"}:
            assert getattr(g, k) == http[k], (k, getattr(g, k), http[k])
        assert [(x.code, x.detail, x.contribution) for x in g.reasons] == [(x["code"], x["detail"], x["contribution"]) for x in http["reasons"]]
        assert json.loads(g.indicators_json) == http["indicators"]
    srv.stop(0)
    # the container entry point (app/serve.py): ML_SERVE picks the transport, the default stays gRPC, a bad value stops the container
    import socket, subprocess, time, urllib.request
    def launch(**env):
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]
        e = {k: v for k, v in os.environ.items() if k != "ML_SERVE"}  # whatever the caller's shell has must not leak into the case under test
        proc = subprocess.Popen([sys.executable, "-m", "app.serve"], env={**e, "PORT": str(p), **env}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return proc, p
    def stop(proc):
        proc.terminate()
        try:
            proc.wait(10)
        except subprocess.TimeoutExpired:
            proc.kill()
    tok = "t" * 40; auth = {"Authorization": f"Bearer {tok}"}
    proc, _ = launch(ML_SERVE="http")  # no token: must stop, never serve an open /v1/predict
    assert proc.wait(30) != 0, "ML_SERVE=http without ML_API_TOKEN must stop the container"
    proc, p = launch(ML_SERVE="http", ML_API_TOKEN=tok)
    try:
        for _ in range(120):  # the model loads before the first request is accepted
            try:
                info_http = json.load(urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{p}/v1/model", headers=auth), timeout=2)); break
            except OSError:
                assert proc.poll() is None, "ML_SERVE=http exited"; time.sleep(0.25)
        else:
            raise AssertionError("ML_SERVE=http never answered")
        assert info_http == info, (info_http, info)
        req = urllib.request.Request(f"http://127.0.0.1:{p}/v1/predict", data=json.dumps(dict(base, sisrute_available=True, sisrute_age_days=2, n90=60, ns90=0.6, n180=80,
                                     hhi180=6000, to_dominant_dest=True, dest_is_nearest=False)).encode(), headers={"Content-Type": "application/json", **auth})
        assert json.load(urllib.request.urlopen(req, timeout=5)) == bad, "a real uvicorn process must answer like the TestClient"
        for path, hdrs in (("/v1/model", {}), ("/v1/model", {"Authorization": "Bearer wrong"}), ("/v1/predict", {})):  # 401 without the right token
            try:
                urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{p}{path}", headers=hdrs), timeout=5); raise AssertionError(f"{path} open without a token")
            except urllib.error.HTTPError as e:
                assert e.code == 401, e.code
        assert json.load(urllib.request.urlopen(f"http://127.0.0.1:{p}/health", timeout=5)) == {"status": "ok"}
    finally:
        stop(proc)
    from app.serve import mode_from
    assert [mode_from(e) for e in ({}, {"ML_SERVE": ""}, {"ML_SERVE": " HTTP "}, {"ML_SERVE": "grpc"})] == ["grpc", "grpc", "http", "grpc"]
    proc, p = launch()  # ML_SERVE unset: the default stays gRPC, so Cloud Run is unchanged
    try:
        ch = grpc.insecure_channel(f"127.0.0.1:{p}")
        grpc.channel_ready_future(ch).result(timeout=30)
        g = pb_grpc.InferenceStub(ch).Predict(pb.PredictRequest(**dict(rpc_base, sisrute_available=True, sisrute_age_days=2, n90=60, ns90=0.6, n180=80, hhi180=6000,
                                                                       to_dominant_dest=True, dest_is_nearest=False)))
        assert g.score == bad["score"] and g.model_version == bad["model_version"]
    finally:
        stop(proc)
    proc, _ = launch(ML_SERVE="websocket")
    assert proc.wait(30) != 0, "an unknown ML_SERVE must stop the container, not fall back"
    # retrain on real audit labels: too few -> no model; enough -> judged on the newest labels, never on its own training rows
    import retrain
    from app.core.model_loader import load_models
    rng = np.random.default_rng(0)
    def label_rows(n):
        out = []
        for i in range(n):
            ns, dom = float(rng.uniform(0, 1)), bool(rng.uniform() < 0.5)
            out.append(dict(base, referral_id=f"l{i}", issued_at=f"2026-01-{1 + i % 28:02d}T00:00:00Z", reason="clinical", stratum="urban|klinik",
                            n90=60, ns90=ns, n180=80, hhi180=float(rng.uniform(1000, 8000)), to_dominant_dest=dom,
                            label=int(ns > 0.7 and dom) if i % 3 else None, random_audit=i % 10 == 0))
        return out
    rep, new = retrain.run(label_rows(60), load_models())
    assert not rep["retrained"] and new is None and "need" in rep["why"], rep
    rep, new = retrain.run(label_rows(600), load_models())
    assert rep["labeled"] == 400 and "holdout" in rep and rep["current_random_audit_only"]["n"] > 0, rep
    assert (new is not None) == rep["retrained"] and (new is None or "+real-400" in new.version), rep
    print("retrain", rep["retrained"], rep["holdout"])
    print("ok")
