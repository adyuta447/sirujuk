export type Decision = "green" | "yellow" | "red";
export type RiskDecision = {
  referral_id: string;
  score: number;
  decision: Decision;
  requires_human_review: boolean;
  status: "SCORED" | "ACCEPTED_ASYNC"; // ACCEPTED_ASYNC: no score yet, the referral still proceeds
  model_version?: string;
  reason_codes?: string[];
  reasons?: { code: string; detail: string; contribution: number }[];
  signals: { nlp_similarity: number; anomaly_score: number; fraud_score: number };
};
