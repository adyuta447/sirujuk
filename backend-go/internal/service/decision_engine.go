package service

import "github.com/sirujuk/backend-go/domain"

// DecisionEngine maps the ML score to a category. YellowFrom/RedFrom are the p80/p95
// cut-offs of the historical score distribution (proposal section 4), not constants.
// Wire format is lowercase (docs/api-contract.md); the DB stores GREEN/YELLOW/RED.
// Output is a recommendation only; final decisions are written by TKMKB/verifier users.
type DecisionEngine struct{ YellowFrom, RedFrom float64 }

func (e DecisionEngine) Decide(referralID string, signals domain.MLScores) domain.RiskDecision {
	decision, review := "green", false
	switch {
	case signals.Score >= e.RedFrom:
		decision, review = "red", true
	case signals.Score >= e.YellowFrom:
		decision, review = "yellow", true
	}
	codes := make([]string, len(signals.Reasons))
	for i, r := range signals.Reasons {
		codes[i] = r.Code
	}
	return domain.RiskDecision{
		ReferralID: referralID, Score: signals.Score, Decision: decision, Signals: signals,
		ModelVersion: signals.ModelVersion, ReasonCodes: codes, Reasons: signals.Reasons, RequiresHumanReview: review, Status: "SCORED",
	}
}
