"""python train.py -> trains on days < 240, evaluates on days >= 240 (temporal split), writes models/sirujuk.joblib."""
import json
import sys

import joblib
import numpy as np
from sklearn.metrics import average_precision_score, roc_auc_score

from app.ml.features import doctor_history
from app.ml.model import Scorer, TERMS
from app.ml.synth import generate

SPLIT = 240


def boot(f, y, s, n=200, seed=0):
    r = np.random.default_rng(seed); v = []
    for _ in range(n):
        i = r.integers(0, len(y), len(y)); v.append(f(y[i], s[i]))
    return np.percentile(v, [2.5, 97.5]).round(3).tolist()


def main():
    df = doctor_history(generate())
    tr, te = df[df.day < SPLIT].copy(), df[df.day >= SPLIT].copy()
    m = Scorer().fit(tr)
    X = m.terms(te); s = m.score(X); y = te.fraud.values
    cat = m.category(s); red, flag = cat == "red", cat != "green"
    prec = lambda yy, rr: yy[rr].mean() if rr.any() else 0
    # operating point for the plain accuracy figure: probability threshold maximising F1 on TRAIN
    Xtr = m.terms(tr); st = m.score(Xtr); ths = np.linspace(5, 95, 91)
    f1 = [2 * ((st > t) & (tr.fraud == 1)).sum() / (((st > t).sum() + tr.fraud.sum()) or 1) for t in ths]
    thr = float(ths[int(np.argmax(f1))]); pred = s > thr
    rep = {
        "evidence": "SYNTHETIC data, temporal split (train<%d, test>=%d)" % (SPLIT, SPLIT),
        "n_train": len(tr), "n_test": len(te), "base_rate_test": round(float(y.mean()), 4),
        "pr_auc": round(average_precision_score(y, s), 4), "roc_auc": round(roc_auc_score(y, s), 4),
        "red_precision": round(float(prec(y, red)), 3), "red_precision_ci": boot(lambda a, b: a[b > m.cut[1]].mean() if (b > m.cut[1]).any() else 0, y, s),
        "red_fdr": round(1 - float(prec(y, red)), 3),
        "recall_yellow_red": round(float(y[flag].sum() / y.sum()), 3),
        "recall_ci": boot(lambda a, b: a[b >= m.cut[0]].sum() / max(a.sum(), 1), y, s),
        "cat_share": {c: round(float((cat == c).mean()), 3) for c in ["green", "yellow", "red"]},
        "op_threshold": thr, "op_accuracy": round(float((pred == y).mean()), 4),
        "op_precision": round(float(y[pred].mean()), 3), "op_recall": round(float(pred[y == 1].mean()), 3),
        "acc_note": "accuracy is NOT the headline: always-'not fraud' scores %.3f" % (1 - y.mean()),
        "insufficient_history_share": round(float(((te.n90 < 20) | (te.n180 < 30)).mean()), 3),
        "len_corr_before_after": [round(v, 3) for v in m.len_corr],
        "weights": dict(zip(TERMS, m.lr.coef_[0].round(3))), "cuts_P80_P95": [round(c, 2) for c in m.cut],
    }
    te["s"], te["cat"] = s, cat
    rep["recall_by_scenario"] = {t: round(float((g.cat != "green").mean()), 3) for t, g in te[te.fraud == 1].groupby("tag")}
    ben = te[(te.fraud == 0)]
    rep["flag_rate_nonfraud_by_doc_role"] = {r: round(float((g.cat != "green").mean()), 3) for r, g in ben.groupby("doc_role")}
    rural = te.rural.values
    rep["by_stratum"] = {k: {"flag_rate": round(float(flag[mk].mean()), 3), "red_precision": round(float(prec(y[mk], red[mk])), 3)}
                         for k, mk in {"rural": rural, "urban": ~rural, **{f"ftype_{t}": (te.ftype == t).values for t in te.ftype.unique()}}.items()}
    # capacity: yellow+red share x referral volume per kantor cabang per day
    rep["capacity_note"] = "yellow+red = %.1f%% of referrals; at 1000 referrals/day/cabang that is %d reviews/day" % (100 * flag.mean(), 1000 * flag.mean())
    joblib.dump(m, "models/sirujuk.joblib")
    print(json.dumps(rep, indent=2, default=float))


if __name__ == "__main__":
    sys.exit(main())
