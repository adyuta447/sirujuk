package service

import "github.com/sirujuk/backend-go/domain"

type DecisionEngine struct{}

func (DecisionEngine) Decide(referralID string, score float64, signals domain.MLScores) domain.RiskDecision {
	decision := "green"
	review := false
	switch {
	case score >= 80:
		decision, review = "red", true
	case score >= 50:
		decision, review = "yellow", true
	}
	return domain.RiskDecision{ReferralID: referralID, Score: score, Decision: decision, Signals: signals, RequiresHumanReview: review}
}
