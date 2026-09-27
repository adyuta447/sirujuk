export type Decision = "green" | "yellow" | "red";
export type RiskDecision = {
  referral_id: string;
  score: number;
  decision: Decision;
  requires_human_review: boolean;
  signals: { nlp_similarity: number; anomaly_score: number; fraud_score: number };
};
