package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

type spyML struct {
	got  domain.ScoringInput
	resp domain.MLScores
	err  error
}

func (s *spyML) Predict(_ context.Context, in domain.ScoringInput) (domain.MLScores, error) {
	s.got = in
	return s.resp, s.err
}

type mapCache map[string][]byte

func (m mapCache) Get(_ context.Context, k string) ([]byte, error) { return m[k], nil }
func (m mapCache) Set(_ context.Context, k string, v []byte) error { m[k] = v; return nil }

func cachedFeatures(t *testing.T, f domain.DoctorFeatures) mapCache {
	b, _ := json.Marshal(f)
	return mapCache{"doctor:d1": b}
}

func freshRequest() domain.ReferralRequest {
	return domain.ReferralRequest{ReferralID: "new", DoctorID: "d1", DestinationFacilityID: "RS-A", IssuedAt: time.Now()}
}

func TestFreshReferralUsesBatchFeaturesAndDerivesDominantDestination(t *testing.T) {
	ml := &spyML{resp: domain.MLScores{Category: CategoryGreen}}
	svc := DecisionService{ML: ml, Cache: cachedFeatures(t, domain.DoctorFeatures{N90: 40, N180: 80, DominantDest: "RS-A"})}
	if _, err := svc.Evaluate(context.Background(), freshRequest()); err != nil {
		t.Fatal(err)
	}
	if ml.got.Doctor.N90 != 40 || !ml.got.Doctor.ToDominantDest {
		t.Fatalf("batch features must reach the model and the dominant destination is per referral: %+v", ml.got.Doctor)
	}
	other := freshRequest()
	other.DestinationFacilityID = "RS-B"
	_, _ = svc.Evaluate(context.Background(), other)
	if ml.got.Doctor.ToDominantDest {
		t.Fatal("a different destination is not the dominant one")
	}
}

func TestLateScoringUsesPointInTimeHistoryNotTheCache(t *testing.T) {
	issued := time.Now().AddDate(0, 0, -30)
	history := repository.NewMemoryStore()
	for i := 0; i < 5; i++ {
		history.Upsert(domain.ReferralRequest{ReferralID: string(rune('a' + i)), DoctorID: "d1", DestinationFacilityID: "RS-A", IssuedAt: issued.AddDate(0, 0, -1-i)}, domain.RiskDecision{})
	}
	ml := &spyML{resp: domain.MLScores{Category: CategoryGreen}}
	svc := DecisionService{ML: ml, History: history, Cache: cachedFeatures(t, domain.DoctorFeatures{N90: 999})}
	req := domain.ReferralRequest{ReferralID: "old", DoctorID: "d1", DestinationFacilityID: "RS-A", IssuedAt: issued}
	if _, err := svc.Evaluate(context.Background(), req); err != nil {
		t.Fatal(err)
	}
	if ml.got.Doctor.N90 != 5 {
		t.Fatalf("a 30 day old referral must be scored with the history before it (5), not today's cache: %d", ml.got.Doctor.N90)
	}
}

func TestUnknownCategoryFromMLIsAnError(t *testing.T) {
	svc := DecisionService{ML: &spyML{resp: domain.MLScores{Category: "purple"}}}
	if _, err := svc.Evaluate(context.Background(), freshRequest()); err == nil {
		t.Fatal("a category the backend does not know must fail open (error), not become a decision")
	}
}

func TestMLErrorPropagatesSoTheHandlerCanFailOpen(t *testing.T) {
	svc := DecisionService{ML: &spyML{err: errors.New("down")}}
	if _, err := svc.Evaluate(context.Background(), freshRequest()); err == nil {
		t.Fatal("expected the ML error")
	}
}

func TestCorruptCachedFeaturesFallBackToColdStart(t *testing.T) {
	ml := &spyML{resp: domain.MLScores{Category: CategoryGreen}}
	svc := DecisionService{ML: ml, Cache: mapCache{"doctor:d1": []byte("{not json")}}
	if _, err := svc.Evaluate(context.Background(), freshRequest()); err != nil {
		t.Fatalf("a damaged cache entry must not block scoring: %v", err)
	}
}

func TestStoredScoreKeepsTheInputsTheModelSaw(t *testing.T) {
	ml := &spyML{resp: domain.MLScores{Category: CategoryYellow, Score: 5, ModelVersion: "m1", YellowFrom: 2.5, RedFrom: 16}}
	svc := DecisionService{ML: ml, Facilities: repository.MockFacilities{"o": {Available: true, AgeDays: 3}}}
	req := freshRequest()
	req.OriginFacilityID = "o"
	d, err := svc.Evaluate(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	if d.Features == nil || !d.Features.SisruteAvailable || d.Features.SisruteAgeDays != 3 || d.ScoredAt == "" || d.YellowFrom != 2.5 || d.ModelVersion != "m1" {
		t.Fatalf("an appeal needs the exact inputs, cut-offs and model version: %+v", d)
	}
}
