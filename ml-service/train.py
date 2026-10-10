"""python train.py [--yellow-share 0.20 --red-share 0.05] -> trains on days < 240, evaluates on days >= 240 (temporal split),
writes models/sirujuk.joblib (+ .sha256) and prints the JSON report. Evidence base: SYNTHETIC data only."""
import argparse
import hashlib
import json
import os
import sys

import joblib
import numpy as np
from sklearn.metrics import average_precision_score, roc_auc_score

from app.ml import diagnosis
from app.ml.features import doctor_history
from app.ml.model import LAYER, TERMS, Scorer
from app.ml.synth import generate

SPLIT = 240
OUT = "models/sirujuk.joblib"


def boot(f, y, s, n=200, seed=0):
    r = np.random.default_rng(seed); v = []
    for _ in range(n):
        i = r.integers(0, len(y), len(y)); v.append(f(y[i], s[i]))
    return np.percentile(v, [2.5, 97.5]).round(3).tolist()


def top_share(y, s, share):
    k = max(int(len(s) * share), 1)
    idx = np.argsort(-s)[:k]
    return dict(review_share=share, precision=round(float(y[idx].mean()), 3), recall=round(float(y[idx].sum() / max(y.sum(), 1)), 3))


def evaluate(m, te, hide_near=False):
    t = te.copy()
    if hide_near:
        t["near"] = np.nan
    s = m.score(m.terms(t)); y = t.fraud.values
    cat = m.category(s); red = cat == "red"
    return s, y, cat, dict(
        pr_auc=round(average_precision_score(y, s), 4), roc_auc=round(roc_auc_score(y, s), 4),
        red_precision=round(float(y[red].mean()) if red.any() else 0, 3),
        recall_yellow_red=round(float(y[cat != "green"].sum() / max(y.sum(), 1)), 3))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--yellow-share", type=float, default=0.20, help="share of referrals sent to review (yellow+red)")
    ap.add_argument("--red-share", type=float, default=0.05)
    a = ap.parse_args()
    df = doctor_history(generate())
    tr, te = df[df.day < SPLIT].copy(), df[df.day >= SPLIT].copy()
    m = Scorer().fit(tr, yellow_share=a.yellow_share, red_share=a.red_share)
    m.version = os.getenv("MODEL_VERSION", "composite-lr-synthetic-v2")
    s, y, cat, main_ev = evaluate(m, te)
    red, flag = cat == "red", cat != "green"
    st = m.score(m.terms(tr)); ths = np.linspace(1, 95, 95)  # operating point for the plain-accuracy figure: max F1 on TRAIN
    f1 = [2 * ((st > t) & (tr.fraud == 1)).sum() / (((st > t).sum() + tr.fraud.sum()) or 1) for t in ths]
    thr = float(ths[int(np.argmax(f1))]); pred = s > thr
    rep = {
        "evidence": "SYNTHETIC data, temporal split (train<%d, test>=%d); proves the pipeline finds what was injected, not real-world performance" % (SPLIT, SPLIT),
        "versions": {"model": m.version, "diagnosis_table": diagnosis.VERSION, "n_kns": diagnosis.N_NS, "n_specialist": diagnosis.N_DIAG - diagnosis.N_NS},
        "n_train": len(tr), "n_test": len(te), "base_rate_test": round(float(y.mean()), 4), **main_ev,
        "red_precision_ci": boot(lambda aa, b: aa[b > m.cut[1]].mean() if (b > m.cut[1]).any() else 0, y, s),
        "red_fdr": round(1 - main_ev["red_precision"], 3),
        "recall_ci": boot(lambda aa, b: aa[b >= m.cut[0]].sum() / max(aa.sum(), 1), y, s),
        "cat_share": {c: round(float((cat == c).mean()), 3) for c in ["green", "yellow", "red"]},
        "op_threshold": thr, "op_accuracy": round(float((pred == y).mean()), 4),
        "op_precision": round(float(y[pred].mean()), 3), "op_recall": round(float(pred[y == 1].mean()), 3),
        "acc_note": "accuracy is NOT the headline: always-'not fraud' scores %.3f" % (1 - y.mean()),
        "insufficient_history_share": round(float(((te.n90 < 20) | (te.n180 < 30)).mean()), 3),
        "diagnosis_unmapped_share": round(float((te["diag"] < 0).mean()), 3),
        "len_corr_before_after": [round(v, 3) for v in m.len_corr],
        "weights": dict(zip(m.terms_used, m.lr.coef_[0].round(3))), "cuts": {"yellow_from": round(m.cut[0], 2), "red_from": round(m.cut[1], 2)},
    }
    # --- honesty checks -----------------------------------------------------------------------------------------
    rep["nearest_facility_unknown"] = evaluate(m, te, hide_near=True)[3]  # what happens if the backend cannot supply it
    weak = doctor_history(generate(seed=99, strength=0.5)); weak = weak[weak.day >= SPLIT]
    rep["robustness_subtler_fraud_half_strength"] = evaluate(m, weak)[3]
    X = m.terms(te)
    base = 100 / (1 + np.exp(-0.25 * (X.t_ns + X.t_hhi + X.t_flag + X.t_nlp)))  # proposal's 0.25 weights, same standardised terms
    rep["baseline_equal_weights_0.25"] = {"pr_auc": round(average_precision_score(y, base), 4), "top20_precision_recall": top_share(y, base.values, a.yellow_share)}
    rep["ablation_drop_layer"] = {}
    for name, drop in LAYER.items():
        ma = Scorer().fit(tr, terms=[t for t in TERMS if t not in drop], yellow_share=a.yellow_share, red_share=a.red_share)
        rep["ablation_drop_layer"][name] = evaluate(ma, te)[3]
    rep["capacity_table"] = [top_share(y, s, sh) for sh in (0.02, 0.05, 0.10, 0.15, 0.20)]
    rep["capacity_note"] = "yellow+red = %.1f%% of referrals; per 1000 referrals/day/cabang that is %d reviews/day. Percentile cuts are a capacity budget, not a fraud probability; set --yellow-share to real verifier capacity." % (100 * flag.mean(), 1000 * flag.mean())
    te["s"], te["cat"] = s, cat
    rep["recall_by_scenario"] = {t: round(float((g.cat != "green").mean()), 3) for t, g in te[te.fraud == 1].groupby("tag")}
    rep["flag_rate_nonfraud_by_doc_role"] = {r: round(float((g.cat != "green").mean()), 3) for r, g in te[te.fraud == 0].groupby("doc_role")}
    rural = te.rural.values
    rep["by_stratum"] = {k: {"flag_rate": round(float(flag[mk].mean()), 3), "red_precision": round(float(y[mk & red].mean()) if (mk & red).any() else 0, 3)}
                         for k, mk in {"rural": rural, "urban": ~rural, **{f"ftype_{t}": (te.ftype == t).values for t in te.ftype.unique()}}.items()}
    joblib.dump(m, OUT)
    with open(OUT + ".sha256", "w") as f:  # model_loader refuses to unpickle a file whose hash does not match
        f.write(hashlib.sha256(open(OUT, "rb").read()).hexdigest() + "\n")
    print(json.dumps(rep, indent=2, default=float))


if __name__ == "__main__":
    sys.exit(main())
