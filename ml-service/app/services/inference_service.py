import re
import zlib

import numpy as np
import pandas as pd

from app.core.config import MODEL_VERSION
from app.core.model_loader import load_models
from app.ml.synth import N_DIAG
from app.schemas.request import PredictionRequest
from app.schemas.response import PredictionResponse
from app.utils.preprocessing import normalize_text

def diag_index(code: str) -> int:
    # shortcut: ICD codes are hashed onto the synthetic PPK list; replace with the versioned 144-list/PPK table.
    if re.fullmatch(r"D\d+", code) and int(code[1:]) < N_DIAG:
        return int(code[1:])
    return zlib.crc32(code.upper().encode()) % N_DIAG

def predict(request: PredictionRequest) -> PredictionResponse:
    m = load_models()
    row = pd.DataFrame([{
        "stratum": request.stratum, "diag": diag_index(request.diagnosis_code), "reason": request.reason,
        "narr": normalize_text(request.clinical_narrative),
        "n90": request.n90, "ns90": np.nan if request.ns90 is None else request.ns90,
        "n180": request.n180, "hhi180": np.nan if request.hhi180 is None else request.hhi180,
        "dest": 1 if request.to_dominant_dest else 0, "dom_dest": 1, "near": int(request.dest_is_nearest),
        "sis_avail": int(request.sisrute_available), "sis_age": request.sisrute_age_days,
    }])
    x = m.terms(row)
    s = float(m.score(x)[0])
    r = row.iloc[0]
    reasons = m.reasons(x.iloc[0], r.n90, r.n180, request.ns90 or 0.0, request.hhi180 or 0.0, r.sis_age)
    doctor_level = float(1 / (1 + np.exp(-(x.t_ns.iloc[0] * m.lr.coef_[0][0] + x.t_hhi.iloc[0] * m.lr.coef_[0][1] + m.lr.intercept_[0]))))
    return PredictionResponse(
        nlp_similarity=float(np.clip(x.nlp.iloc[0], 0, 1)), anomaly_score=doctor_level,
        fraud_score=s / 100, score=s, category=str(m.category(np.array([s]))[0]),
        reasons=reasons, model_version=MODEL_VERSION,
    )
