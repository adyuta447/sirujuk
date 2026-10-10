# API Contract

## `POST /api/v1/referrals/score`

Request:

```json
{
  "referral_id": "r-001",
  "doctor_id": "d-001",
  "origin_facility_id": "fktp-001",
  "destination_facility_id": "fkrtl-001",
  "diagnosis_code": "D12",
  "reason": "Keterbatasan alat",
  "clinical_narrative": "Pasien ...",
  "issued_at": "2026-09-27T12:00:00Z",
  "is_emergency": false
}
```

Response:

```json
{
  "referral_id": "r-001",
  "score": 72.4,
  "decision": "yellow",
  "signals": {
    "nlp_similarity": 0.42,
    "anomaly_score": 0.71,
    "fraud_score": 0.68
  },
  "model_version": "<mlflow run id>",
  "reason_codes": ["NS_HIGH"],
  "requires_human_review": true,
  "status": "SCORED"
}
```

Header wajib: `Idempotency-Key` (= `referral_no`). Opsional: `X-Correlation-ID`, `Authorization: Bearer <API_TOKEN>` bila `API_TOKEN` diset.

`202 Accepted` (`status: "ACCEPTED_ASYNC"`): ML timeout (300 ms) / error, atau rujukan darurat. Rujukan tetap berjalan; dinilai belakangan lewat Redis Stream `scoring:retry`. Tidak pernah 5xx karena ML.
Error: `{code, message, correlation_id}`. `decision` wire format huruf kecil; DB menyimpan `GREEN/YELLOW/RED`.

Alur: handler -> `DecisionService` (fitur dokter dari Redis `doctor:{id}`, SISRUTE dari `FacilityRepository`, fallback `context` dari request) -> ML `/v1/predict` -> `DecisionEngine` (ambang `YELLOW_FROM`/`RED_FROM`).

`decision` hanya boleh dibuat backend Go.
