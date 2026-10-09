# API Contract

## `POST /api/v1/referrals/score`

Request:

```json
{
  "referral_id": "r-001",
  "patient_name": "A",
  "doctor_id": "d-001",
  "origin_facility_id": "fktp-001",
  "destination_facility_id": "fkrtl-001",
  "diagnosis_code": "J06.9",
  "reason": "Keterbatasan alat",
  "clinical_narrative": "Pasien ...",
  "issued_at": "2026-09-27T12:00:00Z"
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
  "requires_human_review": true
}
```

`decision` hanya boleh dibuat backend Go.
