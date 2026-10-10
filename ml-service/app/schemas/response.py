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
    reasons: list[Reason]
    model_version: str
