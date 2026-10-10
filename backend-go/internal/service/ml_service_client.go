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
