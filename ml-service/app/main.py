from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.api.predict import router
from app.core.model_loader import load_models

@asynccontextmanager
async def lifespan(_: FastAPI):
    load_models()  # load at startup: the first request must fit the backend's 300 ms scoring budget
    yield

# Private service (Cloud Run IAM): no interactive docs or schema, so nothing advertises the API surface.
app = FastAPI(title="SIRUJUK ML Inference", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(router, prefix="/v1")


@app.exception_handler(RequestValidationError)
async def invalid_fields(_: Request, e: RequestValidationError) -> JSONResponse:
    # Field names only, like app/grpc_server.py: FastAPI's default 422 body echoes the offending input, which can be the clinical narrative.
    names = dict.fromkeys(".".join(str(p) for p in err["loc"][1:] if isinstance(p, str)) or "body" for err in e.errors())  # error order, as in grpc_server
    return JSONResponse({"detail": "invalid fields: " + ", ".join(names)}, status_code=422)
