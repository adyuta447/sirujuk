export type Decision = "green" | "yellow" | "red";
export type RiskDecision = {
  referral_id: string;
  score: number;
  decision: Decision;
  requires_human_review: boolean;
  signals: { nlp_similarity: number; anomaly_score: number; fraud_score: number };
  model_version?: string;
  signals_source?: string;
  reasons?: string[];
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
