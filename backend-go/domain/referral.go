package domain

import (
	"encoding/json"
	"time"
)

type ReferralRequest struct {
	ReferralID            string `json:"referral_id"`
	PatientName           string `json:"patient_name"`
	DoctorID              string `json:"doctor_id"`
	OriginFacilityID      string `json:"origin_facility_id"`
	OriginWilayah         string `json:"origin_wilayah"`
	DestinationFacilityID string `json:"destination_facility_id"`
	DiagnosisCode         string `json:"diagnosis_code"`
	Reason                string `json:"reason"`
	// ReasonCategory (clinical|equipment|staff) is chosen from a fixed list; the free-text Reason is not parsed when it is set.
	ReasonCategory    string    `json:"reason_category,omitempty"`
	ClinicalNarrative string    `json:"clinical_narrative"`
	IssuedAt          time.Time `json:"issued_at"`
	IsEmergency       bool      `json:"is_emergency"`
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
	DestIsNearest    *bool    `json:"dest_is_nearest"` // nil = unknown (no distance data); never default to true
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
	DestIsNearest  *bool    `json:"dest_is_nearest"` // nil = unknown; true would silently switch the HHI term off
	// DominantDest is the doctor's most-used destination (from the batch). ToDominantDest is then derived per referral.
	DominantDest string `json:"dominant_dest,omitempty"`
}

// ScoringInput is everything the ML service needs, assembled by the backend.
type ScoringInput struct {
	Referral         ReferralRequest
	Doctor           DoctorFeatures
	SisruteAvailable bool
	SisruteAgeDays   float64
}

type MLScores struct {
	NLPSimilarity float64 `json:"nlp_similarity"`
	AnomalyScore  float64 `json:"anomaly_score"`
	FraudScore    float64 `json:"fraud_score"`
	Score         float64 `json:"score"`    // 0-100, owned by the ML service
	Category      string  `json:"category"` // green|yellow|red from the ML model's own p80/p95 cut-offs
	YellowFrom    float64 `json:"yellow_from"`
	RedFrom       float64 `json:"red_from"`
	// Indicators (NS, HHI, SISRUTE, narrative) are passed through untouched: the UI shows what the model used.
	Indicators       json.RawMessage `json:"indicators,omitempty"`
	DiagnosisVersion string          `json:"diagnosis_version,omitempty"`
	Reasons          []Reason        `json:"reasons"`
	ModelVersion     string          `json:"model_version"`
}

type RiskDecision struct {
	ReferralID   string   `json:"referral_id"`
	Score        float64  `json:"score"`
	Decision     string   `json:"decision"`
	Signals      MLScores `json:"signals"`
	ModelVersion string   `json:"model_version"`
	ReasonCodes  []string `json:"reason_codes"`
	// Cut-offs and indicators as the model reported them, kept with the score so an appeal can be answered later.
	YellowFrom          float64         `json:"yellow_from,omitempty"`
	RedFrom             float64         `json:"red_from,omitempty"`
	ModelCategory       string          `json:"model_category,omitempty"` // what the model said, before any backend policy (min red layers)
	Indicators          json.RawMessage `json:"indicators,omitempty"`
	DiagnosisVersion    string          `json:"diagnosis_version,omitempty"`
	RequiresHumanReview bool            `json:"requires_human_review"`
	Reasons             []Reason        `json:"reasons,omitempty"`
	Status              string          `json:"status"`                   // SCORED | ACCEPTED_ASYNC; never a final decision
	SignalsSource       string          `json:"signals_source,omitempty"` // "backend-dummy" only when DUMMY_SCORING is on
	// Features is the exact input the ML service saw (doctor NS/HHI, SISRUTE snapshot): needed to explain a score on appeal.
	Features *FeatureSnapshot `json:"features,omitempty"`
	ScoredAt string           `json:"scored_at,omitempty"`
}

type FeatureSnapshot struct {
	Doctor           DoctorFeatures `json:"doctor"`
	SisruteAvailable bool           `json:"sisrute_available"`
	SisruteAgeDays   float64        `json:"sisrute_age_days"`
}

// ScoreSnapshot is an earlier score of the same referral, kept when it is edited or re-scored.
type ScoreSnapshot struct {
	Score        float64 `json:"score"`
	Decision     string  `json:"decision"`
	ModelVersion string  `json:"model_version"`
	ScoredAt     string  `json:"scored_at"`
}

// AuditReview is one verifier/TKMKB outcome on a stored referral (demo store, see repository.MemoryStore).
type AuditReview struct {
	Reviewer   string `json:"reviewer"`
	Actor      string `json:"actor"` // account email: stable even if the display name changes
	Role       string `json:"role"`
	Outcome    string `json:"outcome"`
	Note       string `json:"note"`
	ReviewedAt string `json:"reviewed_at"`
}

// Clarification is a doctor's written answer to a flagged referral; required before any sanction is considered.
type Clarification struct {
	Author string `json:"author"`
	Actor  string `json:"actor"`
	Text   string `json:"text"`
	At     string `json:"at"`
}

type StoredReferral struct {
	Request        ReferralRequest `json:"request"`
	Decision       RiskDecision    `json:"decision"`
	Audits         []AuditReview   `json:"audits"`
	History        []ScoreSnapshot `json:"history"`
	Clarifications []Clarification `json:"clarifications"`
	Archived       bool            `json:"archived,omitempty"`
	// Synthetic marks demo rows made by the seed. They must never be mistaken for, or mixed into, real data.
	Synthetic bool `json:"synthetic,omitempty"`
	// Source names an imported historical sample (e.g. "bpjs-sampel-2025"): real but de-identified, never a live referral.
	Source string `json:"source,omitempty"`
	// Derived by Derive; never accepted as input.
	ClaimStatus string `json:"claim_status"`
	Final       bool   `json:"final"`
}

// Audit outcomes. Only OutcomeValid and OutcomeInvalid are final; asking the doctor for clarification is not.
const (
	OutcomeValid         = "valid"
	OutcomeInvalid       = "tidak-valid"
	OutcomeClarification = "perlu-klarifikasi"
	OutcomeArchived      = "diarsipkan"
)

// Claim payment status. Red holds the claim payment (never the patient) until TKMKB decides.
const (
	ClaimNormal    = "normal"
	ClaimHeld      = "ditahan"
	ClaimReleased  = "dilepas"
	ClaimConfirmed = "temuan-terkonfirmasi"
)

// Derive fills ClaimStatus and Final from the audit trail. The model never decides: only a human audit moves a red claim.
func (s *StoredReferral) Derive() {
	s.Final, s.ClaimStatus = false, ClaimNormal
	last := ""
	for _, a := range s.Audits {
		if a.Outcome == OutcomeValid || a.Outcome == OutcomeInvalid {
			s.Final, last = true, a.Outcome
		}
	}
	if s.Decision.Decision != "red" {
		return
	}
	switch last {
	case OutcomeValid:
		s.ClaimStatus = ClaimReleased
	case OutcomeInvalid:
		s.ClaimStatus = ClaimConfirmed
	default:
		s.ClaimStatus = ClaimHeld
	}
}
