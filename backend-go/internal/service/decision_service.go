package service

import (
	"context"
	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

type DecisionService struct {
	ML     MLServiceClient
	Engine DecisionEngine
	Scorer ScoringService
	UseML  bool
	Store  *repository.MemoryStore
}

func (s DecisionService) Evaluate(ctx context.Context, request domain.ReferralRequest) (domain.RiskDecision, error) {
	if request.ReferralID == "" {
		request.ReferralID = "r-dummy"
	}
	if !s.UseML {
		signals, score, reasons := s.Scorer.ScoreDummy(request)
		decision := s.Engine.Decide(request.ReferralID, score, signals)
		decision.ModelVersion = DummyVersion
		decision.SignalsSource = "backend-dummy"
		decision.Reasons = reasons
		return decision, nil
	}
	signals, err := s.ML.Predict(ctx, request)
	if err != nil {
		return domain.RiskDecision{}, err
	}
	score := s.Scorer.Score(signals)
	return s.Engine.Decide(request.ReferralID, score, signals), nil
}
