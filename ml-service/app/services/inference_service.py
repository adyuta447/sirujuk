import numpy as np
import pandas as pd

from app.core.model_loader import load_models
from app.ml import diagnosis
from app.schemas.request import PredictionRequest
from app.schemas.response import ModelInfo, PredictionResponse
from app.utils.preprocessing import normalize_text

def predict(request: PredictionRequest) -> PredictionResponse:
    m = load_models()
    nan = lambda v: np.nan if v is None else v
    row = pd.DataFrame([{
        "stratum": request.stratum or "__all__", "diag": diagnosis.resolve(request.diagnosis_code), "reason": request.reason,
        "narr": normalize_text(request.clinical_narrative),
        "n90": request.n90, "ns90": nan(request.ns90), "n180": request.n180, "hhi180": nan(request.hhi180),
        "dest": 1 if request.to_dominant_dest else 0, "dom_dest": 1, "near": np.nan if request.dest_is_nearest is None else int(request.dest_is_nearest),
        "sis_avail": int(request.sisrute_available), "sis_age": request.sisrute_age_days,
    }])
    X = m.terms(row)
    x, s = X.iloc[0], float(m.score(X)[0])
    r = row.iloc[0]
    return PredictionResponse(
        nlp_similarity=0.0 if np.isnan(x.nlp) else float(np.clip(x.nlp, 0, 1)),
        anomaly_score=float(np.clip(1 / (1 + np.exp(-(x.t_ns * m.lr.coef_[0][0] + x.t_hhi * m.lr.coef_[0][1] + m.lr.intercept_[0]))), 0, 1)),
        fraud_score=s / 100, score=s, category=str(m.category(np.array([s]))[0]),
        yellow_from=m.cut[0], red_from=m.cut[1],
        reasons=m.reasons(x, r), indicators=m.indicators(x, r),
        model_version=m.version, diagnosis_version=m.diagnosis_version,
    )

def model_info() -> ModelInfo:
    m = load_models()
    return ModelInfo(model_version=m.version, diagnosis_version=m.diagnosis_version, yellow_from=m.cut[0], red_from=m.cut[1],
                     n_kns=diagnosis.N_NS, n_diagnoses=diagnosis.N_DIAG)
