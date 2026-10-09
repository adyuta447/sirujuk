package domain

import "time"

type ReferralRequest struct {
	ReferralID            string    `json:"referral_id"`
	DoctorID              string    `json:"doctor_id"`
	OriginFacilityID      string    `json:"origin_facility_id"`
	DestinationFacilityID string    `json:"destination_facility_id"`
	DiagnosisCode         string    `json:"diagnosis_code"`
	Reason                string    `json:"reason"`
	ClinicalNarrative     string    `json:"clinical_narrative"`
	IssuedAt              time.Time `json:"issued_at"`
}

type MLScores struct {
	NLPSimilarity float64 `json:"nlp_similarity"`
	AnomalyScore  float64 `json:"anomaly_score"`
	FraudScore    float64 `json:"fraud_score"`
}

type RiskDecision struct {
	ReferralID          string   `json:"referral_id"`
	Score               float64  `json:"score"`
	Decision            string   `json:"decision"`
	Signals             MLScores `json:"signals"`
	RequiresHumanReview bool     `json:"requires_human_review"`
	ModelVersion        string   `json:"model_version"`
	SignalsSource       string   `json:"signals_source"`
	Reasons             []string `json:"reasons"`
}

type AuditReview struct {
	Reviewer   string `json:"reviewer"`
	Outcome    string `json:"outcome"`
	Note       string `json:"note"`
	ReviewedAt string `json:"reviewed_at"`
}

type StoredReferral struct {
	Request  ReferralRequest `json:"request"`
	Decision RiskDecision    `json:"decision"`
	Audits   []AuditReview   `json:"audits"`
}
