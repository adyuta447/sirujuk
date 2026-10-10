from fastapi import APIRouter
from app.schemas.request import PredictionRequest
from app.schemas.response import ModelInfo, PredictionResponse
from app.services.inference_service import model_info, predict

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
def predict_route(request: PredictionRequest) -> PredictionResponse:
    return predict(request)

@router.get("/model", response_model=ModelInfo)
def model_route() -> ModelInfo:
    return model_info()
