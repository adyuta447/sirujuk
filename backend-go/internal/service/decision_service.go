package service

import (
	"context"
	"github.com/sirujuk/backend-go/domain"
)

type DecisionService struct {
	ML     MLServiceClient
	Engine DecisionEngine
	Scorer ScoringService
}

func (s DecisionService) Evaluate(ctx context.Context, request domain.ReferralRequest) (domain.RiskDecision, error) {
	signals, err := s.ML.Predict(ctx, request)
	if err != nil {
		return domain.RiskDecision{}, err
	}
	score := s.Scorer.Score(signals)
	return s.Engine.Decide(request.ReferralID, score, signals), nil
}
