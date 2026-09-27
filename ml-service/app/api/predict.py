from fastapi import APIRouter
from app.schemas.request import PredictionRequest
from app.schemas.response import PredictionResponse
from app.services.inference_service import predict

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
def predict_route(request: PredictionRequest) -> PredictionResponse:
    return predict(request)
