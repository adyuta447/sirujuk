"""python retrain.py labels.json [--dry-run] -> measures the current model on real audit labels and, once there are
enough, refits the layer weights on them. The new model is saved only if it beats the current one on the newest labels.

labels.json is the backend's GET /api/v1/labels called with the service token (no X-Actor):
    curl -H "Authorization: Bearer $API_TOKEN" $BACKEND_URL/api/v1/labels > data/labels.json
Keep that file out of git: it holds clinical narratives."""
import argparse
import copy
import json
import sys

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score

from app.core.config import MODEL_PATH
from app.core.model_loader import load_models
from app.schemas.request import PredictionRequest
from app.services.inference_service import frame
from train import save

MIN_ROWS, MIN_POS = 200, 30  # same as backend internal/handler/labels.go
HOLDOUT = 0.3  # newest share of labels, never seen by the candidate


def metrics(m, df):
    y = df.label.values.astype(int)
    s = m.score(m.terms(df)); cat = m.category(s)
    out = dict(n=len(y), positive=int(y.sum()),
               red_precision=round(float(y[cat == "red"].mean()), 3) if (cat == "red").any() else None,
               recall_yellow_red=round(float(y[cat != "green"].sum() / y.sum()), 3) if y.sum() else None)
    if 0 < y.sum() < len(y):
        out.update(pr_auc=round(average_precision_score(y, s), 4), roc_auc=round(roc_auc_score(y, s), 4))
    return out


def run(rows, m, yellow_share=0.20, red_share=0.05):
    """Returns (report, new model or None)."""
    df = frame([PredictionRequest(**r) for r in rows])
    df["label"] = [r.get("label") for r in rows]
    df["issued"] = pd.to_datetime([r["issued_at"] for r in rows], utc=True)
    df["random"] = [bool(r.get("random_audit")) for r in rows]
    lab = df[df.label.notna()].sort_values("issued")
    rep = {"model": m.version, "rows": len(df), "labeled": len(lab), "positive": int(lab.label.sum())}
    if len(lab):
        rep["current"] = metrics(m, lab)
    if lab.random.any():  # the model did not choose these, so this is the unbiased view of its misses
        rep["current_random_audit_only"] = metrics(m, lab[lab.random])
    if rep["labeled"] < MIN_ROWS or rep["positive"] < MIN_POS:
        rep.update(retrained=False, why=f"need >= {MIN_ROWS} labels with >= {MIN_POS} tidak-valid")
        return rep, None

    def fit(train):
        # shortcut: flagged and random-audit labels weigh the same; once random_audited is in the hundreds,
        # weight them by the inverse of their sampling rate to undo the model's own selection.
        c = copy.deepcopy(m)
        c.lr = LogisticRegression(C=1.0, max_iter=1000).fit(c.terms(train)[c.terms_used], train.label.astype(int))
        s = c.score(c.terms(df))  # capacity cut-offs from all real referrals, labeled or not
        c.cut = (float(np.percentile(s, 100 * (1 - yellow_share))), float(np.percentile(s, 100 * (1 - red_share))))
        return c

    k = int(len(lab) * (1 - HOLDOUT))
    tr, te = lab.iloc[:k], lab.iloc[k:]  # temporal: train on older labels, judge on the newest
    rep["holdout"] = {"current": metrics(m, te), "candidate": metrics(fit(tr), te)}
    old, new = rep["holdout"]["current"].get("pr_auc"), rep["holdout"]["candidate"].get("pr_auc")
    if old is None or new is None or new <= old:
        rep.update(retrained=False, why="candidate does not beat the current model on the newest labels")
        return rep, None
    final = fit(lab)
    final.version = m.version.split("+real-")[0] + "+real-%d" % len(lab)
    rep.update(retrained=True, new_model=final.version, new_cuts={"yellow_from": round(final.cut[0], 2), "red_from": round(final.cut[1], 2)},
               new_weights=dict(zip(final.terms_used, final.lr.coef_[0].round(3))))
    return rep, final


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("labels", help="JSON from GET /api/v1/labels")
    ap.add_argument("--yellow-share", type=float, default=0.20)
    ap.add_argument("--red-share", type=float, default=0.05)
    ap.add_argument("--dry-run", action="store_true", help="report only, never overwrite the model")
    a = ap.parse_args()
    rep, new = run(json.load(open(a.labels))["rows"], load_models(), a.yellow_share, a.red_share)
    if new is not None and not a.dry_run:
        save(new, MODEL_PATH)
        rep["saved"] = MODEL_PATH
    print(json.dumps(rep, indent=2, default=float))


if __name__ == "__main__":
    sys.exit(main())
