export type Decision = "green" | "yellow" | "red";
export type RiskDecision = {
  referral_id: string;
  score: number;
  decision: Decision;
  requires_human_review: boolean;
  status: "SCORED" | "ACCEPTED_ASYNC"; // ACCEPTED_ASYNC: no score yet, the referral still proceeds
  model_version?: string;
  reason_codes?: string[];
  // Backend selalu mengirim objek (termasuk skor dummy: code DUMMY_*).
  reasons?: { code: string; detail: string; contribution: number }[];
  signals: { nlp_similarity: number; anomaly_score: number; fraud_score: number };
  signals_source?: string;
};

export type StoredReferral = {
  request: {
    referral_id: string;
    patient_name: string;
    doctor_id: string;
    origin_facility_id: string;
    destination_facility_id: string;
    diagnosis_code: string;
    reason: string;
    clinical_narrative: string;
    issued_at: string;
  };
  decision: RiskDecision;
  audits: { reviewer: string; outcome: string; note: string; reviewed_at: string }[];
};
