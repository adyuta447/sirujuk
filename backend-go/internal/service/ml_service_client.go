package service

import (
	"context"

	"github.com/sirujuk/backend-go/domain"
)

type MLServiceClient interface {
	Predict(context.Context, domain.ScoringInput) (domain.MLScores, error)
}

type Queue interface {
	Enqueue(ctx context.Context, request domain.ReferralRequest, reason string) error
}

type Store interface {
	Save(ctx context.Context, d domain.RiskDecision) error
	Load(ctx context.Context, referralID string) (*domain.RiskDecision, error) // nil, nil when absent
}
