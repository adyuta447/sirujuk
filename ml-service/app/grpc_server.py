"""Production entry point: the backend calls Predict over one persistent HTTP/2 connection (proto/sirujuk/ml/v1).

The FastAPI app in app.main stays for local debugging and the smoke tests; both run the same predict().
"""
import json
import logging
import os
import signal
from concurrent import futures
from datetime import timezone

import grpc
from pydantic import ValidationError

from app.core.model_loader import load_models
from app.schemas.request import PredictionRequest
from app.services.inference_service import predict
from sirujuk.ml.v1 import inference_pb2 as pb
from sirujuk.ml.v1 import inference_pb2_grpc as pb_grpc

WORKERS = 10  # = containerConcurrency in infra/gcp/cloudrun-ml.yaml


def _opt(msg, field: str):
    return getattr(msg, field) if msg.HasField(field) else None


def to_request(m: pb.PredictRequest) -> PredictionRequest:
    # Pydantic keeps the same bounds as the HTTP API: the proto types alone do not validate ranges.
    return PredictionRequest(
        referral_id=m.referral_id, diagnosis_code=m.diagnosis_code, reason=m.reason, clinical_narrative=m.clinical_narrative,
        issued_at=m.issued_at.ToDatetime(tzinfo=timezone.utc),
        stratum=_opt(m, "stratum"), n90=m.n90, ns90=_opt(m, "ns90"), n180=m.n180, hhi180=_opt(m, "hhi180"),
        to_dominant_dest=m.to_dominant_dest, dest_is_nearest=_opt(m, "dest_is_nearest"),
        sisrute_available=_opt(m, "sisrute_available"), sisrute_age_days=m.sisrute_age_days,
    )


class Inference(pb_grpc.InferenceServicer):
    def Predict(self, request, context):
        try:
            req = to_request(request)
        except ValidationError as e:
            # Field names only: pydantic's message echoes the input, which can hold the clinical narrative.
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "invalid fields: " + ", ".join(".".join(map(str, err["loc"])) for err in e.errors()))
        r = predict(req)
        return pb.PredictResponse(
            nlp_similarity=r.nlp_similarity, anomaly_score=r.anomaly_score, fraud_score=r.fraud_score, score=r.score,
            category=r.category, yellow_from=r.yellow_from, red_from=r.red_from,
            reasons=[pb.Reason(code=x.code, detail=x.detail, contribution=x.contribution) for x in r.reasons],
            indicators_json=json.dumps(r.indicators).encode(), model_version=r.model_version, diagnosis_version=r.diagnosis_version,
        )


def serve(port: str) -> None:
    load_models()  # before listening: the first request must fit the backend's 300 ms scoring budget
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=WORKERS))
    pb_grpc.add_InferenceServicer_to_server(Inference(), server)
    # Plaintext h2c inside the container: TLS ends at the Cloud Run front end, which also checks the caller's ID token.
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    signal.signal(signal.SIGTERM, lambda *_: server.stop(grace=5))  # let in-flight scores finish
    logging.info("ml gRPC listening on :%s", port)
    server.wait_for_termination()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    serve(os.getenv("PORT", "8000"))
