from app.schemas.request import PredictionRequest
from app.schemas.response import PredictionResponse

def predict(request: PredictionRequest) -> PredictionResponse:
    # Placeholder inference: replace with loaded, versioned models.
    return PredictionResponse(
        nlp_similarity=0.5,
        anomaly_score=0.0,
        fraud_score=0.0,
        model_version="baseline-untrained",
    )
