from typing import Any

from pydantic import BaseModel, Field

class Reason(BaseModel):
    code: str
    detail: str
    contribution: float

class PredictionResponse(BaseModel):
    nlp_similarity: float = Field(ge=0, le=1)
    anomaly_score: float = Field(ge=0, le=1)
    fraud_score: float = Field(ge=0, le=1)  # = score / 100; a prioritisation signal, never proof of fraud
    score: float = Field(ge=0, le=100)
    category: str
    yellow_from: float  # the model's own cut-offs, so callers need not keep a second copy
    red_from: float
    reasons: list[Reason]
    indicators: dict[str, Any]
    model_version: str
    diagnosis_version: str

class ModelInfo(BaseModel):
    model_version: str
    diagnosis_version: str
    yellow_from: float
    red_from: float
    n_kns: int
    n_diagnoses: int
