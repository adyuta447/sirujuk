"""SIRUJUK composite risk score. Fixes for proposal gaps are listed in the module-level notes below.

1. Cold start: EB shrinkage toward peer median + INSUFFICIENT_HISTORY reason (n < 20 / 30).
2. Doctor vs referral level: NS term x is_non_specialist(i); HHI term x goes_to_dominant_destination(i).
3. Scale: all four terms on a robust-z scale (Flag uses a fixed effect size FLAG_EFFECT).
4. NLP: continuous residualised z (length-controlled) AND a P10 indicator, both fitted.
5. Weights: logistic regression on terms (proposal's recalibration step) instead of 0.25 each.
"""
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from app.ml.features import MIN_HHI, MIN_NS, shrink
from app.ml.synth import N_NS, ppk_template, N_DIAG

FLAG_EFFECT = 3.0   # fixed effect size so w_f*Flag is comparable to a z-score
TERMS = ["t_ns", "t_hhi", "t_flag", "t_nlp", "t_p10"]
MAD_K = 1.4826


def _robust(x, med, mad):
    return (x - med) / np.maximum(np.asarray(mad) * MAD_K, 1e-6)


class Scorer:
    def fit(self, df: pd.DataFrame):
        self.vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
        self.T = self.vec.fit_transform([ppk_template(d) for d in range(N_DIAG)])
        nlp = self.nlp(df.narr, df["diag"])
        y = 1 - nlp
        ll = np.log1p(df.narr.str.split().str.len())
        self.len_fit = np.polyfit(ll, y, 1)
        res = y - np.polyval(self.len_fit, ll)
        self.nlp_stats = (np.median(res), np.median(np.abs(res - np.median(res))))
        self.p10 = float(np.percentile(nlp, 10))
        self.len_corr = (float(np.corrcoef(ll, y)[0, 1]), float(np.corrcoef(ll, res)[0, 1]))
        self.peer = {}
        for s, g in df.groupby("stratum"):
            a, b = g[g.n90 >= MIN_NS], g[g.n180 >= MIN_HHI]
            ns, hh = a.ns90.values, b.hhi180.values
            self.peer[s] = dict(ns=(np.median(ns), np.median(np.abs(ns - np.median(ns)))),
                                hhi=(np.median(hh), np.median(np.abs(hh - np.median(hh)))))
        X = self.terms(df)
        self.lr = LogisticRegression(C=1.0, max_iter=1000).fit(X[TERMS], df.fraud)
        s = self.score(X)
        self.cut = (float(np.percentile(s, 80)), float(np.percentile(s, 95)))  # capacity budget, see report
        return self

    def nlp(self, narr, diag):
        X = self.vec.transform(narr)
        return np.asarray(X.multiply(self.T[np.asarray(diag)]).sum(1)).ravel()

    def terms(self, df: pd.DataFrame) -> pd.DataFrame:
        out = pd.DataFrame(index=df.index)
        ns_m = df.stratum.map(lambda s: self.peer[s]["ns"]); hh_m = df.stratum.map(lambda s: self.peer[s]["hhi"])
        ns_med, ns_mad = ns_m.str[0].values, ns_m.str[1].values
        hh_med, hh_mad = hh_m.str[0].values, hh_m.str[1].values
        ns = shrink(df.ns90.values, df.n90.values, ns_med)
        hh = shrink(df.hhi180.values, df.n180.values, hh_med)
        is_ns = (df["diag"] < N_NS).values
        to_dom = (df.dest.values == df.dom_dest.values) & (df.near.values == 0)  # steering away from nearest; rural single-hospital docs are not punished
        out["ns_z"], out["hhi_z"] = _robust(ns, ns_med, ns_mad), _robust(hh, hh_med, hh_mad)
        out["t_ns"] = np.clip(out.ns_z, -3, 8) * is_ns
        out["t_hhi"] = (1 + np.clip(out.hhi_z, 0, 8)) * to_dom  # base 1 = steering to a far dominant destination; z scales it
        flag = (df.reason != "clinical").values & (df.sis_avail.values == 1)
        out["w_f"] = 1 / (1 + df.sis_age.values / 30)
        out["t_flag"] = FLAG_EFFECT * out.w_f * flag
        nlp = self.nlp(df.narr, df["diag"])
        ll = np.log1p(df.narr.str.split().str.len())
        res = (1 - nlp) - np.polyval(self.len_fit, ll)
        out["nlp"] = nlp
        out["t_nlp"] = np.clip(_robust(res, *self.nlp_stats), -3, 8)
        out["t_p10"] = (nlp < self.p10).astype(float)
        out["is_ns"], out["to_dom"], out["flag"] = is_ns, to_dom, flag
        return out

    def score(self, X: pd.DataFrame) -> np.ndarray:
        return 100 * self.lr.predict_proba(X[TERMS])[:, 1]

    def category(self, s):
        return np.where(s > self.cut[1], "red", np.where(s >= self.cut[0], "yellow", "green"))

    def reasons(self, x: pd.Series, n90: float, n180: float, ns90: float, hhi: float, sis_age: float) -> list[dict]:
        """Reason codes ranked by contribution (coef * term) with the numbers behind each."""
        contrib = dict(zip(TERMS, self.lr.coef_[0] * x[TERMS].values))
        spec = {
            "t_ns": ("NS_ABOVE_PEER_P95", f"NS {ns90:.2f} (z {x.ns_z:.1f}), n = {int(n90)}"),
            "t_hhi": ("HHI_HIGH_CONCENTRATION", f"HHI {hhi:.0f} (z {x.hhi_z:.1f}), n = {int(n180)}"),
            "t_flag": ("FACILITY_AVAILABLE_PER_SISRUTE", f"SISRUTE shows available, data age {sis_age:.0f} d, w_f {x.w_f:.2f}"),
            "t_nlp": ("NARRATIVE_GENERIC", f"narrative fit {x.nlp:.2f}"),
            "t_p10": ("NARRATIVE_GENERIC", f"narrative fit {x.nlp:.2f} below historical P10 {self.p10:.2f}"),
        }
        out, seen = [], set()
        for t, c in sorted(contrib.items(), key=lambda kv: -kv[1]):
            if c <= 0.05 or spec[t][0] in seen:
                continue
            seen.add(spec[t][0]); out.append({"code": spec[t][0], "detail": spec[t][1], "contribution": round(float(c), 3)})
        if n90 < MIN_NS or n180 < MIN_HHI:
            out.append({"code": "INSUFFICIENT_HISTORY", "detail": f"n90 = {int(n90)} (min {MIN_NS}), n180 = {int(n180)} (min {MIN_HHI})", "contribution": 0.0})
        if x.w_f < 0.4:
            out.append({"code": "SISRUTE_STALE", "detail": f"SISRUTE data age {sis_age:.0f} d", "contribution": 0.0})
        return out
