package service

import (
	"context"
	"encoding/json"
	"log"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

type DecisionService struct {
	ML         MLServiceClient
	Engine     DecisionEngine
	Cache      Cache                         // doctor features from the nightly batch; nil = cold start
	Facilities repository.FacilityRepository // SISRUTE availability of the origin faskes
}

func (s DecisionService) Evaluate(ctx context.Context, request domain.ReferralRequest) (domain.RiskDecision, error) {
	c := request.Context // fallback when batch features / SISRUTE snapshot are unavailable
	in := domain.ScoringInput{
		Referral: request, SisruteAvailable: c.SisruteAvailable, SisruteAgeDays: c.SisruteAgeDays,
		Doctor: domain.DoctorFeatures{Stratum: c.Stratum, N90: c.N90, NS90: c.NS90, N180: c.N180, HHI180: c.HHI180, ToDominantDest: c.ToDominantDest, DestIsNearest: c.DestIsNearest},
	}
	if s.Cache != nil {
		if b, err := s.Cache.Get(ctx, "doctor:"+request.DoctorID); err == nil && b != nil {
			if err := json.Unmarshal(b, &in.Doctor); err != nil {
				log.Printf("doctor features unreadable for %s, cold start", request.DoctorID)
			}
		}
	}
	if s.Facilities != nil {
		if avail, age, err := s.Facilities.Availability(ctx, request.OriginFacilityID); err == nil {
			in.SisruteAvailable, in.SisruteAgeDays = avail, age
		}
	}
	signals, err := s.ML.Predict(ctx, in)
	if err != nil {
		return domain.RiskDecision{}, err
	}
	return s.Engine.Decide(request.ReferralID, signals), nil
}
