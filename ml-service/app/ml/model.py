"""SIRUJUK composite risk score. Where this deviates from the proposal (see MODEL_CARD.md):

1. Cold start: EB shrinkage toward the peer median + INSUFFICIENT_HISTORY reason (n < 20 / 30), not exclusion.
2. Doctor vs referral level: NS term x is_non_specialist(i); HHI term x goes_to_dominant_destination(i).
3. Scale: all terms on a robust-z scale (Flag uses a fixed effect size FLAG_EFFECT).
4. NLP: continuous residualised z (length-controlled) AND a P10 indicator, both fitted.
5. Weights: logistic regression on the terms (the proposal's recalibration step) instead of 0.25 each.
6. HHI needs "is the destination the nearest facility". When that is unknown the HHI term is 0 (reason code
   HHI_NEAREST_UNKNOWN): HHI alone cannot tell steering from a rural single-hospital doctor, and a z-only term
   fitted to a negative weight in testing. The cost is measured in the report (nearest_facility_unknown).
7. Diagnoses outside the table get no NLP term (DIAGNOSIS_UNMAPPED) instead of a made-up template.
8. SISRUTE has the same trap as the nearest facility: `sisrute_available` null = not connected (flag 0, reason code
   SISRUTE_UNKNOWN on equipment/staff referrals), false = checked and the facility has no such equipment. Both give flag 0,
   so the score is the same; only the verifier is told the layer did not run.
9. The cuts are NOT re-cut for a deployment with fewer live layers: recutting to keep 5% red with only NS and narrative
   cut red precision from 0.76 to 0.36 (MODEL_CARD.md). Fewer reds is the safe direction when evidence is thinner.
"""
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from app.ml import diagnosis
from app.ml.features import MIN_HHI, MIN_NS, shrink

FLAG_EFFECT = 3.0   # fixed effect size so w_f*Flag is comparable to a z-score
TERMS = ["t_ns", "t_hhi", "t_flag", "t_nlp", "t_p10"]
LAYER = {"NS": ["t_ns"], "HHI": ["t_hhi"], "SISRUTE": ["t_flag"], "NLP": ["t_nlp", "t_p10"]}
MAD_K = 1.4826


def _robust(x, med, mad):
    return (x - med) / np.maximum(np.asarray(mad) * MAD_K, 1e-6)


def _stats(v):
    m = np.median(v)
    return float(m), float(np.median(np.abs(v - m)))


class Scorer:
    def fit(self, df: pd.DataFrame, terms=TERMS, yellow_share=0.20, red_share=0.05, seed=0):
        self.terms_used = list(terms)
        self.diagnosis_version = diagnosis.VERSION
        self.vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
        self.T = self.vec.fit_transform([diagnosis.template(i) for i in range(diagnosis.N_DIAG)])
        nlp = self.nlp(df.narr, df["diag"])
        ok = ~np.isnan(nlp)
        ll = np.log1p(df.narr.str.split().str.len()).values
        y = 1 - nlp
        self.len_fit = np.polyfit(ll[ok], y[ok], 1)
        res = y[ok] - np.polyval(self.len_fit, ll[ok])
        self.nlp_stats = _stats(res)
        self.p10 = float(np.percentile(nlp[ok], 10))
        self.len_corr = (float(np.corrcoef(ll[ok], y[ok])[0, 1]), float(np.corrcoef(ll[ok], res)[0, 1]))
        self.peer = {}
        for s, g in [("__all__", df)] + list(df.groupby("stratum")):
            ns, hh = g[g.n90 >= MIN_NS].ns90.values, g[g.n180 >= MIN_HHI].hhi180.values
            if len(ns) < 20 or len(hh) < 20:
                continue
            self.peer[s] = dict(ns=_stats(ns), hhi=_stats(hh), ns_p95=float(np.percentile(ns, 95)))
        X = self.terms(df)
        self.lr = LogisticRegression(C=1.0, max_iter=1000).fit(X[self.terms_used], df.fraud)
        s = self.score(X)
        # capacity budget, not a probability: yellow+red = yellow_share of referrals, red = red_share
        self.cut = (float(np.percentile(s, 100 * (1 - yellow_share))), float(np.percentile(s, 100 * (1 - red_share))))
        return self

    def nlp(self, narr, diag) -> np.ndarray:
        """Cosine to the PPK template; NaN when the diagnosis is not in the table."""
        diag = np.asarray(diag)
        out = np.full(len(diag), np.nan)
        m = diag >= 0
        if m.any():
            X = self.vec.transform(np.asarray(narr)[m])
            out[m] = np.asarray(X.multiply(self.T[diag[m]]).sum(1)).ravel()
        return out

    def peer_for(self, stratum: str) -> dict:
        return self.peer.get(stratum, self.peer["__all__"])

    def terms(self, df: pd.DataFrame) -> pd.DataFrame:
        out = pd.DataFrame(index=df.index)
        pr = [self.peer_for(s) for s in df.stratum]
        ns_med, ns_mad = np.array([p["ns"][0] for p in pr]), np.array([p["ns"][1] for p in pr])
        hh_med, hh_mad = np.array([p["hhi"][0] for p in pr]), np.array([p["hhi"][1] for p in pr])
        out["ns_p95"] = [p["ns_p95"] for p in pr]
        ns = shrink(df.ns90.values, df.n90.values, ns_med)
        hh = shrink(df.hhi180.values, df.n180.values, hh_med)
        diag = df["diag"].values
        is_ns = (diag >= 0) & (diag < diagnosis.N_NS)
        near = df.near.values.astype(float)
        known = ~np.isnan(near)
        to_dom = df.dest.values == df.dom_dest.values
        out["ns_z"], out["hhi_z"] = _robust(ns, ns_med, ns_mad), _robust(hh, hh_med, hh_mad)
        out["t_ns"] = np.clip(out.ns_z, -3, 8) * is_ns
        # steering away from the nearest facility; z scales it. Rural single-hospital doctors are not punished.
        out["t_hhi"] = (1 + np.clip(out.hhi_z, 0, 8)) * (to_dom & known & (near == 0))
        flag = (df.reason != "clinical").values & (df.sis_avail.values == 1)
        out["w_f"] = 1 / (1 + df.sis_age.values / 30)
        out["t_flag"] = FLAG_EFFECT * out.w_f * flag
        nlp = self.nlp(df.narr, diag)
        mapped = ~np.isnan(nlp)
        ll = np.log1p(df.narr.str.split().str.len()).values
        res = (1 - np.nan_to_num(nlp)) - np.polyval(self.len_fit, ll)
        out["nlp"] = nlp
        out["t_nlp"] = np.where(mapped, np.clip(_robust(res, *self.nlp_stats), -3, 3), 0.0)  # bounded like the proposal's 1-NLP: a vague narrative alone must not reach red
        out["t_p10"] = (mapped & (np.nan_to_num(nlp, nan=1.0) < self.p10)).astype(float)
        out["is_ns"], out["to_dom"], out["flag"], out["mapped"], out["near_known"] = is_ns, to_dom, flag, mapped, known
        # training data always has a SISRUTE snapshot; only the API can say "not connected" (sis_avail is 0 then)
        out["sis_known"] = df["sis_known"].values.astype(bool) if "sis_known" in df else np.ones(len(df), bool)
        return out

    def score(self, X: pd.DataFrame) -> np.ndarray:
        return 100 * self.lr.predict_proba(X[self.terms_used])[:, 1]

    def category(self, s):
        return np.where(s > self.cut[1], "red", np.where(s >= self.cut[0], "yellow", "green"))

    def indicators(self, x: pd.Series, r: pd.Series) -> dict:
        """The real numbers behind the score, for the verifier UI and the clarification flow."""
        nan_none = lambda v: None if v is None or (isinstance(v, float) and np.isnan(v)) else float(v)
        return {
            "ns": {"value": nan_none(r.ns90), "peer_p95": float(x.ns_p95), "n": int(r.n90), "min_n": MIN_NS, "applies": bool(x.is_ns)},
            "hhi": {"value": nan_none(r.hhi180), "n": int(r.n180), "min_n": MIN_HHI, "observe_from": 1500, "high_from": 2500,
                    "to_dominant_destination": bool(x.to_dom), "nearest_known": bool(x.near_known)},
            "sisrute": {"flag": bool(x.flag), "age_days": float(r.sis_age), "weight": float(x.w_f), "known": bool(x.sis_known)},
            "narrative": {"similarity": nan_none(x.nlp), "p10": self.p10, "mapped": bool(x.mapped)},
        }

    def reasons(self, x: pd.Series, r: pd.Series) -> list[dict]:
        """Reason codes ranked by contribution (coef * term), each with the numbers behind it."""
        coef = dict(zip(self.terms_used, self.lr.coef_[0]))
        c = {t: coef[t] * x[t] for t in self.terms_used}
        ns = r.ns90 if r.ns90 == r.ns90 else 0.0
        hh = r.hhi180 if r.hhi180 == r.hhi180 else 0.0
        spec = {
            "NS_ABOVE_PEER_P95": (c.get("t_ns", 0), f"NS {ns:.2f} vs peer P95 {x.ns_p95:.2f}, n = {int(r.n90)}"),
            "HHI_HIGH_CONCENTRATION": (c.get("t_hhi", 0),
                                       f"HHI {hh:.0f} (observasi 1.500, tinggi 2.500), n = {int(r.n180)}, tujuan dominan"
),
            "FACILITY_AVAILABLE_PER_SISRUTE": (c.get("t_flag", 0), f"SISRUTE menunjukkan tersedia, umur data {r.sis_age:.0f} hari, bobot {x.w_f:.2f}"),
            "NARRATIVE_GENERIC": (c.get("t_nlp", 0) + c.get("t_p10", 0), f"kesesuaian narasi {x.nlp:.2f} (P10 historis {self.p10:.2f})"),
        }
        out = [{"code": k, "detail": d, "contribution": round(float(v), 3)} for k, (v, d) in spec.items() if v > 0.05]
        out.sort(key=lambda o: -o["contribution"])
        if r.n90 < MIN_NS or r.n180 < MIN_HHI:
            out.append({"code": "INSUFFICIENT_HISTORY", "detail": f"n90 = {int(r.n90)} (min {MIN_NS}), n180 = {int(r.n180)} (min {MIN_HHI})", "contribution": 0.0})
        if x.flag and x.w_f < 0.4:
            out.append({"code": "SISRUTE_STALE", "detail": f"umur data SISRUTE {r.sis_age:.0f} hari", "contribution": 0.0})
        if not x.sis_known and r.reason != "clinical":  # a clinical referral never uses SISRUTE, so its absence is not news
            out.append({"code": "SISRUTE_UNKNOWN", "detail": "data SISRUTE tidak ada (belum tersambung): ketersediaan alat/SDM tidak diperiksa", "contribution": 0.0})
        if x.to_dom and not x.near_known:
            out.append({"code": "HHI_NEAREST_UNKNOWN", "detail": f"HHI {hh:.0f}, n = {int(r.n180)}: data faskes terdekat tidak ada, konsentrasi tidak dinilai", "contribution": 0.0})
        if not x.mapped:
            out.append({"code": "DIAGNOSIS_UNMAPPED", "detail": "kode diagnosis di luar tabel PPK/KNS; kesesuaian narasi tidak dihitung", "contribution": 0.0})
        return out
