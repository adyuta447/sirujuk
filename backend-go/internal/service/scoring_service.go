package service

import "github.com/sirujuk/backend-go/domain"

type ScoringService struct{}

func (ScoringService) Score(signals domain.MLScores) float64 {
	return ClampScore(100 * (0.4*signals.FraudScore + 0.35*signals.AnomalyScore + 0.25*(1-signals.NLPSimilarity)))
}

func ClampScore(score float64) float64 {
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}
