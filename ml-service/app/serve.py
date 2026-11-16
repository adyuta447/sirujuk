"""Container entry point: one image, two transports, chosen by ML_SERVE (default grpc).

grpc  the default, what Cloud Run runs (HTTP/2 end to end). The backend side is ML_TRANSPORT=grpc.
http  the FastAPI app (POST /v1/predict, GET /v1/model) for hosts whose ingress has no HTTP/2, such as Azure Container
      Apps Express. The backend side is ML_TRANSPORT=http. Both call the same predict(), and tests_smoke.py compares
      every field of the two replies.

Both listen on $PORT (default 8000). The http mode has no authentication of its own: keep its ingress internal.
An unknown ML_SERVE stops the container: guessing a transport would leave the backend scoring against nothing.
"""
import logging
import os

MODES = ("grpc", "http")


def mode_from(env) -> str:
    mode = (env.get("ML_SERVE") or "grpc").strip().lower()  # unset or empty = the default
    if mode not in MODES:
        raise SystemExit(f"ML_SERVE={mode!r} is not one of {', '.join(MODES)}")
    return mode


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    mode, port = mode_from(os.environ), os.getenv("PORT", "8000")
    logging.info("ml serving over %s on :%s", mode, port)
    if mode == "grpc":
        from app.grpc_server import serve
        serve(port)
    else:
        import uvicorn
        from app.main import app  # loads the model at startup (lifespan), before the first request is accepted
        uvicorn.run(app, host="0.0.0.0", port=int(port), server_header=False)


if __name__ == "__main__":
    main()
