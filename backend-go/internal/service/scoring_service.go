package service

import "github.com/sirujuk/backend-go/domain"

type ScoringService struct{}

func (ScoringService) Score(signals domain.MLScores) float64 {
	// Baseline heuristic; calibrate only with approved labelled audit outcomes.
	score := 100 * (0.25*signals.FraudScore + 0.25*signals.AnomalyScore + 0.25*(1-signals.NLPSimilarity) + 0.25*signals.FraudScore)
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}
