package service

import (
	"context"
	"github.com/sirujuk/backend-go/domain"
)

type MLServiceClient interface {
	Predict(context.Context, domain.ReferralRequest) (domain.MLScores, error)
}
