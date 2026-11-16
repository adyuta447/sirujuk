package seed

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

func fastRetry(t *testing.T) {
	t.Helper()
	old := retryPause
	retryPause = time.Millisecond
	t.Cleanup(func() { retryPause = old })
}

func modelAnswer(id string) domain.RiskDecision {
	return domain.RiskDecision{ReferralID: id, Score: 50, Decision: "yellow", Status: "SCORED", SignalsSource: "ml"}
}

func dummyRows(store *repository.MemoryStore) (n int) {
	for _, it := range store.List() {
		if it.Decision.SignalsSource == "backend-dummy" {
			n++
		}
	}
	return n
}

func TestOneTimeoutInTheMiddleOfASeedLeavesNoDummyRow(t *testing.T) {
	fastRetry(t)
	var calls atomic.Int32
	flaky := func(_ context.Context, r domain.ReferralRequest) (domain.RiskDecision, error) {
		if calls.Add(1) == 7 { // one call after the warm-up answered runs out of time
			return domain.RiskDecision{}, context.DeadlineExceeded
		}
		return modelAnswer(r.ReferralID), nil
	}
	store := repository.NewMemoryStore()
	Run(store, 30, flaky)
	if store.Count() != 30 || dummyRows(store) != 0 {
		t.Fatalf("30 rows scored by the model, got %d rows and %d dummy", store.Count(), dummyRows(store))
	}
	if calls.Load() != 31 {
		t.Fatalf("exactly one retry, got %d calls", calls.Load())
	}
}

func TestARowIsRetriedAFewTimesThenFallsBackToTheDummyScore(t *testing.T) {
	fastRetry(t)
	var calls atomic.Int32
	stuck := func(_ context.Context, r domain.ReferralRequest) (domain.RiskDecision, error) {
		calls.Add(1)
		return domain.RiskDecision{}, errors.New("timeout")
	}
	store := repository.NewMemoryStore()
	Run(store, 5, stuck)
	if store.Count() != 5 || dummyRows(store) != 5 {
		t.Fatalf("with the model down every row carries the labelled dummy score: %d rows, %d dummy", store.Count(), dummyRows(store))
	}
	// The first row uses all its tries; once the model is known to be down, each later row gets one.
	if calls.Load() != scoreTries+4 {
		t.Fatalf("a dead model must not be retried on every row: %d calls", calls.Load())
	}
}

func TestTheModelComingBackEndsTheDownState(t *testing.T) {
	fastRetry(t)
	var calls atomic.Int32
	backAtSix := func(_ context.Context, r domain.ReferralRequest) (domain.RiskDecision, error) {
		if calls.Add(1) < 6 {
			return domain.RiskDecision{}, errors.New("timeout")
		}
		return modelAnswer(r.ReferralID), nil
	}
	score := scorer(backAtSix)
	req := domain.ReferralRequest{ReferralID: "r-1", DiagnosisCode: "I10", Reason: "alat", IssuedAt: time.Now()}
	if score(req).SignalsSource != "backend-dummy" { // 3 failed tries
		t.Fatal("first row: the model never answered")
	}
	if score(req).SignalsSource != "backend-dummy" { // down: 1 try, call 4
		t.Fatal("second row: one try only")
	}
	if score(req).SignalsSource != "backend-dummy" { // call 5
		t.Fatal("third row")
	}
	if score(req).SignalsSource != "ml" { // call 6 answers
		t.Fatal("the model answered, so the row must carry its score")
	}
	if calls.Load() != 6 {
		t.Fatalf("calls: %d", calls.Load())
	}
	// And a later slow call gets its retries again.
	calls.Store(5)
	flaky := func(c context.Context, r domain.ReferralRequest) (domain.RiskDecision, error) { return backAtSix(c, r) }
	if score = scorer(flaky); score(req).SignalsSource != "ml" {
		t.Fatal("a fresh scorer starts with all its tries")
	}
}
