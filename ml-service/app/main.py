from fastapi import FastAPI
from app.api.predict import router

app = FastAPI(title="SIRUJUK ML Inference")
app.include_router(router, prefix="/v1")
