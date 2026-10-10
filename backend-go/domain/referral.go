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
	IsEmergency           bool      `json:"is_emergency"`
	// shortcut: history context is client-supplied and only a fallback when the Redis batch features are missing; compute it server-side from the referral repo before the pilot.
	Context ReferralContext `json:"context"`
}

// ReferralContext is the point-in-time doctor/facility history the ML service needs (zero value = cold start).
type ReferralContext struct {
	Stratum          string   `json:"stratum"`
	N90              int      `json:"n90"`
	NS90             *float64 `json:"ns90"`
	N180             int      `json:"n180"`
	HHI180           *float64 `json:"hhi180"`
	ToDominantDest   bool     `json:"to_dominant_dest"`
	DestIsNearest    bool     `json:"dest_is_nearest"`
	SisruteAvailable bool     `json:"sisrute_available"`
	SisruteAgeDays   float64  `json:"sisrute_age_days"`
}

type Reason struct {
	Code         string  `json:"code"`
	Detail       string  `json:"detail"`
	Contribution float64 `json:"contribution"`
}

// DoctorFeatures are batch-computed (NS, HHI) and cached; zero value = cold start.
type DoctorFeatures struct {
	Stratum        string   `json:"stratum"`
	N90            int      `json:"n90"`
	NS90           *float64 `json:"ns90"`
	N180           int      `json:"n180"`
	HHI180         *float64 `json:"hhi180"`
	ToDominantDest bool     `json:"to_dominant_dest"`
	DestIsNearest  bool     `json:"dest_is_nearest"`
}

// ScoringInput is everything the ML service needs, assembled by the backend.
type ScoringInput struct {
	Referral         ReferralRequest
	Doctor           DoctorFeatures
	SisruteAvailable bool
	SisruteAgeDays   float64
}

type MLScores struct {
	NLPSimilarity float64  `json:"nlp_similarity"`
	AnomalyScore  float64  `json:"anomaly_score"`
	FraudScore    float64  `json:"fraud_score"`
	Score         float64  `json:"score"` // 0-100, owned by the ML service
	Reasons       []Reason `json:"reasons"`
	ModelVersion  string   `json:"model_version"`
}

type RiskDecision struct {
	ReferralID          string   `json:"referral_id"`
	Score               float64  `json:"score"`
	Decision            string   `json:"decision"`
	Signals             MLScores `json:"signals"`
	ModelVersion        string   `json:"model_version"`
	ReasonCodes         []string `json:"reason_codes"`
	RequiresHumanReview bool     `json:"requires_human_review"`
	Reasons             []Reason `json:"reasons,omitempty"`
	Status              string   `json:"status"` // SCORED | ACCEPTED_ASYNC; never a final decision
}
