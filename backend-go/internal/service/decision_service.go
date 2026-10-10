package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// freshReferral: a referral issued within this window is scored with the batch cache; older ones point-in-time.
const freshReferral = 10 * time.Minute

type DecisionService struct {
	ML         MLServiceClient
	Engine     DecisionEngine
	Cache      Cache                         // doctor features from the nightly batch; nil = cold start
	Facilities repository.FacilityRepository // SISRUTE availability of the origin faskes
	History    ReferralSource                // enables point-in-time features for retrospective scoring; nil = batch cache only
	KNS        KNSList                       // 144-diagnosis list used with History
	Dummy      bool                          // DUMMY_SCORING: heuristic scores, no ML call; demo only (main.go refuses it in production)
}

func (s DecisionService) Evaluate(ctx context.Context, request domain.ReferralRequest) (domain.RiskDecision, error) {
	if s.Dummy {
		d := DummyEngine.Decide(request.ReferralID, ScoreDummy(request))
		d.SignalsSource = "backend-dummy"
		return d, nil
	}
	c := request.Context // fallback when batch features / SISRUTE snapshot are unavailable
	in := domain.ScoringInput{
		Referral: request, SisruteAvailable: c.SisruteAvailable, SisruteAgeDays: c.SisruteAgeDays,
		Doctor: domain.DoctorFeatures{Stratum: c.Stratum, N90: c.N90, NS90: c.NS90, N180: c.N180, HHI180: c.HHI180, ToDominantDest: c.ToDominantDest, DestIsNearest: c.DestIsNearest},
	}
	switch {
	case s.History != nil && time.Since(request.IssuedAt) > freshReferral:
		// Late scoring (re-score, retried queue, edit): features as of issue time, not today's.
		in.Doctor = FeaturesAsOf(s.History.List(), request.DoctorID, request.ReferralID, s.KNS, request.IssuedAt)
	case s.Cache != nil:
		if b, err := s.Cache.Get(ctx, "doctor:"+request.DoctorID); err == nil && b != nil {
			if err := json.Unmarshal(b, &in.Doctor); err != nil {
				log.Printf("doctor features unreadable for %s, cold start", request.DoctorID)
			}
		}
	}
	// ToDominantDest is per referral: is this destination the doctor's most-used one in the window?
	if in.Doctor.DominantDest != "" {
		in.Doctor.ToDominantDest = in.Doctor.DominantDest == request.DestinationFacilityID
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
	if signals.Category != "" && !validCategory(signals.Category) {
		return domain.RiskDecision{}, fmt.Errorf("ml service returned unknown category %q", signals.Category)
	}
	d := s.Engine.Decide(request.ReferralID, signals)
	d.Features = &domain.FeatureSnapshot{Doctor: in.Doctor, SisruteAvailable: in.SisruteAvailable, SisruteAgeDays: in.SisruteAgeDays}
	d.ScoredAt = time.Now().UTC().Format(time.RFC3339)
	return d, nil
}
