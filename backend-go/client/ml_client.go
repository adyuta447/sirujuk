package client

import (
	"context"
	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
)

type MLClient struct{}

func (MLClient) Predict(context.Context, domain.ReferralRequest) (domain.MLScores, error) {
	return domain.MLScores{}, nil
}

var _ service.MLServiceClient = MLClient{}
