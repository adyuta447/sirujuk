package service

import (
	"context"

	"github.com/sirujuk/backend-go/domain"
)

type MLServiceClient interface {
	Predict(context.Context, domain.ScoringInput) (domain.MLScores, error)
}

// Queue holds referrals that must be scored later (timeout, ML down, emergency).
type Queue interface {
	Enqueue(ctx context.Context, request domain.ReferralRequest, reason string) error
}

// Store keeps scoring results so a retried POST is idempotent and GET can serve async results.
// shortcut: Redis with TTL; replace with the immutable risk_scores table in Postgres.
type Store interface {
	Save(ctx context.Context, d domain.RiskDecision) error
	Load(ctx context.Context, referralID string) (*domain.RiskDecision, error) // nil, nil when absent
}
