from contextlib import asynccontextmanager

from fastapi import FastAPI
from app.api.predict import router
from app.core.model_loader import load_models

@asynccontextmanager
async def lifespan(_: FastAPI):
    load_models()  # load at startup: the first request must fit the backend's 300 ms scoring budget
    yield

app = FastAPI(title="SIRUJUK ML Inference", lifespan=lifespan)
app.include_router(router, prefix="/v1")
