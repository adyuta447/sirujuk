from pydantic import BaseModel, Field

class PredictionResponse(BaseModel):
    nlp_similarity: float = Field(ge=0, le=1)
    anomaly_score: float = Field(ge=0, le=1)
    fraud_score: float = Field(ge=0, le=1)
    model_version: str
